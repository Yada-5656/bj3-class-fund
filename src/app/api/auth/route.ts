import { NextRequest, NextResponse } from "next/server";
import { validateLogin, findRoom } from "@/lib/rooms";
import { getRoomData } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, username, password, roomSlug, pin } = body;

    // 1. Room Login Action (Username: 3/15, Password: 3/15BJ3)
    if (action === "login") {
      if (!username || !password) {
        return NextResponse.json(
          { error: "กรุณากรอกห้องเรียนและรหัสผ่านให้ครบถ้วน" },
          { status: 400 }
        );
      }

      const result = validateLogin(username, password);
      if (result.isAdmin) {
        return NextResponse.json({
          success: true,
          isAdmin: true,
          redirectUrl: "/admin",
        });
      }

      if (!result.success || !result.room) {
        return NextResponse.json(
          { error: result.error || "เข้าสู่ระบบไม่สำเร็จ" },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        room: result.room,
        redirectUrl: `/${result.room.slug}`,
      });
    }

    // 2. Treasurer PIN Verification Action
    if (action === "verify-pin") {
      if (!roomSlug || !pin) {
        return NextResponse.json(
          { error: "กรุณากรอกรหัส PIN เหรัญญิก" },
          { status: 400 }
        );
      }

      const roomData = getRoomData(roomSlug);
      const expectedPin = roomData.settings.treasurerPin || "1234";

      if (pin.trim() === expectedPin) {
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { error: "รหัส PIN เหรัญญิกไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Auth API Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์" },
      { status: 500 }
    );
  }
}
