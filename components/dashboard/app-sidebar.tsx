"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Section } from "@/app/page";
import {
  LayoutDashboard,
  Phone,
  Brain,
  MessageSquare,
  Settings,
  Moon,
  PanelRight,
  PanelRightClose,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AppSidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  hasActiveChat?: boolean;
}

interface NavItem {
  id: Section;
  label: string;
  icon: LucideIcon;
  badge?: number;
  badgeColor?: "red" | "yellow" | "green";
}

const mainMenu: NavItem[] = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  // { id: "oncall", label: "On-Call", icon: Phone },
  { id: "ideas", label: "Ideas", icon: Brain },
  { id: "chat", label: "Assistant", icon: MessageSquare },
];

export function AppSidebar({
  activeSection,
  onSectionChange,
  isRightPanelOpen,
  onToggleRightPanel,
  hasActiveChat = false,
}: AppSidebarProps) {
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col shrink-0 transition-[width] duration-200",
        isLeftPanelCollapsed ? "w-[88px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-border">
        <div
          className={cn(
            "rounded-xl bg-chart-1 flex items-center justify-center transition-all",
            isLeftPanelCollapsed ? "w-8 h-8" : "w-9 h-9 sm:w-10 sm:h-10"
          )}
        >
          <span className={cn("text-primary-foreground font-semibold", isLeftPanelCollapsed ? "text-[10px]" : "text-xs sm:text-sm")}>
            SI
          </span>
        </div>
        <span className={cn("font-semibold text-foreground text-[15px] tracking-tight", isLeftPanelCollapsed && "hidden")}>
          Starter Idea
        </span>
        <button
          type="button"
          onClick={() => setIsLeftPanelCollapsed((prev) => !prev)}
          className="ml-auto p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label={isLeftPanelCollapsed ? "Expand left panel" : "Collapse left panel"}
        >
          {isLeftPanelCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-4">
        <button
          type="button"
          onClick={onToggleRightPanel}
          className={cn(
            "w-full mt-2 flex items-center px-3.5 py-2.5 rounded-xl bg-muted/40 hover:bg-muted transition-colors",
            isLeftPanelCollapsed ? "justify-center" : "gap-3"
          )}
        >
          {isRightPanelOpen ? (
            <PanelRightClose className="w-4 h-4 text-muted-foreground" />
          ) : (
            <PanelRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className={cn("text-sm text-muted-foreground", isLeftPanelCollapsed && "hidden")}>
            {isRightPanelOpen ? "Hide Filters Panel" : "Show Filters Panel"}
          </span>
        </button>
      </div>

      {/* Main Menu */}
      <div className="px-4 flex-1">
        <p className={cn("px-2 mb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider", isLeftPanelCollapsed && "hidden")}>
          Operations
        </p>
        <nav className="space-y-0.5">
          {mainMenu.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeSection === item.id}
              onClick={() => onSectionChange(item.id)}
              collapsed={isLeftPanelCollapsed}
              showConversationDot={item.id === "chat" && hasActiveChat}
            />
          ))}
        </nav>

      </div>

      {/* Settings & User */}
      <div className="px-4 py-4 border-t border-border space-y-2">
        <NavButton
          item={{ id: "settings", label: "Settings", icon: Settings }}
          isActive={activeSection === "settings"}
          onClick={() => onSectionChange("settings")}
          collapsed={isLeftPanelCollapsed}
        />
        
        {/* User Profile */}
        <div className={cn("flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer", isLeftPanelCollapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-full bg-chart-1/20 flex items-center justify-center">
            <span className="text-chart-1 text-sm font-medium">JD</span>
          </div>
          <div className={cn("flex-1 min-w-0", isLeftPanelCollapsed && "hidden")}>
            <p className="text-sm font-medium text-foreground truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">SRE Lead</p>
          </div>
          <button
            type="button"
            className={cn("p-1.5 rounded-lg hover:bg-muted transition-colors", isLeftPanelCollapsed && "hidden")}
            aria-label="Toggle theme"
          >
            <Moon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </aside>
  );
}

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  collapsed?: boolean;
  showConversationDot?: boolean;
}

function NavButton({ item, isActive, onClick, collapsed = false, showConversationDot = false }: NavButtonProps) {
  const Icon = item.icon;
  
  const badgeColorClass = {
    red: "bg-destructive/15 text-destructive",
    yellow: "bg-warning/20 text-warning",
    green: "bg-success/15 text-success",
  };
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-200",
        collapsed ? "justify-center" : "gap-3",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-primary text-primary-foreground font-medium shadow-sm"
          : "text-foreground/80 hover:bg-muted/80 hover:text-foreground"
      )}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span className={cn("flex-1 text-left", collapsed && "hidden")}>{item.label}</span>
      {!collapsed && item.badge ? (
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            isActive
              ? "bg-primary-foreground/20 text-primary-foreground"
              : item.badgeColor
                ? badgeColorClass[item.badgeColor]
                : "bg-muted text-muted-foreground",
          )}
        >
          {item.badge}
        </span>
      ) : null}
      {!collapsed && showConversationDot ? (
        <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
      ) : null}
    </button>
  );
}
