import type { Metadata } from "next";
import "@/styles/globals.css";
import ScrollToTop from "@/components/ScrollToTop";

export const metadata: Metadata = {
  title: "ระบบจัดการเงินห้องเรียน - โรงเรียนบรรหารแจ่มใสวิทยา 3 (BJ3)",
  description: "ระบบจัดการเงินห้องเรียนฉบับพี่น้อง รองรับ 77 ห้องเรียน โรงเรียนบรรหารแจ่มใสวิทยา 3",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-[#F8F5FB] text-[#332941] antialiased selection:bg-[#E9D5FF] selection:text-[#581C87]">
        {children}
        <ScrollToTop />
      </body>
    </html>
  );
}
