import { RoomSettings, Transaction } from "./db";

const CLOUD_BIN_ID = process.env.BJ3_CLOUD_BIN || "edbbbbf";
const STORE_URL = `https://extendsclass.com/api/json-storage/bin/${CLOUD_BIN_ID}`;

export interface CloudState {
  version: number;
  updatedAt: string;
  promotionDate?: string | null;
  adminUsername?: string;
  adminPassword?: string;
  rooms: Record<
    string,
    {
      settings?: RoomSettings;
      dailyCheckins?: Record<string, string[]>;
      transactions?: Transaction[];
      lastUpdated?: string;
    }
  >;
}

let memoryCache: CloudState | null = null;
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 2000;

export async function fetchCloudState(): Promise<CloudState> {
  const now = Date.now();
  if (memoryCache && now - lastCacheFetchTime < CACHE_TTL_MS) {
    return memoryCache;
  }

  try {
    const res = await fetch(STORE_URL, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.rooms === "object") {
        memoryCache = data;
        lastCacheFetchTime = now;
        return data;
      }
    }
  } catch (err) {
    console.error("Cloud store fetch error:", err);
  }

  if (!memoryCache) {
    memoryCache = {
      version: 1,
      updatedAt: new Date().toISOString(),
      rooms: {},
      promotionDate: null,
    };
  }
  return memoryCache;
}

export async function saveCloudState(
  updater: (prev: CloudState) => CloudState
): Promise<CloudState> {
  const current = await fetchCloudState();
  const next = updater(current);
  next.updatedAt = new Date().toISOString();
  memoryCache = next;
  lastCacheFetchTime = Date.now();

  try {
    await fetch(STORE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify(next),
    });
  } catch (err) {
    console.error("Failed to save to cloud store:", err);
  }

  return next;
}

export async function getCloudRoom(roomSlug: string): Promise<{
  settings: RoomSettings;
  dailyCheckins?: Record<string, string[]>;
  transactions?: Transaction[];
} | null> {
  const state = await fetchCloudState();
  const roomEntry = state.rooms[roomSlug];
  if (!roomEntry) return null;

  return {
    settings: roomEntry.settings || {
      treasurerPin: "1234",
      fundFeePerStudent: 20,
      isInitialized: false,
    },
    dailyCheckins: roomEntry.dailyCheckins || {},
    transactions: roomEntry.transactions || [],
  };
}

export async function initializeCloudRoom(
  roomSlug: string,
  feePerStudent: number,
  treasurerPin: string
): Promise<RoomSettings> {
  const newSettings: RoomSettings = {
    fundFeePerStudent: feePerStudent,
    treasurerPin: treasurerPin.trim(),
    isInitialized: true,
  };

  await saveCloudState((prev) => {
    const existing = prev.rooms[roomSlug] || {};
    return {
      ...prev,
      rooms: {
        ...prev.rooms,
        [roomSlug]: {
          ...existing,
          settings: {
            ...(existing.settings || {}),
            ...newSettings,
          },
          lastUpdated: new Date().toISOString(),
        },
      },
    };
  });

  return newSettings;
}

export async function syncRoomToCloud(
  roomSlug: string,
  settings: RoomSettings,
  dailyCheckins: Record<string, string[]>,
  transactions: Transaction[]
): Promise<boolean> {
  await saveCloudState((prev) => {
    const existing = prev.rooms[roomSlug] || {};
    return {
      ...prev,
      rooms: {
        ...prev.rooms,
        [roomSlug]: {
          ...existing,
          settings: {
            ...(existing.settings || {}),
            ...settings,
          },
          dailyCheckins: {
            ...(existing.dailyCheckins || {}),
            ...dailyCheckins,
          },
          transactions: transactions || existing.transactions || [],
          lastUpdated: new Date().toISOString(),
        },
      },
    };
  });
  return true;
}

