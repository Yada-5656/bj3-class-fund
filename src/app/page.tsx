"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { findRoom, validateLogin } from "@/lib/rooms";
import { checkAndRunPromotion } from "@/lib/db";
import {
  School,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Auto-login / remember room & promotion check
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Automatic promotion check if date reached
      checkAndRunPromotion();

      const activeRoom = localStorage.getItem("bj3_active_room");
      if (activeRoom) {
        // If room was M.3 or M.6 and graduated/wiped, clear active room
        if (activeRoom.startsWith("3-") || activeRoom.startsWith("6-")) {
          const raw = localStorage.getItem(`bj3_class_fund_room_v5_${activeRoom}`);
          if (!raw) {
            localStorage.removeItem("bj3_active_room");
            setIsCheckingSession(false);
            return;
          }
        }
        router.replace(`/${activeRoom}`);
        return;
      }
      setIsCheckingSession(false);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    // 1. Direct admin check: "ถ้าเข้าไปแล้วไม่ต้องเซฟหน้านั้นไว้ เฉพาะหน้าแอดมินนะ"
    if (cleanUser.toLowerCase() === "admin" && cleanPass === "1706") {
      sessionStorage.setItem("bj3_admin_auth", "true");
      localStorage.removeItem("bj3_admin_auth");
      router.push("/admin");
      return;
    }

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username: cleanUser,
          password: cleanPass,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.isAdmin) {
          sessionStorage.setItem("bj3_admin_auth", "true");
          localStorage.removeItem("bj3_admin_auth");
          router.push("/admin");
          return;
        }
        if (data.room) {
          localStorage.setItem("bj3_active_room", data.room.slug);
          router.push(`/${data.room.slug}`);
          return;
        }
      }

      setError(data.error || "ชื่อห้องเรียนหรือรหัสผ่านไม่ถูกต้อง");
    } catch {
      // Client fallback check
      const check = validateLogin(cleanUser, cleanPass);
      if (check.isAdmin) {
        sessionStorage.setItem("bj3_admin_auth", "true");
        localStorage.removeItem("bj3_admin_auth");
        router.push("/admin");
        return;
      }
      if (check.success && check.room) {
        localStorage.setItem("bj3_active_room", check.room.slug);
        router.push(`/${check.room.slug}`);
      } else {
        setError(check.error || "ชื่อห้องเรียนหรือรหัสผ่านไม่ถูกต้อง โปรดตรวจสอบอีกครั้ง");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#F8F5FB] flex items-center justify-center">
        <div className="text-xs text-[#7B708A] font-medium flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#C084FC] border-t-transparent rounded-full animate-spin" />
          <span>กำลังโหลดระบบ...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5FB] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Background Decorative Blobs */}
      <div className="fixed top-12 left-10 w-72 h-72 bg-[#C084FC]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-12 right-10 w-80 h-80 bg-[#50F2C8]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#C084FC] to-[#A855F7] text-white shadow-pastel mb-1">
            <School className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#332941]">
            ระบบจัดการเงินห้องเรียน
          </h1>
          <p className="text-sm text-[#7B708A] font-medium">
            โรงเรียนบรรหารแจ่มใสวิทยา 3 (BJ3)
          </p>
        </div>

        {/* Main Login Card - Clean & Minimalist */}
        <div className="pastel-card p-6 sm:p-8 bg-white/95 backdrop-blur-md shadow-pastel">
          {error && (
            <div className="mb-4 p-3 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl text-xs sm:text-sm text-[#E11D48] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Room Username Input */}
            <div>
              <label className="block text-xs font-semibold text-[#7B708A] mb-1.5">
                ห้องเรียน
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกเลขห้อง เช่น 1/5 หรือ 3/15"
                className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
                autoFocus
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold text-[#7B708A] mb-1.5">
                รหัสผ่านประจำห้อง
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านประจำห้อง"
                  className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full mt-3 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#C084FC] to-[#A855F7] hover:opacity-95 shadow-pastel flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              <span>{isLoading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบห้องเรียน"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <p className="text-center text-xs text-[#9E94AD] mt-6">
          © Class Fund Management System • โรงเรียนบรรหารแจ่มใสวิทยา 3
        </p>
      </div>
    </div>
  );
}
