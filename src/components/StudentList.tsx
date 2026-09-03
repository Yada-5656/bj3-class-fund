"use client";

import React, { useState, useMemo } from "react";
import { Student } from "@/lib/db";
import { formatCurrency, formatThaiDate } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Search,
  CheckCheck,
  RotateCcw,
  Save,
  Users,
  AlertCircle,
  Filter,
} from "lucide-react";

interface StudentListProps {
  students: Student[];
  mode?: "public-unpaid" | "treasurer-manage";
  feePerStudent?: number;
  onSave?: (updatedStudents: Student[], recordTransaction: boolean) => Promise<void> | void;
  isLoading?: boolean;
}

export default function StudentList({
  students: initialStudents,
  mode = "public-unpaid",
  feePerStudent = 20,
  onSave,
  isLoading = false,
}: StudentListProps) {
  // Working state for treasurer modifications
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");
  const [recordAsTransaction, setRecordAsTransaction] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync if initialStudents update
  React.useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);

  // Filter students based on search and status
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.rollNumber).includes(searchQuery);

      if (mode === "public-unpaid") {
        return !s.isPaid && matchesSearch;
      }

      if (filterStatus === "paid") return s.isPaid && matchesSearch;
      if (filterStatus === "unpaid") return !s.isPaid && matchesSearch;
      return matchesSearch;
    });
  }, [students, searchQuery, filterStatus, mode]);

  // Calculation for treasurer
  const paidCount = students.filter((s) => s.isPaid).length;
  const unpaidCount = students.length - paidCount;
  const totalFundCalculated = paidCount * feePerStudent;

  // Toggle individual student status
  const handleToggle = (id: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              isPaid: !s.isPaid,
              paidDate: !s.isPaid ? new Date().toISOString().split("T")[0] : undefined,
            }
          : s
      )
    );
  };

  // Bulk actions
  const handleSelectAllPaid = () => {
    const today = new Date().toISOString().split("T")[0];
    setStudents((prev) =>
      prev.map((s) => ({ ...s, isPaid: true, paidDate: s.paidDate || today }))
    );
  };

  const handleSelectAllUnpaid = () => {
    setStudents((prev) =>
      prev.map((s) => ({ ...s, isPaid: false, paidDate: undefined }))
    );
  };

  // Save changes
  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(students, recordAsTransaction);
      setSuccessNotice("บันทึกสถานะการชำระเงินเรียบร้อยแล้ว!");
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // -------------------------------------------------------------
  // MODE 1: Public Dashboard View (Shows ONLY Unpaid Students)
  // -------------------------------------------------------------
  if (mode === "public-unpaid") {
    const unpaidList = students.filter((s) => !s.isPaid);

    return (
      <div className="pastel-card p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1EDF7]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#332941]">
                รายชื่อนักเรียนที่ค้างชำระค่าห้อง
              </h3>
              <p className="text-xs text-[#7B708A]">
                ค่าห้อง {formatCurrency(feePerStudent)} / คน
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] text-xs font-semibold rounded-full">
            {unpaidList.length} คน
          </span>
        </div>

        {unpaidList.length === 0 ? (
          <div className="text-center py-8 text-sm text-[#059669] bg-[#ECFDF5] rounded-2xl border border-[#D1FAE5]">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-[#10B981]" />
            <p className="font-medium">ยอดเยี่ยมมาก! นักเรียนทุกคนชำระค่าห้องครบแล้ว</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
            {unpaidList.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-2.5 bg-[#FAF5FF] rounded-xl border border-[#EFE8F6] text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-white text-[#9333EA] font-semibold text-xs flex items-center justify-center border border-[#E9D5FF] shadow-xs">
                    {student.rollNumber}
                  </span>
                  <span className="text-[#332941] font-medium text-xs sm:text-sm">
                    {student.name}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#E11D48] bg-[#FFF1F2] px-2 py-0.5 rounded-md">
                  ค้าง {formatCurrency(feePerStudent)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // MODE 2: Treasurer Interactive Check-in System
  // -------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl text-xs sm:text-sm text-[#065F46] flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Summary Stat Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="pastel-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#7B708A]">นักเรียนทั้งหมด</div>
            <div className="text-lg font-bold text-[#332941]">{students.length} คน</div>
          </div>
        </div>

        <div className="pastel-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#7B708A]">ชำระแล้ว ({formatCurrency(totalFundCalculated)})</div>
            <div className="text-lg font-bold text-[#059669]">{paidCount} คน</div>
          </div>
        </div>

        <div className="pastel-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#7B708A]">ยังไม่ชำระ</div>
            <div className="text-lg font-bold text-[#E11D48]">{unpaidCount} คน</div>
          </div>
        </div>
      </div>

      {/* Action Controls & Filters */}
      <div className="pastel-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#9E94AD] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขที่ หรือ ชื่อนักเรียน..."
              className="w-full pl-9 pr-4 py-2 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941]"
            />
          </div>

          {/* Filter Status Buttons */}
          <div className="flex items-center gap-1 bg-[#F8F5FB] p-1 rounded-xl border border-[#EFE8F6] self-start sm:self-auto">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filterStatus === "all"
                  ? "bg-white text-[#9333EA] shadow-xs font-semibold"
                  : "text-[#7B708A] hover:text-[#332941]"
              }`}
            >
              ทั้งหมด ({students.length})
            </button>
            <button
              onClick={() => setFilterStatus("paid")}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filterStatus === "paid"
                  ? "bg-white text-[#059669] shadow-xs font-semibold"
                  : "text-[#7B708A] hover:text-[#332941]"
              }`}
            >
              ชำระแล้ว ({paidCount})
            </button>
            <button
              onClick={() => setFilterStatus("unpaid")}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filterStatus === "unpaid"
                  ? "bg-white text-[#E11D48] shadow-xs font-semibold"
                  : "text-[#7B708A] hover:text-[#332941]"
              }`}
            >
              ค้างชำระ ({unpaidCount})
            </button>
          </div>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1EDF7]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllPaid}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#059669] bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] rounded-xl transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>เลือกชำระทั้งหมด</span>
            </button>
            <button
              onClick={handleSelectAllUnpaid}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7B708A] bg-[#F8F5FB] hover:bg-[#EFE8F6] border border-[#EFE8F6] rounded-xl transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ยกเลิกทั้งหมด</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[#7B708A] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={recordAsTransaction}
                onChange={(e) => setRecordAsTransaction(e.target.checked)}
                className="w-3.5 h-3.5 accent-[#C084FC] rounded"
              />
              <span>บันทึกเป็นรายการเงินห้องอัตโนมัติ</span>
            </label>

            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#C084FC] hover:bg-[#A855F7] disabled:opacity-50 rounded-xl shadow-pastel transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Student Check-in Interactive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {filteredStudents.map((student) => {
          const isPaid = student.isPaid;
          return (
            <div
              key={student.id}
              onClick={() => handleToggle(student.id)}
              className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                isPaid
                  ? "bg-[#F0FDF4] border-[#BBF7D0] hover:border-[#86EFAC] shadow-xs"
                  : "bg-white border-[#EFE8F6] hover:border-[#D8B4FE]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                    isPaid
                      ? "bg-[#22C55E] text-white"
                      : "bg-[#F8F5FB] text-[#7B708A] border border-[#EFE8F6]"
                  }`}
                >
                  {student.rollNumber}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[#332941]">
                    {student.name}
                  </div>
                  <div className="text-[11px] text-[#9E94AD]">
                    {isPaid ? (
                      <span className="text-[#16A34A] font-medium">
                        ชำระแล้ว ({student.paidDate ? formatThaiDate(student.paidDate) : "เรียบร้อย"})
                      </span>
                    ) : (
                      <span className="text-[#E11D48] font-medium">
                        ยังไม่ชำระ ({formatCurrency(feePerStudent)})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Toggle Icon */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                  isPaid ? "text-[#16A34A]" : "text-[#D1D5DB]"
                }`}
              >
                {isPaid ? (
                  <CheckCircle2 className="w-5 h-5 fill-[#22C55E] text-white" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-[#D1D5DB]" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
