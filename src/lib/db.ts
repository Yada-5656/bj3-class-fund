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
  isInitialized?: boolean;
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

// Generate realistic initial data for any of the rooms using extracted real student roster
// Starts at 0 balance and empty transactions as requested
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

  return {
    roomSlug,
    settings: {
      treasurerPin: "1234",
      fundFeePerStudent: 20,
      lastCheckinDate: getTodayISODate(),
      isInitialized: false,
    },
    students,
    transactions: [],
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
  const hasRecordedToday = !!(dailyCheckins && dailyCheckins[today] !== undefined);

  let paidCount = 0;
  let unpaidCount = 0;
  let collectionRate = 0;
  const totalStudents = students.length;
  let unpaidStudents: Student[] = [];

  if (hasRecordedToday) {
    const todayPaidSet = new Set(dailyCheckins![today]);
    paidCount = students.filter((s) => todayPaidSet.has(s.id)).length;
    unpaidCount = totalStudents - paidCount;
    collectionRate = totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0;
    unpaidStudents = students.filter((s) => !todayPaidSet.has(s.id));
  }

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
export const STORAGE_PREFIX = "bj3_class_fund_room_v5_";

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

      // Consolidate duplicate fund transactions on the same date into 1 single row per date
      const seenFundDates = new Set<string>();
      const consolidatedTx: Transaction[] = [];
      for (const tx of data.transactions || []) {
        if (tx.type === "fund") {
          if (!seenFundDates.has(tx.date)) {
            seenFundDates.add(tx.date);
            const paidIds = data.dailyCheckins?.[tx.date];
            if (paidIds && paidIds.length > 0) {
              const fee = data.settings?.fundFeePerStudent || 20;
              tx.amount = paidIds.length * fee;
              tx.description = `เก็บเงินห้อง (${paidIds.length} คน x ${fee} บาท)`;
              consolidatedTx.push(tx);
            } else if (!paidIds) {
              consolidatedTx.push(tx);
            }
          }
        } else {
          consolidatedTx.push(tx);
        }
      }
      data.transactions = consolidatedTx;

      // Synchronize students for today
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

  // Trigger background cloud sync across all devices
  try {
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync_room",
        roomSlug,
        settings: data.settings,
        dailyCheckins: data.dailyCheckins || {},
        transactions: data.transactions || [],
      }),
    }).catch((e) => {
      // Quiet fail for offline support
    });
  } catch (e) {
    // Quiet fail
  }
}

/**
 * Synchronize room state with central cloud server (cross-device sync)
 */
export async function syncRoomWithServer(roomSlug: string): Promise<RoomData> {
  const localData = loadRoomFromClientStorage(roomSlug);

  if (typeof window === "undefined") {
    return localData;
  }

  try {
    const res = await fetch(`/api/sync?room=${roomSlug}`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.settings) {
        let updated = false;
        const mergedData: RoomData = { ...localData };

        // 1. Sync Settings (Initialized status, Treasurer PIN, Fund Fee)
        if (json.settings.isInitialized !== undefined) {
          mergedData.settings = {
            ...mergedData.settings,
            ...json.settings,
          };
          updated = true;
        }

        // 2. Sync Daily Checkins if server has records
        if (json.dailyCheckins && Object.keys(json.dailyCheckins).length > 0) {
          mergedData.dailyCheckins = {
            ...(mergedData.dailyCheckins || {}),
            ...json.dailyCheckins,
          };
          updated = true;
        }

        // 3. Sync Transactions (Merge by ID, newest first)
        if (Array.isArray(json.transactions) && json.transactions.length > 0) {
          const txMap = new Map<string, Transaction>();
          (mergedData.transactions || []).forEach((t) => txMap.set(t.id, t));
          json.transactions.forEach((t: Transaction) => txMap.set(t.id, t));
          mergedData.transactions = Array.from(txMap.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          updated = true;
        }

        // 4. Update today's payment status for students
        const today = getTodayISODate();
        const todayPaidSet = new Set(mergedData.dailyCheckins?.[today] || []);
        mergedData.students = mergedData.students.map((s) => ({
          ...s,
          isPaid: todayPaidSet.has(s.id),
          paidDate: todayPaidSet.has(s.id) ? today : undefined,
        }));

        if (updated) {
          try {
            localStorage.setItem(`${STORAGE_PREFIX}${roomSlug}`, JSON.stringify(mergedData));
            memoryStore.set(roomSlug, mergedData);
          } catch (e) {
            // ignore quota error
          }
        }

        return mergedData;
      }
    }
  } catch (err) {
    console.warn("syncRoomWithServer error, fallback to local:", err);
  }

  return localData;
}

