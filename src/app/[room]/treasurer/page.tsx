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
  const [activeTab, setActiveTab] = useState<"checkin" | "transactions" | "settings">("checkin");

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

  // Handle student check-in save
  const handleSaveStudents = async (
    updatedStudents: Student[],
    recordTransaction: boolean
  ) => {
    let updatedTx = [...roomData.transactions];

    if (recordTransaction) {
      // Calculate newly paid students
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
          date: new Date().toISOString().split("T")[0],
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
      // Edit existing
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
      // Add new
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/${roomSlug}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#7B708A] hover:text-[#332941] mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับหน้าแดชบอร์ด</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#332941]">
              ระบบจัดการเงินห้อง (เหรัญญิก {displayName})
            </h1>
          </div>
          <p className="text-xs text-[#7B708A] mt-1">
            เช็คชื่อชำระเงินห้องประจำสัปดาห์ และบันทึกรายรับ-รายจ่าย
          </p>
        </div>

        {/* Lock Session Button */}
        <button
          onClick={handleLockSession}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#7B708A] hover:text-[#E11D48] bg-white hover:bg-[#FFF1F2] border border-[#EFE8F6] rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>ออกจากระบบเหรัญญิก</span>
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-[#EFE8F6] pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("checkin")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "checkin"
              ? "bg-[#C084FC] text-white shadow-pastel"
              : "text-[#7B708A] hover:bg-white/80 hover:text-[#332941]"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>เช็คชื่อจ่ายเงินห้อง</span>
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "transactions"
              ? "bg-[#C084FC] text-white shadow-pastel"
              : "text-[#7B708A] hover:bg-white/80 hover:text-[#332941]"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>บันทึกรายรับ - รายจ่าย</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === "settings"
              ? "bg-[#C084FC] text-white shadow-pastel"
              : "text-[#7B708A] hover:bg-white/80 hover:text-[#332941]"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>ตั้งค่าห้องเรียน</span>
        </button>
      </div>

      {/* TAB 1: Check-in System */}
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

      {/* TAB 2: Income / Expense Records */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#332941]">
                จัดการรายการรายรับ - รายจ่าย
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

      {/* TAB 3: Settings */}
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
