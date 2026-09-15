import { RoomData, RoomSettings, Transaction, createDefaultRoomData } from "./db";

// Cloud Store configuration using public reliable JSON store
const STORE_URL = "https://api.restful-api.dev/objects/ff808181a09d98f701a0a664936f137c";

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

// In-Memory server cache with TTL
let memoryCache: CloudState | null = null;
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 2000; // 2 seconds cache for fast response

/**
 * Fetch current state from Cloud Store (with in-memory cache)
 */
export async function fetchCloudState(): Promise<CloudState> {
  const now = Date.now();
  if (memoryCache && now - lastCacheFetchTime < CACHE_TTL_MS) {
    return memoryCache;
  }

  // 1. Try Upstash Redis if configured
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const res = await fetch(`${process.env.KV_REST_API_URL}/get/bj3_cloud_state`, {
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          const parsed = typeof json.result === "string" ? JSON.parse(json.result) : json.result;
          memoryCache = parsed;
          lastCacheFetchTime = now;
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Upstash fetch failed:", err);
    }
  }

  // 2. Primary Cloud Store
  try {
    const res = await fetch(STORE_URL, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      const rawData = json.data || {};
      const data: CloudState = {
        version: rawData.version || 1,
        updatedAt: rawData.updatedAt || new Date().toISOString(),
        promotionDate: rawData.promotionDate || null,
        adminUsername: rawData.adminUsername,
        adminPassword: rawData.adminPassword,
        rooms: rawData.rooms || {},
      };
      memoryCache = data;
      lastCacheFetchTime = now;
      return data;
    }
  } catch (err) {
    console.error("Cloud store fetch error:", err);
  }

  // Fallback to empty state if offline or network error
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

/**
 * Persist updated state to Cloud Store
 */
export async function saveCloudState(
  updater: (prev: CloudState) => CloudState
): Promise<CloudState> {
  const current = await fetchCloudState();
  const next = updater(current);
  next.updatedAt = new Date().toISOString();
  memoryCache = next;
  lastCacheFetchTime = Date.now();

  // 1. Persist to Upstash if configured
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      await fetch(`${process.env.KV_REST_API_URL}/set/bj3_cloud_state`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(next),
      });
    } catch (err) {
      console.warn("Upstash save failed:", err);
    }
  }

  // 2. Persist to Primary Cloud Store
  try {
    await fetch(STORE_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "bj3_rooms_store",
        data: next,
      }),
    });
  } catch (err) {
    console.error("Failed to save to cloud store:", err);
  }

  return next;
}

/**
 * Get room settings and data from cloud
 */
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

/**
 * Mark a room as initialized and save its treasurer PIN & fee to cloud
 */
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

/**
 * Save full room sync data (checkins, transactions, settings) to cloud
 */
export async function syncRoomToCloud(
  roomSlug: string,
  settings: RoomSettings,
  dailyCheckins: Record<string, string[]>,
  transactions: Transaction[]
): Promise<boolean> {
  try {
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
  } catch (err) {
    console.error("syncRoomToCloud error:", err);
    return false;
  }
}
