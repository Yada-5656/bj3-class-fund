"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { slugToDisplayName } from "@/lib/rooms";
import { loadRoomFromClientStorage } from "@/lib/db";
import PinModal from "@/components/PinModal";

export default function TreasurerLayout({
  children,
  params: propsParams,
}: {
  children: React.ReactNode;
  params?: { room?: string };
}) {
  const routeParams = useParams();
  const roomSlug = (propsParams?.room || routeParams?.room || "3-15") as string;
  const displayName = slugToDisplayName(roomSlug);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [expectedPin, setExpectedPin] = useState<string>("");

  useEffect(() => {
    // Check if treasurer is already authenticated in this browser session
    const isAuth = sessionStorage.getItem(`bj3_treasurer_auth_${roomSlug}`);
    if (isAuth === "true") {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
    const data = loadRoomFromClientStorage(roomSlug);
    if (data && data.settings) {
      setExpectedPin(data.settings.treasurerPin || "");
    }
  }, [roomSlug]);

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center py-20 text-xs text-[#7B708A]">
        กำลังตรวจสอบสิทธิ์เหรัญญิก...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <PinModal
        roomSlug={roomSlug}
        displayName={displayName}
        expectedPin={expectedPin}
        onSuccess={() => setIsAuthenticated(true)}
      />
    );
  }

  return <>{children}</>;
}
