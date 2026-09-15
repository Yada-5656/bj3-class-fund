"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Transaction } from "@/lib/db";
import { getTodayISODate } from "@/lib/utils";
import { X, Plus, AlertTriangle } from "lucide-react";

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
  roomSlug?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  roomSlug: propsRoomSlug,
}: TransactionModalProps) {
  const routeParams = useParams();
  const roomSlug =
    propsRoomSlug || (routeParams?.room as string) || "default";

  // Default to "income" on entry as requested: "ตอนเข้ามาให้เซตไว้ที่หน้ารายรับ"
  const [type, setType] = useState<"income" | "expense">("income");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  // Default date to today on every entry as requested: "ทุกครั้งที่เข้าหน้านี้ให้เซตวันที่เป็นวันปัจจุบัน"
  const [date, setDate] = useState(getTodayISODate());
  const [error, setError] = useState<string | null>(null);

  // Preset shortcuts strictly isolated PER ROOM (ห้องแต่ละห้องแยกจากกันอย่างชัดเจน):
  // "รายรับให้มีขึ้นเป็นชุดผิดกับมาสาย รายจ่ายไม่ต้อง ให้เหรัญญิกไปเพิ่มเอาเอง"
  const [incomePresets, setIncomePresets] = useState<string[]>(["ชุดผิด", "มาสาย"]);
  const [expensePresets, setExpensePresets] = useState<string[]>([]);
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  // Load custom presets isolated by roomSlug from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && roomSlug) {
      const savedIncome = localStorage.getItem(`bj3_income_presets_${roomSlug}`);
      if (savedIncome) {
        try {
          const parsed = JSON.parse(savedIncome);
          if (Array.isArray(parsed)) setIncomePresets(parsed);
        } catch (e) {}
      } else {
        setIncomePresets(["ชุดผิด", "มาสาย"]);
      }

      const savedExpense = localStorage.getItem(`bj3_expense_presets_${roomSlug}`);
      if (savedExpense) {
        try {
          const parsed = JSON.parse(savedExpense);
          if (Array.isArray(parsed)) setExpensePresets(parsed);
        } catch (e) {}
      } else {
        setExpensePresets([]);
      }
    }
  }, [roomSlug, isOpen]);

  // Reset form every time the modal is opened
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type === "expense" ? "expense" : "income");
        setDescription(initialData.description || "");
        setAmount(initialData.amount ? String(initialData.amount) : "");
        setDate(initialData.date || getTodayISODate());
      } else {
        // Critical requirement: default to income and today's date
        setType("income");
        setDescription("");
        setAmount("");
        setDate(getTodayISODate());
      }
      setError(null);
      setIsAddingPreset(false);
      setNewPresetName("");
    }
  }, [isOpen, initialData]);

  // Long press timer ref for deleting presets ("ถ้าอันไหนไม่ต้องการให้กดค้างเพื่อนลบ")
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handleStartPress = (preset: string) => {
    isLongPressRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      // Requirement: "ไอตรงนี้ไม่ต้องถาม ลบเลย" -> delete immediately without confirm prompt
      handleDeletePreset(preset);
    }, 550);
  };

  const handleEndPress = (preset: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isLongPressRef.current) {
      // Normal click: populate description
      setDescription(preset);
    }
  };

  const handleCancelPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Add new preset chip (Isolated by roomSlug)
  const handleAddPreset = () => {
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      setIsAddingPreset(false);
      return;
    }

    if (type === "income") {
      if (!incomePresets.includes(trimmed)) {
        const next = [...incomePresets, trimmed];
        setIncomePresets(next);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `bj3_income_presets_${roomSlug}`,
            JSON.stringify(next)
          );
        }
      }
    } else {
      if (!expensePresets.includes(trimmed)) {
        const next = [...expensePresets, trimmed];
        setExpensePresets(next);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `bj3_expense_presets_${roomSlug}`,
            JSON.stringify(next)
          );
        }
      }
    }
    setNewPresetName("");
    setIsAddingPreset(false);
  };

  // Delete preset chip immediately without confirm: "ไอตรงนี้ไม่ต้องถาม ลบเลย"
  const handleDeletePreset = (presetToDelete: string) => {
    if (type === "income") {
      const next = incomePresets.filter((p) => p !== presetToDelete);
      setIncomePresets(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `bj3_income_presets_${roomSlug}`,
          JSON.stringify(next)
        );
      }
    } else {
      const next = expensePresets.filter((p) => p !== presetToDelete);
      setExpensePresets(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `bj3_expense_presets_${roomSlug}`,
          JSON.stringify(next)
        );
      }
    }

    if (description === presetToDelete) {
      setDescription("");
    }
  };

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
      category: type === "income" ? "รายรับ" : "รายจ่าย",
      description: description.trim(),
      amount: numAmount,
      date,
    });
    onClose();
  };

  const currentPresets = type === "income" ? incomePresets : expensePresets;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="pastel-card w-full max-w-md bg-white p-6 shadow-pastel space-y-4">
        {/* Title */}
        <div className="flex items-center justify-between pb-3 border-b border-[#F1EDF7]">
          <h3 className="text-base font-bold text-[#332941]">
            {initialData ? "แก้ไขรายการบันทึก" : "เพิ่มรายการ รายรับ / รายจ่าย"}
          </h3>
          <button
            type="button"
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          {/* 1. ประเภทรายการ (2 buttons: รายรับ / รายจ่าย) */}
          <div>
            <label className="block font-medium text-[#7B708A] mb-1.5 text-xs">
              ประเภทรายการ
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#F8F5FB] p-1 rounded-xl border border-[#EFE8F6]">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === "income"
                    ? "bg-[#ECFDF5] text-[#059669] shadow-xs border border-[#A7F3D0]"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                รายรับ
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === "expense"
                    ? "bg-[#FFF1F2] text-[#E11D48] shadow-xs border border-[#FECDD3]"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                รายจ่าย
              </button>
            </div>
          </div>

          {/* 2. เพิ่มรายการ / บันทึกรายการ (Quick Presets with [+] chip and instant delete) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-[#7B708A] text-xs">
                เพิ่มรายการ
              </label>
              <span className="text-[10px] text-[#9E94AD]">
                กดเพื่อเลือก • กดค้างเพื่อลบ
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* [+] Add preset button */}
              {isAddingPreset ? (
                <div className="inline-flex items-center gap-1.5 p-1 bg-[#F8F5FB] border border-[#C084FC] rounded-xl animate-fadeIn">
                  <input
                    type="text"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="ชื่อรายการ..."
                    className="w-24 px-2 py-0.5 text-xs bg-white border border-[#EFE8F6] rounded-lg focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPreset();
                      } else if (e.key === "Escape") {
                        setIsAddingPreset(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddPreset}
                    className="px-2 py-0.5 text-white bg-[#C084FC] hover:bg-[#A855F7] rounded-lg text-[10px] font-bold"
                  >
                    เพิ่ม
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingPreset(false)}
                    className="px-1 text-[#7B708A] hover:bg-[#EFE8F6] rounded-lg text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingPreset(true)}
                  className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF] hover:bg-[#F3E8FF] transition-colors"
                  title="เพิ่มรายการบันทึกใหม่"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}

              {/* Preset Chips */}
              {currentPresets.map((preset) => (
                <div
                  key={preset}
                  onMouseDown={() => handleStartPress(preset)}
                  onMouseUp={() => handleEndPress(preset)}
                  onMouseLeave={handleCancelPress}
                  onTouchStart={() => handleStartPress(preset)}
                  onTouchEnd={() => handleEndPress(preset)}
                  onTouchCancel={handleCancelPress}
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer select-none transition-all ${
                    description === preset
                      ? "bg-[#C084FC] text-white shadow-xs"
                      : "bg-[#F8F5FB] text-[#332941] hover:bg-[#FAF5FF] border border-[#EFE8F6]"
                  }`}
                  title="กดเพื่อเลือก หรือ กดค้างเพื่อลบ"
                >
                  <span>{preset}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePreset(preset);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[#9E94AD] hover:text-[#E11D48] transition-opacity ml-0.5"
                    title="ลบ"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {currentPresets.length === 0 && !isAddingPreset && (
                <span className="text-xs text-[#9E94AD] italic">
                  (กด + เพื่อเพิ่มรายการลัด)
                </span>
              )}
            </div>
          </div>

          {/* 3. รายละเอียดรายการ (ช่องโล่งๆ ไม่มีตัวอย่าง) */}
          <div>
            <label className="block font-medium text-[#7B708A] mb-1 text-xs">
              รายละเอียดรายการ
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder=""
              className="w-full px-3 py-2 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941]"
            />
          </div>

          {/* 4. จำนวนเงิน & วันที่เกิดรายการ (2 columns as in Sketch) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-[#7B708A] mb-1 text-xs">
                จำนวนเงิน
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
              <label className="block font-medium text-[#7B708A] mb-1 text-xs">
                วันที่เกิดรายการ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941]"
              />
            </div>
          </div>

          {/* 5. Submit Actions: [ ยกเลิก ] [ บันทึก ] */}
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
              บันทึก
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
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
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
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-medium text-[#7B708A] hover:bg-[#F8F5FB] rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#FF96A8] hover:bg-[#FB7185] rounded-xl shadow-xs transition-colors"
          >
            {confirmText || "ยืนยันการลบ"}
          </button>
        </div>
      </div>
    </div>
  );
}
