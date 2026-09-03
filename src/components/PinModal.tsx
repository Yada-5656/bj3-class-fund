"use client";

import React, { useState } from "react";
import { Lock, Delete, KeyRound, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PinModalProps {
  roomSlug: string;
  displayName: string;
  onSuccess: () => void;
  expectedPin?: string;
}

export default function PinModal({
  roomSlug,
  displayName,
  onSuccess,
  expectedPin = "1234",
}: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin("");
    setError(null);
  };

  const verifyPin = async (enteredPin: string) => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-pin",
          roomSlug,
          pin: enteredPin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Store verification in sessionStorage for this room
        sessionStorage.setItem(`bj3_treasurer_auth_${roomSlug}`, "true");
        onSuccess();
      } else {
        triggerError(data.error || "รหัส PIN ไม่ถูกต้อง");
      }
    } catch {
      // Fallback local check
      if (enteredPin === expectedPin) {
        sessionStorage.setItem(`bj3_treasurer_auth_${roomSlug}`, "true");
        onSuccess();
      } else {
        triggerError("รหัส PIN ไม่ถูกต้อง (ค่าเริ่มต้น: 1234)");
      }
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setPin("");
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#F8F5FB]/90 backdrop-blur-md">
      <div
        className={`pastel-card w-full max-w-sm bg-white p-6 shadow-pastel space-y-5 text-center ${
          shake ? "animate-bounce" : ""
        }`}
      >
        {/* Lock Icon */}
        <div className="w-14 h-14 mx-auto rounded-3xl bg-gradient-to-tr from-[#C084FC] to-[#A855F7] text-white flex items-center justify-center shadow-pastel">
          <Lock className="w-7 h-7" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg font-bold text-[#332941]">
            เข้าสู่ระบบเหรัญญิก ({displayName})
          </h2>
          <p className="text-xs text-[#7B708A] mt-1">
            กรุณาระบุรหัส PIN 4 หลักเพื่อเข้าจัดการเงินห้อง
          </p>
        </div>

        {/* PIN Indicators (4 Dots) */}
        <div className="flex justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                pin.length > index
                  ? "bg-[#C084FC] border-[#C084FC] scale-110 shadow-xs"
                  : "border-[#D8B4FE] bg-transparent"
              }`}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-xs text-[#E11D48] bg-[#FFF1F2] border border-[#FECDD3] py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="w-16 h-12 mx-auto rounded-2xl bg-[#F8F5FB] hover:bg-[#FAF5FF] hover:border-[#C084FC] border border-[#EFE8F6] text-lg font-bold text-[#332941] transition-all active:scale-95 flex items-center justify-center"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="w-16 h-12 mx-auto rounded-2xl bg-[#FAF5FF] hover:bg-[#F3E8FF] text-xs font-semibold text-[#9333EA] transition-all active:scale-95 flex items-center justify-center"
          >
            ล้าง
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="w-16 h-12 mx-auto rounded-2xl bg-[#F8F5FB] hover:bg-[#FAF5FF] hover:border-[#C084FC] border border-[#EFE8F6] text-lg font-bold text-[#332941] transition-all active:scale-95 flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-16 h-12 mx-auto rounded-2xl bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] transition-all active:scale-95 flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Hint & Back Button */}
        <div className="pt-2 border-t border-[#F1EDF7] space-y-2">
          <p className="text-[11px] text-[#9E94AD]">
            💡 รหัส PIN เริ่มต้นทดสอบ: <span className="font-semibold text-[#9333EA]">1234</span>
          </p>
          <Link
            href={`/${roomSlug}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#7B708A] hover:text-[#332941]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>กลับสู่หน้าแดชบอร์ด</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
