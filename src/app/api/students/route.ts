import { NextRequest, NextResponse } from "next/server";
import { getRoomData, Student, Transaction } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room");

  if (!room) {
    return NextResponse.json({ error: "Missing room parameter" }, { status: 400 });
  }

  const roomData = getRoomData(room);
  return NextResponse.json({
    students: roomData.students,
    settings: roomData.settings,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { room, studentUpdates, recordTransaction, feePerStudent, date } = body;

    if (!room || !Array.isArray(studentUpdates)) {
      return NextResponse.json(
        { error: "ข้อมูลนักเรียนไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const roomData = getRoomData(room);
    const updateMap = new Map<string, boolean>(
      studentUpdates.map((u: { id: string; isPaid: boolean }) => [u.id, u.isPaid])
    );

    let newlyPaidCount = 0;
    const today = date || new Date().toISOString().split("T")[0];

    roomData.students = roomData.students.map((student) => {
      if (updateMap.has(student.id)) {
        const nextStatus = updateMap.get(student.id)!;
        if (!student.isPaid && nextStatus) {
          newlyPaidCount++;
        }
        return {
          ...student,
          isPaid: nextStatus,
          paidDate: nextStatus ? (student.paidDate || today) : undefined,
        };
      }
      return student;
    });

    // Optionally auto-record class fund collection transaction if requested
    if (recordTransaction && newlyPaidCount > 0) {
      const fee = feePerStudent || roomData.settings.fundFeePerStudent || 20;
      const totalCollected = newlyPaidCount * fee;

      const tx: Transaction = {
        id: `tx-${room}-${Date.now()}`,
        roomId: room,
        type: "fund",
        category: "เงินห้อง",
        description: `บันทึกเก็บเงินห้อง (${newlyPaidCount} คน x ${fee} บาท)`,
        amount: totalCollected,
        date: today,
        createdAt: new Date().toISOString(),
      };
      roomData.transactions.unshift(tx);
    }

    return NextResponse.json({
      success: true,
      students: roomData.students,
      transactions: roomData.transactions,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update students" }, { status: 500 });
  }
}
