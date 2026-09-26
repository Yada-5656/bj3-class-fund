"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { findRoom } from "@/lib/rooms";
import { LogOut, School } from "lucide-react";

interface NavbarProps {
  currentRoomSlug?: string;
}

export default function Navbar({ currentRoomSlug }: NavbarProps) {
  const router = useRouter();
  const params = useParams();

  const activeSlug = currentRoomSlug || (params?.room as string) || undefined;
  const room = activeSlug ? findRoom(activeSlug) : undefined;
  const displayName = room ? room.displayName : activeSlug ? `ม.${activeSlug.replace("-", "/")}` : "เข้าสู่ระบบ";

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E5F6FA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School Branding */}
          <div className="flex items-center gap-3">
            <Link href={currentRoomSlug ? `/${currentRoomSlug}` : "/"} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EB9AB2] to-[#D9849D] flex items-center justify-center text-white shadow-pastel group-hover:scale-105 transition-transform">
                <School className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-[#5C435A]">
                    BJ3 <span className="text-[#D9849D]">Class Fund</span>
                  </span>
                  {currentRoomSlug && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-white text-[#4A8D9B] border border-[#EFCFE3]">
                      {displayName}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#9C8599] hidden sm:block">
                  โรงเรียนบรรหารแจ่มใสวิทยา 3
                </p>
              </div>
            </Link>
          </div>

          {/* Right Actions: Logout */}
          <div className="flex items-center gap-2">
            {currentRoomSlug ? (
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#FF8DA1] bg-[#FFF1F2] hover:bg-[#FFE4E6] rounded-xl border border-[#FFC4D0] transition-colors"
                title="ออกจากระบบห้องเรียน"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ออกจากห้อง</span>
              </button>
            ) : (
              <Link
                href="/"
                className="px-4 py-2 text-xs font-semibold bg-[#B3DEE2] hover:bg-[#D9849D] text-white rounded-xl shadow-pastel transition-colors"
              >
                เข้าสู่ระบบห้องเรียน
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
