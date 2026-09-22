"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Caught by custom error boundary:", error);
    
    // Auto-reload to bust cache, but prevent infinite reload loop
    const lastReload = sessionStorage.getItem("last_error_reload");
    const now = Date.now();
    
    if (!lastReload || now - parseInt(lastReload) > 10000) {
      sessionStorage.setItem("last_error_reload", now.toString());
      // Force cache bypass by appending a timestamp query string
      const url = new URL(window.location.href);
      url.searchParams.set("v", now.toString());
      window.location.replace(url.toString());
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFF5F8] p-6 text-center font-sans">
      <div className="w-16 h-16 bg-red-100 text-red-500 flex items-center justify-center rounded-2xl mb-4 shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-[#5C435A] mb-2">
        กำลังโหลดระบบเวอร์ชันล่าสุด...
      </h2>
      <p className="text-[#9C8599] text-sm mb-6 max-w-xs mx-auto leading-relaxed">
        ระบบตรวจพบเวอร์ชันเก่าในเครื่องของคุณ กำลังล้างแคชและรีเฟรชหน้าจออัตโนมัติ กรุณารอสักครู่ครับ
      </p>
      <button
        onClick={() => {
          sessionStorage.setItem("last_error_reload", Date.now().toString());
          const url = new URL(window.location.href);
          url.searchParams.set("v", Date.now().toString());
          window.location.replace(url.toString());
        }}
        className="px-6 py-2.5 bg-[#E27396] text-white rounded-xl text-sm font-semibold hover:bg-[#D65A80] transition-all shadow-sm"
      >
        กดที่นี่หากระบบไม่รีเฟรช
      </button>
    </div>
  );
}
