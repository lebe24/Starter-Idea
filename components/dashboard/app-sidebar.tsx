"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import type { Section } from "@/lib/dashboard-section";
import {
  LayoutDashboard,
  Brain,
  MessageSquare,
  Settings,
  Moon,
  Sun,
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
  const { theme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const isDark = theme === "dark";
  const toggleColorMode = () => setTheme(isDark ? "light" : "dark");

  return (
    <aside
      className={cn(
        "h-screen flex flex-col shrink-0 border-r border-border/80 bg-sidebar transition-[width] duration-200",
        isLeftPanelCollapsed ? "w-[88px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border/80 px-5">
        <div
          className={cn(
            "flex items-center justify-center rounded-md border border-border/90 bg-muted/25 transition-all",
            isLeftPanelCollapsed ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"
          )}
        >
          <span
            className={cn(
              "font-mono font-semibold tracking-[0.14em] text-foreground",
              isLeftPanelCollapsed ? "text-[9px]" : "text-[10px] sm:text-[11px]"
            )}
          >
            SI
          </span>
        </div>
        <span
          className={cn(
            "font-serif text-[17px] font-normal tracking-tight text-foreground",
            isLeftPanelCollapsed && "hidden"
          )}
        >
          Starter Idea
        </span>
        <button
          type="button"
          onClick={() => setIsLeftPanelCollapsed((prev) => !prev)}
          className="ml-auto rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
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
            "mt-2 flex w-full items-center rounded-md border border-border/60 bg-background/60 px-3 py-2.5 text-muted-foreground transition-colors hover:border-border hover:bg-muted/50 hover:text-foreground",
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
        <p
          className={cn(
            "mb-2 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground",
            isLeftPanelCollapsed && "hidden"
          )}
        >
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
      <div className="space-y-2 border-t border-border/80 px-4 py-4">
        <NavButton
          item={{ id: "settings", label: "Settings", icon: Settings }}
          isActive={activeSection === "settings"}
          onClick={() => onSectionChange("settings")}
          collapsed={isLeftPanelCollapsed}
        />
        
        {/* User Profile */}
        <div
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50",
            isLeftPanelCollapsed && "justify-center"
          )}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-muted/30">
            <span className="text-sm font-medium text-foreground">JD</span>
          </div>
          <div className={cn("flex-1 min-w-0", isLeftPanelCollapsed && "hidden")}>
            <p className="text-sm font-medium text-foreground truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">SRE Lead</p>
          </div>
          <button
            type="button"
            onClick={toggleColorMode}
            className={cn(
              "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isLeftPanelCollapsed && "hidden"
            )}
            aria-label="Toggle color theme"
            title="Toggle color theme"
          >
            {!themeReady ? (
              <Moon className="h-4 w-4 opacity-40" aria-hidden />
            ) : isDark ? (
              <Sun className="h-4 w-4" aria-hidden />
            ) : (
              <Moon className="h-4 w-4" aria-hidden />
            )}
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
        "flex w-full items-center rounded-md border-l-2 border-transparent py-2.5 pr-3 text-sm transition-colors duration-200",
        collapsed ? "justify-center pl-2" : "gap-3 pl-2.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isActive
          ? "border-accent bg-muted/45 font-medium text-foreground"
          : "text-foreground/75 hover:bg-muted/40 hover:text-foreground"
      )}
    >
      <Icon className="w-[18px] h-[18px] shrink-0" />
      <span className={cn("flex-1 text-left", collapsed && "hidden")}>{item.label}</span>
      {!collapsed && item.badge ? (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            isActive
              ? "bg-foreground/10 text-foreground"
              : item.badgeColor
                ? badgeColorClass[item.badgeColor]
                : "bg-muted text-muted-foreground",
          )}
        >
          {item.badge}
        </span>
      ) : null}
      {!collapsed && showConversationDot ? (
        <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
      ) : null}
    </button>
  );
}
