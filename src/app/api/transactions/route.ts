import { NextRequest, NextResponse } from "next/server";
import { getRoomData, Transaction } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const room = searchParams.get("room");

  if (!room) {
    return NextResponse.json({ error: "Missing room parameter" }, { status: 400 });
  }

  const roomData = getRoomData(room);
  return NextResponse.json({ transactions: roomData.transactions });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { room, type, category, description, amount, date } = body;

    if (!room || !type || !category || !description || amount === undefined || !date) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลรายการให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const roomData = getRoomData(room);
    const newTransaction: Transaction = {
      id: `tx-${room}-${Date.now()}`,
      roomId: room,
      type,
      category,
      description,
      amount: Number(amount),
      date, // ISO YYYY-MM-DD
      createdAt: new Date().toISOString(),
    };

    roomData.transactions.unshift(newTransaction);

    return NextResponse.json({
      success: true,
      transaction: newTransaction,
      transactions: roomData.transactions,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { room, id, type, category, description, amount, date } = body;

    if (!room || !id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const roomData = getRoomData(room);
    const index = roomData.transactions.findIndex((t) => t.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    roomData.transactions[index] = {
      ...roomData.transactions[index],
      type: type ?? roomData.transactions[index].type,
      category: category ?? roomData.transactions[index].category,
      description: description ?? roomData.transactions[index].description,
      amount: amount !== undefined ? Number(amount) : roomData.transactions[index].amount,
      date: date ?? roomData.transactions[index].date,
    };

    return NextResponse.json({
      success: true,
      transaction: roomData.transactions[index],
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const room = searchParams.get("room");
    const id = searchParams.get("id");

    if (!room || !id) {
      return NextResponse.json({ error: "Missing room or id" }, { status: 400 });
    }

    const roomData = getRoomData(room);
    roomData.transactions = roomData.transactions.filter((t) => t.id !== id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
