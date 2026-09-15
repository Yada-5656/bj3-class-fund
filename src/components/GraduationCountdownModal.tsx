"use client";

import React, { useState, useEffect } from "react";
import { formatThaiDate } from "@/lib/utils";
import { Clock, X, AlertTriangle, GraduationCap } from "lucide-react";

interface GraduationCountdownModalProps {
  grade: number;
  displayName: string;
  promotionDate: string | null;
}

export default function GraduationCountdownModal({
  grade,
  displayName,
  promotionDate,
}: GraduationCountdownModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    // Only show for graduating classes: M.3 and M.6
    if (grade !== 3 && grade !== 6) return;
    if (!promotionDate) return;

    // Check if dismissed in this session
    const dismissedKey = `bj3_dismiss_countdown_${grade}`;
    if (sessionStorage.getItem(dismissedKey)) return;

    const targetTime = new Date(`${promotionDate}T00:00:00`).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    setIsOpen(true);

    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [grade, promotionDate]);

  if (!isOpen || !promotionDate || !timeLeft) return null;

  const handleClose = () => {
    sessionStorage.setItem(`bj3_dismiss_countdown_${grade}`, "true");
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#332941]/40 backdrop-blur-xs animate-fadeIn">
      <div className="relative pastel-card w-full max-w-md bg-white p-6 sm:p-7 shadow-pastel border-2 border-[#FCA5A5] text-center space-y-4">
        {/* Close Button [X] */}
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-4 right-4 p-1.5 rounded-full text-[#9E94AD] hover:text-[#332941] hover:bg-[#F8F5FB] transition-colors"
          title="ปิดการแจ้งเตือน"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-[#FF96A8] to-[#FB7185] text-white flex items-center justify-center shadow-pastel">
          <GraduationCap className="w-7 h-7" />
        </div>

        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3] mb-2">
            ประกาศสำคัญสำหรับนักเรียนห้อง {displayName}
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#332941]">
            แจ้งเตือนการสิ้นสุดปีการศึกษา
          </h2>
          <p className="text-xs text-[#7B708A] mt-1">
            เนื่องจากระดับชั้น ม.{grade} จะสำเร็จการศึกษา ระบบห้องเรียนจะปิดตัวลงในวันที่:
          </p>
          <p className="text-sm font-bold text-[#E11D48] mt-0.5">
            {formatThaiDate(promotionDate)}
          </p>
        </div>

        {/* Countdown Display */}
        <div className="grid grid-cols-4 gap-2 py-2">
          <div className="bg-[#FFF5F7] border border-[#FECDD3] rounded-2xl p-2.5">
            <div className="text-xl sm:text-2xl font-black text-[#E11D48]">
              {timeLeft.days}
            </div>
            <div className="text-[10px] text-[#7B708A] font-semibold">วัน</div>
          </div>
          <div className="bg-[#FFF5F7] border border-[#FECDD3] rounded-2xl p-2.5">
            <div className="text-xl sm:text-2xl font-black text-[#E11D48]">
              {timeLeft.hours}
            </div>
            <div className="text-[10px] text-[#7B708A] font-semibold">ชั่วโมง</div>
          </div>
          <div className="bg-[#FFF5F7] border border-[#FECDD3] rounded-2xl p-2.5">
            <div className="text-xl sm:text-2xl font-black text-[#E11D48]">
              {timeLeft.minutes}
            </div>
            <div className="text-[10px] text-[#7B708A] font-semibold">นาที</div>
          </div>
          <div className="bg-[#FFF5F7] border border-[#FECDD3] rounded-2xl p-2.5">
            <div className="text-xl sm:text-2xl font-black text-[#E11D48]">
              {timeLeft.seconds}
            </div>
            <div className="text-[10px] text-[#7B708A] font-semibold">วินาที</div>
          </div>
        </div>

        <div className="text-[11px] text-[#9E94AD] bg-[#FAF5FF] p-2.5 rounded-xl border border-[#E9D5FF] text-left">
          ⚠️ ข้อมูลประวัติการเก็บเงินและรายชื่อห้อง ม.{grade} จะถูกล้างข้อมูลเมื่อถึงวันเลื่อนชั้น กรุณาเหรัญญิกและสมาชิกห้องสรุปบัญชีให้เรียบร้อย
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleClose}
          type="button"
          className="w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#FF96A8] to-[#FB7185] hover:opacity-95 shadow-pastel transition-all"
        >
          รับทราบและปิดข้อความ
        </button>
      </div>
    </div>
  );
}
