"use client";

import { cn } from "@/lib/utils";

export function AppLogo({
  showWordmark = true,
  compact = false,
  className,
}: {
  showWordmark?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border border-border/90 bg-muted/25 transition-all",
          compact ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10",
        )}
      >
        <span
          className={cn(
            "font-mono font-semibold tracking-[0.14em] text-foreground",
            compact ? "text-[9px]" : "text-[10px] sm:text-[11px]",
          )}
        >
          SI
        </span>
      </div>
      {showWordmark ? (
        <span className="truncate font-serif text-[17px] font-normal tracking-tight text-foreground">
          Starter Idea
        </span>
      ) : null}
    </div>
  );
}
