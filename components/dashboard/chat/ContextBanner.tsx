"use client";

import { Filter, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { IdeaFilters } from "@/lib/ideas-data";

function summarizeFilters(filters: IdeaFilters, matchingCount: number, totalCount: number): string {
  const parts: string[] = [];
  if (filters.search) parts.push(`Search: ${filters.search}`);
  if (filters.minScore > 0) parts.push(`Score ≥ ${filters.minScore}`);
  if (filters.minRevenueK > 0) parts.push(`Revenue ≥ ${filters.minRevenueK}K`);
  if (Number.isFinite(filters.maxCostK)) parts.push(`Cost ≤ ${filters.maxCostK}K`);
  if (filters.icpKeyword) parts.push(`ICP: ${filters.icpKeyword}`);
  for (const t of filters.tactics) parts.push(`Tactic: ${t}`);
  const filterText = parts.length > 0 ? parts.join(" · ") : "Custom filters";
  return `${filterText} · ${matchingCount} of ${totalCount} ideas`;
}

interface ContextBannerProps {
  ideaFilters: IdeaFilters;
  matchingCount: number;
  totalCount: number;
  dismissed: boolean;
  onDismiss: () => void;
  onViewIdeas: () => void;
}

export function ContextBanner({
  ideaFilters,
  matchingCount,
  totalCount,
  dismissed,
  onDismiss,
  onViewIdeas,
}: ContextBannerProps) {
  if (dismissed || matchingCount === totalCount || totalCount === 0) return null;

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <Filter className="text-primary" />
      <AlertTitle className="text-foreground">Active idea filters</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0">{summarizeFilters(ideaFilters, matchingCount, totalCount)}</span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onViewIdeas}>
            View in Ideas
          </Button>
          <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={onDismiss} aria-label="Dismiss">
            <X className="h-4 w-4" />
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
