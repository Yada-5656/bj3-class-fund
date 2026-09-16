import { NextRequest, NextResponse } from "next/server";
import {
  fetchCloudState,
  getCloudRoom,
  initializeCloudRoom,
  syncRoomToCloud,
  saveCloudState,
} from "@/lib/cloudDb";
import { RoomSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomSlug = searchParams.get("room");

    if (roomSlug) {
      const roomData = await getCloudRoom(roomSlug);
      const state = await fetchCloudState();
      return NextResponse.json({
        success: true,
        roomSlug,
        settings: roomData?.settings || {
          treasurerPin: "1234",
          fundFeePerStudent: 20,
          isInitialized: false,
        },
        dailyCheckins: roomData?.dailyCheckins || {},
        transactions: roomData?.transactions || [],
        promotionDate: state.promotionDate || null,
      });
    }

    // Return all rooms state (e.g. for Admin or Global Sync)
    const state = await fetchCloudState();
    return NextResponse.json({
      success: true,
      state,
    });
  } catch (error) {
    console.error("GET /api/sync error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sync state" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, roomSlug, feePerStudent, treasurerPin, settings, dailyCheckins, transactions, promotionDate } = body;

    // 1. Initialize Room (First-time setup by first visitor)
    if (action === "initialize") {
      if (!roomSlug || feePerStudent === undefined || !treasurerPin) {
        return NextResponse.json(
          { error: "Missing required fields for initialization" },
          { status: 400 }
        );
      }

      // Check if room is already initialized in cloud
      const existing = await getCloudRoom(roomSlug);
      if (existing?.settings?.isInitialized) {
        return NextResponse.json({
          success: true,
          alreadyInitialized: true,
          settings: existing.settings,
          message: "ห้องนี้ถูกตั้งค่าไปแล้วโดยเหรัญญิก",
        });
      }

      const newSettings = await initializeCloudRoom(
        roomSlug,
        Number(feePerStudent),
        String(treasurerPin)
      );

      return NextResponse.json({
        success: true,
        settings: newSettings,
      });
    }

    // 2. Full Room Sync (check-ins, transactions, settings)
    if (action === "sync_room") {
      if (!roomSlug) {
        return NextResponse.json(
          { error: "Missing roomSlug" },
          { status: 400 }
        );
      }

      await syncRoomToCloud(
        roomSlug,
        settings as RoomSettings,
        dailyCheckins || {},
        transactions || []
      );

      return NextResponse.json({ success: true });
    }

    // 3. Update Promotion Date
    if (action === "update_promotion_date") {
      await saveCloudState((prev) => ({
        ...prev,
        promotionDate: promotionDate || null,
      }));
      return NextResponse.json({ success: true, promotionDate });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/sync error:", error);
    return NextResponse.json(
      { error: "Failed to process sync action" },
      { status: 500 }
    );
  }
}
