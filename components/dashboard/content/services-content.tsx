"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, CheckCircle, AlertTriangle, XCircle, ExternalLink, GitBranch } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeIdeaStats,
  filterIdeas,
  type IdeaFilters,
  type IdeaRecord,
} from "../../../lib/ideas-data";
import { computeTacticRevenue } from "@/lib/overview-utils";

type IdeaHealth = "healthy" | "degraded" | "down" | "maintenance";

const statusConfig = {
  healthy: { label: "Healthy", color: "text-success", bgColor: "bg-success/10", icon: CheckCircle },
  degraded: { label: "Degraded", color: "text-warning", bgColor: "bg-warning/10", icon: AlertTriangle },
  down: { label: "Down", color: "text-destructive", bgColor: "bg-destructive/10", icon: XCircle },
  maintenance: { label: "Unscored", color: "text-muted-foreground", bgColor: "bg-muted", icon: Brain },
};

const cardShadow = "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px";

function parseScore(score: string): number | null {
  const parsed = Number.parseFloat(score);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIdeaHealth(score: string): IdeaHealth {
  const parsed = parseScore(score);
  if (parsed === null) {
    return "maintenance";
  }
  if (parsed >= 80) {
    return "healthy";
  }
  if (parsed >= 60) {
    return "degraded";
  }
  return "down";
}

function firstEntry(value: string): string {
  return value.split(",")[0]?.trim() || "N/A";
}

interface ServicesContentProps {
  ideaFilters: IdeaFilters;
}

export function ServicesContent({ ideaFilters }: ServicesContentProps) {
  const router = useRouter();
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadIdeas() {
      try {
        const response = await fetch("/api/ideas");
        const data = await response.json();
        if (isMounted) {
          setIdeas(data.ideas ?? []);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    void loadIdeas();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredIdeas = useMemo(() => filterIdeas(ideas, ideaFilters), [ideas, ideaFilters]);
  const stats = useMemo(() => computeIdeaStats(filteredIdeas), [filteredIdeas]);
  const tacticRevenue = useMemo(() => computeTacticRevenue(filteredIdeas), [filteredIdeas]);

  const healthyCount = filteredIdeas.filter((idea) => toIdeaHealth(idea.solopreneurScore) === "healthy").length;
  const degradedCount = filteredIdeas.filter((idea) => toIdeaHealth(idea.solopreneurScore) === "degraded").length;
  const downCount = filteredIdeas.filter((idea) => toIdeaHealth(idea.solopreneurScore) === "down").length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`summary-skeleton-${index}`}
              className="bg-card rounded-2xl p-5 border border-border space-y-3"
              style={{ boxShadow: cardShadow }}
            >
              <Skeleton className="h-3 w-20 animate-shimmer rounded-md" />
              <Skeleton className="h-7 w-14 animate-shimmer rounded-md" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`idea-skeleton-${index}`}
              className="bg-card rounded-2xl border border-border p-6 space-y-4"
              style={{ boxShadow: cardShadow }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl animate-shimmer" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-44 animate-shimmer rounded-md" />
                    <Skeleton className="h-3 w-28 animate-shimmer rounded-md" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full animate-shimmer" />
              </div>

              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((__, metricIndex) => (
                  <div key={`metric-skeleton-${index}-${metricIndex}`} className="p-2 rounded-lg bg-muted/50 space-y-2">
                    <Skeleton className="h-2.5 w-10 animate-shimmer rounded-md" />
                    <Skeleton className="h-3.5 w-12 animate-shimmer rounded-md" />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-14 animate-shimmer rounded-md" />
                  <Skeleton className="h-3 w-20 animate-shimmer rounded-md" />
                  <Skeleton className="h-3 w-24 animate-shimmer rounded-md" />
                </div>
                <Skeleton className="h-7 w-20 animate-shimmer rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div
          className="bg-card rounded-2xl p-5 border border-border"
          style={{ boxShadow: cardShadow }}
        >
          <p className="text-sm text-muted-foreground mb-1">Total Ideas</p>
          <p className="text-2xl font-semibold text-foreground">{stats.totalShown}</p>
        </div>
        <div
          className="bg-card rounded-2xl p-5 border border-border"
          style={{ boxShadow: cardShadow }}
        >
          <p className="text-sm text-muted-foreground mb-1">High Score (80+)</p>
          <p className="text-2xl font-semibold text-success">{healthyCount}</p>
        </div>
        <div
          className="bg-card rounded-2xl p-5 border border-border"
          style={{ boxShadow: cardShadow }}
        >
          <p className="text-sm text-muted-foreground mb-1">Mid Score (60-79)</p>
          <p className="text-2xl font-semibold text-warning">{degradedCount}</p>
        </div>
        <div
          className="bg-card rounded-2xl p-5 border border-border"
          style={{ boxShadow: cardShadow }}
        >
          <p className="text-sm text-muted-foreground mb-1">Low Score (&lt;60)</p>
          <p className="text-2xl font-semibold text-destructive">{downCount}</p>
        </div>
      </div>

      {/* Ideas Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredIdeas.map((idea) => {
          const status = statusConfig[toIdeaHealth(idea.solopreneurScore)];
          const StatusIcon = status.icon;

          return (
            <div
              key={idea.idea}
              className="bg-card rounded-2xl border border-border p-6 hover:border-primary/20 transition-colors"
              style={{ boxShadow: cardShadow }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", status.bgColor)}>
                    <StatusIcon className={cn("w-5 h-5", status.color)} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{idea.idea}</h3>
                    <p className="text-xs text-muted-foreground">ICP: {firstEntry(idea.icp)}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-full",
                  status.bgColor,
                  status.color
                )}>
                  {status.label}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue</p>
                  <p className="text-sm font-semibold text-foreground">{idea.monthlyRevenue}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Traffic</p>
                  <p className="text-sm font-semibold text-foreground">{idea.monthlyTraffic}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">RPV</p>
                  <p className="text-sm font-semibold text-foreground">{idea.revenuePerVisitor}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Start Cost</p>
                  <p className="text-sm font-semibold text-foreground">{idea.startingCosts}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    Score {idea.solopreneurScore}
                  </span>
                  <span>ICP: {firstEntry(idea.icp)}</span>
                  <span>Tactic: {firstEntry(idea.growthTactics)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => router.push(`/explore?idea=${encodeURIComponent(idea.idea)}`)}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Explore
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <details
        className="bg-card rounded-2xl border border-border p-6"
        style={{ boxShadow: cardShadow }}
      >
        <summary className="cursor-pointer text-sm font-semibold text-foreground">
          Revenue by Growth Tactic
        </summary>
        <p className="text-xs text-muted-foreground mt-2 mb-4">
          Average monthly revenue by tactic across your currently filtered ideas.
        </p>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tacticRevenue} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 250)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 12 }}
                axisLine={{ stroke: "oklch(0.92 0.005 250)" }}
              />
              <YAxis
                dataKey="tactic"
                type="category"
                tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 12 }}
                axisLine={{ stroke: "oklch(0.92 0.005 250)" }}
                width={120}
              />
              <Tooltip
                formatter={(value, _, payload) => [
                  `Avg $${Math.round(Number(value))}K/mo across ${payload?.payload?.ideaCount ?? 0} ideas`,
                  "Revenue",
                ]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid oklch(0.92 0.005 250)",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="avgRevenue" fill="oklch(0.55 0.18 250)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </details>
    </div>
  );
}
