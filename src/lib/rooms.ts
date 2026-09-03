export interface RoomInfo {
  slug: string;        // e.g. "3-15"
  name: string;        // e.g. "3/15"
  displayName: string; // e.g. "ม.3/15"
  grade: number;       // 1 to 6
  roomNumber: number;  // 1 to 15
  expectedPassword: string; // e.g. "3/15BJ3"
}

// Generate the 77 rooms across 6 grade levels according to BJ3 school structure:
// M.1: 1/1 - 1/15 (15 rooms)
// M.2: 2/1 - 2/15 (15 rooms)
// M.3: 3/1 - 3/15 (15 rooms)
// M.4: 4/1 - 4/11 (11 rooms)
// M.5: 5/1 - 5/11 (11 rooms)
// M.6: 6/1 - 6/10 (10 rooms)
export function generateAllRooms(): RoomInfo[] {
  const rooms: RoomInfo[] = [];

  const gradeConfigs: { grade: number; roomCount: number }[] = [
    { grade: 1, roomCount: 15 },
    { grade: 2, roomCount: 15 },
    { grade: 3, roomCount: 15 },
    { grade: 4, roomCount: 11 },
    { grade: 5, roomCount: 11 },
    { grade: 6, roomCount: 10 },
  ];

  for (const config of gradeConfigs) {
    for (let r = 1; r <= config.roomCount; r++) {
      const name = `${config.grade}/${r}`;
      const slug = `${config.grade}-${r}`;
      rooms.push({
        slug,
        name,
        displayName: `ม.${name}`,
        grade: config.grade,
        roomNumber: r,
        expectedPassword: `${name}BJ3`,
      });
    }
  }

  return rooms;
}

export const ALL_ROOMS = generateAllRooms();

// Lookup dictionary for O(1) checks
export const ROOM_BY_SLUG = new Map<string, RoomInfo>(
  ALL_ROOMS.map((r) => [r.slug, r])
);

export const ROOM_BY_NAME = new Map<string, RoomInfo>(
  ALL_ROOMS.map((r) => [r.name, r])
);

/**
 * Normalizes user input room name (e.g. "3/15", "3-15", "ม.3/15", "m.3/15") into RoomInfo
 */
export function findRoom(input: string): RoomInfo | undefined {
  if (!input) return undefined;
  const cleaned = input.trim().replace(/^ม\./i, "").replace(/^m\./i, "").trim();

  // Try direct slug
  if (ROOM_BY_SLUG.has(cleaned)) {
    return ROOM_BY_SLUG.get(cleaned);
  }

  // Try room name format (e.g. "3/15")
  if (ROOM_BY_NAME.has(cleaned)) {
    return ROOM_BY_NAME.get(cleaned);
  }

  // Convert "3-15" to "3/15" or vice versa
  const normalizedSlash = cleaned.replace("-", "/");
  if (ROOM_BY_NAME.has(normalizedSlash)) {
    return ROOM_BY_NAME.get(normalizedSlash);
  }

  return undefined;
}

/**
 * Converts slug to display name (e.g. "3-15" -> "ม.3/15")
 */
export function slugToDisplayName(slug: string): string {
  const room = ROOM_BY_SLUG.get(slug);
  return room ? room.displayName : `ม.${slug.replace("-", "/")}`;
}

/**
 * Validates login credentials based on specification:
 * Username: Room number (e.g., "3/15", "1/1")
 * Password: Room number + "BJ3" (e.g., "3/15BJ3", "1/1BJ3")
 */
export function validateLogin(username: string, password: string): {
  success: boolean;
  room?: RoomInfo;
  error?: string;
} {
  const room = findRoom(username);
  if (!room) {
    return {
      success: false,
      error: `ไม่พบห้องเรียน "${username}" ในระบบ (รองรับ 77 ห้อง: ม.1/1 - ม.6/10)`,
    };
  }

  // Check password (e.g. "3/15BJ3" or "3-15BJ3", case-insensitive for BJ3)
  const normalizedInputPassword = password.trim().toUpperCase();
  const validPass1 = `${room.name}BJ3`.toUpperCase();
  const validPass2 = `${room.slug}BJ3`.toUpperCase();

  if (
    normalizedInputPassword === validPass1 ||
    normalizedInputPassword === validPass2
  ) {
    return {
      success: true,
      room,
    };
  }

  return {
    success: false,
    error: `รหัสผ่านไม่ถูกต้อง (ตัวอย่าง: "${room.name}BJ3")`,
  };
}
