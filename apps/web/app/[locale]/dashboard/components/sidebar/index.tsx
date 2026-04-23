"use client";

import { Navigation } from "@/components/layout";
import type { BackendStatus, TabId } from "@/lib/types/dashboard";

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onBackendChange: () => Promise<void>;
  backendStatus: BackendStatus;
}

export function Sidebar({
  activeTab,
  onTabChange,
  onBackendChange,
  backendStatus,
}: SidebarProps) {
  return (
    <Navigation
      activeTab={activeTab}
      onTabChange={onTabChange}
      onBackendChange={onBackendChange}
      backendStatus={backendStatus}
    />
  );
}
