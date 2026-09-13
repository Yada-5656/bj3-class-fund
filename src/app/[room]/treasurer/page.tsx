"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { findRoom, slugToDisplayName } from "@/lib/rooms";
import {
  loadRoomFromClientStorage,
  saveRoomToClientStorage,
  RoomData,
  Student,
  Transaction,
} from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import StudentList from "@/components/StudentList";
import TransactionTable from "@/components/TransactionTable";
import { TransactionModal, ConfirmModal } from "@/components/Modals";
import {
  ShieldCheck,
  CheckSquare,
  Receipt,
  Settings,
  PlusCircle,
  Lock,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Coins,
  ChevronRight,
  ArrowRight,
  LayoutGrid,
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
  // Default to "menu" so the user is greeted with 2 main choice buttons first!
  const [activeTab, setActiveTab] = useState<"menu" | "checkin" | "transactions" | "settings">("menu");

  // Modals state
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Settings form state
  const [newPin, setNewPin] = useState("");
  const [newFee, setNewFee] = useState("20");
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  useEffect(() => {
    const data = loadRoomFromClientStorage(roomSlug);
    setRoomData(data);
    if (data.settings) {
      setNewPin(data.settings.treasurerPin || "1234");
      setNewFee(String(data.settings.fundFeePerStudent || 20));
    }
  }, [roomSlug]);

  if (!roomData) {
    return (
      <div className="flex items-center justify-center py-20 text-xs text-[#7B708A]">
        กำลังโหลดระบบเหรัญญิก {displayName}...
      </div>
    );
  }

  // Handle student check-in save with custom selected date
  const handleSaveStudents = async (
    updatedStudents: Student[],
    recordTransaction: boolean,
    selectedDate: string
  ) => {
    let updatedTx = [...roomData.transactions];

    if (recordTransaction) {
      const prevPaidMap = new Map(roomData.students.map((s) => [s.id, s.isPaid]));
      const newlyPaidCount = updatedStudents.filter(
        (s) => s.isPaid && !prevPaidMap.get(s.id)
      ).length;

      if (newlyPaidCount > 0) {
        const fee = roomData.settings.fundFeePerStudent || 20;
        const total = newlyPaidCount * fee;
        const newRecord: Transaction = {
          id: `tx-${roomSlug}-${Date.now()}`,
          roomId: roomSlug,
          type: "fund",
          category: "เงินห้อง",
          description: `บันทึกเก็บเงินห้อง (${newlyPaidCount} คน x ${fee} บาท)`,
          amount: total,
          date: selectedDate || new Date().toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
        };
        updatedTx.unshift(newRecord);
      }
    }

    const nextData: RoomData = {
      ...roomData,
      students: updatedStudents,
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
    const pin = newPin.trim() || "1234";

    const nextData: RoomData = {
      ...roomData,
      settings: {
        treasurerPin: pin,
        fundFeePerStudent: feeNum,
      },
    };

    setRoomData(nextData);
    saveRoomToClientStorage(roomSlug, nextData);
    setSettingsNotice("บันทึกการตั้งค่าเรียบร้อยแล้ว!");
    setTimeout(() => setSettingsNotice(null), 3000);
  };

  // Lock and exit treasurer
  const handleLockSession = () => {
    sessionStorage.removeItem(`bj3_treasurer_auth_${roomSlug}`);
    router.push(`/${roomSlug}`);
  };

  // -------------------------------------------------------------
  // VIEW 1: Main Menu Portal (2 Big Choice Buttons before entering)
  // -------------------------------------------------------------
  if (activeTab === "menu") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn py-4">
        {/* Top Breadcrumb & Lock Button */}
        <div className="flex items-center justify-between">
          <Link
            href={`/${roomSlug}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#7B708A] hover:text-[#332941] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับสู่หน้าแดชบอร์ด</span>
          </Link>

          <button
            onClick={handleLockSession}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#7B708A] hover:text-[#E11D48] bg-white hover:bg-[#FFF1F2] border border-[#EFE8F6] rounded-xl shadow-xs transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>ออกจากระบบเหรัญญิก</span>
          </button>
        </div>

        {/* Header Title */}
        <div className="text-center space-y-2 py-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#C084FC] to-[#A855F7] text-white shadow-pastel mb-1">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#332941]">
            ระบบจัดการเงินห้อง (เหรัญญิก {displayName})
          </h1>
          <p className="text-sm text-[#7B708A]">
            กรุณาเลือกหน้าที่ต้องการเข้าใช้งาน
          </p>
        </div>

        {/* 2 Main Choice Cards (Crucial Requirement) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Card 1: Check-in Page Button */}
          <div
            onClick={() => setActiveTab("checkin")}
            className="pastel-card p-6 sm:p-8 bg-gradient-to-br from-white via-[#F0FDF4]/30 to-[#DCFCE7]/40 border-2 border-[#BBF7D0] hover:border-[#22C55E] hover:shadow-pastel cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] text-[#16A34A] border border-[#A7F3D0] flex items-center justify-center group-hover:scale-105 transition-transform">
                <CheckSquare className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#332941] group-hover:text-[#16A34A] transition-colors">
                  หน้าเช็คชื่อจ่ายเงินห้อง
                </h2>
                <p className="text-xs sm:text-sm text-[#7B708A] mt-2 leading-relaxed">
                  เช็คชื่อนักเรียนที่ชำระค่าห้องเรียนประจำวัน/สัปดาห์ มีระบบเปลี่ยนวันที่เช็คชื่อ และแสดงรายชื่อเรียงเป็นแนวตั้งดูง่าย
                </p>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-[#EFE8F6] flex items-center justify-between text-sm font-bold text-[#16A34A]">
              <span>เข้าสู่หน้าเช็คชื่อ</span>
              <div className="w-8 h-8 rounded-xl bg-[#22C55E] text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-xs">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Card 2: Other Transactions Page Button */}
          <div
            onClick={() => setActiveTab("transactions")}
            className="pastel-card p-6 sm:p-8 bg-gradient-to-br from-white via-[#FAF5FF]/50 to-[#F3E8FF]/60 border-2 border-[#E9D5FF] hover:border-[#C084FC] hover:shadow-pastel cursor-pointer transition-all group flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Receipt className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#332941] group-hover:text-[#9333EA] transition-colors">
                  หน้ารายการอื่นๆ (รายรับ - รายจ่าย)
                </h2>
                <p className="text-xs sm:text-sm text-[#7B708A] mt-2 leading-relaxed">
                  บันทึกรายการรายรับและรายจ่ายอื่นๆ ของห้องเรียน เช่น ซื้ออุปกรณ์ทำความสะอาด, ค่าพิมพ์เอกสารชีทเรียน, เงินสนับสนุน
                </p>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-[#EFE8F6] flex items-center justify-between text-sm font-bold text-[#9333EA]">
              <span>เข้าสู่หน้ารายการอื่นๆ</span>
              <div className="w-8 h-8 rounded-xl bg-[#C084FC] text-white flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-xs">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Option: Room Settings */}
        <div className="pt-4 text-center">
          <button
            onClick={() => setActiveTab("settings")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#7B708A] hover:text-[#332941] bg-white border border-[#EFE8F6] shadow-xs hover:bg-[#F8F5FB] transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-[#C084FC]" />
            <span>การตั้งค่าห้องเรียน (เปลี่ยน PIN / อัตราค่าห้อง)</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: Inside Specific Management Views (Check-in, Transactions, Settings)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header with Back to Menu Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {/* Crucial: Back to 2-Button Choice Menu */}
            <button
              onClick={() => setActiveTab("menu")}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#9333EA] bg-[#FAF5FF] hover:bg-[#F3E8FF] border border-[#E9D5FF] rounded-xl transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับหน้าเลือกเมนู</span>
            </button>

            <Link
              href={`/${roomSlug}`}
              className="text-xs text-[#7B708A] hover:text-[#332941] transition-colors"
            >
              หน้าแดชบอร์ด
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#332941]">
              {activeTab === "checkin" && `หน้าเช็คชื่อจ่ายเงินห้อง (${displayName})`}
              {activeTab === "transactions" && `หน้ารายการอื่นๆ รายรับ - รายจ่าย (${displayName})`}
              {activeTab === "settings" && `ตั้งค่าห้องเรียน (${displayName})`}
            </h1>
          </div>
        </div>

        {/* Quick Tab Switcher & Lock Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#EFE8F6] shadow-xs">
            <button
              onClick={() => setActiveTab("checkin")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === "checkin"
                  ? "bg-[#22C55E] text-white shadow-xs"
                  : "text-[#7B708A] hover:text-[#332941]"
              }`}
            >
              เช็คชื่อค่าห้อง
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
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
            className="p-2 text-[#7B708A] hover:text-[#E11D48] bg-white hover:bg-[#FFF1F2] border border-[#EFE8F6] rounded-xl shadow-xs transition-colors"
            title="ออกจากระบบเหรัญญิก"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SUB-VIEW 1: Check-in Class Fund (Date Picker + Vertical Column List) */}
      {activeTab === "checkin" && (
        <div className="space-y-4">
          <StudentList
            students={roomData.students}
            mode="treasurer-manage"
            feePerStudent={roomData.settings.fundFeePerStudent || 20}
            onSave={handleSaveStudents}
          />
        </div>
      )}

      {/* SUB-VIEW 2: Other Transactions (Income / Expense Records) */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#332941]">
                หน้ารายการอื่นๆ (รายรับ - รายจ่าย)
              </h3>
              <p className="text-xs text-[#7B708A]">
                เพิ่ม ลบ หรือแก้ไขรายการเงินห้อง (เช่น ซื้ออุปกรณ์, ค่าเอกสารชีท)
              </p>
            </div>

            <button
              onClick={() => {
                setEditingTransaction(null);
                setTxModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#C084FC] hover:bg-[#A855F7] shadow-pastel transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เพิ่มรายการใหม่</span>
            </button>
          </div>

          <TransactionTable
            transactions={roomData.transactions}
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

      {/* SUB-VIEW 3: Room Settings */}
      {activeTab === "settings" && (
        <div className="pastel-card p-6 max-w-lg bg-white shadow-pastel">
          <h3 className="text-base font-bold text-[#332941] mb-1">
            การตั้งค่าห้องเรียน {displayName}
          </h3>
          <p className="text-xs text-[#7B708A] mb-4">
            ปรับเปลี่ยนรหัส PIN และอัตราค่าห้องเรียนประจำสัปดาห์
          </p>

          {settingsNotice && (
            <div className="mb-4 p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs text-[#065F46] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
              <span>{settingsNotice}</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label className="flex items-center gap-1.5 font-semibold text-[#7B708A] mb-1">
                <KeyRound className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>รหัส PIN เหรัญญิก (4 หลัก)</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="เช่น 1234"
                className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
              />
              <p className="text-[11px] text-[#9E94AD] mt-1">
                รหัสนี้ใช้สำหรับเข้าสู่หน้าระบบเหรัญญิกของห้อง {displayName}
              </p>
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
              <p className="text-[11px] text-[#9E94AD] mt-1">
                ใช้คำนวณยอดเงินรวมเมื่อนักเรียนชำระค่าห้อง
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#C084FC] hover:bg-[#A855F7] shadow-pastel transition-colors"
            >
              บันทึกการตั้งค่า
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
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="ยืนยันการลบรายการ"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? เมื่อลบแล้วยอดเงินคงเหลือจะถูกคำนวณใหม่"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
