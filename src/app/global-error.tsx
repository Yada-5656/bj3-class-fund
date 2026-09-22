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
      const url = new URL(window.location.href);
      url.searchParams.set("v", now.toString());
      window.location.replace(url.toString());
    }
  }, [error]);

  return (
    <html lang="th">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF5F8', padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', marginBottom: '16px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#5C435A', marginBottom: '8px' }}>
            กำลังโหลดระบบเวอร์ชันล่าสุด...
          </h2>
          <p style={{ color: '#9C8599', fontSize: '14px', marginBottom: '24px', maxWidth: '300px' }}>
            ระบบกำลังทำการรีเฟรชอัตโนมัติเพื่ออัพเดตเวอร์ชัน กรุณารอสักครู่ครับ
          </p>
          <button
            onClick={() => {
              sessionStorage.setItem("last_error_reload", Date.now().toString());
              const url = new URL(window.location.href);
              url.searchParams.set("v", Date.now().toString());
              window.location.replace(url.toString());
            }}
            style={{ padding: '10px 24px', backgroundColor: '#E27396', color: 'white', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
          >
            กดที่นี่หากระบบไม่รีเฟรช
          </button>
        </div>
      </body>
    </html>
  );
}
