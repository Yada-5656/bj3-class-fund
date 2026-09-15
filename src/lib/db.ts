import { ALL_ROOMS, findRoom } from "./rooms";
import realStudentsData from "./real_students.json";
import { getTodayISODate } from "./utils";

export interface Student {
  id: string;
  rollNumber: number;
  name: string;
  isPaid: boolean;
  paidDate?: string; // Stored as ISO YYYY-MM-DD
}

export interface Transaction {
  id: string;
  roomId: string;
  type: "income" | "expense" | "fund";
  category: string;
  description: string;
  amount: number;
  date: string; // ISO format YYYY-MM-DD (Rendered as Thai BE date on UI)
  createdAt: string;
}

export interface RoomSettings {
  treasurerPin: string;
  fundFeePerStudent: number;
  lastCheckinDate?: string;
}

export interface RoomData {
  roomSlug: string;
  settings: RoomSettings;
  students: Student[];
  transactions: Transaction[];
  dailyCheckins?: Record<string, string[]>;
}

export interface RoomSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  paidCount: number;
  unpaidCount: number;
  totalStudents: number;
  collectionRate: number;
  unpaidStudents: Student[];
}

// Generate realistic initial data for any of the 77 rooms using extracted real student roster
export function createDefaultRoomData(roomSlug: string): RoomData {
  const room = findRoom(roomSlug);
  const displayName = room ? room.displayName : `ม.${roomSlug.replace("-", "/")}`;

  // Load real student roster from extracted BJ3 school data
  const rawList = (realStudentsData as Record<string, { rollNumber: number; name: string }[]>)[roomSlug];
  const students: Student[] = [];

  if (rawList && rawList.length > 0) {
    for (let i = 0; i < rawList.length; i++) {
      const item = rawList[i];
      students.push({
        id: `${roomSlug}-${item.rollNumber.toString().padStart(2, "0")}`,
        rollNumber: item.rollNumber,
        name: item.name,
        isPaid: false,
      });
    }
  } else {
    // Fallback if room key is not found
    for (let i = 1; i <= 35; i++) {
      students.push({
        id: `${roomSlug}-${i.toString().padStart(2, "0")}`,
        rollNumber: i,
        name: `เลขที่ ${i}`,
        isPaid: false,
      });
    }
  }

  // Realistic starter transactions
  const transactions: Transaction[] = [
    {
      id: `tx-${roomSlug}-1`,
      roomId: roomSlug,
      type: "income",
      category: "เงินสนับสนุน",
      description: "เงินสนับสนุนกิจกรรมห้องเรียนจากครูที่ปรึกษา",
      amount: 400,
      date: "2024-09-01",
      createdAt: new Date("2024-09-01T09:00:00Z").toISOString(),
    },
    {
      id: `tx-${roomSlug}-2`,
      roomId: roomSlug,
      type: "expense",
      category: "อุปกรณ์ทำความสะอาด",
      description: "ซื้อไม้กวาดทางมะพร้าวและที่ตักผงประจำเวรห้อง",
      amount: 140,
      date: "2024-09-02",
      createdAt: new Date("2024-09-02T10:15:00Z").toISOString(),
    },
    {
      id: `tx-${roomSlug}-3`,
      roomId: roomSlug,
      type: "expense",
      category: "เอกสารการเรียน",
      description: "ค่าถ่ายเอกสารชีทสรุปเตรียมสอบย่อยกลางภาค",
      amount: 175,
      date: "2024-08-30",
      createdAt: new Date("2024-08-30T13:45:00Z").toISOString(),
    },
  ];

  return {
    roomSlug,
    settings: {
      treasurerPin: "1234",
      fundFeePerStudent: 20,
      lastCheckinDate: getTodayISODate(),
    },
    students,
    transactions,
    dailyCheckins: {},
  };
}

// In-Memory store for server-side mock operations
const memoryStore = new Map<string, RoomData>();

export function getRoomData(roomSlug: string): RoomData {
  if (!memoryStore.has(roomSlug)) {
    memoryStore.set(roomSlug, createDefaultRoomData(roomSlug));
  }
  return memoryStore.get(roomSlug)!;
}

export function calculateSummary(roomData: RoomData): RoomSummary {
  const { students, transactions, dailyCheckins } = roomData;

  const totalIncome = transactions
    .filter((t) => t.type === "income" || t.type === "fund")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalBalance = totalIncome - totalExpense;

  const today = getTodayISODate();
  const todayPaidSet = new Set(
    dailyCheckins?.[today] ??
    students.filter((s) => s.isPaid).map((s) => s.id)
  );

  const paidCount = students.filter((s) => todayPaidSet.has(s.id)).length;
  const totalStudents = students.length;
  const unpaidCount = totalStudents - paidCount;
  const collectionRate = totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0;
  const unpaidStudents = students.filter((s) => !todayPaidSet.has(s.id));

  return {
    totalBalance,
    totalIncome,
    totalExpense,
    paidCount,
    unpaidCount,
    totalStudents,
    collectionRate,
    unpaidStudents,
  };
}

// Client-side LocalStorage sync helpers with versioned key
const STORAGE_PREFIX = "bj3_class_fund_room_v4_";

export function loadRoomFromClientStorage(roomSlug: string): RoomData {
  if (typeof window === "undefined") {
    return getRoomData(roomSlug);
  }

  const today = getTodayISODate();

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${roomSlug}`);
    if (raw) {
      const data: RoomData = JSON.parse(raw);
      data.dailyCheckins = data.dailyCheckins || {};

      // Migrate any legacy check-in data into dailyCheckins if missing
      if (Object.keys(data.dailyCheckins).length === 0) {
        const legacyDate = data.settings?.lastCheckinDate || today;
        const legacyPaid = data.students.filter((s) => s.isPaid).map((s) => s.id);
        if (legacyPaid.length > 0) {
          data.dailyCheckins[legacyDate] = legacyPaid;
        }
      }

      // Synchronize students for today
      // If today has no checkins recorded yet, students start as isPaid: false
      // If today already has checkins recorded, restore them
      const todayPaidSet = new Set(data.dailyCheckins[today] || []);
      data.students = data.students.map((s) => ({
        ...s,
        isPaid: todayPaidSet.has(s.id),
        paidDate: todayPaidSet.has(s.id) ? today : undefined,
      }));

      return data;
    }
  } catch (err) {
    console.error("Failed to read from localStorage:", err);
  }

  const defaultData = getRoomData(roomSlug);
  defaultData.dailyCheckins = defaultData.dailyCheckins || {};
  defaultData.settings.lastCheckinDate = today;
  defaultData.students = defaultData.students.map((s) => ({
    ...s,
    isPaid: false,
    paidDate: undefined,
  }));
  saveRoomToClientStorage(roomSlug, defaultData);
  return defaultData;
}

export function saveRoomToClientStorage(roomSlug: string, data: RoomData): void {
  if (typeof window === "undefined") {
    memoryStore.set(roomSlug, data);
    return;
  }

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${roomSlug}`, JSON.stringify(data));
    memoryStore.set(roomSlug, data);
  } catch (err) {
    console.error("Failed to write to localStorage:", err);
  }
}
