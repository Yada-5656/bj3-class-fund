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
  UserCog,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Check,
  X,
  ChevronUp,
  ChevronDown,
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

  // Edit Mode state ("ตรงหน้าเช็คชื่อจ่ายเงินห้องอะ ให้มีปุ่มกดแก้ไขรายชื่อด้วย")
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  React.useEffect(() => {
    setStudents(initialStudents);
  }, [initialStudents]);

  // Filter students based on search and status
  const filteredStudents = useMemo(() => {
    // In edit mode, show all students so reordering / editing works across the full roster
    if (isEditMode) {
      if (!searchQuery.trim()) return students;
      return students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(s.rollNumber).includes(searchQuery)
      );
    }

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
  }, [students, searchQuery, filterStatus, mode, isEditMode]);

  // Calculations
  const paidCount = students.filter((s) => s.isPaid).length;
  const unpaidCount = students.length - paidCount;
  const totalFundCalculated = paidCount * feePerStudent;

  // Toggle student status using selected checkinDate
  const handleToggle = (id: string) => {
    if (isEditMode) return;
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
      setSuccessNotice("บันทึกเรียบร้อย");
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-persist student roster changes
  const handleAutoPersistRoster = (updated: Student[]) => {
    setStudents(updated);
    if (onSave) {
      onSave(updated, false, checkinDate);
    }
  };

  // 1. Add Student ("ละกะปุ่มกดเพิ่มรายชื่ออะไม่ต้องให้ใส่เลขที่นะ")
  const handleAddStudent = () => {
    const trimmed = newStudentName.trim();
    if (!trimmed) {
      setIsAddingStudent(false);
      return;
    }

    const newStudent: Student = {
      id: `student-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      rollNumber: students.length + 1,
      name: trimmed,
      isPaid: false,
    };

    const updated = [...students, newStudent].map((s, idx) => ({
      ...s,
      rollNumber: idx + 1,
    }));

    setNewStudentName("");
    setIsAddingStudent(false);
    handleAutoPersistRoster(updated);
  };

  // 2. Edit Student Name
  const handleSaveEditStudent = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingStudentId(null);
      return;
    }

    const updated = students.map((s) =>
      s.id === id ? { ...s, name: trimmed } : s
    );

    setEditingStudentId(null);
    handleAutoPersistRoster(updated);
  };

  // 3. Delete Student
  const handleDeleteStudent = (id: string) => {
    const updated = students
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, rollNumber: idx + 1 }));

    handleAutoPersistRoster(updated);
  };

  // 4. Reorder / Move Students Up or Down ("กดค้างเพื่อเปลี่ยนตำแหน่งของชื่อ แบบย้ายชื่อขึ้นลงอะ")
  const handleMoveStudent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= students.length) return;
    const copy = [...students];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    const reindexed = copy.map((s, idx) => ({ ...s, rollNumber: idx + 1 }));
    handleAutoPersistRoster(reindexed);
  };

  // HTML5 Drag and Drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }
    handleMoveStudent(draggedIndex, targetIndex);
    setDraggedIndex(null);
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
            <h3 className="font-semibold text-base text-[#332941]">
              รายชื่อค้างชำระ
            </h3>
          </div>
          <span className="px-3 py-1 bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] text-xs font-semibold rounded-full">
            {unpaidList.length} คน
          </span>
        </div>

        {unpaidList.length === 0 ? (
          <div className="text-center py-6 text-sm text-[#059669] bg-[#ECFDF5] rounded-2xl border border-[#D1FAE5]">
            <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-[#10B981]" />
            <span className="font-medium">ชำระครบทุกคน</span>
          </div>
        ) : (
          <div className="flex flex-col space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {unpaidList.map((student) => (
              <div
                key={student.id}
                className="flex items-center justify-between p-2.5 bg-[#FAF5FF] hover:bg-[#F5EDFD] rounded-xl border border-[#EFE8F6] text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-white text-[#9333EA] font-bold text-xs flex items-center justify-center border border-[#E9D5FF]">
                    {student.rollNumber}
                  </span>
                  <span className="text-[#332941] font-medium text-xs sm:text-sm">
                    {student.name}
                  </span>
                </div>
                <span className="text-xs font-semibold text-[#E11D48] bg-[#FFF1F2] px-2.5 py-0.5 rounded-lg border border-[#FECDD3]">
                  {formatCurrency(feePerStudent)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // MODE 2: Treasurer Interactive Check-in System (Clean Minimal)
  // -------------------------------------------------------------
  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-2.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl text-xs sm:text-sm text-[#065F46] flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
          <span className="font-medium">{successNotice}</span>
        </div>
      )}

      {/* Summary Stat Cards (Minimal) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="pastel-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-[#7B708A]">ทั้งหมด</div>
            <div className="text-base font-bold text-[#332941]">{students.length} คน</div>
          </div>
        </div>

        <div className="pastel-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-[#7B708A]">ชำระแล้ว ({formatCurrency(totalFundCalculated)})</div>
            <div className="text-base font-bold text-[#059669]">{paidCount} คน</div>
          </div>
        </div>

        <div className="pastel-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-[#7B708A]">ค้างชำระ</div>
            <div className="text-base font-bold text-[#E11D48]">{unpaidCount} คน</div>
          </div>
        </div>
      </div>

      {/* Main Control Panel: Date Picker + Search + Status Filters */}
      <div className="pastel-card p-4 space-y-3.5">
        {/* Date Picker Row */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F1EDF7]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-[#9333EA]">
              พ.ศ. {formatThaiDate(checkinDate)}
            </span>
          </div>

          <input
            type="date"
            value={checkinDate}
            onChange={(e) => setCheckinDate(e.target.value)}
            className="px-2.5 py-1 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs font-medium text-[#332941] focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
          />
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#9E94AD] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ หรือเลขที่..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C084FC] text-[#332941]"
            />
          </div>

          {/* Filter Status Tabs */}
          {!isEditMode && (
            <div className="flex items-center gap-1 bg-[#F8F5FB] p-1 rounded-xl border border-[#EFE8F6] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  filterStatus === "all"
                    ? "bg-white text-[#9333EA] shadow-xs font-semibold"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                ทั้งหมด ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("paid")}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  filterStatus === "paid"
                    ? "bg-white text-[#059669] shadow-xs font-semibold"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                ชำระแล้ว ({paidCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("unpaid")}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  filterStatus === "unpaid"
                    ? "bg-white text-[#E11D48] shadow-xs font-semibold"
                    : "text-[#7B708A] hover:text-[#332941]"
                }`}
              >
                ค้างชำระ ({unpaidCount})
              </button>
            </div>
          )}
        </div>

        {/* Action Controls: Bulk Actions, Edit Mode Toggle & Save */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#F1EDF7]">
          <div className="flex items-center gap-2">
            {!isEditMode ? (
              <>
                <button
                  type="button"
                  onClick={handleSelectAllPaid}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#059669] bg-[#ECFDF5] hover:bg-[#D1FAE5] border border-[#A7F3D0] rounded-xl transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>เลือกชำระทั้งหมด</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllUnpaid}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#7B708A] bg-[#F8F5FB] hover:bg-[#EFE8F6] border border-[#EFE8F6] rounded-xl transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ยกเลิกทั้งหมด</span>
                </button>
              </>
            ) : (
              <span className="text-xs text-[#7B708A]">
                ลากหรือกดลูกศรเพื่อเลื่อนลำดับเลขที่
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Button to toggle Edit Mode ("ปุ่มกดแก้ไขรายชื่อ") */}
            <button
              type="button"
              onClick={() => {
                setIsEditMode(!isEditMode);
                setIsAddingStudent(false);
                setEditingStudentId(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isEditMode
                  ? "bg-[#9333EA] text-white shadow-xs"
                  : "bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF] hover:bg-[#F3E8FF]"
              }`}
            >
              <UserCog className="w-3.5 h-3.5" />
              <span>{isEditMode ? "เสร็จสิ้น" : "แก้ไขรายชื่อ"}</span>
            </button>

            {!isEditMode && (
              <>
                <label className="flex items-center gap-1.5 text-xs text-[#7B708A] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={recordAsTransaction}
                    onChange={(e) => setRecordAsTransaction(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#C084FC] rounded"
                  />
                  <span>บันทึกเป็นรายการเงินห้อง</span>
                </label>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#C084FC] hover:bg-[#A855F7] disabled:opacity-50 rounded-xl shadow-pastel transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "กำลังบันทึก..." : "บันทึก"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* VERTICAL Student List */}
      <div className="pastel-card overflow-hidden">
        {/* Table Header with Plus Button when in Edit Mode */}
        <div className="p-3 bg-[#FAF5FF] border-b border-[#EFE8F6] flex items-center justify-between text-xs font-semibold text-[#7B708A]">
          <div className="flex items-center gap-4">
            {isEditMode && <span className="w-4" />}
            <span className="w-8 text-center">เลขที่</span>
            <span>ชื่อ - นามสกุล</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Student Button: Plus Icon ("พอกดแล้วจะมีให้เพิ่มรายชื่อเป็นรูปบวก") */}
            {isEditMode && (
              <button
                type="button"
                onClick={() => setIsAddingStudent(true)}
                className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#22C55E] hover:bg-[#16A34A] text-white shadow-xs transition-colors"
                title="เพิ่มรายชื่อ"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="pr-1">{isEditMode ? "จัดการ" : "สถานะ"}</span>
          </div>
        </div>

        {/* Inline Add Student Form ("ไม่ต้องให้ใส่เลขที่นะ") */}
        {isEditMode && isAddingStudent && (
          <div className="p-3 bg-[#F0FDF4] border-b border-[#BBF7D0] flex items-center gap-3 animate-fadeIn">
            <div className="w-7 h-7 rounded-xl bg-[#22C55E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {students.length + 1}
            </div>
            <input
              type="text"
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              placeholder="ชื่อ - นามสกุล นักเรียน..."
              className="flex-1 px-3 py-1.5 text-xs sm:text-sm bg-white border border-[#86EFAC] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22C55E] text-[#332941]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddStudent();
                } else if (e.key === "Escape") {
                  setIsAddingStudent(false);
                }
              }}
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAddStudent}
                className="p-1.5 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] transition-colors"
                title="บันทึก"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingStudent(false);
                  setNewStudentName("");
                }}
                className="p-1.5 text-[#7B708A] hover:bg-[#EFE8F6] rounded-lg transition-colors"
                title="ยกเลิก"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-[#F1EDF7] max-h-[600px] overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#9E94AD]">
              ไม่พบข้อมูล
            </div>
          ) : (
            filteredStudents.map((student, index) => {
              const isPaid = student.isPaid;
              const isBeingDragged = draggedIndex === index;

              return (
                <div
                  key={student.id}
                  draggable={isEditMode}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(index)}
                  onClick={() => handleToggle(student.id)}
                  className={`flex items-center justify-between p-2.5 sm:px-4 select-none transition-colors ${
                    isBeingDragged
                      ? "bg-[#FAF5FF] opacity-40 border-2 border-dashed border-[#C084FC]"
                      : isPaid && !isEditMode
                      ? "bg-[#F0FDF4]/60 hover:bg-[#DCFCE7]"
                      : isEditMode
                      ? "bg-white hover:bg-[#FAF5FF]"
                      : "bg-white hover:bg-[#FAF5FF] cursor-pointer"
                  }`}
                >
                  {/* Left: Drag Handle (if in edit mode) + Roll Number + Name */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 pr-2">
                    {isEditMode && (
                      <div
                        className="cursor-grab active:cursor-grabbing text-[#9E94AD] hover:text-[#332941] p-1 flex-shrink-0"
                        title="กดค้างเพื่อเลื่อนตำแหน่ง"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                        isPaid && !isEditMode
                          ? "bg-[#22C55E] text-white shadow-xs"
                          : "bg-[#F8F5FB] text-[#7B708A] border border-[#EFE8F6]"
                      }`}
                    >
                      {student.rollNumber}
                    </div>

                    {/* Student Name or Inline Edit Input */}
                    {isEditMode && editingStudentId === student.id ? (
                      <div
                        className="flex items-center gap-1.5 flex-1 max-w-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs sm:text-sm bg-white border border-[#C084FC] rounded-lg focus:outline-none text-[#332941]"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveEditStudent(student.id);
                            } else if (e.key === "Escape") {
                              setEditingStudentId(null);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditStudent(student.id)}
                          className="p-1 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A] flex-shrink-0"
                          title="บันทึกชื่อ"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStudentId(null)}
                          className="p-1 text-[#7B708A] hover:bg-[#EFE8F6] rounded-lg flex-shrink-0"
                          title="ยกเลิก"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm font-medium text-[#332941] truncate">
                        {student.name}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {isEditMode ? (
                    /* Edit Mode: Up/Down arrow buttons + Edit & Delete Icon Buttons ("เอาเป็นสัญลักพอไมต้องเขียนชื่อปุ่ม") */
                    <div
                      className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Move Up / Down Buttons */}
                      <div className="flex items-center bg-[#F8F5FB] rounded-lg border border-[#EFE8F6] p-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveStudent(index, index - 1)}
                          disabled={index === 0}
                          className="p-1 text-[#7B708A] hover:text-[#9333EA] disabled:opacity-20 rounded"
                          title="เลื่อนขึ้น"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveStudent(index, index + 1)}
                          disabled={index === students.length - 1}
                          className="p-1 text-[#7B708A] hover:text-[#9333EA] disabled:opacity-20 rounded"
                          title="เลื่อนลง"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Edit Icon Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStudentId(student.id);
                          setEditingName(student.name);
                        }}
                        className="p-1.5 rounded-lg text-[#7B708A] hover:text-[#9333EA] hover:bg-[#FAF5FF] border border-transparent hover:border-[#E9D5FF] transition-colors"
                        title="แก้ไขชื่อ"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Icon Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-1.5 rounded-lg text-[#7B708A] hover:text-[#E11D48] hover:bg-[#FFF1F2] border border-transparent hover:border-[#FECDD3] transition-colors"
                        title="ลบรายชื่อ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    /* Check-in Mode: Toggle Paid Button */
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(student.id);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                        isPaid
                          ? "bg-[#22C55E] text-white shadow-xs"
                          : "bg-[#F8F5FB] hover:bg-[#EFE8F6] text-[#7B708A] border border-[#EFE8F6]"
                      }`}
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>ชำระแล้ว</span>
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 rounded-full border border-[#9E94AD]" />
                          <span>ยังไม่ชำระ</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
