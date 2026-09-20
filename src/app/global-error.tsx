"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const lastReload = sessionStorage.getItem("last_error_reload");
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload) > 10000) {
      sessionStorage.setItem("last_error_reload", now.toString());
      window.location.reload();
    }
  }, [error]);

  return (
    <html lang="th">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F5FB', padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#332941', marginBottom: '8px' }}>
            กำลังโหลดระบบเวอร์ชันล่าสุด...
          </h2>
          <p style={{ color: '#7B708A', fontSize: '14px', marginBottom: '24px', maxWidth: '300px' }}>
            ระบบกำลังทำการรีเฟรชอัตโนมัติเพื่ออัพเดตเวอร์ชัน กรุณารอสักครู่ครับ
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 24px', backgroundColor: '#9333EA', color: 'white', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
          >
            รีเฟรชหน้าจอ
          </button>
        </div>
      </body>
    </html>
  );
}
