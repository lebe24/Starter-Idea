"use client";

import { LayoutDashboard, Brain, MessageSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Section } from "@/lib/dashboard-section";

const items: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "ideas", label: "Ideas", icon: Brain },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "settings", label: "Settings", icon: Settings },
];

export function DashboardMobileBottomNav({
  activeSection,
  onSectionChange,
  hasActiveChat,
}: {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  hasActiveChat?: boolean;
}) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch justify-around border-t border-border/80 bg-sidebar/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Main"
    >
      {items.map(({ id, label, icon: Icon }) => {
        const active = activeSection === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSectionChange(id)}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="relative flex h-6 items-center justify-center">
              <Icon className="h-5 w-5 shrink-0" />
              {id === "chat" && hasActiveChat ? (
                <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-accent" aria-hidden />
              ) : null}
            </span>
            <span className="max-w-[4.5rem] truncate leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
