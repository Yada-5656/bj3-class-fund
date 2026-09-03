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
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import StudentList from "@/components/StudentList";
import TransactionTable from "@/components/TransactionTable";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  School,
  Sparkles,
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
        กำลังโหลดข้อมูลห้องเรียน {displayName}...
      </div>
    );
  }

  const summary = calculateSummary(roomData);
  const feePerStudent = roomData.settings?.fundFeePerStudent || 20;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="pastel-card p-6 bg-gradient-to-r from-white via-[#FAF5FF] to-[#F3E8FF] border border-[#E9D5FF] relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#C084FC]/15 text-[#9333EA] mb-2">
              <School className="w-3.5 h-3.5" />
              <span>ห้องเรียน {displayName} • BJ3</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#332941]">
              แดชบอร์ดสรุปยอดเงินห้อง {displayName}
            </h1>
            <p className="text-xs sm:text-sm text-[#7B708A] mt-1">
              ระบบแสดงสถานะการเงินและเช็คชื่อค่าห้องเรียนแบบเรียลไทม์
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/${roomSlug}/history`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium bg-white text-[#7B708A] hover:text-[#332941] border border-[#EFE8F6] shadow-xs transition-all"
            >
              <span>ดูประวัติทั้งหมด</span>
              <ChevronRight className="w-4 h-4" />
            </Link>

            <Link
              href={`/${roomSlug}/treasurer`}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#C084FC] hover:bg-[#A855F7] shadow-pastel transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>เข้าสู่ระบบเหรัญญิก</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Core Stat Cards (Pastel Tone Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Balance Card (Primary Purple #C084FC) */}
        <div className="pastel-card p-5 bg-gradient-to-br from-white to-[#FAF5FF] border border-[#E9D5FF]/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7B708A]">
              ยอดเงินคงเหลือทั้งหมด
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#FAF5FF] text-[#C084FC] border border-[#E9D5FF] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#332941] tracking-tight">
              {formatCurrency(summary.totalBalance)}
            </div>
            <div className="flex items-center gap-1 text-xs text-[#9333EA] mt-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>เงินกองกลางพร้อมใช้</span>
            </div>
          </div>
        </div>

        {/* Total Income Card (Success Mint #50F2C8) */}
        <div className="pastel-card p-5 bg-gradient-to-br from-white to-[#F0FDF4] border border-[#BBF7D0]/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7B708A]">
              ยอดรายรับรวมทั้งหมด
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#059669] tracking-tight">
              +{formatCurrency(summary.totalIncome)}
            </div>
            <div className="text-xs text-[#059669] mt-1 font-medium">
              รวมค่าห้องและเงินสนับสนุน
            </div>
          </div>
        </div>

        {/* Total Expense Card (Danger Coral #FF96A8) */}
        <div className="pastel-card p-5 bg-gradient-to-br from-white to-[#FFF1F2] border border-[#FECDD3]/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#7B708A]">
              ยอดรายจ่ายรวมทั้งหมด
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-[#E11D48] tracking-tight">
              -{formatCurrency(summary.totalExpense)}
            </div>
            <div className="text-xs text-[#E11D48] mt-1 font-medium">
              ค่าอุปกรณ์และกิจกรรมห้อง
            </div>
          </div>
        </div>
      </div>

      {/* Class Fund Payment Status Progress Card */}
      <div className="pastel-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-base text-[#332941]">
              สรุปความคืบหน้าการเก็บเงินห้อง ({displayName})
            </h3>
            <p className="text-xs text-[#7B708A]">
              อัตราค่าห้อง: {formatCurrency(feePerStudent)} / นักเรียน 1 คน
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-[#059669]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#50F2C8]" />
              <span>ชำระแล้ว {summary.paidCount} คน</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#E11D48]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF96A8]" />
              <span>ค้างชำระ {summary.unpaidCount} คน</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#F1EDF7] h-3.5 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-[#50F2C8] to-[#10B981] transition-all duration-500"
            style={{ width: `${summary.collectionRate}%` }}
          />
          <div
            className="h-full bg-[#FF96A8] transition-all duration-500"
            style={{ width: `${100 - summary.collectionRate}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-[#7B708A] mt-2 font-medium">
          <span>ความคืบหน้าการเก็บเงิน {summary.collectionRate}%</span>
          <span>นักเรียนทั้งหมด {summary.totalStudents} คน</span>
        </div>
      </div>

      {/* Crucial Requirement: Unpaid Students List */}
      <StudentList
        students={roomData.students}
        mode="public-unpaid"
        feePerStudent={feePerStudent}
      />

      {/* Recent Transactions Section (DD/MM/YYYY Buddhist Era, NO TIME) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-[#332941]">
              รายการเคลื่อนไหวล่าสุด (5 รายการ)
            </h3>
            <p className="text-xs text-[#7B708A]">
              แสดงวันที่ตามปี พ.ศ. (ไม่มีเวลา)
            </p>
          </div>
          <Link
            href={`/${roomSlug}/history`}
            className="text-xs font-semibold text-[#9333EA] hover:text-[#7E22CE] flex items-center gap-1"
          >
            <span>ดูรายการทั้งหมด</span>
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
