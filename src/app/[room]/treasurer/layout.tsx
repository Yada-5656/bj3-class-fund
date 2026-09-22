"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { slugToDisplayName } from "@/lib/rooms";
import { loadRoomFromClientStorage, saveRoomToClientStorage, syncRoomWithServer, RoomData } from "@/lib/db";
import PinModal from "@/components/PinModal";
import FirstTimeSetupModal from "@/components/FirstTimeSetupModal";

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
  const [isInitialized, setIsInitialized] = useState<boolean>(true);
  const [expectedPin, setExpectedPin] = useState<string>("");
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const isAuth = sessionStorage.getItem(`bj3_treasurer_auth_${roomSlug}`);
    const isAdminAuth = localStorage.getItem("bj3_admin_auth") === "true";
    
    if (isAuth === "true" || isAdminAuth) {
      setIsAuthenticated(true);
      setIsCheckingStatus(false);
      return;
    }

    // Check local state first
    const local = loadRoomFromClientStorage(roomSlug);
    setRoomData(local);
    setExpectedPin(local.settings?.treasurerPin || "");
    setIsInitialized(!!local.settings?.isInitialized);

    // Cross-check with server sync
    syncRoomWithServer(roomSlug)
      .then((synced) => {
        if (isMounted) {
          setRoomData(synced);
          setExpectedPin(synced.settings?.treasurerPin || "");
          setIsInitialized(!!synced.settings?.isInitialized);
          setIsCheckingStatus(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsCheckingStatus(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roomSlug]);

  const handleCompleteSetup = async (fee: number, pin: string) => {
    if (!roomData) return;
    const nextData: RoomData = {
      ...roomData,
      settings: {
        ...roomData.settings,
        fundFeePerStudent: fee,
        treasurerPin: pin,
        isInitialized: true,
      },
    };
    setRoomData(nextData);
    setExpectedPin(pin);
    setIsInitialized(true);
    saveRoomToClientStorage(roomSlug, nextData);

    // Grant access to this session
    sessionStorage.setItem(`bj3_treasurer_auth_${roomSlug}`, "true");
    setIsAuthenticated(true);

    // Save to central cloud store
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "initialize",
          roomSlug,
          feePerStudent: fee,
          treasurerPin: pin,
        }),
      });
    } catch (err) {
      console.error("Cloud initialization error:", err);
    }
  };

  if (isCheckingStatus && isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center py-20 text-xs text-[#9C8599]">
        กำลังตรวจสอบสิทธิ์เหรัญญิก...
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If the room has never been set up by any treasurer yet, show setup modal
  if (!isInitialized) {
    return (
      <FirstTimeSetupModal
        isOpen={true}
        roomSlug={roomSlug}
        displayName={displayName}
        onComplete={handleCompleteSetup}
      />
    );
  }

  // Room is already set up: prompt for the room's single treasurer PIN
  return (
    <PinModal
      roomSlug={roomSlug}
      displayName={displayName}
      expectedPin={expectedPin}
      onSuccess={() => setIsAuthenticated(true)}
    />
  );
}
