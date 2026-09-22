"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Student } from "@/lib/db";
import { ConfirmModal } from "@/components/Modals";
import { formatCurrency, getTodayISODate, formatThaiDate } from "@/lib/utils";
import {
  Search,
  RotateCcw,
  Save,
  Users,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  X,
  UserCog,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface StudentListProps {
  students: Student[];
  dailyCheckins: Record<string, string[]>;
  mode?: "public-unpaid" | "treasurer-manage";
  feePerStudent?: number;
  onSave?: (
    updatedStudents: Student[],
    recordTransaction: boolean,
    selectedDate: string,
    paidStudentIds: string[],
    allDailyCheckins: Record<string, string[]>
  ) => void;
}

export default function StudentList({
  students: initialStudents = [],
  dailyCheckins: initialDailyCheckins = {},
  mode = "public-unpaid",
  feePerStudent = 20,
  onSave,
}: StudentListProps) {
  // --- STATE ---
  const [students, setStudents] = useState<Student[]>([]);
  const [checkinHistory, setCheckinHistory] = useState<Record<string, string[]>>({});
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "unpaid">("all");
  const [recordAsTransaction, setRecordAsTransaction] = useState(true);
  const [checkinDate, setCheckinDate] = useState<string>("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);


  // --- INITIALIZATION ---
  useEffect(() => {
    // Safely parse initial students
    if (Array.isArray(initialStudents)) {
      setStudents(initialStudents.filter(Boolean));
    }
  }, [initialStudents]);

  useEffect(() => {
    // Safely parse initial daily checkins
    if (initialDailyCheckins && typeof initialDailyCheckins === 'object') {
      setCheckinHistory(initialDailyCheckins);
    }
    
    // Set initial date if not set
    if (!checkinDate) {
      setCheckinDate(getTodayISODate());
    }
  }, [initialDailyCheckins, checkinDate]);

  // --- DERIVED STATE ---
  const currentPaidIds = useMemo(() => {
    if (!checkinDate) return new Set<string>();
    const ids = checkinHistory[checkinDate];
    return new Set<string>(Array.isArray(ids) ? ids : []);
  }, [checkinHistory, checkinDate]);

  const paidCount = useMemo(() => {
    return students.filter(s => currentPaidIds.has(s.id)).length;
  }, [students, currentPaidIds]);

  const unpaidCount = Math.max(0, students.length - paidCount);
  const totalFundCalculated = paidCount * feePerStudent;

  const filteredStudents = useMemo(() => {
    let result = [...students];
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(query) || 
        String(s.rollNumber).includes(query)
      );
    }

    // Filter by status
    if (mode === "public-unpaid") {
      result = result.filter(s => !currentPaidIds.has(s.id));
    } else if (!isEditMode) {
      if (filterStatus === "paid") {
        result = result.filter(s => currentPaidIds.has(s.id));
      } else if (filterStatus === "unpaid") {
        result = result.filter(s => !currentPaidIds.has(s.id));
      }
    }

    return result;
  }, [students, searchQuery, filterStatus, isEditMode, mode, currentPaidIds]);

  // --- HANDLERS ---
  const handleAutoPersistRoster = (newStudents: Student[], newHistory = checkinHistory) => {
    setStudents(newStudents);
    if (onSave) {
      const currentPaid = Array.isArray(newHistory[checkinDate]) ? newHistory[checkinDate] : [];
      onSave(newStudents, recordAsTransaction, checkinDate, currentPaid, newHistory);
    }
  };

  const handleToggleCheckin = (studentId: string) => {
    if (mode === "public-unpaid" || isEditMode) return;
    
    setCheckinHistory(prev => {
      const current = Array.isArray(prev[checkinDate]) ? prev[checkinDate] : [];
      const isCurrentlyPaid = current.includes(studentId);
      
      let nextPaid: string[];
      if (isCurrentlyPaid) {
        nextPaid = current.filter(id => id !== studentId);
      } else {
        nextPaid = [...current, studentId];
      }
      
      return { ...prev, [checkinDate]: nextPaid };
    });
  };

  const isAllPaid = students.length > 0 && paidCount === students.length;

  const handleToggleAll = () => {
    setCheckinHistory(prev => {
      if (isAllPaid) {
        return { ...prev, [checkinDate]: [] };
      } else {
        return { ...prev, [checkinDate]: students.map(s => s.id) };
      }
    });
  };

  const handleSaveCheckin = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      const currentPaid = Array.isArray(checkinHistory[checkinDate]) ? checkinHistory[checkinDate] : [];
      await onSave(students, recordAsTransaction, checkinDate, currentPaid, checkinHistory);
      setSuccessNotice("บันทึกเรียบร้อย");
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSaving(false);
    }
  };

  // Roster Management
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
    };
    const updated = [...students, newStudent];
    setNewStudentName("");
    handleAutoPersistRoster(updated);
  };

  const handleSaveEditStudent = (id: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingStudentId(null);
      return;
    }
    const updated = students.map(s => s.id === id ? { ...s, name: trimmed } : s);
    setEditingStudentId(null);
    handleAutoPersistRoster(updated);
  };

  const handleDeleteStudent = (id: string) => {
    const updated = students
      .filter(s => s.id !== id)
      .map((s, idx) => ({ ...s, rollNumber: idx + 1 }));

    const cleanedHistory: Record<string, string[]> = {};
    for (const [date, ids] of Object.entries(checkinHistory)) {
      cleanedHistory[date] = Array.isArray(ids) ? ids.filter(studentId => studentId !== id) : [];
    }
    
    setCheckinHistory(cleanedHistory);
    handleAutoPersistRoster(updated, cleanedHistory);
    setConfirmDeleteId(null);
  };

  const handleMoveStudent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= students.length) return;
    const copy = [...students];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    const reindexed = copy.map((s, idx) => ({ ...s, rollNumber: idx + 1 }));
    handleAutoPersistRoster(reindexed);
  };

  const isDataNotRecorded = mode === "public-unpaid" && checkinHistory[checkinDate] === undefined;

  // --- RENDER ---
  return (
    <div className="space-y-4 font-sans relative">
      {/* HEADER SECTION (Treasurer only) */}
      {mode === "treasurer-manage" && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-[#FDF2F6] space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-[#5C435A] font-bold flex items-center gap-2">
              <div className="w-2 h-6 bg-[#EB9AB2] rounded-full"></div>
              เช็คชื่อรายวัน
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EB9AB2]" />
                <input
                  type="date"
                  value={checkinDate}
                  onChange={(e) => setCheckinDate(e.target.value)}
                  className="w-full sm:w-auto pl-9 pr-3 py-2 bg-[#FFF5F8] border border-[#EFCFE3] rounded-xl text-sm font-semibold text-[#5C435A] focus:outline-none focus:border-[#EB9AB2]"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-2 rounded-xl border transition-colors ${
                  isEditMode 
                    ? "bg-[#5C435A] border-[#5C435A] text-white" 
                    : "bg-[#FFF5F8] border-[#FCE4EC] text-[#9C8599] hover:bg-[#FCE4EC]"
                }`}
                title="จัดการรายชื่อ"
              >
                <UserCog className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#EDF8F2] border border-[#BDECD2] p-3 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[#166534] text-xs font-bold mb-1">จ่ายแล้ว</span>
              <span className="text-xl font-black text-[#5A967C]">{paidCount}</span>
            </div>
            <div className="bg-[#FFF0F3] border border-[#FFC4D0] p-3 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[#9F1239] text-xs font-bold mb-1">ยังไม่จ่าย</span>
              <span className="text-xl font-black text-[#E57388]">{unpaidCount}</span>
            </div>
            <div className="bg-[#FFF5F8] border border-[#EFCFE3] p-3 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[#6B21A8] text-xs font-bold mb-1">ยอดรวมวันนี้</span>
              <span className="text-xl font-black text-[#D65A80] truncate w-full text-center">
                {formatCurrency(totalFundCalculated, false)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LIST SECTION */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#FDF2F6] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-[#FDF2F6] space-y-3 bg-white z-10 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BDA8BA]" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือ เลขที่..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#FFF5F8] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#EFCFE3] text-[#5C435A]"
            />
          </div>

          {mode === "treasurer-manage" && !isEditMode && (
            <div className="flex bg-[#FFF5F8] p-1 rounded-xl">
              {(["all", "paid", "unpaid"] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    filterStatus === status 
                      ? "bg-white text-[#E27396] shadow-xs" 
                      : "text-[#9C8599] hover:text-[#5C435A]"
                  }`}
                >
                  {status === "all" ? "ทั้งหมด" : status === "paid" ? "จ่ายแล้ว" : "ยังไม่จ่าย"}
                </button>
              ))}
            </div>
          )}

          {isEditMode && (
            <button
              type="button"
              onClick={() => setIsAddingStudent(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FFF5F8] text-[#E27396] hover:bg-[#FCE4EC] rounded-xl text-sm font-bold transition-colors border border-[#EFCFE3] border-dashed"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายชื่อนักเรียน
            </button>
          )}

          {isAddingStudent && (
            <div className="flex items-center gap-2 p-2 bg-[#FFF5F8] rounded-xl border border-[#FCE4EC]">
              <div className="w-7 h-7 rounded-lg bg-[#EFCFE3] text-[#D65A80] flex items-center justify-center text-xs font-bold shrink-0">
                {students.length + 1}
              </div>
              <input
                type="text"
                placeholder="พิมพ์ชื่อนักเรียน..."
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddStudent();
                  else if (e.key === "Escape") setIsAddingStudent(false);
                }}
                className="flex-1 px-2 py-1.5 text-sm bg-white border border-[#D8B4FE] rounded-lg focus:outline-none"
              />
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={handleAddStudent} className="p-1.5 bg-[#88D4AB] text-white rounded-lg hover:bg-[#76BFA0]"><Check className="w-4 h-4" /></button>
                <button onClick={() => setIsAddingStudent(false)} className="p-1.5 bg-white text-[#9C8599] border border-[#FCE4EC] rounded-lg hover:bg-[#FDF2F6]"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable List */}
        <div className="p-2 sm:p-3 space-y-1 bg-[#FFF5F8]/50">
          {isDataNotRecorded ? (
            <div className="h-full flex flex-col items-center justify-center text-[#BDA8BA] space-y-3 py-10">
              <Calendar className="w-12 h-12 opacity-20" />
              <span className="text-sm font-medium text-center leading-relaxed">
                ไม่มีการบันทึกข้อมูล<br/>ของวันที่ {formatThaiDate(checkinDate)}
              </span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#BDA8BA] space-y-3 py-10">
              <Users className="w-12 h-12 opacity-20" />
              <span className="text-sm font-medium">ไม่พบรายชื่อ</span>
            </div>
          ) : (
            filteredStudents.map((student, index) => {
              const isPaid = currentPaidIds.has(student.id);
              return (
                <div
                  key={student.id}
                  onClick={() => !isEditMode && handleToggleCheckin(student.id)}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all ${
                    isPaid && !isEditMode
                      ? "bg-[#EDF8F2] border border-[#BDECD2]"
                      : isEditMode
                      ? "bg-white border border-[#FCE4EC]"
                      : "bg-white border border-transparent hover:border-[#FCE4EC] cursor-pointer shadow-xs"
                  }`}
                >
                  {/* Left Side */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      isPaid && !isEditMode
                        ? "bg-[#88D4AB] text-white shadow-xs"
                        : "bg-[#FDF2F6] text-[#9C8599]"
                    }`}>
                      {student.rollNumber}
                    </div>

                    {isEditMode && editingStudentId === student.id ? (
                      <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-[#EB9AB2] rounded-lg focus:outline-none"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter") handleSaveEditStudent(student.id);
                            else if (e.key === "Escape") setEditingStudentId(null);
                          }}
                        />
                        <button onClick={() => handleSaveEditStudent(student.id)} className="p-1 bg-[#88D4AB] text-white rounded-md"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingStudentId(null)} className="p-1 bg-[#FDF2F6] text-[#9C8599] rounded-md"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-[#5C435A] truncate">
                        {student.name}
                      </div>
                    )}
                  </div>

                  {/* Right Side */}
                  {isEditMode ? (
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col bg-[#FFF5F8] rounded-lg border border-[#FCE4EC]">
                        <button onClick={() => handleMoveStudent(index, index - 1)} disabled={index === 0} className="p-0.5 text-[#9C8599] hover:text-[#E27396] disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => handleMoveStudent(index, index + 1)} disabled={index === students.length - 1} className="p-0.5 text-[#9C8599] hover:text-[#E27396] disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                      </div>
                      <button onClick={() => { setEditingStudentId(student.id); setEditingName(student.name); }} className="p-2 text-[#9C8599] hover:bg-[#FCE4EC] hover:text-[#E27396] rounded-xl"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDeleteId(student.id)} className="p-2 text-[#9C8599] hover:bg-[#FFF0F3] hover:text-[#FF8DA1] rounded-xl"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="shrink-0">
                      {isPaid ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#88D4AB] text-white rounded-xl text-xs font-bold shadow-xs">
                          <CheckCircle2 className="w-4 h-4" /> ชำระแล้ว
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF5F8] text-[#9C8599] border border-[#FCE4EC] rounded-xl text-xs font-bold">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-[#BDA8BA]" /> ยังไม่ชำระ
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FOOTER ACTIONS (Treasurer only) */}
      {mode === "treasurer-manage" && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-[#FDF2F6] space-y-4">
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#FFF5F8] border border-[#FCE4EC] cursor-pointer hover:border-[#EFCFE3] transition-colors">
            <input
              type="checkbox"
              checked={recordAsTransaction}
              onChange={(e) => setRecordAsTransaction(e.target.checked)}
              className="w-5 h-5 rounded border-[#EB9AB2] text-[#E27396] focus:ring-[#EFCFE3]"
            />
            <span className="text-sm font-semibold text-[#5C435A]">
              บันทึกเป็นรายรับลงในบัญชีอัตโนมัติ
            </span>
          </label>

          {successNotice && (
            <div className="p-3 rounded-2xl bg-[#EDF8F2] border border-[#BDECD2] text-[#5A967C] text-sm font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {successNotice}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleToggleAll}
              className={`px-6 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
                isAllPaid
                  ? "bg-white text-[#FF8DA1] border border-[#FFC4D0] hover:bg-[#FFF0F3]"
                  : "bg-white text-[#88D4AB] border border-[#BDECD2] hover:bg-[#EDF8F2]"
              }`}
            >
              {isAllPaid ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  ยกเลิกชำระทั้งหมด
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  ชำระทั้งหมด
                </>
              )}
            </button>
            <button
              onClick={handleSaveCheckin}
              disabled={isSaving}
              className="flex-1 py-3 bg-[#E27396] hover:bg-[#D65A80] text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {isSaving ? (
                "กำลังบันทึก..."
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  บันทึกข้อมูล
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="ยืนยันการลบรายชื่อ"
        message="แน่ใจหรือไม่ที่จะลบรายชื่อนี้? ข้อมูลการจ่ายเงินที่ผ่านมาจะถูกลบด้วย"
        confirmText="ลบรายชื่อ"
        onConfirm={() => confirmDeleteId && handleDeleteStudent(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      
    </div>
  );
}
