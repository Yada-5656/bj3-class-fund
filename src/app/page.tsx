"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_ROOMS, findRoom, RoomInfo } from "@/lib/rooms";
import {
  School,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  GraduationCap,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [selectedGrade, setSelectedGrade] = useState<number>(3); // Default M.3
  const [username, setUsername] = useState("3/15");
  const [password, setPassword] = useState("3/15BJ3");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter rooms by selected grade tab
  const roomsInGrade = ALL_ROOMS.filter((r) => r.grade === selectedGrade);

  // When user clicks a room pill
  const handleSelectRoom = (room: RoomInfo) => {
    setUsername(room.name);
    setPassword(room.expectedPassword);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username,
          password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.room) {
        router.push(`/${data.room.slug}`);
      } else {
        setError(data.error || "เข้าสู่ระบบไม่สำเร็จ โปรดตรวจสอบห้องเรียนและรหัสผ่าน");
      }
    } catch {
      // Client fallback check
      const room = findRoom(username);
      if (room && password.toUpperCase() === room.expectedPassword.toUpperCase()) {
        router.push(`/${room.slug}`);
      } else {
        setError(`รหัสผ่านไม่ถูกต้อง (รูปแบบรหัสผ่าน: ${username || "ห้อง"}BJ3)`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5FB] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Background Decorative Blobs */}
      <div className="fixed top-12 left-10 w-72 h-72 bg-[#C084FC]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-12 right-10 w-80 h-80 bg-[#50F2C8]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#C084FC] to-[#A855F7] text-white shadow-pastel mb-1">
            <School className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#332941]">
            ระบบจัดการเงินห้องเรียน
          </h1>
          <p className="text-sm text-[#7B708A] font-medium">
            โรงเรียนบรรหารแจ่มใสวิทยา 3 (BJ3) • รองรับ 77 ห้องเรียน
          </p>
        </div>

        {/* Main Login Card */}
        <div className="pastel-card p-6 sm:p-8 bg-white/90 backdrop-blur-md shadow-pastel">
          {error && (
            <div className="mb-4 p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl text-xs sm:text-sm text-[#E11D48] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Grade Tabs (M.1 to M.6) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#7B708A]">
                  เลือกระดับชั้น (มัธยมศึกษาปีที่ 1 - 6)
                </label>
                <span className="text-[11px] text-[#A855F7] font-medium">
                  รวมทั้งหมด 77 ห้อง
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1 bg-[#F8F5FB] p-1 rounded-xl border border-[#EFE8F6]">
                {[1, 2, 3, 4, 5, 6].map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setSelectedGrade(grade)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      selectedGrade === grade
                        ? "bg-[#C084FC] text-white shadow-xs"
                        : "text-[#7B708A] hover:text-[#332941]"
                    }`}
                  >
                    ม.{grade}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Pills for Fast Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#7B708A] mb-1.5">
                เลือกห้องเรียนระดับชั้น ม.{selectedGrade} ({roomsInGrade.length} ห้อง)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-[#F8F5FB] rounded-xl border border-[#EFE8F6]">
                {roomsInGrade.map((room) => {
                  const isSelected = username === room.name;
                  return (
                    <button
                      key={room.slug}
                      type="button"
                      onClick={() => handleSelectRoom(room)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                        isSelected
                          ? "bg-[#9333EA] text-white shadow-xs font-bold scale-105"
                          : "bg-white text-[#332941] hover:bg-[#FAF5FF] border border-[#EFE8F6]"
                      }`}
                    >
                      {room.displayName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Room Username Input */}
            <div>
              <label className="block text-xs font-semibold text-[#7B708A] mb-1">
                ชื่อห้องเรียน (Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    const r = findRoom(e.target.value);
                    if (r) setPassword(r.expectedPassword);
                  }}
                  placeholder="เช่น 3/15 หรือ 1/1"
                  className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#7B708A]">
                  รหัสผ่านประจำห้อง (Password)
                </label>
                <span className="text-[11px] text-[#9E94AD]">
                  รูปแบบ: [เลขห้อง] + BJ3
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="เช่น 3/15BJ3"
                  className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#C084FC] to-[#A855F7] hover:opacity-95 shadow-pastel flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <span>{isLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบห้องเรียน"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Shortcuts */}
          <div className="mt-6 pt-5 border-t border-[#F1EDF7] text-center">
            <p className="text-xs text-[#7B708A] mb-2 font-medium">
              ⚡ ทางลัดทดสอบระบบ (คลิกเพื่อเข้าดูห้องตัวอย่าง):
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsername("3/15");
                  setPassword("3/15BJ3");
                  router.push("/3-15");
                }}
                className="px-3 py-1 text-xs bg-[#FAF5FF] hover:bg-[#F3E8FF] text-[#9333EA] font-semibold rounded-lg border border-[#E9D5FF] transition-colors"
              >
                ห้อง ม.3/15 (ตัวอย่างหลัก)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername("1/1");
                  setPassword("1/1BJ3");
                  router.push("/1-1");
                }}
                className="px-3 py-1 text-xs bg-[#FAF5FF] hover:bg-[#F3E8FF] text-[#9333EA] font-semibold rounded-lg border border-[#E9D5FF] transition-colors"
              >
                ห้อง ม.1/1
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername("6/10");
                  setPassword("6/10BJ3");
                  router.push("/6-10");
                }}
                className="px-3 py-1 text-xs bg-[#FAF5FF] hover:bg-[#F3E8FF] text-[#9333EA] font-semibold rounded-lg border border-[#E9D5FF] transition-colors"
              >
                ห้อง ม.6/10
              </button>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <p className="text-center text-xs text-[#9E94AD] mt-6">
          © Class Fund Management System • โรงเรียนบรรหารแจ่มใสวิทยา 3
        </p>
      </div>
    </div>
  );
}
