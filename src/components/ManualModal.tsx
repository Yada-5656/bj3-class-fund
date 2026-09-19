"use client";

import React, { useState } from "react";
import { X, BookOpen, Users, Key, AlertCircle } from "lucide-react";

interface ManualModalProps {
  onClose: () => void;
}

export default function ManualModal({ onClose }: ManualModalProps) {
  const [activeTab, setActiveTab] = useState<"student" | "treasurer">("student");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#332941]/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#F1EDF7] flex items-center justify-between bg-gradient-to-r from-[#FAF5FF] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E9D5FF] flex items-center justify-center text-[#9333EA]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#332941]">คู่มือการใช้งาน</h2>
              <p className="text-xs text-[#7B708A]">ทำความเข้าใจระบบและวิธีการใช้งาน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#A89BB7] hover:bg-[#F8F5FB] hover:text-[#F43F5E] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6">
          {/* Tabs */}
          <div className="flex bg-[#F8F5FB] p-1.5 rounded-2xl mb-6">
            <button
              onClick={() => setActiveTab("student")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === "student"
                  ? "bg-white text-[#9333EA] shadow-sm"
                  : "text-[#7B708A] hover:text-[#581C87]"
              }`}
            >
              <Users className="w-4 h-4" />
              สำหรับเพื่อนในห้อง
            </button>
            <button
              onClick={() => setActiveTab("treasurer")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                activeTab === "treasurer"
                  ? "bg-white text-[#9333EA] shadow-sm"
                  : "text-[#7B708A] hover:text-[#581C87]"
              }`}
            >
              <Key className="w-4 h-4" />
              สำหรับเหรัญญิก
            </button>
          </div>

          {/* Student Tab */}
          {activeTab === "student" && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-3">
                <h3 className="font-bold text-[#332941] flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-6 h-6 rounded-full bg-[#EFE8F6] flex items-center justify-center text-[#9333EA] text-xs">1</span>
                  วิธีดูยอดเงินและสถานะการจ่าย
                </h3>
                <div className="bg-[#FAF5FF] p-4 rounded-2xl border border-[#E9D5FF] text-sm text-[#581C87]">
                  <p>ในหน้าหลักของห้อง คุณสามารถดูสถานะการจ่ายเงินของเพื่อนแต่ละคนได้จากสีของป้ายชื่อ:</p>
                  <ul className="mt-3 space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
                      <span className="font-semibold text-[#065F46]">สีเขียว (จ่ายแล้ว):</span> เพื่อนจ่ายเงินของวันนี้เรียบร้อยแล้ว
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#F43F5E]"></div>
                      <span className="font-semibold text-[#9F1239]">สีแดง (ยังไม่จ่าย):</span> เพื่อนยังไม่ได้จ่ายเงินของวันนี้
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-[#332941] flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-6 h-6 rounded-full bg-[#EFE8F6] flex items-center justify-center text-[#9333EA] text-xs">2</span>
                  การอ่านกราฟรายรับ-รายจ่าย
                </h3>
                <div className="bg-[#FAF5FF] p-4 rounded-2xl border border-[#E9D5FF] text-sm text-[#581C87] space-y-2">
                  <p>สามารถเลือกช่วงเวลา <strong>รายวัน, รายสัปดาห์, หรือรายเดือน</strong> ได้ที่ด้านล่างกราฟ</p>
                  <p>เส้นกราฟสีเขียวแทนรายรับ และสีแดงแทนรายจ่าย สามารถนำเมาส์ไปชี้ (หรือจิ้ม) ที่จุดบนกราฟเพื่อดูรายละเอียดจำนวนเงินในวันนั้นๆ</p>
                </div>
              </div>
            </div>
          )}

          {/* Treasurer Tab */}
          {activeTab === "treasurer" && (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <div className="space-y-3">
                <h3 className="font-bold text-[#332941] flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-6 h-6 rounded-full bg-[#EFE8F6] flex items-center justify-center text-[#9333EA] text-xs">1</span>
                  วิธีล็อกอินเข้าสู่โหมดเหรัญญิก
                </h3>
                <div className="bg-[#FAF5FF] p-4 rounded-2xl border border-[#E9D5FF] text-sm text-[#581C87]">
                  กดปุ่ม <strong>&quot;ล็อกอินเหรัญญิก&quot;</strong> หรือไอคอนฟันเฟืองที่มุมขวาบนของหน้าห้องเรียน รหัสผ่านเริ่มต้นคือ <strong>1234</strong> (แนะนำให้เปลี่ยนรหัสผ่านในหน้าตั้งค่า)
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-[#332941] flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-6 h-6 rounded-full bg-[#EFE8F6] flex items-center justify-center text-[#9333EA] text-xs">2</span>
                  วิธีเช็คชื่อและเก็บเงิน
                </h3>
                <div className="bg-[#FAF5FF] p-4 rounded-2xl border border-[#E9D5FF] text-sm text-[#581C87] space-y-2">
                  <p>1. ในแท็บหน้าแรก ให้ติ๊กเครื่องหมายถูกหน้ารายชื่อเพื่อนที่จ่ายเงินแล้ว</p>
                  <p>2. ระบบจะคำนวณยอดเงินรวมให้อัตโนมัติ</p>
                  <p>3. **สำคัญมาก:** ต้องกดปุ่ม <strong>&quot;บันทึกข้อมูลวันนี้&quot;</strong> ทุกครั้ง ข้อมูลถึงจะอัปเดตลงบัญชีรายรับของห้อง!</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-[#332941] flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-6 h-6 rounded-full bg-[#EFE8F6] flex items-center justify-center text-[#9333EA] text-xs">3</span>
                  การจัดการรายรับ-รายจ่ายเพิ่มเติม
                </h3>
                <div className="bg-[#FAF5FF] p-4 rounded-2xl border border-[#E9D5FF] text-sm text-[#581C87]">
                  ไปที่แท็บ <strong>&quot;รายรับ/รายจ่าย&quot;</strong> เพื่อบันทึกการใช้จ่ายอื่นๆ ของห้อง เช่น ค่าพานไหว้ครู, ค่าปริ้นงาน โดยกดปุ่ม &quot;เพิ่มรายการ&quot;
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-[#F8F5FB] border-t border-[#F1EDF7]">
          <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-[#F1EDF7]">
            <AlertCircle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#7B708A] leading-relaxed">
              <strong>กรณีจำรหัสแอดมินไม่ได้:</strong><br />
              ติดต่อ นายวิรัตน์ ธีรพิพัฒนปัญญา<br />
              กลุ่มสาระการเรียนรู้วิทยาศาสตร์และเทคโนโลยี
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
