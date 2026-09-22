"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { findRoom, slugToDisplayName } from "@/lib/rooms";
import { loadRoomFromClientStorage, RoomData } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import TransactionTable from "@/components/TransactionTable";
import {
  ArrowLeft,
  History,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

export default function RoomHistoryPage({
  params: propsParams,
}: {
  params?: { room?: string };
}) {
  const routeParams = useParams();
  const roomSlug = (propsParams?.room || routeParams?.room || "3-15") as string;
  const displayName = slugToDisplayName(roomSlug);

  const [roomData, setRoomData] = useState<RoomData | null>(null);

  useEffect(() => {
    const data = loadRoomFromClientStorage(roomSlug);
    setRoomData(data);
  }, [roomSlug]);

  if (!roomData) {
    return (
      <div className="flex items-center justify-center py-20 text-xs text-[#9C8599]">
        กำลังโหลด...
      </div>
    );
  }

  const transactions = roomData.transactions;
  const totalIncome = transactions
    .filter((t) => t.type === "income" || t.type === "fund")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header (Minimalist) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/${roomSlug}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#9C8599] hover:text-[#5C435A] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>แดชบอร์ด</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-[#5C435A] flex items-center gap-2">
            <History className="w-6 h-6 text-[#EB9AB2]" />
            <span>ประวัติเงินห้อง ({displayName})</span>
          </h1>
        </div>

        <Link
          href={`/${roomSlug}/treasurer`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#EB9AB2] hover:bg-[#D9849D] shadow-pastel transition-all self-start sm:self-auto"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>เหรัญญิก</span>
        </Link>
      </div>

      {/* Summary Mini Bar (Minimalist) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="pastel-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#9C8599]">ทั้งหมด</span>
            <div className="text-base font-bold text-[#5C435A]">
              {transactions.length} รายการ
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#FFF5F8] text-[#EB9AB2] flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
        </div>

        <div className="pastel-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#9C8599]">รายรับรวม</span>
            <div className="text-base font-bold text-[#76BFA0]">
              +{formatCurrency(totalIncome)}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#76BFA0] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="pastel-card p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#9C8599]">รายจ่ายรวม</span>
            <div className="text-base font-bold text-[#FF8DA1]">
              -{formatCurrency(totalExpense)}
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#FFF1F2] text-[#FF8DA1] flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Full Filterable Table */}
      <TransactionTable
        transactions={transactions}
        isTreasurer={false}
        showFilters={true}
      />
    </div>
  );
}
