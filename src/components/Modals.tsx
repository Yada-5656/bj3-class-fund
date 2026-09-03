"use client";

import React, { useState, useEffect } from "react";
import { Transaction } from "@/lib/db";
import { getTodayISODate } from "@/lib/utils";
import { X, PlusCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id?: string;
    type: "income" | "expense";
    category: string;
    description: string;
    amount: number;
    date: string;
  }) => void;
  initialData?: Transaction | null;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: TransactionModalProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("อุปกรณ์ทำความสะอาด");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(getTodayISODate());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type === "income" ? "income" : "expense");
      setCategory(initialData.category);
      setDescription(initialData.description);
      setAmount(String(initialData.amount));
      setDate(initialData.date || getTodayISODate());
    } else {
      setType("expense");
      setCategory("อุปกรณ์ทำความสะอาด");
      setDescription("");
      setAmount("");
      setDate(getTodayISODate());
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("กรุณาระบุรายละเอียดรายการ");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("กรุณาระบุจำนวนเงินที่ถูกต้อง (มากกว่า 0)");
      return;
    }

    onSubmit({
      id: initialData?.id,
      type,
      category,
      description: description.trim(),
      amount: numAmount,
      date,
    });
    onClose();
  };

  const expenseCategories = [
    "อุปกรณ์ทำความสะอาด",
    "เอกสารและชีทเรียน",
    "กิจกรรมห้องเรียน",
    "ตกแต่งห้องเรียน / บอร์ด",
    "อุปกรณ์กีฬา / กิจกรรม",
    "อื่นๆ",
  ];

  const incomeCategories = [
    "เงินสนับสนุนจากครูที่ปรึกษา",
    "เงินรางวัลจากการแข่งขัน",
    "เงินเหลือจากกิจกรรม",
    "รับบริจาค / สนับสนุน",
    "อื่นๆ",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="pastel-card w-full max-w-md bg-white p-6 shadow-pastel space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F1EDF7]">
          <h3 className="text-base font-bold text-[#332941]">
            {initialData ? "แก้ไขรายการบันทึก" : "เพิ่มรายการ รายรับ / รายจ่าย"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[#9E94AD] hover:text-[#332941] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-[#FFF1F2] border border-[#FECDD3] text-xs text-[#E11D48] rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs sm:text-sm">
          {/* Type Selector Tabs */}
          <div>
            <label className="block font-medium text-[#7B708A] mb-1.5">
              ประเภทรายการ
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#F8F5FB] p-1 rounded-xl border border-[#EFE8F6]">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                  type === "expense"
                    ? "bg-[#FFF1F2] text-[#E11D48] shadow-xs border border-[#FECDD3]"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                รายจ่าย (Expense)
              </button>
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                  type === "income"
                    ? "bg-[#ECFDF5] text-[#059669] shadow-xs border border-[#A7F3D0]"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                รายรับอื่น (Income)
              </button>
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block font-medium text-[#7B708A] mb-1">
              หมวดหมู่
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941]"
            >
              {(type === "expense" ? expenseCategories : incomeCategories).map(
                (cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block font-medium text-[#7B708A] mb-1">
              รายละเอียดรายการ
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น ซื้อไม้กวาดห้อง, ค่าพิมพ์ชีทแบบฝึกหัด..."
              className="w-full px-3 py-2 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941]"
            />
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#7B708A] mb-1">
                จำนวนเงิน (บาท)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941] font-semibold"
              />
            </div>
            <div>
              <label className="block font-medium text-[#7B708A] mb-1">
                วันที่ทำรายการ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941]"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1EDF7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#7B708A] hover:bg-[#F8F5FB] rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#C084FC] hover:bg-[#A855F7] rounded-xl shadow-pastel transition-colors"
            >
              บันทึกรายการ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Confirmation Dialog Modal
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="pastel-card w-full max-w-sm bg-white p-5 shadow-pastel space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#332941]">{title}</h4>
            <p className="text-xs text-[#7B708A] mt-0.5">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-[#7B708A] hover:bg-[#F8F5FB] rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#FF96A8] hover:bg-[#FB7185] rounded-xl shadow-xs transition-colors"
          >
            ยืนยันการลบ
          </button>
        </div>
      </div>
    </div>
  );
}
