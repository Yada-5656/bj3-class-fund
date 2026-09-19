"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { slugToDisplayName } from "@/lib/rooms";
import {
  loadRoomFromClientStorage,
  saveRoomToClientStorage,
  syncRoomWithServer,
  Student,
  Transaction,
  RoomData,
} from "@/lib/db";
import { formatCurrency, getTodayISODate } from "@/lib/utils";
import StudentList from "@/components/StudentList";
import TransactionTable from "@/components/TransactionTable";
import { TransactionModal, ConfirmModal } from "@/components/Modals";
import ManualModal from "@/components/ManualModal";
import {
  ShieldCheck,
  Receipt,
  PlusCircle,
  Lock,
  ArrowLeft,
  ArrowRight,
  BookOpen,
} from "lucide-react";

export default function TreasurerDashboardPage({
  params: propsParams,
}: {
  params?: { room?: string };
}) {
  const router = useRouter();
  const routeParams = useParams();
  const roomSlug = (propsParams?.room || routeParams?.room || "3-15") as string;
  const displayName = slugToDisplayName(roomSlug);

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [activeTab, setActiveTab] = useState<"menu" | "checkin" | "transactions" | "settings">("menu");
  const [showManualModal, setShowManualModal] = useState(false);

  // Modals state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Settings form state
  const [newPin, setNewPin] = useState("");
  const [newFee, setNewFee] = useState("20");
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSuperAdmin(localStorage.getItem("bj3_admin_auth") === "true");

      const activeRoom = localStorage.getItem("bj3_active_room");
      if (!activeRoom || activeRoom !== roomSlug) {
        router.replace("/");
        return;
      }
      const data = loadRoomFromClientStorage(roomSlug);
      setRoomData(data);
      if (data.settings) {
        setNewPin("");
        setNewFee(String(data.settings.fundFeePerStudent || 20));
      }

      // Sync latest data from cloud
      syncRoomWithServer(roomSlug).then((synced) => {
        setRoomData(synced);
        if (synced.settings) {
          setNewFee(String(synced.settings.fundFeePerStudent || 20));
        }
      });
    }
  }, [roomSlug, router]);

  if (!roomData) {
    return (
      <div className="flex items-center justify-center py-20 text-xs text-[#7B708A]">
        กำลังโหลด...
      </div>
    );
  }

  // Handle student check-in save with custom selected date and per-date history
  const handleSaveStudents = async (
    updatedStudents: Student[],
    recordTransaction: boolean,
    selectedDate: string,
    paidStudentIds?: string[],
    allDailyCheckins?: Record<string, string[]>
  ) => {
    const mergedCheckins: Record<string, string[]> = {
      ...(roomData.dailyCheckins || {}),
      ...(allDailyCheckins || {}),
    };
    if (paidStudentIds) {
      mergedCheckins[selectedDate] = paidStudentIds;
    }

    const currentPaidList = paidStudentIds ?? (mergedCheckins[selectedDate] || []);
    const paidCount = currentPaidList.length;
    let feeToUse = roomData.settings.fundFeePerStudent || 20;

    let remainingTx = roomData.transactions;

    if (recordTransaction) {
      // Find existing transaction to infer the historical fee rate
      const existingTx = roomData.transactions.find(
        (t) => t.type === "fund" && t.date === selectedDate
      );
      
      if (existingTx && existingTx.amount) {
        // Try to infer fee from previous checkin count
        const oldPaidCount = (roomData.dailyCheckins?.[selectedDate] || []).length;
        if (oldPaidCount > 0) {
          const inferredFee = existingTx.amount / oldPaidCount;
          if (inferredFee > 0 && inferredFee % 1 === 0) {
            feeToUse = inferredFee;
          }
        }
      }

      // Filter out ANY existing fund transaction(s) for selectedDate
      remainingTx = roomData.transactions.filter(
        (t) => !(t.type === "fund" && t.date === selectedDate)
      );

      if (paidCount > 0) {
        const fundRecord: Transaction = {
          id: `tx-${roomSlug}-fund-${selectedDate}`,
          roomId: roomSlug,
          type: "fund",
          category: "เงินห้อง",
          description: `เก็บเงินห้อง (${paidCount} คน x ${feeToUse} บาท)`,
          amount: paidCount * feeToUse,
          date: selectedDate || getTodayISODate(),
          createdAt: new Date().toISOString(),
        };
        remainingTx.unshift(fundRecord);
      }
    }

    const updatedTx = remainingTx.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Keep students state synchronized for today so dashboard metrics reflect today's status
    const today = getTodayISODate();
    const todayPaidSet = new Set(mergedCheckins[today] || []);
    const synchronizedStudents = updatedStudents.map((s) => ({
      ...s,
      isPaid: todayPaidSet.has(s.id),
      paidDate: todayPaidSet.has(s.id) ? today : undefined,
    }));

    const nextData: RoomData = {
      ...roomData,
      settings: {
        ...roomData.settings,
        lastCheckinDate: selectedDate || getTodayISODate(),
      },
      students: synchronizedStudents,
      dailyCheckins: mergedCheckins,
      transactions: updatedTx,
    };

    setRoomData(nextData);
    saveRoomToClientStorage(roomSlug, nextData);
  };

  // Handle Add/Edit Transaction
  const handleSaveTransaction = (formData: {
    id?: string;
    type: "income" | "expense";
    category: string;
    description: string;
    amount: number;
    date: string;
  }) => {
    let updatedTx = [...roomData.transactions];

    if (formData.id) {
      updatedTx = updatedTx.map((t) =>
        t.id === formData.id
          ? {
              ...t,
              type: formData.type,
              category: formData.category,
              description: formData.description,
              amount: formData.amount,
              date: formData.date,
            }
          : t
      );
    } else {
      const newTx: Transaction = {
        id: `tx-${roomSlug}-${Date.now()}`,
        roomId: roomSlug,
        type: formData.type,
        category: formData.category,
        description: formData.description,
        amount: formData.amount,
        date: formData.date,
        createdAt: new Date().toISOString(),
      };
      updatedTx.unshift(newTx);
    }

    const nextData: RoomData = {
      ...roomData,
      transactions: updatedTx,
    };

    setRoomData(nextData);
    saveRoomToClientStorage(roomSlug, nextData);
    setEditingTransaction(null);
  };

  // Handle Delete Transaction
  const handleConfirmDelete = () => {
    if (!deleteId) return;

    const nextData: RoomData = {
      ...roomData,
      transactions: roomData.transactions.filter((t) => t.id !== deleteId),
    };

    setRoomData(nextData);
    saveRoomToClientStorage(roomSlug, nextData);
    setDeleteId(null);
  };

  // Handle Settings Save
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const feeNum = parseFloat(newFee) || 20;
    const pin = newPin.trim() || roomData.settings.treasurerPin || "1234";

    const nextData: RoomData = {
      ...roomData,
      settings: {
        ...roomData.settings,
        treasurerPin: pin,
        fundFeePerStudent: feeNum,
        isInitialized: true,
      },
    };

    setRoomData(nextData);
    saveRoomToClientStorage(roomSlug, nextData);
    setSettingsNotice("บันทึกการตั้งค่าเรียบร้อยแล้ว");
    setTimeout(() => setSettingsNotice(null), 3000);
  };

  // Lock and exit treasurer
  const handleLockSession = () => {
    sessionStorage.removeItem(`bj3_treasurer_auth_${roomSlug}`);
    router.push(`/${roomSlug}`);
  };

  // -------------------------------------------------------------
  // VIEW 1: Main Menu Portal (Clean Minimalist 2-Card Choice)
  // -------------------------------------------------------------
  if (activeTab === "menu") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn py-4">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${roomSlug}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7B708A] hover:text-[#332941] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>แดชบอร์ด</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9333EA] bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#E9D5FF] rounded-xl transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>คู่มือ</span>
            </button>
            <button
              onClick={handleLockSession}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7B708A] hover:text-[#E11D48] bg-white hover:bg-[#FFF1F2] border border-[#EFE8F6] rounded-xl shadow-xs transition-colors"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSuperAdmin ? "กลับไปหน้าห้อง" : "ออกจากระบบ"}</span>
            </button>
          </div>
        </div>

        {/* Header Title (Minimal - No explanation paragraphs) */}
        <div className="text-center space-y-2 py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#C084FC] to-[#A855F7] text-white shadow-pastel mb-1">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#332941] flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>ระบบเหรัญญิก ({displayName})</span>
            {isSuperAdmin && (
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] flex items-center gap-1 shadow-xs">
                <ShieldCheck className="w-3 h-3" />
                Super Admin
              </span>
            )}
          </h1>
        </div>

        {/* 2 Main Choice Cards (Clean & Minimalist) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Card 1: Check-in Page Button */}
          <div
            onClick={() => setActiveTab("checkin")}
            className="pastel-card p-6 sm:p-8 bg-white border-2 border-[#BBF7D0] hover:border-[#22C55E] hover:shadow-pastel cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] text-[#16A34A] border border-[#A7F3D0] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <CheckSquare className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-[#332941] group-hover:text-[#16A34A] transition-colors">
                เช็คชื่อจ่ายเงินห้อง
              </h2>
            </div>

            <div className="pt-6 mt-6 border-t border-[#EFE8F6] flex items-center justify-between text-sm font-bold text-[#16A34A]">
              <span>เข้าสู่หน้าเช็คชื่อ</span>
              <div className="w-8 h-8 rounded-xl bg-[#22C55E] text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-xs">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 2: Other Transactions Page Button */}
          <div
            onClick={() => setActiveTab("transactions")}
            className="pastel-card p-6 sm:p-8 bg-white border-2 border-[#E9D5FF] hover:border-[#C084FC] hover:shadow-pastel cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF] flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <Receipt className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-[#332941] group-hover:text-[#9333EA] transition-colors">
                รายการอื่นๆ (รายรับ - รายจ่าย)
              </h2>
            </div>

            <div className="pt-6 mt-6 border-t border-[#EFE8F6] flex items-center justify-between text-sm font-bold text-[#9333EA]">
              <span>เข้าสู่หน้ารายการอื่นๆ</span>
              <div className="w-8 h-8 rounded-xl bg-[#C084FC] text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-xs">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Settings Link */}
        <div className="pt-2 text-center">
          <button
            onClick={() => setActiveTab("settings")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#7B708A] hover:text-[#332941] bg-white border border-[#EFE8F6] shadow-xs hover:bg-[#F8F5FB] transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-[#C084FC]" />
            <span>ตั้งค่าห้องเรียน</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: Inside Specific Views (Check-in, Transactions, Settings)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Clean Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-[#EFE8F6]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab("menu")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#9333EA] bg-white hover:bg-[#FAF5FF] border border-[#E9D5FF] rounded-xl shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>เลือกเมนู</span>
          </button>

          <h1 className="text-lg sm:text-xl font-bold text-[#332941]">
            {activeTab === "checkin" && `เช็คชื่อจ่ายเงินห้อง (${displayName})`}
            {activeTab === "transactions" && `รายการอื่นๆ (${displayName})`}
            {activeTab === "settings" && `ตั้งค่าห้องเรียน (${displayName})`}
          </h1>
        </div>

        {/* Quick Switcher & Lock Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#EFE8F6] shadow-xs">
            <button
              onClick={() => setActiveTab("checkin")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "checkin"
                  ? "bg-[#22C55E] text-white shadow-xs"
                  : "text-[#7B708A] hover:text-[#332941]"
              }`}
            >
              เช็คชื่อ
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "transactions"
                  ? "bg-[#C084FC] text-white shadow-xs"
                  : "text-[#7B708A] hover:text-[#332941]"
              }`}
            >
              รายการอื่นๆ
            </button>
          </div>

          <button
            onClick={handleLockSession}
            className="p-1.5 text-[#7B708A] hover:text-[#E11D48] bg-white hover:bg-[#FFF1F2] border border-[#EFE8F6] rounded-xl shadow-xs transition-colors"
            title="ออกจากระบบ"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: Check-in Class Fund */}
      {activeTab === "checkin" && (
        <div className="space-y-4">
          <StudentList
            students={roomData.students}
            dailyCheckins={roomData.dailyCheckins}
            mode="treasurer-manage"
            feePerStudent={roomData.settings.fundFeePerStudent || 20}
            onSave={handleSaveStudents}
          />
        </div>
      )}

      {/* SUB-VIEW 2: Other Transactions (Minimal) */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-[#332941]">
              รายการอื่นๆ (รายรับ - รายจ่าย)
            </h3>

            <button
              onClick={() => {
                setEditingTransaction(null);
                setTxModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#C084FC] hover:bg-[#A855F7] shadow-pastel transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เพิ่มรายการ</span>
            </button>
          </div>

          <TransactionTable
            transactions={roomData.transactions}
            students={roomData.students}
            dailyCheckins={roomData.dailyCheckins}
            isTreasurer={true}
            onEdit={(tx) => {
              setEditingTransaction(tx);
              setTxModalOpen(true);
            }}
            onDelete={(id) => setDeleteId(id)}
            showFilters={true}
          />
        </div>
      )}

      {/* SUB-VIEW 3: Room Settings (Minimal) */}
      {activeTab === "settings" && (
        <div className="pastel-card p-6 max-w-md bg-white shadow-pastel mx-auto">
          <h3 className="text-base font-bold text-[#332941] mb-4">
            ตั้งค่าห้องเรียน ({displayName})
          </h3>

          {settingsNotice && (
            <div className="mb-4 p-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs text-[#065F46] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
              <span>{settingsNotice}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-[#7B708A] mb-1">
                <KeyRound className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>รหัส PIN เหรัญญิก</span>
              </label>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="กรอกรหัส PIN ใหม่ (4 หลัก)"
                className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 font-semibold text-[#7B708A] mb-1">
                <Coins className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>อัตราค่าห้องเรียน (บาท / คน)</span>
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="20"
                className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#C084FC] hover:bg-[#A855F7] shadow-pastel transition-colors"
            >
              บันทึก
            </button>
          </form>
        </div>
      )}

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => {
          setTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleSaveTransaction}
        initialData={editingTransaction}
        roomSlug={roomSlug}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="ยืนยันการลบ"
        message="ต้องการลบรายการนี้ใช่หรือไม่?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Manual Modal */}
      {showManualModal && (
        <ManualModal onClose={() => setShowManualModal(false)} />
      )}
    </div>
  );
}
