"use client";

import React, { useState } from "react";
import { Coins, KeyRound, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";

interface FirstTimeSetupModalProps {
  isOpen: boolean;
  roomSlug: string;
  displayName: string;
  onComplete: (fee: number, pin: string) => Promise<void>;
}

export default function FirstTimeSetupModal({
  isOpen,
  roomSlug,
  displayName,
  onComplete,
}: FirstTimeSetupModalProps) {
  const [fee, setFee] = useState("20");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const feeNum = parseFloat(fee);
    if (isNaN(feeNum) || feeNum < 0) {
      setError("จำนวนเงินที่เก็บต่อรอบไม่ถูกต้อง");
      setIsSubmitting(false);
      return;
    }

    if (pin.length < 4) {
      setError("กรุณาตั้งรหัสผ่านเหรัญญิกอย่างน้อย 4 หลัก");
      setIsSubmitting(false);
      return;
    }

    if (pin !== confirmPin) {
      setError("รหัสผ่านยืนยันไม่ตรงกัน");
      setIsSubmitting(false);
      return;
    }

    try {
      await onComplete(feeNum, pin.trim());
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการบันทึกข้อมูล โปรดลองอีกครั้ง");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#332941]/40 backdrop-blur-xs animate-fadeIn">
      <div className="pastel-card w-full max-w-md bg-white p-6 sm:p-7 shadow-pastel space-y-5 border border-[#E9D5FF]">
        {/* Header Icon */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-[#C084FC] to-[#A855F7] text-white flex items-center justify-center shadow-pastel">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#332941]">
            ยินดีต้อนรับสู่ห้อง {displayName}
          </h2>
          <p className="text-xs text-[#7B708A]">
            ตั้งค่าเริ่มต้นสำหรับห้องเรียนของคุณ (ทำเพียงครั้งแรก โดยเหรัญญิกคนแรกที่เข้าใช้งาน)
          </p>
          <div className="text-[11px] text-[#A855F7] bg-[#FAF5FF] p-2 rounded-xl border border-[#E9D5FF] leading-relaxed">
            ℹ️ เมื่อตั้งค่าแล้ว ข้อมูลจะเชื่อมต่อส่วนกลางทันที เครื่องอื่นๆ ทุกเครื่องจะไม่เจอหน้านี้อีก และจะใช้รหัสผ่านนี้ร่วมกัน
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="text-xs text-[#E11D48] bg-[#FFF1F2] border border-[#FECDD3] p-2.5 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fund Fee Input */}
          <div>
            <label className="block text-xs font-semibold text-[#7B708A] mb-1.5">
              <span className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>จำนวนเงินห้องต่อคน (บาท)</span>
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="5"
              required
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="เช่น 20"
              className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
            />
          </div>

          {/* Treasurer PIN */}
          <div>
            <label className="block text-xs font-semibold text-[#7B708A] mb-1.5">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#C084FC]" />
                <span>ตั้งรหัสผ่านเหรัญญิก (PIN 4 หลัก)</span>
              </span>
            </label>
            <input
              type="password"
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="กรอกรหัส PIN (เช่น 1234)"
              className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
            />
          </div>

          {/* Confirm PIN */}
          <div>
            <label className="block text-xs font-semibold text-[#7B708A] mb-1.5">
              <span>ยืนยันรหัสผ่านเหรัญญิกอีกครั้ง</span>
            </label>
            <input
              type="password"
              maxLength={6}
              required
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="กรอกรหัส PIN ซ้ำอีกครั้ง"
              className="w-full px-3.5 py-2.5 bg-[#F8F5FB] border border-[#EFE8F6] rounded-xl text-sm text-[#332941] font-semibold focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#C084FC] to-[#A855F7] hover:opacity-95 disabled:opacity-50 shadow-pastel flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? "กำลังบันทึกข้อมูลส่วนกลาง..." : "บันทึกและเริ่มใช้งานห้อง"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