/**
 * Returns all classrooms ranked by total money collected (highest first)
 */
export function getAllRoomsRanked(): {
  roomSlug: string;
  displayName: string;
  summary: RoomSummary;
  totalCollected: number;
}[] {
  const roomList = [...ALL_ROOMS];
  const room6_11 = findRoom("6/11");
  if (room6_11 && !roomList.some((r) => r.slug === "6-11")) {
    if (typeof window !== "undefined" && localStorage.getItem(`${STORAGE_PREFIX}6-11`)) {
      roomList.push(room6_11);
    }
  }

  const results = roomList.map((r) => {
    const data = loadRoomFromClientStorage(r.slug);
    const summary = calculateSummary(data);
    const totalCollected = summary.totalIncome;
    return {
      roomSlug: r.slug,
      displayName: r.displayName,
      summary,
      totalCollected,
    };
  });

  return results.sort(
    (a, b) =>
      b.totalCollected - a.totalCollected ||
      b.summary.totalBalance - a.summary.totalBalance
  );
}

/**
 * Gets saved promotion date (YYYY-MM-DD) or null
 */
export function getPromotionDate(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bj3_promotion_date");
}

/**
 * Sets promotion date or clears it if null
 */
export function setPromotionDate(dateStr: string | null): void {
  if (typeof window === "undefined") return;
  if (dateStr && dateStr.trim()) {
    localStorage.setItem("bj3_promotion_date", dateStr.trim());
  } else {
    localStorage.removeItem("bj3_promotion_date");
  }
}

/**
 * Executes the grade promotion transition for Lower and Upper Secondary:
 * 1. M.3 graduates -> wipe all M.3 rooms
 * 2. M.2 promotes to M.3
 * 3. M.1 promotes to M.2
 * 4. M.1 resets to empty (0 balance, 0 students, uninitialized)
 * 5. M.6 graduates -> wipe all M.6 rooms
 * 6. M.5 promotes to M.6 (5/1-5/11 -> 6/1-6/11, total 78 rooms)
 * 7. M.4 promotes to M.5
 * 8. M.4 resets to empty (0 balance, 0 students, uninitialized)
 * 9. Clear auto-login if previously active in M.3 or M.6
 * 10. Clear promotion date and advance generation
 */
