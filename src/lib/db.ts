import { ALL_ROOMS, findRoom } from "./rooms";
import realStudentsData from "./real_students.json";

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
}

export interface RoomData {
  roomSlug: string;
  settings: RoomSettings;
  students: Student[];
  transactions: Transaction[];
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
      // Seed initial status: first 70% paid, rest unpaid for realistic dashboard demonstration
      const isPaid = i < Math.floor(rawList.length * 0.7);
      students.push({
        id: `${roomSlug}-${item.rollNumber.toString().padStart(2, "0")}`,
        rollNumber: item.rollNumber,
        name: item.name,
        isPaid,
        paidDate: isPaid ? "2024-09-02" : undefined,
      });
    }
  } else {
    // Fallback if room key is not found
    for (let i = 1; i <= 35; i++) {
      const isPaid = i <= 25;
      students.push({
        id: `${roomSlug}-${i.toString().padStart(2, "0")}`,
        rollNumber: i,
        name: `เลขที่ ${i}`,
        isPaid,
        paidDate: isPaid ? "2024-09-02" : undefined,
      });
    }
  }

  const paidCount = students.filter((s) => s.isPaid).length;
  const initialFundCollected = paidCount * 20;

  // Realistic starter transactions
  const transactions: Transaction[] = [
    {
      id: `tx-${roomSlug}-1`,
      roomId: roomSlug,
      type: "fund",
      category: "เงินห้องประจำสัปดาห์",
      description: `เก็บเงินห้องประจำสัปดาห์ (${paidCount} คน x 20 บาท)`,
      amount: initialFundCollected,
      date: "2024-09-02",
      createdAt: new Date("2024-09-02T08:30:00Z").toISOString(),
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
      type: "income",
      category: "เงินสนับสนุน",
      description: "เงินสนับสนุนกิจกรรมห้องเรียนจากครูที่ปรึกษา",
      amount: 400,
      date: "2024-09-01",
      createdAt: new Date("2024-09-01T09:00:00Z").toISOString(),
    },
    {
      id: `tx-${roomSlug}-4`,
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
    },
    students,
    transactions,
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
  const { students, transactions } = roomData;

  const totalIncome = transactions
    .filter((t) => t.type === "income" || t.type === "fund")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalBalance = totalIncome - totalExpense;

  const paidCount = students.filter((s) => s.isPaid).length;
  const totalStudents = students.length;
  const unpaidCount = totalStudents - paidCount;
  const collectionRate = totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0;
  const unpaidStudents = students.filter((s) => !s.isPaid);

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
const STORAGE_PREFIX = "bj3_class_fund_room_v3_";

export function loadRoomFromClientStorage(roomSlug: string): RoomData {
  if (typeof window === "undefined") {
    return getRoomData(roomSlug);
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${roomSlug}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Failed to read from localStorage:", err);
  }

  const defaultData = getRoomData(roomSlug);
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
