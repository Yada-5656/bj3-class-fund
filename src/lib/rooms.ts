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
 * Normalizes user input room name (e.g. "3/15", "3-15", "ม.3/15", "m.3/15", "6/11", "1/1/1") into RoomInfo
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

  // Dynamic parser for any grade/room or generation (e.g. 6/11, 1/1/1, 4/1/1)
  const match = cleaned.match(/^([1-6])[\/\-]([0-9]{1,2})(?:[\/\-]([0-9]+))?$/);
  if (match) {
    const grade = parseInt(match[1]);
    const roomNumber = parseInt(match[2]);
    const gen = match[3];
    const name = gen ? `${grade}/${roomNumber}/${gen}` : `${grade}/${roomNumber}`;
    const slug = gen ? `${grade}-${roomNumber}-${gen}` : `${grade}-${roomNumber}`;
    return {
      slug,
      name,
      displayName: `ม.${name}`,
      grade,
      roomNumber,
      expectedPassword: `${name}BJ3`,
    };
  }

  return undefined;
}

/**
 * Converts slug to display name (e.g. "3-15" -> "ม.3/15")
 */
export function slugToDisplayName(slug: string): string {
  const room = findRoom(slug);
  return room ? room.displayName : `ม.${slug.replace("-", "/")}`;
}

/**
 * Validates login credentials based on specification:
 * Username: "admin" -> Password "1706"
 * Username: Room number (e.g., "3/15", "1/1")
 * Password: Room number + "BJ3" (e.g., "3/15BJ3", "1/1BJ3") or custom saved room password
 */
export function validateLogin(username: string, password: string): {
  success: boolean;
  isAdmin?: boolean;
  room?: RoomInfo;
  error?: string;
} {
  const trimmedUser = username.trim().toLowerCase();
  const trimmedPass = password.trim();

  // Admin login check:ห้อง admin รหัส 1706
  if (trimmedUser === "admin" && trimmedPass === "1706") {
    return {
      success: true,
      isAdmin: true,
    };
  }

  const room = findRoom(username);
  if (!room) {
    return {
      success: false,
      error: `ไม่พบห้องเรียน "${username}" ในระบบ โปรดตรวจสอบชื่อห้องเรียนอีกครั้ง`,
    };
  }

  // Check password (e.g. "3/15BJ3" or "3-15BJ3", case-insensitive for BJ3)
  const normalizedInputPassword = password.trim().toUpperCase();
  const validPass1 = `${room.name}BJ3`.toUpperCase();
  const validPass2 = `${room.slug}BJ3`.toUpperCase();

  // Also support base room password if generation suffix is omitted or vice versa
  const baseName = `${room.grade}/${room.roomNumber}`;
  const validPassBase = `${baseName}BJ3`.toUpperCase();

  // Check custom saved password in localStorage
  let savedPassword: string | null = null;
  if (typeof window !== "undefined") {
    savedPassword = localStorage.getItem(`bj3_room_pwd_${room.slug}`);
  }

  if (
    normalizedInputPassword === validPass1 ||
    normalizedInputPassword === validPass2 ||
    normalizedInputPassword === validPassBase ||
    (savedPassword && normalizedInputPassword === savedPassword.toUpperCase())
  ) {
    return {
      success: true,
      room,
    };
  }

  return {
    success: false,
    error: "รหัสผ่านประจำห้องไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง",
  };
}
