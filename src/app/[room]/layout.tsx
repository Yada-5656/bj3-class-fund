import React from "react";
import Navbar from "@/components/Navbar";

export default function RoomLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params?: { room?: string };
}) {
  return (
    <div className="min-h-screen bg-[#FFF5F8] flex flex-col">
      <Navbar currentRoomSlug={params?.room} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-[#FCE4EC] py-6 text-center text-xs text-[#BDA8BA] bg-white/40">
        <p>Class Fund Management System • โรงเรียนบรรหารแจ่มใสวิทยา 3 (BJ3)</p>
      </footer>
    </div>
  );
}