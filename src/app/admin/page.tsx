"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getAllRoomsRanked,
  getPromotionDate,
  setPromotionDate,
  promoteGrades,
  RoomSummary,
} from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import { ConfirmModal } from "@/components/Modals";
import {
  ShieldAlert,
  Calendar,
  Save,
  LogOut,
  Search,
  RotateCcw,
  ExternalLink,
  Users,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
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
  const [sortBy, setSortBy] = useState<"balance-desc" | "balance-asc" | "room-asc" | "room-desc">("balance-desc");
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
      <div className="flex items-center justify-center py-20 text-xs text-[#9C8599]">
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
  ).sort((a, b) => {
    if (sortBy === "balance-desc") return b.summary.totalBalance - a.summary.totalBalance;
    if (sortBy === "balance-asc") return a.summary.totalBalance - b.summary.totalBalance;
    
    const parseRoom = (slug: string) => {
      const parts = slug.split('-');
      return { grade: parseInt(parts[0] || "0", 10), room: parseInt(parts[1] || "0", 10) };
    };
    const roomA = parseRoom(a.roomSlug);
    const roomB = parseRoom(b.roomSlug);
    
    if (sortBy === "room-asc") {
      if (roomA.grade !== roomB.grade) return roomA.grade - roomB.grade;
      return roomA.room - roomB.room;
    }
    if (sortBy === "room-desc") {
      if (roomA.grade !== roomB.grade) return roomB.grade - roomA.grade;
      return roomB.room - roomA.room;
    }
    return 0;
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="pastel-card p-4 sm:p-5 bg-white border border-[#EFCFE3] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#EB9AB2] to-[#D9849D] text-white flex items-center justify-center shadow-pastel flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#5C435A]">
              ผู้ดูแลระบบ (Admin)
            </h1>
            <p className="text-xs text-[#9C8599]">
              โรงเรียนบรรหารแจ่มใสวิทยา 3 (BJ3)
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#FF8DA1] bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#FFC4D0] transition-colors"
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
      <div className="pastel-card p-5 sm:p-6 bg-white border border-[#EFCFE3] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFF5F8] text-[#EB9AB2] border border-[#EFCFE3] flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#5C435A]">
              กำหนดวันเลื่อนชั้น (Promotion Date)
            </h2>
            <p className="text-[11px] text-[#9C8599]">
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
              className="flex-1 px-3.5 py-2.5 bg-[#FFF5F8] border border-[#FCE4EC] rounded-xl text-xs sm:text-sm text-[#5C435A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#EB9AB2]"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#EB9AB2] hover:bg-[#D9849D] shadow-pastel transition-colors"
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
                  className="px-3 py-2.5 rounded-xl font-medium text-xs text-[#9C8599] hover:text-[#FF8DA1] bg-[#FFF5F8] hover:bg-[#FFF1F2] border border-[#FCE4EC] transition-colors"
                  title="ล้างวันที่"
                >
                  ล้าง
                </button>
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-[#FFF5F8]">
            <span className="text-[11px] text-[#BDA8BA]">
              สถานะปัจจุบัน:{" "}
              {promotionDateInput ? (
                <span className="font-semibold text-[#E27396]">
                  กำหนดไว้ วันที่ {formatThaiDate(promotionDateInput)}
                </span>
              ) : (
                <span>ยังไม่ได้กำหนดวันเลื่อนชั้น</span>
              )}
            </span>

            <button
              type="button"
              onClick={() => setShowPromoteConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#E27396] hover:text-[#D65A80] bg-[#FFF5F8] hover:bg-[#FCE4EC] px-3 py-1.5 rounded-xl border border-[#EFCFE3] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ดำเนินการเลื่อนชั้นทันที</span>
            </button>
          </div>
        </form>
      </div>

      {/* Admin Credentials Form */}
      <div className="pastel-card p-5 sm:p-6 bg-white border border-[#EFCFE3] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFF5F8] text-[#EB9AB2] border border-[#EFCFE3] flex items-center justify-center">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#5C435A]">
              เปลี่ยนชื่อผู้ใช้และรหัสผ่านแอดมิน
            </h2>
            <p className="text-[11px] text-[#9C8599]">
              กำหนดชื่อผู้ใช้และรหัสผ่านใหม่สำหรับเข้าสู่ระบบแอดมิน (Admin)
            </p>
          </div>
        </div>

        {adminCredError && (
          <div className="text-xs text-[#FF8DA1] bg-[#FFF1F2] border border-[#FFC4D0] p-2.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{adminCredError}</span>
          </div>
        )}

        <form onSubmit={handleSaveAdminCredentials} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#9C8599] mb-1">
                ชื่อผู้ใช้แอดมิน (Username)
              </label>
              <input
                type="text"
                required
                value={adminUsernameInput}
                onChange={(e) => setAdminUsernameInput(e.target.value)}
                placeholder="เช่น admin"
                className="w-full px-3.5 py-2.5 bg-[#FFF5F8] border border-[#FCE4EC] rounded-xl text-xs sm:text-sm text-[#5C435A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#EB9AB2]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#9C8599] mb-1">
                รหัสผ่านใหม่ (New Password)
              </label>
              <input
                type="password"
                required
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่"
                className="w-full px-3.5 py-2.5 bg-[#FFF5F8] border border-[#FCE4EC] rounded-xl text-xs sm:text-sm text-[#5C435A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#EB9AB2]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#9C8599] mb-1">
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                type="password"
                required
                value={confirmAdminPasswordInput}
                onChange={(e) => setConfirmAdminPasswordInput(e.target.value)}
                placeholder="ยืนยันรหัสผ่านใหม่"
                className="w-full px-3.5 py-2.5 bg-[#FFF5F8] border border-[#FCE4EC] rounded-xl text-xs sm:text-sm text-[#5C435A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#EB9AB2]"
              />
            </div>
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#EB9AB2] hover:bg-[#D9849D] shadow-pastel transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกข้อมูลแอดมิน</span>
            </button>
          </div>
        </form>
      </div>

      {/* Classroom Rankings List */}
      <div className="space-y-3">
        {/* Search & Sort bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#BDA8BA] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาห้อง เช่น 3/15"
                className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#FCE4EC] rounded-xl text-xs text-[#5C435A] focus:outline-none focus:ring-2 focus:ring-[#EB9AB2]"
              />
            </div>
            
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none pl-3 pr-8 py-2 bg-white border border-[#FCE4EC] rounded-xl text-xs text-[#9C8599] font-semibold focus:outline-none focus:ring-2 focus:ring-[#EB9AB2] cursor-pointer"
              >
                <option value="balance-desc">เงิน (มากไปน้อย)</option>
                <option value="balance-asc">เงิน (น้อยไปมาก)</option>
                <option value="room-asc">ห้อง (น้อยไปมาก)</option>
                <option value="room-desc">ห้อง (มากไปน้อย)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#9C8599]">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <span className="text-xs text-[#9C8599] font-medium inline sm:hidden">
              {filteredRooms.length} ห้อง
            </span>
            <button
              onClick={() => openResetModal(null)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FFF1F2] text-[#FF8DA1] hover:bg-[#FFE4E6] border border-[#FFC4D0] rounded-xl text-xs font-bold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">รีเซ็ตทั้งหมดทุกห้อง</span>
              <span className="sm:hidden">รีเซ็ตทั้งหมด</span>
            </button>
            <span className="text-xs text-[#9C8599] font-medium hidden sm:inline">
              ทั้งหมด {filteredRooms.length} ห้อง
            </span>
          </div>
        </div>

        {/* Clean list ranked 1 to N */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredRooms.map((room, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;

            const bgClasses = ["bg-[#E5F6FA]", "bg-[#FFFDE8]", "bg-[#FDF2F6]", "bg-[#EDF8F2]", "bg-[#F4F1FA]"];
            const borderClasses = ["border-[#B3DEE2]", "border-[#FCEEA8]", "border-[#FAD7E4]", "border-[#A9D8B6]", "border-[#D8B4E2]"];
            const hoverBorderClasses = ["hover:border-[#77C1D1]", "hover:border-[#D9A619]", "hover:border-[#EB9AB2]", "hover:border-[#76BFA0]", "hover:border-[#C084FC]"];
            
            const colorIdx = index % 5;
            const rowClass = `pastel-card p-4 ${bgClasses[colorIdx]} border ${borderClasses[colorIdx]} ${hoverBorderClasses[colorIdx]} transition-all flex items-center justify-between gap-3 shadow-xs`;

            return (
              <div
                key={room.roomSlug}
                className={rowClass}
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
                        : "bg-[#FFF5F8] text-[#9C8599] border border-[#EFCFE3]"
                    }`}
                  >
                    #{rank}
                  </div>

                  {/* Room Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-[#5C435A] truncate">
                        {room.displayName}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#9C8599] flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#EB9AB2]" />
                      <span>{room.summary.totalStudents} คน</span>
                      <span className="text-[#FCE4EC]">•</span>
                      <span>ชำระแล้ว {room.summary.paidCount}</span>
                    </div>
                  </div>
                </div>

                {/* Money Collected */}
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                  <div className="text-sm sm:text-base font-extrabold text-[#76BFA0]">
                    {formatCurrency(room.totalCollected)}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openResetModal({ slug: room.roomSlug, name: room.displayName })}
                      className="inline-flex items-center gap-1 text-[11px] text-[#FF8DA1] hover:text-[#E57388] bg-[#FFF1F2] hover:bg-[#FFE4E6] px-2.5 py-1 rounded-lg border border-[#FFC4D0] font-semibold transition-colors"
                      title="รีเซ็ตห้องนี้"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>รีเซ็ต</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleViewRoom(room.roomSlug)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#E27396] hover:text-[#D65A80] bg-[#FFF5F8] hover:bg-[#FCE4EC] px-2.5 py-1 rounded-lg border border-[#EFCFE3] font-semibold transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5C435A]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-pastel flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#FCE4EC] bg-[#FFF1F2]">
              <h2 className="text-sm font-extrabold text-[#FF8DA1] flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                {resetTargetRoom ? `รีเซ็ตข้อมูลห้อง ${resetTargetRoom.name}` : "รีเซ็ตข้อมูลทั้งหมดทุกห้อง"}
              </h2>
            </div>
            
            <form onSubmit={handleResetSubmit} className="p-4 overflow-y-auto space-y-4">
              {resetError && (
                <div className="p-3 bg-[#FFF1F2] border border-[#FFC4D0] text-[#FF8DA1] text-xs font-medium rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetStep === 1 ? (
                <>
                  <p className="text-xs text-[#9C8599] font-medium mb-3">
                    กรุณาเลือกรูปแบบการรีเซ็ตข้อมูล:
                  </p>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${resetType === 'balance' ? 'bg-[#FFF5F8] border-[#EB9AB2]' : 'border-[#FCE4EC] hover:bg-gray-50'}`}>
                      <input type="radio" name="resetType" value="balance" checked={resetType === 'balance'} onChange={() => setResetType('balance')} className="mt-0.5 text-[#EB9AB2] focus:ring-[#EB9AB2]" />
                      <div>
                        <div className="text-sm font-bold text-[#5C435A]">รีเซ็ตจำนวนเงิน (ธุรกรรม)</div>
                        <div className="text-[11px] text-[#9C8599]">ลบประวัติรายรับ-รายจ่ายทั้งหมด ยอดเงินจะกลับเป็น 0 บาท แต่รายชื่อที่เช็คแล้วยังคงอยู่</div>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${resetType === 'names' ? 'bg-[#FFF5F8] border-[#EB9AB2]' : 'border-[#FCE4EC] hover:bg-gray-50'}`}>
                      <input type="radio" name="resetType" value="names" checked={resetType === 'names'} onChange={() => setResetType('names')} className="mt-0.5 text-[#EB9AB2] focus:ring-[#EB9AB2]" />
                      <div>
                        <div className="text-sm font-bold text-[#5C435A]">รีเซ็ตรายชื่อ (การเช็คชื่อ)</div>
                        <div className="text-[11px] text-[#9C8599]">ลบประวัติการเช็คชื่อจ่ายเงินทั้งหมด นักเรียนทุกคนจะกลับมาอยู่ในสถานะ "ยังไม่จ่าย"</div>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${resetType === 'all' ? 'bg-[#FFF1F2] border-[#FF8DA1]' : 'border-[#FCE4EC] hover:bg-gray-50'}`}>
                      <input type="radio" name="resetType" value="all" checked={resetType === 'all'} onChange={() => setResetType('all')} className="mt-0.5 text-[#FF8DA1] focus:ring-[#FF8DA1]" />
                      <div className="w-full">
                        <div className="text-sm font-bold text-[#FF8DA1]">รีเซ็ตทั้งหมด (ค่าเริ่มต้น)</div>
                        <div className="text-[11px] text-[#9C8599]">ลบจำนวนเงิน, ล้างประวัติการเช็คชื่อ และรีเซ็ตรหัสผ่านเหรัญญิกกลับไปเป็นค่าเริ่มต้น</div>
                        {resetType === 'all' && (
                          <div className="mt-3 pt-3 border-t border-[#FFC4D0] flex items-center gap-2 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                             <input type="checkbox" id="resetRoster" checked={resetRoster} onChange={(e) => setResetRoster(e.target.checked)} className="text-[#FF8DA1] focus:ring-[#FF8DA1] rounded w-4 h-4 cursor-pointer" />
                             <label htmlFor="resetRoster" className="text-[11px] text-[#FF8DA1] font-semibold cursor-pointer select-none">คืนค่ารายชื่อนักเรียนดั้งเดิมด้วย (ลบรายชื่อที่เคยแก้ไข)</label>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-[#FFF1F2] border border-[#FFC4D0] rounded-xl mb-4">
                    <div className="flex gap-2 text-[#FF8DA1]">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <div className="text-xs font-bold">
                        คุณกำลังดำเนินการ: {resetType === 'balance' ? "รีเซ็ตจำนวนเงิน" : resetType === 'names' ? "รีเซ็ตรายชื่อ" : "รีเซ็ตทั้งหมด"}
                      </div>
                    </div>
                    <p className="text-[11px] text-[#FF8DA1]/80 mt-1 pl-6">
                      การดำเนินการนี้ไม่สามารถย้อนกลับได้ กรุณายืนยันด้วยรหัสแอดมิน
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9C8599] mb-1">
                      รหัสผ่านแอดมินปัจจุบัน
                    </label>
                    <input
                      type="password"
                      required
                      autoFocus
                      value={resetAdminPassword}
                      onChange={(e) => setResetAdminPassword(e.target.value)}
                      placeholder="กรอกรหัสแอดมินเพื่อยืนยัน"
                      className="w-full px-3.5 py-2.5 bg-[#FFF5F8] border border-[#FCE4EC] rounded-xl text-xs sm:text-sm text-[#5C435A] font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF8DA1]"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-2 border-t border-[#FCE4EC]">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  disabled={isResetting}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-[#9C8599] bg-white border border-[#FCE4EC] hover:bg-[#FFF5F8] transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                {resetStep === 1 ? (
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#EB9AB2] hover:bg-[#D9849D] shadow-pastel transition-colors"
                  >
                    ถัดไป
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isResetting || !resetAdminPassword}
                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-[#FF8DA1] hover:bg-[#E57388] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
