"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { findRoom, slugToDisplayName } from "@/lib/rooms";
import {
  loadRoomFromClientStorage,
  calculateSummary,
  RoomData,
} from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import StudentList from "@/components/StudentList";
import TransactionTable from "@/components/TransactionTable";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  School,
} from "lucide-react";

export default function RoomDashboardPage({
  params: propsParams,
}: {
  params?: { room?: string };
}) {
  const routeParams = useParams();
  const roomSlug = (propsParams?.room || routeParams?.room || "3-15") as string;
  const room = findRoom(roomSlug);
  const displayName = slugToDisplayName(roomSlug);

  const [roomData, setRoomData] = useState<RoomData | null>(null);

  // Load isolated room data with local storage fallback
  useEffect(() => {
    const data = loadRoomFromClientStorage(roomSlug);
    setRoomData(data);
  }, [roomSlug]);

  if (!roomData) {
    return (
      <div className="flex items-center justify-center py-20 text-xs text-[#7B708A]">
        กำลังโหลด...
      </div>
    );
  }

  const summary = calculateSummary(roomData);
  const feePerStudent = roomData.settings?.fundFeePerStudent || 20;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner (Minimalist) */}
      <div className="pastel-card p-5 sm:p-6 bg-white border border-[#E9D5FF] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF] flex items-center justify-center flex-shrink-0">
            <School className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#332941]">
              ห้อง {displayName}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${roomSlug}/history`}
            className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium bg-white text-[#7B708A] hover:text-[#332941] border border-[#EFE8F6] shadow-xs transition-all"
          >
            ประวัติ
          </Link>

          <Link
            href={`/${roomSlug}/treasurer`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#C084FC] hover:bg-[#A855F7] shadow-pastel transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>เหรัญญิก</span>
          </Link>
        </div>
      </div>

      {/* 3 Core Stat Cards (Minimalist) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Balance Card */}
        <div className="pastel-card p-5 bg-white border border-[#E9D5FF]/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7B708A]">
              ยอดคงเหลือ
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] text-[#C084FC] border border-[#E9D5FF] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#332941] tracking-tight">
              {formatCurrency(summary.totalBalance)}
            </div>
          </div>
        </div>

        {/* Total Income Card */}
        <div className="pastel-card p-5 bg-white border border-[#BBF7D0]/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7B708A]">
              รายรับรวม
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#059669] tracking-tight">
              +{formatCurrency(summary.totalIncome)}
            </div>
          </div>
        </div>

        {/* Total Expense Card */}
        <div className="pastel-card p-5 bg-white border border-[#FECDD3]/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7B708A]">
              รายจ่ายรวม
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#E11D48] tracking-tight">
              -{formatCurrency(summary.totalExpense)}
            </div>
          </div>
        </div>
      </div>

      {/* Class Fund Payment Status Progress Card (Minimalist) */}
      <div className="pastel-card p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-bold text-base text-[#332941]">
            การเก็บเงินห้อง ({summary.collectionRate}%)
          </h3>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-[#059669]">ชำระแล้ว {summary.paidCount}</span>
            <span className="text-[#E11D48]">ค้างชำระ {summary.unpaidCount}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#F1EDF7] h-3 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-[#50F2C8] to-[#10B981] transition-all duration-500"
            style={{ width: `${summary.collectionRate}%` }}
          />
          <div
            className="h-full bg-[#FF96A8] transition-all duration-500"
            style={{ width: `${100 - summary.collectionRate}%` }}
          />
        </div>
      </div>

      {/* Unpaid Students List (Minimalist) */}
      <StudentList
        students={roomData.students}
        mode="public-unpaid"
        feePerStudent={feePerStudent}
      />

      {/* Recent Transactions Section (Minimalist) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-[#332941]">
            รายการล่าสุด
          </h3>
          <Link
            href={`/${roomSlug}/history`}
            className="text-xs font-semibold text-[#9333EA] hover:text-[#7E22CE] flex items-center gap-1"
          >
            <span>ทั้งหมด</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <TransactionTable
          transactions={roomData.transactions}
          limit={5}
          showFilters={false}
        />
      </div>
    </div>
  );
}