export function promoteGrades(): {
  m3Graduated: number;
  m6Graduated: number;
  totalRooms: number;
} {
  if (typeof window === "undefined") {
    return { m3Graduated: 15, m6Graduated: 10, totalRooms: 78 };
  }

  // 1. Wipe M.3 rooms (1-15)
  for (let r = 1; r <= 15; r++) {
    localStorage.removeItem(`${STORAGE_PREFIX}3-${r}`);
    localStorage.removeItem(`bj3_room_pwd_3-${r}`);
  }

  // 2. Promote M.2 -> M.3 (1-15)
  for (let r = 1; r <= 15; r++) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}2-${r}`);
    if (raw) {
      try {
        const data: RoomData = JSON.parse(raw);
        data.roomSlug = `3-${r}`;
        data.students = data.students.map((s) => ({
          ...s,
          id: `3-${r}-${s.rollNumber.toString().padStart(2, "0")}`,
        }));
        data.transactions = (data.transactions || []).map((t) => ({
          ...t,
          roomId: `3-${r}`,
        }));
        localStorage.setItem(`${STORAGE_PREFIX}3-${r}`, JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem(`${STORAGE_PREFIX}2-${r}`);
    }
    const pwd = localStorage.getItem(`bj3_room_pwd_2-${r}`);
    if (pwd) {
      localStorage.setItem(`bj3_room_pwd_3-${r}`, pwd);
      localStorage.removeItem(`bj3_room_pwd_2-${r}`);
    }
  }

  // 3. Promote M.1 -> M.2 (1-15)
  for (let r = 1; r <= 15; r++) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}1-${r}`);
    if (raw) {
      try {
        const data: RoomData = JSON.parse(raw);
        data.roomSlug = `2-${r}`;
        data.students = data.students.map((s) => ({
          ...s,
          id: `2-${r}-${s.rollNumber.toString().padStart(2, "0")}`,
        }));
        data.transactions = (data.transactions || []).map((t) => ({
          ...t,
          roomId: `2-${r}`,
        }));
        localStorage.setItem(`${STORAGE_PREFIX}2-${r}`, JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem(`${STORAGE_PREFIX}1-${r}`);
    }
    const pwd = localStorage.getItem(`bj3_room_pwd_1-${r}`);
    if (pwd) {
      localStorage.setItem(`bj3_room_pwd_2-${r}`, pwd);
      localStorage.removeItem(`bj3_room_pwd_1-${r}`);
    }
  }

  // 4. Reset M.1 (1-15) to empty fresh rooms
  for (let r = 1; r <= 15; r++) {
    const emptyRoom: RoomData = {
      roomSlug: `1-${r}`,
      settings: {
        treasurerPin: "1234",
        fundFeePerStudent: 20,
        lastCheckinDate: getTodayISODate(),
        isInitialized: false,
      },
      students: [],
      transactions: [],
      dailyCheckins: {},
    };
    localStorage.setItem(`${STORAGE_PREFIX}1-${r}`, JSON.stringify(emptyRoom));
    localStorage.removeItem(`bj3_room_pwd_1-${r}`);
  }

  // 5. Wipe M.6 rooms (1-15)
  for (let r = 1; r <= 15; r++) {
    localStorage.removeItem(`${STORAGE_PREFIX}6-${r}`);
    localStorage.removeItem(`bj3_room_pwd_6-${r}`);
  }

  // 6. Promote M.5 -> M.6 (1-11)
  for (let r = 1; r <= 11; r++) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}5-${r}`);
    if (raw) {
      try {
        const data: RoomData = JSON.parse(raw);
        data.roomSlug = `6-${r}`;
        data.students = data.students.map((s) => ({
          ...s,
          id: `6-${r}-${s.rollNumber.toString().padStart(2, "0")}`,
        }));
        data.transactions = (data.transactions || []).map((t) => ({
          ...t,
          roomId: `6-${r}`,
        }));
        localStorage.setItem(`${STORAGE_PREFIX}6-${r}`, JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem(`${STORAGE_PREFIX}5-${r}`);
    }
    const pwd = localStorage.getItem(`bj3_room_pwd_5-${r}`);
    if (pwd) {
      localStorage.setItem(`bj3_room_pwd_6-${r}`, pwd);
      localStorage.removeItem(`bj3_room_pwd_5-${r}`);
    }
  }

  // 7. Promote M.4 -> M.5 (1-11)
  for (let r = 1; r <= 11; r++) {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}4-${r}`);
    if (raw) {
      try {
        const data: RoomData = JSON.parse(raw);
        data.roomSlug = `5-${r}`;
        data.students = data.students.map((s) => ({
          ...s,
          id: `5-${r}-${s.rollNumber.toString().padStart(2, "0")}`,
        }));
        data.transactions = (data.transactions || []).map((t) => ({
          ...t,
          roomId: `5-${r}`,
        }));
        localStorage.setItem(`${STORAGE_PREFIX}5-${r}`, JSON.stringify(data));
      } catch (e) {
        console.error(e);
      }
      localStorage.removeItem(`${STORAGE_PREFIX}4-${r}`);
    }
    const pwd = localStorage.getItem(`bj3_room_pwd_4-${r}`);
    if (pwd) {
      localStorage.setItem(`bj3_room_pwd_5-${r}`, pwd);
      localStorage.removeItem(`bj3_room_pwd_4-${r}`);
    }
  }

  // 8. Reset M.4 (1-11) to empty fresh rooms
  for (let r = 1; r <= 11; r++) {
    const emptyRoom: RoomData = {
      roomSlug: `4-${r}`,
      settings: {
        treasurerPin: "1234",
        fundFeePerStudent: 20,
        lastCheckinDate: getTodayISODate(),
        isInitialized: false,
      },
      students: [],
      transactions: [],
      dailyCheckins: {},
    };
    localStorage.setItem(`${STORAGE_PREFIX}4-${r}`, JSON.stringify(emptyRoom));
    localStorage.removeItem(`bj3_room_pwd_4-${r}`);
  }

  // 9. Clear auto-login if in M.3 or M.6
  const activeRoom = localStorage.getItem("bj3_active_room");
  if (activeRoom && (activeRoom.startsWith("3-") || activeRoom.startsWith("6-"))) {
    localStorage.removeItem("bj3_active_room");
  }

  // 10. Advance generation and clear promotion date
  const curGen = parseInt(localStorage.getItem("bj3_promotion_generation") || "0") + 1;
  localStorage.setItem("bj3_promotion_generation", String(curGen));
  localStorage.removeItem("bj3_promotion_date");

  return {
    m3Graduated: 15,
    m6Graduated: 11,
    totalRooms: 78,
  };
}

/**
 * Checks if current date has reached or passed the promotion date.
 * If so, automatically runs promoteGrades() and resets promotion date.
 */
export function checkAndRunPromotion(): boolean {
  if (typeof window === "undefined") return false;
  const promoDate = getPromotionDate();
  if (!promoDate) return false;

  const today = getTodayISODate();
  if (today >= promoDate) {
    promoteGrades();
    return true;
  }
  return false;
}
