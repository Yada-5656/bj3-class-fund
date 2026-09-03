"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { ALL_ROOMS, findRoom } from "@/lib/rooms";
import {
  Wallet,
  LayoutDashboard,
  History,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Menu,
  X,
  School,
} from "lucide-react";

interface NavbarProps {
  currentRoomSlug?: string;
}

export default function Navbar({ currentRoomSlug }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roomDropdownOpen, setRoomDropdownOpen] = useState(false);

  const activeSlug = currentRoomSlug || (params?.room as string) || undefined;
  const room = activeSlug ? findRoom(activeSlug) : undefined;
  const displayName = room ? room.displayName : activeSlug ? `ม.${activeSlug.replace("-", "/")}` : "เข้าสู่ระบบ";

  const navLinks = activeSlug
    ? [
        {
          name: "แดชบอร์ด",
          href: `/${activeSlug}`,
          icon: LayoutDashboard,
          active: pathname === `/${activeSlug}`,
        },
        {
          name: "ประวัติเงินห้อง",
          href: `/${activeSlug}/history`,
          icon: History,
          active: pathname.startsWith(`/${activeSlug}/history`),
        },
        {
          name: "ระบบเหรัญญิก",
          href: `/${activeSlug}/treasurer`,
          icon: ShieldCheck,
          active: pathname.startsWith(`/${activeSlug}/treasurer`),
          isPrivate: true,
        },
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#EFE8F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & School Branding */}
          <div className="flex items-center gap-3">
            <Link href={currentRoomSlug ? `/${currentRoomSlug}` : "/"} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#C084FC] to-[#A855F7] flex items-center justify-center text-white shadow-pastel group-hover:scale-105 transition-transform">
                <School className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight text-[#332941]">
                    BJ3 <span className="text-[#A855F7]">Class Fund</span>
                  </span>
                  {currentRoomSlug && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#FAF5FF] text-[#9333EA] border border-[#E9D5FF]">
                      {displayName}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7B708A] hidden sm:block">
                  โรงเรียนบรรหารแจ่มใสวิทยา 3
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          {currentRoomSlug && (
            <nav className="hidden md:flex items-center gap-1.5 bg-[#FAF5FF] p-1.5 rounded-2xl border border-[#F1EDF7]">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all ${
                      link.active
                        ? "bg-white text-[#9333EA] shadow-sm font-semibold"
                        : "text-[#7B708A] hover:text-[#332941] hover:bg-white/60"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${link.active ? "text-[#C084FC]" : "text-[#9E94AD]"}`} />
                    <span>{link.name}</span>
                    {link.isPrivate && (
                      <span className="text-[10px] bg-[#FFE4E6] text-[#E11D48] px-1.5 py-0.2 rounded-full font-normal">
                        PIN
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Actions: Room Switcher & Logout */}
          <div className="flex items-center gap-2">
            {currentRoomSlug ? (
              <>
                {/* Switch Room Button */}
                <div className="relative">
                  <button
                    onClick={() => setRoomDropdownOpen(!roomDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#F8F5FB] hover:bg-[#EFE8F6] text-[#7B708A] rounded-xl border border-[#EFE8F6] transition-colors"
                  >
                    <span>สลับห้อง</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Dropdown Menu */}
                  {roomDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setRoomDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 max-h-80 overflow-y-auto bg-white rounded-2xl shadow-pastel border border-[#EFE8F6] p-2 z-50">
                        <div className="px-3 py-1.5 text-[11px] font-semibold text-[#9E94AD] border-b border-[#F1EDF7] mb-1">
                          เลือกห้องเรียน (77 ห้อง)
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {ALL_ROOMS.map((r) => (
                            <Link
                              key={r.slug}
                              href={`/${r.slug}`}
                              onClick={() => setRoomDropdownOpen(false)}
                              className={`px-2 py-1.5 text-xs text-center rounded-lg transition-colors ${
                                r.slug === currentRoomSlug
                                  ? "bg-[#C084FC] text-white font-semibold"
                                  : "text-[#332941] hover:bg-[#FAF5FF]"
                              }`}
                            >
                              {r.displayName}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => router.push("/")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#E11D48] bg-[#FFF1F2] hover:bg-[#FFE4E6] rounded-xl border border-[#FECDD3] transition-colors"
                  title="ออกจากระบบห้องเรียน"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ออกจากห้อง</span>
                </button>
              </>
            ) : (
              <Link
                href="/"
                className="px-4 py-2 text-xs font-semibold bg-[#C084FC] hover:bg-[#A855F7] text-white rounded-xl shadow-pastel transition-colors"
              >
                เข้าสู่ระบบห้องเรียน
              </Link>
            )}

            {/* Mobile Menu Toggle Button */}
            {currentRoomSlug && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 md:hidden text-[#7B708A] hover:text-[#332941] hover:bg-[#F8F5FB] rounded-xl"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {currentRoomSlug && mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[#EFE8F6] space-y-1.5 animate-fadeIn">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    link.active
                      ? "bg-[#FAF5FF] text-[#9333EA] font-semibold"
                      : "text-[#7B708A] hover:bg-[#F8F5FB] hover:text-[#332941]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${link.active ? "text-[#C084FC]" : "text-[#9E94AD]"}`} />
                    <span>{link.name}</span>
                  </div>
                  {link.isPrivate && (
                    <span className="text-[10px] bg-[#FFE4E6] text-[#E11D48] px-2 py-0.5 rounded-full">
                      PIN Required
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
