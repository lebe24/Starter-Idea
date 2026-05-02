"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Filter, RotateCcw, Search } from "lucide-react";
import {
  computeIdeaStats,
  defaultIdeaFilters,
  filterIdeas,
  type IdeaFilters,
  type IdeaRecord,
} from "@/lib/ideas-data";

const tacticOptions = [
  "word of mouth",
  "seo (blog posts, organic traffic from search engines)",
  "advertising on social media",
  "pay per click advertising",
  "email marketing",
  "referral program",
  "direct sales",
  "organic social media",
];

interface RightPanelProps {
  ideaFilters: IdeaFilters;
  onIdeaFiltersChange: Dispatch<SetStateAction<IdeaFilters>>;
}

export function RightPanel({ ideaFilters, onIdeaFiltersChange }: RightPanelProps) {
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const filters = ideaFilters;
  const setFilters = onIdeaFiltersChange;

  useEffect(() => {
    let isMounted = true;
    async function loadIdeas() {
      const response = await fetch("/api/ideas");
      const data = await response.json();
      if (isMounted) {
        setIdeas(data.ideas ?? []);
      }
    }
    void loadIdeas();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredIdeas = useMemo(() => filterIdeas(ideas, filters), [ideas, filters]);
  const stats = useMemo(() => computeIdeaStats(filteredIdeas), [filteredIdeas]);

  const activeFilterTags = useMemo(() => {
    const tags: string[] = [];
    if (filters.search) tags.push(`Search: ${filters.search}`);
    if (filters.minScore > 0) tags.push(`Score >= ${filters.minScore}`);
    if (filters.minRevenueK > 0) tags.push(`Revenue >= ${filters.minRevenueK}K`);
    if (Number.isFinite(filters.maxCostK)) tags.push(`Cost <= ${filters.maxCostK}K`);
    if (filters.icpKeyword) tags.push(`ICP: ${filters.icpKeyword}`);
    for (const tactic of filters.tactics) tags.push(`Tactic: ${tactic}`);
    return tags;
  }, [filters]);

  const toggleTactic = (tactic: string) => {
    setFilters((prev) => {
      const exists = prev.tactics.includes(tactic);
      return {
        ...prev,
        tactics: exists ? prev.tactics.filter((item) => item !== tactic) : [...prev.tactics, tactic],
      };
    });
  };

  return (
    <aside className="flex h-screen w-[280px] shrink-0 flex-col overflow-y-auto border-l border-border/80 bg-sidebar">
      <div className="border-b border-border/80 p-5">
        <h3 className="mb-4 flex items-center gap-2 font-serif text-base font-normal text-foreground">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Idea filters
        </h3>

        <div className="space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              placeholder="Search idea, ICP, tactics"
              className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Minimum Score</label>
            <input
              type="range"
              min={0}
              max={100}
              value={filters.minScore}
              onChange={(event) => setFilters((prev) => ({ ...prev, minScore: Number(event.target.value) }))}
              className="w-full mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{filters.minScore}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Min Revenue</label>
              <select
                value={filters.minRevenueK}
                onChange={(event) => setFilters((prev) => ({ ...prev, minRevenueK: Number(event.target.value) }))}
                className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs mt-1"
              >
                <option value={0}>Any</option>
                <option value={10}>10K+</option>
                <option value={50}>50K+</option>
                <option value={100}>100K+</option>
                <option value={500}>500K+</option>
                <option value={1000}>1M+</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Max Cost</label>
              <select
                value={Number.isFinite(filters.maxCostK) ? filters.maxCostK : -1}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    maxCostK: Number(event.target.value) === -1 ? Number.POSITIVE_INFINITY : Number(event.target.value),
                  }))
                }
                className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs mt-1"
              >
                <option value={-1}>Any</option>
                <option value={0}>Zero only</option>
                <option value={1}>Under 1K</option>
                <option value={10}>Under 10K</option>
                <option value={100}>Under 100K</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">ICP Keyword</label>
            <input
              value={filters.icpKeyword}
              onChange={(event) => setFilters((prev) => ({ ...prev, icpKeyword: event.target.value }))}
              placeholder="ex: startups, ecommerce"
              className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs mt-1"
            />
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Growth Tactics</p>
            <div className="grid grid-cols-1 gap-1.5 max-h-28 overflow-y-auto">
              {tacticOptions.map((tactic) => {
                const checked = filters.tactics.includes(tactic);
                return (
                  <label key={tactic} className="flex items-center gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTactic(tactic)}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                    <span className="truncate">{tactic}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">Active Filters</h3>
          <button
            type="button"
            onClick={() => setFilters(defaultIdeaFilters)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {activeFilterTags.length === 0 ? (
            <span className="text-xs text-muted-foreground">No filters active</span>
          ) : (
            activeFilterTags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">
                {tag}
              </span>
            ))
          )}
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Filtered Snapshot</h3>
        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-muted/50">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Ideas shown</p>
            <p className="text-lg font-semibold text-foreground">{stats.totalShown}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Avg score</p>
            <p className="text-lg font-semibold text-foreground">
              {stats.avgScore === null ? "—" : Math.round(stats.avgScore)}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Median revenue</p>
            <p className="text-lg font-semibold text-foreground">
              {stats.medianRevenueK === null ? "—" : `${Math.round(stats.medianRevenueK)}K`}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Top tactic</p>
            <p className="text-sm font-semibold text-foreground">{stats.topTactic ?? "—"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
