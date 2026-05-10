"use client";

import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { AppLogo } from "@/components/dashboard/app-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function DashboardMobileHeader({
  title,
  subtitle,
  menuOpen,
  onMenuOpenChange,
  menuContent,
}: {
  title: string;
  subtitle: string;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  menuContent: ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/80 bg-background/95 px-3 backdrop-blur-sm lg:hidden">
      <AppLogo showWordmark={false} className="min-w-0 shrink-0" />
      <div className="min-w-0 flex-1 px-2 text-center">
        <h1 className="truncate font-serif text-base font-normal leading-tight text-foreground">{title}</h1>
        <p className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          {subtitle}
        </p>
      </div>
      <Sheet open={menuOpen} onOpenChange={onMenuOpenChange}>
        <SheetTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="shrink-0" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-[min(100vw,22rem)] flex-col gap-0 p-0">
          <SheetHeader className="border-b border-border/80 p-4 text-left">
            <SheetTitle>Quick actions</SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">{menuContent}</div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
