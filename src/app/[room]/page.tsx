"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { findRoom, slugToDisplayName } from "@/lib/rooms";
import {
  loadRoomFromClientStorage,
  syncRoomWithServer,
  calculateSummary,
  getPromotionDate,
  RoomData,
} from "@/lib/db";
import { formatCurrency, formatThaiDate, getTodayISODate } from "@/lib/utils";
import StudentList from "@/components/StudentList";
import TransactionTable from "@/components/TransactionTable";
import StatChart from "@/components/StatChart";
import { ConfirmModal } from "@/components/Modals";
import GraduationCountdownModal from "@/components/GraduationCountdownModal";
import ManualModal from "@/components/ManualModal";
import {
  ShieldCheck,
  School,
  BarChart3,
  LogOut,
  History,
  BookOpen,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Users,
} from "lucide-react";

export default function RoomDashboardPage({
  params: propsParams,
}: {
  params?: { room?: string };
}) {
  const router = useRouter();
  const routeParams = useParams();
  const roomSlug = (propsParams?.room || routeParams?.room || "3-15") as string;
  const room = findRoom(roomSlug);
  const displayName = slugToDisplayName(roomSlug);

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [promotionDate, setPromotionDate] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Default to "stats" as requested by user
  const [activeTab, setActiveTab] = useState<"stats" | "history">("stats");

  // Room Guard & load room data (Local + Cloud Sync + Live Polling)
  useEffect(() => {
    let isMounted = true;
    if (typeof window !== "undefined") {
      setIsSuperAdmin(localStorage.getItem("bj3_admin_auth") === "true");

      const activeRoom = localStorage.getItem("bj3_active_room");
      if (!activeRoom || activeRoom !== roomSlug) {
        router.replace("/");
        return;
      }

      // 1. Instant local load
      const localData = loadRoomFromClientStorage(roomSlug);
      setRoomData(localData);
      setPromotionDate(getPromotionDate());

      // 2. Cross-device cloud sync
      const fetchSync = () => {
        syncRoomWithServer(roomSlug).then((syncedData) => {
          if (isMounted) {
            setRoomData(syncedData);
          }
        });
      };

      fetchSync();

      // Poll periodically and on focus so other devices see balance and transactions live
      const interval = setInterval(fetchSync, 8000);
      window.addEventListener("focus", fetchSync);

      return () => {
        isMounted = false;
        clearInterval(interval);
        window.removeEventListener("focus", fetchSync);
      };
    }
  }, [roomSlug, router]);

  const handleConfirmLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bj3_active_room");
      sessionStorage.removeItem(`bj3_treasurer_auth_${roomSlug}`);
    }
    router.replace("/");
  };

  const handleExitRoom = () => {
    if (isSuperAdmin) {
      router.push("/admin");
    } else {
      setShowLogoutModal(true);
    }
  };

  if (!roomData) {
    return (
      <div className="flex items-center justify-center py-20 text-xs text-[#7B708A]">
        กำลังโหลด...
      </div>
    );
  }

  const summary = calculateSummary(roomData);
  const feePerStudent = roomData.settings?.fundFeePerStudent || 20;
  const today = getTodayISODate();
  const hasRecordedToday = !!(roomData.dailyCheckins && roomData.dailyCheckins[today] !== undefined);

  return (
    <div className="space-y-5 animate-fadeIn max-w-4xl mx-auto">
      {/* Top Banner (Minimalist) */}
      <div className="pastel-card p-4 sm:p-5 bg-white border border-[#E9D5FF] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF] flex items-center justify-center flex-shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#332941] flex items-center gap-2">
              ห้อง {displayName}
              {isSuperAdmin && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] flex items-center gap-1 shadow-xs">
                  <ShieldCheck className="w-3 h-3" />
                  Super Admin
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl text-[#9333EA] bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#E9D5FF] transition-all"
            title="คู่มือการใช้งาน"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline sm:ml-1.5 text-xs font-semibold">คู่มือ</span>
          </button>
          <button
            type="button"
            onClick={handleExitRoom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#7B708A] hover:text-[#E11D48] bg-white hover:bg-[#FFF1F2] border border-[#EFE8F6] shadow-xs transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{isSuperAdmin ? "กลับหน้าแอดมิน" : "ออกจากระบบ"}</span>
            <span className="sm:hidden">{isSuperAdmin ? "กลับ" : "ออก"}</span>
          </button>
          <Link
            href={`/${roomSlug}/treasurer`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#C084FC] hover:bg-[#A855F7] shadow-pastel transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>เหรัญญิก</span>
          </Link>
        </div>
      </div>

      {/* 1. Top Card: ยอดเงินคงเหลือ (Prominent Large Card as in User Sketch) */}
      <div className="pastel-card p-6 sm:p-8 bg-white border border-[#E9D5FF] text-center shadow-xs">
        <div className="inline-flex items-center justify-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-[#FAF5FF] text-[#C084FC] border border-[#E9D5FF] flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-[#7B708A]">
            ยอดเงินคงเหลือ
          </span>
        </div>
        <div className="text-3xl sm:text-5xl font-extrabold text-[#332941] tracking-tight">
          {formatCurrency(summary.totalBalance)}
        </div>
      </div>

      {/* 2. Side-by-Side Cards: รายรับรวม & รายจ่ายรวม (2 Columns as in Sketch) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Total Income */}
        <div className="pastel-card p-4 sm:p-5 bg-white border border-[#BBF7D0]/80">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-[#7B708A]">
              รายรับรวม
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-3xl font-extrabold text-[#059669] tracking-tight">
            +{formatCurrency(summary.totalIncome)}
          </div>
        </div>

        {/* Total Expense */}
        <div className="pastel-card p-4 sm:p-5 bg-white border border-[#FECDD3]/80">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-semibold text-[#7B708A]">
              รายจ่ายรวม
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-3xl font-extrabold text-[#E11D48] tracking-tight">
            -{formatCurrency(summary.totalExpense)}
          </div>
        </div>
      </div>

      {/* 3. Class Fund Progress Bar: การเก็บเงินห้อง (เหมือนเดิม) */}
      <div className="pastel-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-bold text-xs sm:text-sm text-[#332941]">
            การเก็บเงินห้อง ({summary.collectionRate}%)
          </h3>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="text-[#059669]">ชำระแล้ว {summary.paidCount}</span>
            <span className="text-[#E11D48]">ค้าง {summary.unpaidCount}</span>
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

      {/* 4. Protruding Folder Tabs (ยื่นออกมาแล้วยืดสูงขึ้นเวลากดเปลี่ยนหน้า) */}
      <div className="relative pt-3">
        {/* Protruding Tabs Row */}
        <div className="flex items-end gap-2 px-2 sm:px-4">
          {/* Tab 1: สถิติ (Default Active Tab) */}
          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={`relative flex items-center gap-2 rounded-t-2xl font-bold transition-all duration-300 select-none ${
              activeTab === "stats"
                ? "bg-white text-[#9333EA] border-t-2 border-x-2 border-[#E9D5FF] pt-3.5 pb-2.5 sm:pt-4 sm:pb-3 px-5 sm:px-8 text-sm sm:text-base z-10 -mb-[2px] shadow-xs"
                : "bg-[#F3E8FF]/70 hover:bg-[#F3E8FF] text-[#7B708A] hover:text-[#332941] pt-2 pb-2 px-4 sm:px-6 text-xs sm:text-sm z-0"
            }`}
          >
            <BarChart3
              className={
                activeTab === "stats"
                  ? "w-4 h-4 sm:w-5 sm:h-5 text-[#9333EA]"
                  : "w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7B708A]"
              }
            />
            <span>สถิติ</span>
            {activeTab === "stats" && (
              <span className="w-2 h-2 rounded-full bg-[#9333EA]" />
            )}
          </button>

          {/* Tab 2: ประวัติ */}
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`relative flex items-center gap-2 rounded-t-2xl font-bold transition-all duration-300 select-none ${
              activeTab === "history"
                ? "bg-white text-[#9333EA] border-t-2 border-x-2 border-[#E9D5FF] pt-3.5 pb-2.5 sm:pt-4 sm:pb-3 px-5 sm:px-8 text-sm sm:text-base z-10 -mb-[2px] shadow-xs"
                : "bg-[#F3E8FF]/70 hover:bg-[#F3E8FF] text-[#7B708A] hover:text-[#332941] pt-2 pb-2 px-4 sm:px-6 text-xs sm:text-sm z-0"
            }`}
          >
            <History
              className={
                activeTab === "history"
                  ? "w-4 h-4 sm:w-5 sm:h-5 text-[#9333EA]"
                  : "w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#7B708A]"
              }
            />
            <span>ประวัติ</span>
            {activeTab === "history" && (
              <span className="w-2 h-2 rounded-full bg-[#9333EA]" />
            )}
          </button>
        </div>

        {/* Tab Content Box: Seamlessly connected with the active tab */}
        <div className="pastel-card p-4 sm:p-6 bg-white border-2 border-[#E9D5FF] rounded-b-2xl rounded-tr-2xl relative z-0">
          {activeTab === "stats" ? (
            /* Tab Content: สถิติ (Interactive Curve Chart with Week/Month/Term) */
            <StatChart transactions={roomData.transactions} />
          ) : (
            /* Tab Content: ประวัติ (Transaction History Table & Unpaid Roster) */
            <div className="space-y-6">
              {/* Today's Unpaid Students Section */}
              <div>
                {!hasRecordedToday ? (
                  <div className="pastel-card p-4 sm:p-5 bg-white border border-[#E9D5FF] rounded-2xl flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF] flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-[#7B708A] font-medium">สถานะเงินห้องประจำวัน</div>
                      <div className="text-xs sm:text-sm font-bold text-[#332941]">
                        ไม่มีข้อมูลบันทึกเงินห้องสำหรับวันที่: {formatThaiDate(today)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#7B708A] flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#C084FC]" />
                        <span>รายชื่อนักเรียนค้างชำระวันนี้ ({summary.unpaidCount} คน)</span>
                      </span>
                    </div>
                    <StudentList
                      students={roomData.students}
                      dailyCheckins={roomData.dailyCheckins}
                      mode="public-unpaid"
                      feePerStudent={feePerStudent}
                    />
                  </div>
                )}
              </div>

              {/* Transaction History Table */}
              <div className="pt-2 border-t border-[#F1EDF7]">
                <TransactionTable
                  transactions={roomData.transactions}
                  students={roomData.students}
                  dailyCheckins={roomData.dailyCheckins}
                  showFilters={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        title="ยืนยันการออกจากระบบ"
        message={`คุณต้องการออกจากระบบห้อง ${displayName} ใช่หรือไม่? หากออกจากระบบจะต้องกรอกรหัสผ่านเพื่อเข้าใช้งานใหม่อีกครั้ง`}
        confirmText="ออกจากระบบ"
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      {/* Graduation Countdown Notice for M.3 and M.6 */}
      <GraduationCountdownModal
        grade={room ? room.grade : parseInt(roomSlug.split("-")[0]) || 0}
        displayName={displayName}
        promotionDate={promotionDate}
      />

      {/* Manual Modal */}
      {showManualModal && (
        <ManualModal onClose={() => setShowManualModal(false)} />
      )}
    </div>
  );
}
