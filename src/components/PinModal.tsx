"use client";

import React, { useState } from "react";
import { Lock, Delete, KeyRound, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { loadRoomFromClientStorage } from "@/lib/db";

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
  expectedPin,
}: PinModalProps) {
  const [syncedPin, setSyncedPin] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const roomData = loadRoomFromClientStorage(roomSlug);
      return (roomData?.settings?.treasurerPin || expectedPin || "").trim();
    }
    return (expectedPin || "").trim();
  });
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/sync?room=${roomSlug}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.settings?.treasurerPin) {
          setSyncedPin(json.settings.treasurerPin.trim());
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [roomSlug]);

  const handleKeyPress = (digit: string) => {
    const targetLength = syncedPin.length || 4;
    if (pin.length < targetLength) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);

      if (nextPin.length === targetLength) {
        verifyPin(nextPin, syncedPin);
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

  const verifyPin = async (enteredPin: string, targetPin?: string) => {
    let actualPin = (targetPin || syncedPin).trim();

    if (actualPin && enteredPin.trim() === actualPin) {
      sessionStorage.setItem(`bj3_treasurer_auth_${roomSlug}`, "true");
      onSuccess();
      return;
    }

    // Double check with server before rejecting
    try {
      const res = await fetch(`/api/sync?room=${roomSlug}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.settings?.treasurerPin) {
          actualPin = json.settings.treasurerPin.trim();
          setSyncedPin(actualPin);
          if (enteredPin.trim() === actualPin) {
            sessionStorage.setItem(`bj3_treasurer_auth_${roomSlug}`, "true");
            onSuccess();
            return;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    triggerError("รหัส PIN เหรัญญิกไม่ถูกต้อง");
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
            เหรัญญิก ({displayName})
          </h2>
        </div>

        {/* PIN Indicators */}
        <div className="flex justify-center gap-3 py-2">
          {Array.from(
            { length: syncedPin.length || 4 },
            (_, i) => i
          ).map((index) => (
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

        {/* Back Button */}
        <div className="pt-2 border-t border-[#F1EDF7] space-y-2">
          <Link
            href={`/${roomSlug}`}
            className="inline-flex items-center gap-1.5 text-xs text-[#7B708A] hover:text-[#332941]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>แดชบอร์ด</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
