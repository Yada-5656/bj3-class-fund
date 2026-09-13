"use client";

import React, { useState, useMemo } from "react";
import { Student } from "@/lib/db";
import { formatCurrency, formatThaiDate, getTodayISODate } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Search,
  CheckCheck,
  RotateCcw,
  Save,
  Users,
  AlertCircle,
  Calendar,
  Filter,
} from "lucide-react";

interface StudentListProps {
  students: Student[];
  mode?: "public-unpaid" | "treasurer-manage";
  feePerStudent?: number;
  onSave?: (
    updatedStudents: Student[],
    recordTransaction: boolean,
    selectedDate: string
  ) => Promise<void> | void;
  isLoading?: boolean;
}

export default function StudentList({
  students: initialStudents,
  mode = "public-unpaid",
  feePerStudent = 20,
  onSave,
  isLoading = false,
}: StudentListProps) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");
  const [recordAsTransaction, setRecordAsTransaction] = useState(true);
  const [checkinDate, setCheckinDate] = useState<string>(getTodayISODate());
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

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

  // Calculations
  const paidCount = students.filter((s) => s.isPaid).length;
  const unpaidCount = students.length - paidCount;
  const totalFundCalculated = paidCount * feePerStudent;

  // Toggle student status using selected checkinDate
  const handleToggle = (id: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              isPaid: !s.isPaid,
              paidDate: !s.isPaid ? checkinDate : undefined,
            }
          : s
      )
    );
  };

  // Bulk actions using selected checkinDate
  const handleSelectAllPaid = () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        isPaid: true,
        paidDate: s.paidDate || checkinDate,
      }))
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
      await onSave(students, recordAsTransaction, checkinDate);
      setSuccessNotice("บันทึกสถานะการเช็คชื่อจ่ายเงินห้องเรียบร้อยแล้ว!");
      setTimeout(() => setSuccessNotice(null), 3500);
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
          /* Vertical Column List for Unpaid Students */
          <div className="flex flex-col space-y-2 max-h-96 overflow-y-auto pr-1">
            {unpaidList.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 bg-[#FAF5FF] hover:bg-[#F5EDFD] rounded-xl border border-[#EFE8F6] text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-white text-[#9333EA] font-bold text-xs flex items-center justify-center border border-[#E9D5FF] shadow-xs">
                    {student.rollNumber}
                  </span>
                  <span className="text-[#332941] font-medium text-xs sm:text-sm">
                    {student.name}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#E11D48] bg-[#FFF1F2] px-2.5 py-1 rounded-lg border border-[#FECDD3]">
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
  // MODE 2: Treasurer Interactive Check-in System (Vertical Layout + Date Picker)
  // -------------------------------------------------------------
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl text-xs sm:text-sm text-[#065F46] flex items-center gap-2 shadow-xs animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-[#10B981] flex-shrink-0" />
          <span className="font-medium">{successNotice}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
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

      {/* Main Control Panel: Date Picker + Search + Status Filters */}
      <div className="pastel-card p-4 sm:p-5 space-y-4">
        {/* Date Picker Row (Crucial Requirement: เปลี่ยนวันที่ได้) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F1EDF7]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#7B708A]">วันที่เช็คชื่อชำระเงิน</div>
              <div className="text-xs font-bold text-[#9333EA]">
                พ.ศ. {formatThaiDate(checkinDate)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-[#7B708A] font-medium hidden sm:inline">
              เลือกวันที่:
            </label>
            <input
              type="date"
              value={checkinDate}
              onChange={(e) => setCheckinDate(e.target.value)}
              className="px-3 py-1.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs sm:text-sm font-medium text-[#332941] focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
            />
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#9E94AD] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขที่ หรือ ชื่อ-นามสกุล..."
              className="w-full pl-9 pr-4 py-2 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941]"
            />
          </div>

          {/* Filter Status Tabs */}
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

        {/* Action Controls: Bulk Actions & Save */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F1EDF7]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllPaid}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#059669] bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] rounded-xl transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>เลือกชำระทั้งหมด ({formatThaiDate(checkinDate)})</span>
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
              className="flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#C084FC] hover:bg-[#A855F7] disabled:opacity-50 rounded-xl shadow-pastel transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Crucial Requirement: VERTICAL Single Column Student List (เรียงแนวตั้งลงมา) */}
      <div className="pastel-card overflow-hidden">
        <div className="p-3.5 bg-[#FAF5FF] border-b border-[#EFE8F6] flex items-center justify-between text-xs font-semibold text-[#7B708A]">
          <div className="flex items-center gap-4">
            <span className="w-10 text-center">เลขที่</span>
            <span>ชื่อ - นามสกุล นักเรียน</span>
          </div>
          <div className="flex items-center gap-8 pr-2">
            <span className="hidden sm:inline">สถานะการชำระ</span>
            <span>คลิกเพื่อเช็คชื่อ</span>
          </div>
        </div>

        <div className="divide-y divide-[#F1EDF7] max-h-[600px] overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#9E94AD]">
              ไม่พบรายชื่อนักเรียนที่ค้นหา
            </div>
          ) : (
            filteredStudents.map((student) => {
              const isPaid = student.isPaid;
              return (
                <div
                  key={student.id}
                  onClick={() => handleToggle(student.id)}
                  className={`flex items-center justify-between p-3 sm:px-4 cursor-pointer select-none transition-colors ${
                    isPaid
                      ? "bg-[#F0FDF4]/70 hover:bg-[#DCFCE7]"
                      : "bg-white hover:bg-[#FAF5FF]"
                  }`}
                >
                  {/* Left: Roll Number & Name */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-colors ${
                        isPaid
                          ? "bg-[#22C55E] text-white shadow-xs"
                          : "bg-[#F8F5FB] text-[#7B708A] border border-[#EFE8F6]"
                      }`}
                    >
                      {student.rollNumber}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#332941]">
                        {student.name}
                      </div>
                      <div className="text-[11px] sm:hidden mt-0.5">
                        {isPaid ? (
                          <span className="text-[#16A34A] font-medium">
                            ชำระแล้ว ({student.paidDate ? formatThaiDate(student.paidDate) : formatThaiDate(checkinDate)})
                          </span>
                        ) : (
                          <span className="text-[#E11D48] font-medium">
                            ค้าง {formatCurrency(feePerStudent)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Payment Status Badge & Interactive Toggle Button */}
                  <div className="flex items-center gap-3 sm:gap-6">
                    <div className="hidden sm:block text-right">
                      {isPaid ? (
                        <div className="text-xs font-semibold text-[#16A34A]">
                          ชำระแล้ว
                          <div className="text-[10px] text-[#7B708A] font-normal">
                            วันที่: {student.paidDate ? formatThaiDate(student.paidDate) : formatThaiDate(checkinDate)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-[#E11D48]">
                          ยังไม่ชำระ
                          <div className="text-[10px] text-[#9E94AD] font-normal">
                            ค้าง {formatCurrency(feePerStudent)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(student.id);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isPaid
                          ? "bg-[#22C55E] text-white shadow-xs"
                          : "bg-[#F8F5FB] hover:bg-[#EFE8F6] text-[#7B708A] border border-[#EFE8F6]"
                      }`}
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>ชำระแล้ว</span>
                        </>
                      ) : (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-[#9E94AD]" />
                          <span>ยังไม่ชำระ</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
