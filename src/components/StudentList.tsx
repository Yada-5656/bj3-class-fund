"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Student } from "@/lib/db";
import { formatCurrency, getTodayISODate } from "@/lib/utils";
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
    if (!window.confirm("แน่ใจหรือไม่ที่จะลบรายชื่อนี้?")) return;
    
    const updated = students
      .filter(s => s.id !== id)
      .map((s, idx) => ({ ...s, rollNumber: idx + 1 }));

    const cleanedHistory: Record<string, string[]> = {};
    for (const [date, ids] of Object.entries(checkinHistory)) {
      cleanedHistory[date] = Array.isArray(ids) ? ids.filter(studentId => studentId !== id) : [];
    }
    
    setCheckinHistory(cleanedHistory);
    handleAutoPersistRoster(updated, cleanedHistory);
  };

  const handleMoveStudent = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= students.length) return;
    const copy = [...students];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    const reindexed = copy.map((s, idx) => ({ ...s, rollNumber: idx + 1 }));
    handleAutoPersistRoster(reindexed);
  };

  // --- RENDER ---
  return (
    <div className="space-y-4 font-sans relative">
      {/* HEADER SECTION (Treasurer only) */}
      {mode === "treasurer-manage" && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-[#F1EDF7] space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-[#332941] font-bold flex items-center gap-2">
              <div className="w-2 h-6 bg-[#C084FC] rounded-full"></div>
              เช็คชื่อรายวัน
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C084FC]" />
                <input
                  type="date"
                  value={checkinDate}
                  onChange={(e) => setCheckinDate(e.target.value)}
                  className="w-full sm:w-auto pl-9 pr-3 py-2 bg-[#FAF5FF] border border-[#E9D5FF] rounded-xl text-sm font-semibold text-[#332941] focus:outline-none focus:border-[#C084FC]"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`p-2 rounded-xl border transition-colors ${
                  isEditMode 
                    ? "bg-[#332941] border-[#332941] text-white" 
                    : "bg-[#F8F5FB] border-[#EFE8F6] text-[#7B708A] hover:bg-[#EFE8F6]"
                }`}
                title="จัดการรายชื่อ"
              >
                <UserCog className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-3 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[#166534] text-xs font-bold mb-1">จ่ายแล้ว</span>
              <span className="text-xl font-black text-[#15803D]">{paidCount}</span>
            </div>
            <div className="bg-[#FEF2F2] border border-[#FECDD3] p-3 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[#9F1239] text-xs font-bold mb-1">ยังไม่จ่าย</span>
              <span className="text-xl font-black text-[#BE123C]">{unpaidCount}</span>
            </div>
            <div className="bg-[#FAF5FF] border border-[#E9D5FF] p-3 rounded-2xl flex flex-col items-center justify-center">
              <span className="text-[#6B21A8] text-xs font-bold mb-1">ยอดรวมวันนี้</span>
              <span className="text-xl font-black text-[#7E22CE] truncate w-full text-center">
                {formatCurrency(totalFundCalculated, false)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LIST SECTION */}
      <div className="bg-white rounded-3xl shadow-sm border border-[#F1EDF7] overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-[#F1EDF7] space-y-3 bg-white z-10 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E94AD]" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือ เลขที่..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#F8F5FB] border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E9D5FF] text-[#332941]"
            />
          </div>

          {mode === "treasurer-manage" && !isEditMode && (
            <div className="flex bg-[#F8F5FB] p-1 rounded-xl">
              {(["all", "paid", "unpaid"] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    filterStatus === status 
                      ? "bg-white text-[#9333EA] shadow-xs" 
                      : "text-[#7B708A] hover:text-[#332941]"
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
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FAF5FF] text-[#9333EA] hover:bg-[#F3E8FF] rounded-xl text-sm font-bold transition-colors border border-[#E9D5FF] border-dashed"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายชื่อนักเรียน
            </button>
          )}

          {isAddingStudent && (
            <div className="flex items-center gap-2 p-2 bg-[#F8F5FB] rounded-xl border border-[#EFE8F6]">
              <div className="w-7 h-7 rounded-lg bg-[#E9D5FF] text-[#7E22CE] flex items-center justify-center text-xs font-bold shrink-0">
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
                <button onClick={handleAddStudent} className="p-1.5 bg-[#22C55E] text-white rounded-lg hover:bg-[#16A34A]"><Check className="w-4 h-4" /></button>
                <button onClick={() => setIsAddingStudent(false)} className="p-1.5 bg-white text-[#7B708A] border border-[#EFE8F6] rounded-lg hover:bg-[#F1EDF7]"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable List */}
        <div className="p-2 sm:p-3 space-y-1 bg-[#F8F5FB]/50">
          {filteredStudents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[#9E94AD] space-y-3">
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
                      ? "bg-[#F0FDF4] border border-[#BBF7D0]"
                      : isEditMode
                      ? "bg-white border border-[#EFE8F6]"
                      : "bg-white border border-transparent hover:border-[#EFE8F6] cursor-pointer shadow-xs"
                  }`}
                >
                  {/* Left Side */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      isPaid && !isEditMode
                        ? "bg-[#22C55E] text-white shadow-xs"
                        : "bg-[#F1EDF7] text-[#7B708A]"
                    }`}>
                      {student.rollNumber}
                    </div>

                    {isEditMode && editingStudentId === student.id ? (
                      <div className="flex items-center gap-1.5 flex-1" onClick={e => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-[#C084FC] rounded-lg focus:outline-none"
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === "Enter") handleSaveEditStudent(student.id);
                            else if (e.key === "Escape") setEditingStudentId(null);
                          }}
                        />
                        <button onClick={() => handleSaveEditStudent(student.id)} className="p-1 bg-[#22C55E] text-white rounded-md"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingStudentId(null)} className="p-1 bg-[#F1EDF7] text-[#7B708A] rounded-md"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-[#332941] truncate">
                        {student.name}
                      </div>
                    )}
                  </div>

                  {/* Right Side */}
                  {isEditMode ? (
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col bg-[#F8F5FB] rounded-lg border border-[#EFE8F6]">
                        <button onClick={() => handleMoveStudent(index, index - 1)} disabled={index === 0} className="p-0.5 text-[#7B708A] hover:text-[#9333EA] disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => handleMoveStudent(index, index + 1)} disabled={index === students.length - 1} className="p-0.5 text-[#7B708A] hover:text-[#9333EA] disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                      </div>
                      <button onClick={() => { setEditingStudentId(student.id); setEditingName(student.name); }} className="p-2 text-[#7B708A] hover:bg-[#F3E8FF] hover:text-[#9333EA] rounded-xl"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteStudent(student.id)} className="p-2 text-[#7B708A] hover:bg-[#FEF2F2] hover:text-[#E11D48] rounded-xl"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="shrink-0">
                      {isPaid ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#22C55E] text-white rounded-xl text-xs font-bold shadow-xs">
                          <CheckCircle2 className="w-4 h-4" /> ชำระแล้ว
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8F5FB] text-[#7B708A] border border-[#EFE8F6] rounded-xl text-xs font-bold">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-[#9E94AD]" /> ยังไม่ชำระ
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
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-[#F1EDF7] space-y-4">
          <label className="flex items-center gap-3 p-3 rounded-2xl bg-[#F8F5FB] border border-[#EFE8F6] cursor-pointer hover:border-[#E9D5FF] transition-colors">
            <input
              type="checkbox"
              checked={recordAsTransaction}
              onChange={(e) => setRecordAsTransaction(e.target.checked)}
              className="w-5 h-5 rounded border-[#C084FC] text-[#9333EA] focus:ring-[#E9D5FF]"
            />
            <span className="text-sm font-semibold text-[#332941]">
              บันทึกเป็นรายรับลงในบัญชีอัตโนมัติ
            </span>
          </label>

          {successNotice && (
            <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-sm font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              {successNotice}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleToggleAll}
              className={`px-6 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shrink-0 ${
                isAllPaid
                  ? "bg-white text-[#E11D48] border border-[#FECDD3] hover:bg-[#FEF2F2]"
                  : "bg-white text-[#22C55E] border border-[#BBF7D0] hover:bg-[#F0FDF4]"
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
              className="flex-1 py-3 bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
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
    </div>
  );
}
