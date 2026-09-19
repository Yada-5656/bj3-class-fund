"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAllRoomsRanked,
  getPromotionDate,
  setPromotionDate,
  promoteGrades,
  RoomSummary,
} from "@/lib/db";
import { formatCurrency, formatThaiDate, getTodayISODate } from "@/lib/utils";
import { ConfirmModal } from "@/components/Modals";
import {
  ShieldAlert,
  Calendar,
  Save,
  LogOut,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Users,
  KeyRound,
  AlertCircle,
} from "lucide-react";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [rankedRooms, setRankedRooms] = useState<
    {
      roomSlug: string;
      displayName: string;
      summary: RoomSummary;
      totalCollected: number;
    }[]
  >([]);
  const [promotionDateInput, setPromotionDateInput] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);

  // Admin Credentials state
  const [adminUsernameInput, setAdminUsernameInput] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [confirmAdminPasswordInput, setConfirmAdminPasswordInput] = useState("");
  const [adminCredError, setAdminCredError] = useState<string | null>(null);

  // Reset state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTargetRoom, setResetTargetRoom] = useState<{slug: string, name: string} | null>(null);
  const [resetType, setResetType] = useState<"balance" | "names" | "all">("balance");
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetAdminPassword, setResetAdminPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetRoster, setResetRoster] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("bj3_admin_auth");
      if (auth !== "true") {
        router.replace("/");
        return;
      }
      setIsAuthorized(true);

      // Load ranked rooms
      const list = getAllRoomsRanked();
      setRankedRooms(list);

      // Load saved promotion date
      const savedDate = getPromotionDate();
      if (savedDate) {
        setPromotionDateInput(savedDate);
      }

      // Load current admin username
      const curAdminUser = localStorage.getItem("bj3_admin_username") || "admin";
      setAdminUsernameInput(curAdminUser);
    }
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center py-20 text-xs text-[#7B708A]">
        กำลังตรวจสอบสิทธิ์...
      </div>
    );
  }

  // Handle Save Promotion Date
  const handleSavePromotionDate = (e: React.FormEvent) => {
    e.preventDefault();
    setPromotionDate(promotionDateInput || null);
    // Sync to cloud
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_promotion_date",
        promotionDate: promotionDateInput || null,
      }),
    }).catch(() => {});

    setNotice(
      promotionDateInput
        ? `บันทึกวันเลื่อนชั้น: ${formatThaiDate(promotionDateInput)} เรียบร้อยแล้ว`
        : "ล้างวันเลื่อนชั้นเรียบร้อยแล้ว"
    );
    setTimeout(() => setNotice(null), 4000);
  };

  // Handle Manual Trigger Promotion
  const handleConfirmPromotion = () => {
    const result = promoteGrades();
    setShowPromoteConfirm(false);
    // Reload ranked rooms
    const list = getAllRoomsRanked();
    setRankedRooms(list);
    setPromotionDateInput("");
    setNotice(
      `ดำเนินการเลื่อนชั้นสำเร็จ! (ม.3 จบ ${result.m3Graduated} ห้อง, ม.6 จบ ${result.m6Graduated} ห้อง, รวม ${result.totalRooms} ห้อง)`
    );
    setTimeout(() => setNotice(null), 6000);
  };

  const openResetModal = (room: {slug: string, name: string} | null) => {
    setResetTargetRoom(room);
    setResetType("balance");
    setResetStep(1);
    setResetAdminPassword("");
    setResetError("");
    setResetRoster(true);
    setResetModalOpen(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetStep === 1) {
      setResetStep(2);
      return;
    }

    setIsResetting(true);
    setResetError("");

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: resetTargetRoom ? "reset_room" : "reset_all_rooms",
          roomSlug: resetTargetRoom?.slug,
          resetType,
          adminPassword: resetAdminPassword
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Reset failed");
      }
      
      // Update local storage so UI reflects immediately
      const prefix = "bj3_class_fund_room_v5_";
      const roomSlugs = resetTargetRoom ? [resetTargetRoom.slug] : rankedRooms.map(r => r.roomSlug);
      
      for (const slug of roomSlugs) {
        const key = prefix + slug;
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            if (resetType === "all") {
              if (resetRoster) {
                localStorage.removeItem(key);
              } else {
                data.transactions = [];
                data.dailyCheckins = {};
                data.settings = {
                  fundFeePerStudent: 20,
                  treasurerPin: "1234",
                  isInitialized: false,
                  lastCheckinDate: new Date().toISOString().split("T")[0],
                };
                localStorage.setItem(key, JSON.stringify(data));
              }
            } else if (resetType === "balance") {
              data.transactions = [];
              localStorage.setItem(key, JSON.stringify(data));
            } else if (resetType === "names") {
              data.dailyCheckins = {};
              localStorage.setItem(key, JSON.stringify(data));
            }
          } catch (e) {}
        } else if (resetType === "all" && resetRoster) {
           localStorage.removeItem(key);
        }
      }

      setNotice("ดำเนินการรีเซ็ตเรียบร้อยแล้ว");
      setTimeout(() => setNotice(null), 4000);
      setResetModalOpen(false);
      
      // Reload local state to reflect changes
      const list = getAllRoomsRanked();
      setRankedRooms(list);
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCredError(null);

    const user = adminUsernameInput.trim().toLowerCase();
    const pass = adminPasswordInput.trim();

    if (!user) {
      setAdminCredError("กรุณากรอกชื่อผู้ใช้แอดมิน");
      return;
    }
    if (!pass) {
      setAdminCredError("กรุณากรอกรหัสผ่านใหม่");
      return;
    }
    if (pass !== confirmAdminPasswordInput.trim()) {
      setAdminCredError("รหัสผ่านใหม่ไม่ตรงกัน โปรดตรวจสอบอีกครั้ง");
      return;
    }

    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_admin_credentials",
          adminUsername: user,
          adminPassword: pass,
        }),
      });
      
      localStorage.setItem("bj3_admin_username", user);
      localStorage.setItem("bj3_admin_password", pass);
      setAdminPasswordInput("");
      setConfirmAdminPasswordInput("");
      setNotice("บันทึกชื่อผู้ใช้และรหัสผ่านแอดมินใหม่เรียบร้อยแล้ว");
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setAdminCredError("ไม่สามารถบันทึกไปยังเซิร์ฟเวอร์ได้");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("bj3_admin_auth");
    localStorage.removeItem("bj3_admin_auth");
    router.replace("/");
  };

  const handleViewRoom = (roomSlug: string) => {
    localStorage.setItem("bj3_active_room", roomSlug);
    router.push(`/${roomSlug}`);
  };

  const filteredRooms = rankedRooms.filter((r) =>
    r.displayName.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="pastel-card p-4 sm:p-5 bg-white border border-[#E9D5FF] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#C084FC] to-[#A855F7] text-white flex items-center justify-center shadow-pastel flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#332941]">
              ผู้ดูแลระบบ (Admin)
            </h1>
            <p className="text-xs text-[#7B708A]">
              โรงเรียนบรรหารแจ่มใสวิทยา 3 (BJ3)
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#E11D48] bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#FECDD3] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      {/* Notice Alert */}
      {notice && (
        <div className="p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl text-xs sm:text-sm text-[#065F46] flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#10B981] flex-shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Promotion Date Section (ไม่บังคับใส่) */}
      <div className="pastel-card p-5 sm:p-6 bg-white border border-[#E9D5FF] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FAF5FF] text-[#C084FC] border border-[#E9D5FF] flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#332941]">
              กำหนดวันเลื่อนชั้น (Promotion Date)
            </h2>
            <p className="text-[11px] text-[#7B708A]">
              ไม่บังคับใส่ เมื่อถึงวันที่กำหนดระบบจะดำเนินการเลื่อนชั้นและรีเซ็ตให้อัตโนมัติ
            </p>
          </div>
        </div>

        <form onSubmit={handleSavePromotionDate} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <input
              type="date"
              value={promotionDateInput}
              onChange={(e) => setPromotionDateInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs sm:text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#C084FC] hover:bg-[#A855F7] shadow-pastel transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>บันทึกวันเลื่อนชั้น</span>
              </button>

              {promotionDateInput && (
                <button
                  type="button"
                  onClick={() => {
                    setPromotionDateInput("");
                    setPromotionDate(null);
                    setNotice("ล้างวันเลื่อนชั้นเรียบร้อยแล้ว");
                    setTimeout(() => setNotice(null), 3000);
                  }}
                  className="px-3 py-2.5 rounded-xl font-medium text-xs text-[#7B708A] hover:text-[#E11D48] bg-[#F8F5FB] hover:bg-[#FFF1F2] border border-[#EFE8F6] transition-colors"
                  title="ล้างวันที่"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-[#F8F5FB]">
            <span className="text-[11px] text-[#9E94AD]">
              สถานะปัจจุบัน:{" "}
              {promotionDateInput ? (
                <span className="font-semibold text-[#9333EA]">
                  กำหนดไว้ วันที่ {formatThaiDate(promotionDateInput)}
                </span>
              ) : (
                <span>ยังไม่ได้กำหนดวันเลื่อนชั้น</span>
              )}
            </span>

            <button
              type="button"
              onClick={() => setShowPromoteConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#9333EA] hover:text-[#7E22CE] bg-[#FAF5FF] hover:bg-[#F3E8FF] px-3 py-1.5 rounded-xl border border-[#E9D5FF] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ดำเนินการเลื่อนชั้นทันที</span>
            </button>
          </div>
        </form>
      </div>

      {/* Admin Credentials Form */}
      <div className="pastel-card p-5 sm:p-6 bg-white border border-[#E9D5FF] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FAF5FF] text-[#C084FC] border border-[#E9D5FF] flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#332941]">
              เปลี่ยนชื่อผู้ใช้และรหัสผ่านแอดมิน
            </h2>
            <p className="text-[11px] text-[#7B708A]">
              กำหนดชื่อผู้ใช้และรหัสผ่านใหม่สำหรับเข้าสู่ระบบแอดมิน (Admin)
            </p>
          </div>
        </div>

        {adminCredError && (
          <div className="text-xs text-[#E11D48] bg-[#FFF1F2] border border-[#FECDD3] p-2.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{adminCredError}</span>
          </div>
        )}

        <form onSubmit={handleSaveAdminCredentials} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#7B708A] mb-1">
                ชื่อผู้ใช้แอดมิน (Username)
              </label>
              <input
                type="text"
                required
                value={adminUsernameInput}
                onChange={(e) => setAdminUsernameInput(e.target.value)}
                placeholder="เช่น admin"
                className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs sm:text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#7B708A] mb-1">
                รหัสผ่านใหม่ (New Password)
              </label>
              <input
                type="password"
                required
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่"
                className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs sm:text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#7B708A] mb-1">
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                type="password"
                required
                value={confirmAdminPasswordInput}
                onChange={(e) => setConfirmAdminPasswordInput(e.target.value)}
                placeholder="ยืนยันรหัสผ่านใหม่"
                className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs sm:text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
              />
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#C084FC] hover:bg-[#A855F7] shadow-pastel transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อมูลแอดมิน</span>
            </button>
          </div>
        </form>
      </div>

      {/* Classroom Rankings List (เรียงมาเลย 1-77 โดยไม่มีคำว่า "ตารางจัดอันดับ") */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-[#9E94AD] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาห้อง เช่น 3/15"
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#EFE8F6] rounded-xl text-xs text-[#332941] focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openResetModal(null)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FFF1F2] text-[#E11D48] hover:bg-[#FFE4E6] border border-[#FECDD3] rounded-xl text-xs font-bold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">รีเซ็ตทั้งหมดทุกห้อง</span>
              <span className="sm:hidden">รีเซ็ตทั้งหมด</span>
            </button>
            <span className="text-xs text-[#7B708A] font-medium hidden sm:inline">
              ทั้งหมด {filteredRooms.length} ห้อง
            </span>
          </div>
        </div>

        {/* Clean list ranked 1 to N */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredRooms.map((room, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;

            return (
              <div
                key={room.roomSlug}
                className="pastel-card p-4 bg-white border border-[#EFE8F6] hover:border-[#C084FC]/60 transition-all flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Rank Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 ${
                      rank === 1
                        ? "bg-[#FEF9C3] text-[#A16207] border border-[#FDE047]"
                        : rank === 2
                        ? "bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]"
                        : rank === 3
                        ? "bg-[#FFEDD5] text-[#C2410C] border border-[#FDBA74]"
                        : "bg-[#FAF5FF] text-[#7B708A] border border-[#E9D5FF]"
                    }`}
                  >
                    #{rank}
                  </div>

                  {/* Room Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-[#332941] truncate">
                        {room.displayName}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#7B708A] flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#C084FC]" />
                      <span>{room.summary.totalStudents} คน</span>
                      <span className="text-[#EFE8F6]">•</span>
                      <span>ชำระแล้ว {room.summary.paidCount}</span>
                    </div>
                  </div>
                </div>

                {/* Money Collected */}
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                  <div className="text-sm sm:text-base font-extrabold text-[#059669]">
                    {formatCurrency(room.totalCollected)}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openResetModal({ slug: room.roomSlug, name: room.displayName })}
                      className="inline-flex items-center gap-1 text-[11px] text-[#E11D48] hover:text-[#BE123C] bg-[#FFF1F2] hover:bg-[#FFE4E6] px-2.5 py-1 rounded-lg border border-[#FECDD3] font-semibold transition-colors"
                      title="รีเซ็ตห้องนี้"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>รีเซ็ต</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewRoom(room.roomSlug)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#9333EA] hover:text-[#7E22CE] bg-[#FAF5FF] hover:bg-[#F3E8FF] px-2.5 py-1 rounded-lg border border-[#E9D5FF] font-semibold transition-colors"
                    >
                      <span>ดูห้อง</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal for Manual Promotion */}
      <ConfirmModal
        isOpen={showPromoteConfirm}
        title="ยืนยันการดำเนินการเลื่อนชั้น"
        message="การเลื่อนชั้นจะลบข้อมูลห้อง ม.3 และ ม.6 ที่จบการศึกษาออก และเลื่อนข้อมูล ม.1->ม.2->ม.3 รวมถึง ม.4->ม.5->ม.6 พร้อมรีเซ็ต ม.1 และ ม.4 เป็นห้องใหม่ ต้องการดำเนินการทันทีใช่หรือไม่?"
        confirmText="ยืนยันการเลื่อนชั้น"
        onConfirm={handleConfirmPromotion}
        onCancel={() => setShowPromoteConfirm(false)}
      />

      {/* Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#332941]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-pastel flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#EFE8F6] bg-[#FFF1F2]">
              <h2 className="text-sm font-extrabold text-[#E11D48] flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                {resetTargetRoom ? `รีเซ็ตข้อมูลห้อง ${resetTargetRoom.name}` : "รีเซ็ตข้อมูลทั้งหมดทุกห้อง"}
              </h2>
            </div>
            
            <form onSubmit={handleResetSubmit} className="p-4 overflow-y-auto space-y-4">
              {resetError && (
                <div className="p-3 bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] text-xs font-medium rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetStep === 1 ? (
                <>
                  <p className="text-xs text-[#7B708A] font-medium mb-3">
                    กรุณาเลือกรูปแบบการรีเซ็ตข้อมูล:
                  </p>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${resetType === 'balance' ? 'bg-[#F8F5FB] border-[#C084FC]' : 'border-[#EFE8F6] hover:bg-gray-50'}`}>
                      <input type="radio" name="resetType" value="balance" checked={resetType === 'balance'} onChange={() => setResetType('balance')} className="mt-0.5 text-[#C084FC] focus:ring-[#C084FC]" />
                      <div>
                        <div className="text-sm font-bold text-[#332941]">รีเซ็ตจำนวนเงิน (ธุรกรรม)</div>
                        <div className="text-[11px] text-[#7B708A]">ลบประวัติรายรับ-รายจ่ายทั้งหมด ยอดเงินจะกลับเป็น 0 บาท แต่รายชื่อที่เช็คแล้วยังคงอยู่</div>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${resetType === 'names' ? 'bg-[#F8F5FB] border-[#C084FC]' : 'border-[#EFE8F6] hover:bg-gray-50'}`}>
                      <input type="radio" name="resetType" value="names" checked={resetType === 'names'} onChange={() => setResetType('names')} className="mt-0.5 text-[#C084FC] focus:ring-[#C084FC]" />
                      <div>
                        <div className="text-sm font-bold text-[#332941]">รีเซ็ตรายชื่อ (การเช็คชื่อ)</div>
                        <div className="text-[11px] text-[#7B708A]">ลบประวัติการเช็คชื่อจ่ายเงินทั้งหมด นักเรียนทุกคนจะกลับมาอยู่ในสถานะ "ยังไม่จ่าย"</div>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${resetType === 'all' ? 'bg-[#FFF1F2] border-[#E11D48]' : 'border-[#EFE8F6] hover:bg-gray-50'}`}>
                      <input type="radio" name="resetType" value="all" checked={resetType === 'all'} onChange={() => setResetType('all')} className="mt-0.5 text-[#E11D48] focus:ring-[#E11D48]" />
                      <div className="w-full">
                        <div className="text-sm font-bold text-[#E11D48]">รีเซ็ตทั้งหมด (ค่าเริ่มต้น)</div>
                        <div className="text-[11px] text-[#7B708A]">ลบจำนวนเงิน, ล้างประวัติการเช็คชื่อ และรีเซ็ตรหัสผ่านเหรัญญิกกลับไปเป็นค่าเริ่มต้น</div>
                        {resetType === 'all' && (
                          <div className="mt-3 pt-3 border-t border-[#FECDD3] flex items-center gap-2 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                             <input type="checkbox" id="resetRoster" checked={resetRoster} onChange={(e) => setResetRoster(e.target.checked)} className="text-[#E11D48] focus:ring-[#E11D48] rounded w-4 h-4 cursor-pointer" />
                             <label htmlFor="resetRoster" className="text-[11px] text-[#E11D48] font-semibold cursor-pointer select-none">คืนค่ารายชื่อนักเรียนดั้งเดิมด้วย (ลบรายชื่อที่เคยแก้ไข)</label>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl mb-4">
                    <div className="flex gap-2 text-[#E11D48]">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <div className="text-xs font-bold">
                        คุณกำลังดำเนินการ: {resetType === 'balance' ? "รีเซ็ตจำนวนเงิน" : resetType === 'names' ? "รีเซ็ตรายชื่อ" : "รีเซ็ตทั้งหมด"}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#E11D48]/80 mt-1 pl-6">
                      การดำเนินการนี้ไม่สามารถย้อนกลับได้ กรุณายืนยันด้วยรหัสแอดมิน
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#7B708A] mb-1">
                      รหัสผ่านแอดมินปัจจุบัน
                    </label>
                    <input
                      type="password"
                      required
                      autoFocus
                      value={resetAdminPassword}
                      onChange={(e) => setResetAdminPassword(e.target.value)}
                      placeholder="กรอกรหัสแอดมินเพื่อยืนยัน"
                      className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-xs sm:text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2 border-t border-[#EFE8F6]">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  disabled={isResetting}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-[#7B708A] bg-white border border-[#EFE8F6] hover:bg-[#F8F5FB] transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                {resetStep === 1 ? (
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#C084FC] hover:bg-[#A855F7] shadow-pastel transition-colors"
                  >
                    ถัดไป
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isResetting || !resetAdminPassword}
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#E11D48] hover:bg-[#BE123C] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isResetting ? (
                      <span className="animate-pulse">กำลังรีเซ็ต...</span>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>ยืนยันรีเซ็ต</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
