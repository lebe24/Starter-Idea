"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Brain,
  ExternalLink,
  RefreshCw,
  Sparkles,
  TrendingDown,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { Section } from "@/app/page";
import { Skeleton } from "@/components/ui/skeleton";
import { GitHubFeedsWidget } from "@/components/dashboard/overview/GitHubFeedsWidget";
import { defaultIdeaFilters, type IdeaFilters, type IdeaRecord } from "@/lib/ideas-data";
import type { FeedSource, HNStory, PHPost, RSSItem } from "@/lib/overview-types";
import {
  computeMetrics,
  computeScoreBuckets,
  computeTacticRevenue,
  findRelatedIdea,
  mergeAndSortFeed,
} from "@/lib/overview-utils";

interface OverviewContentProps {
  onSectionChange: (section: Section) => void;
  ideaFilters: IdeaFilters;
  onIdeaFiltersChange: (next: IdeaFilters) => void;
}

const cardShadow = "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px";
const TECHCRUNCH_FEED = "https://api.rss2json.com/v1/api.json?rss_url=https://techcrunch.com/feed/";

function toRelativeTime(value: Date): string {
  const deltaMs = Date.now() - value.getTime();
  const deltaMin = Math.max(1, Math.floor(deltaMs / (1000 * 60)));
  if (deltaMin < 60) return `${deltaMin}m ago`;
  const deltaHours = Math.floor(deltaMin / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function formatRevenueK(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}M/mo`;
  return `$${Math.round(value)}K/mo`;
}

function sourceLabel(source: FeedSource): string {
  if (source === "hn") return "Hacker News";
  if (source === "producthunt") return "Product Hunt";
  if (source === "techcrunch") return "TechCrunch";
  if (source === "indiehackers") return "Indie Hackers";
  return "The Verge";
}

export function OverviewContent({
  onSectionChange,
  ideaFilters,
  onIdeaFiltersChange,
}: OverviewContentProps) {
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [hnStories, setHnStories] = useState<HNStory[]>([]);
  const [rssItems, setRssItems] = useState<RSSItem[]>([]);
  const [phPosts, setPhPosts] = useState<PHPost[]>([]);
  const [feedSource, setFeedSource] = useState<"all" | "hn" | "tc" | "ph">("all");
  const [chartMode, setChartMode] = useState<"score" | "revenue">("score");
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const refreshFeed = useCallback(async () => {
    setFeedError(null);
    setIsLoadingFeed(true);
    try {
      const topResponse = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
      const topIds = ((await topResponse.json()) as number[]).slice(0, 10);
      const hnItems = await Promise.all(
        topIds.map(async (id) => {
          const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          const item = (await response.json()) as Partial<HNStory>;
          if (!item.url || !item.title || !item.id || !item.time) return null;
          return {
            id: item.id,
            title: item.title,
            url: item.url,
            score: item.score ?? 0,
            descendants: item.descendants ?? 0,
            by: item.by ?? "unknown",
            time: item.time,
          } satisfies HNStory;
        }),
      );

      const rssResponse = await fetch(TECHCRUNCH_FEED);
      const rssPayload = await rssResponse.json();
      const techCrunchItems: RSSItem[] = (rssPayload.items ?? []).slice(0, 5).map((item: {
        title: string;
        link: string;
        pubDate: string;
        thumbnail?: string;
        description?: string;
      }) => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        thumbnail: item.thumbnail ?? "",
        description: item.description ?? "",
        source: "techcrunch",
      }));

      let nextPhPosts: PHPost[] = [];
      try {
        const phResponse = await fetch("/api/producthunt");
        if (phResponse.ok) {
          const phPayload = await phResponse.json();
          if (phPayload.enabled) {
            nextPhPosts = phPayload.posts ?? [];
          }
        }
      } catch {
        // Product Hunt is optional, no-op on failure.
      }

      setHnStories(hnItems.filter((item): item is HNStory => Boolean(item)));
      setRssItems(techCrunchItems);
      setPhPosts(nextPhPosts);
      setLastRefreshed(new Date());
    } catch {
      setFeedError("Could not refresh startup feed. Showing latest cached data.");
    } finally {
      setIsLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadIdeas() {
      try {
        const response = await fetch("/api/ideas");
        const payload = await response.json();
        if (isMounted) setIdeas(payload.ideas ?? []);
      } finally {
        if (isMounted) setIsLoadingIdeas(false);
      }
    }
    void loadIdeas();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    void refreshFeed();
    const interval = setInterval(() => {
      void refreshFeed();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshFeed]);

  const metrics = useMemo(() => computeMetrics(ideas), [ideas]);
  const scoreBuckets = useMemo(() => computeScoreBuckets(ideas), [ideas]);
  const tacticRevenue = useMemo(() => computeTacticRevenue(ideas), [ideas]);
  const lowCostTopIdeas = useMemo(
    () =>
      [...ideas]
        .filter((idea) => (idea.costNumK ?? 0) <= 1 && idea.scoreNum !== null)
        .sort((a, b) => (b.scoreNum ?? 0) - (a.scoreNum ?? 0))
        .slice(0, 5),
    [ideas],
  );

  const mergedFeed = useMemo(() => {
    const base = mergeAndSortFeed(hnStories, rssItems, phPosts);
    return base.map((item) => ({ ...item, relatedIdea: findRelatedIdea(item.title, ideas) }));
  }, [hnStories, rssItems, phPosts, ideas]);

  const visibleFeed = useMemo(() => {
    if (feedSource === "all") return mergedFeed;
    if (feedSource === "hn") return mergedFeed.filter((item) => item.source === "hn");
    if (feedSource === "tc") return mergedFeed.filter((item) => item.source === "techcrunch");
    return mergedFeed.filter((item) => item.source === "producthunt");
  }, [feedSource, mergedFeed]);

  const navigateToIdea = (idea: IdeaRecord) => {
    onIdeaFiltersChange({
      ...defaultIdeaFilters,
      ...ideaFilters,
      search: idea.idea,
    });
    onSectionChange("ideas");
  };

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {isLoadingIdeas
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`metric-skeleton-${index}`}
                className="bg-card rounded-2xl p-5 border border-border space-y-3"
                style={{ boxShadow: cardShadow }}
              >
                <Skeleton className="h-10 w-10 rounded-xl animate-shimmer" />
                <Skeleton className="h-7 w-16 animate-shimmer" />
                <Skeleton className="h-4 w-28 animate-shimmer" />
              </div>
            ))
          : metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.label}
                  className="bg-card rounded-2xl p-5 border border-border"
                  style={{ boxShadow: cardShadow }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${metric.color}`}>
                      <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                    </div>
                    {metric.trend ? (
                      <div className={`flex items-center gap-1 text-sm ${
                        metric.trend === "up" ? "text-success" : "text-warning"
                      }`}>
                        {metric.trend === "up" ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                      </div>
                    ) : null}
                  </div>
                  <p className="text-2xl font-semibold text-foreground mb-1">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{metric.subtitle}</p>
                </div>
              );
            })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Score Distribution / Revenue Chart */}
        <div
          className="xl:col-span-2 bg-card rounded-2xl p-6 border border-border"
          style={{ boxShadow: cardShadow }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {chartMode === "score" ? "Ideas Score Distribution" : "Revenue by Cost Tier"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Higher scores = easier to build solo. 80+ is the sweet spot.
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setChartMode("score")}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  chartMode === "score" ? "bg-background text-foreground" : "text-muted-foreground"
                }`}
              >
                Score Dist.
              </button>
              <button
                type="button"
                onClick={() => setChartMode("revenue")}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  chartMode === "revenue" ? "bg-background text-foreground" : "text-muted-foreground"
                }`}
              >
                Revenue
              </button>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "score" ? (
                <AreaChart data={scoreBuckets}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.55 0.18 250)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="oklch(0.55 0.18 250)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 250)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 12 }}
                    axisLine={{ stroke: "oklch(0.92 0.005 250)" }}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.55 0.01 250)", fontSize: 12 }}
                    axisLine={{ stroke: "oklch(0.92 0.005 250)" }}
                  />
                  <Tooltip
                    formatter={(value, _, payload) => {
                      const count = String(value);
                      const label = payload?.payload?.label ?? "";
                      return [`${count} ideas score between ${label}`, "Density"];
                    }}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid oklch(0.92 0.005 250)",
                      borderRadius: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="oklch(0.55 0.18 250)"
                    strokeWidth={2}
                    fill="url(#scoreGradient)"
                  />
                </AreaChart>
              ) : (
                <BarChart data={tacticRevenue} layout="vertical" barCategoryGap="28%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.92 0.005 250)"
                    horizontal={false}
                  />
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
                      `Avg ${formatRevenueK(Number(value))} across ${payload?.payload?.ideaCount ?? 0} ideas`,
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
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Startup Feed */}
        <div
          className="bg-card rounded-2xl p-6 border border-border"
          style={{ boxShadow: cardShadow }}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Startup Feed</h3>
              <p className="text-sm text-muted-foreground">Live from the builder community</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshFeed()}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Refresh feed"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFeedSource("all")}
              className={`px-2.5 py-1 text-xs rounded-full ${
                feedSource === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => setFeedSource("hn")}
              className={`px-2.5 py-1 text-xs rounded-full ${
                feedSource === "hn" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              HN
            </button>
            <button
              type="button"
              onClick={() => setFeedSource("tc")}
              className={`px-2.5 py-1 text-xs rounded-full ${
                feedSource === "tc" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              TC
            </button>
            {phPosts.length > 0 ? (
              <button
                type="button"
                onClick={() => setFeedSource("ph")}
                className={`px-2.5 py-1 text-xs rounded-full ${
                  feedSource === "ph" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                PH
              </button>
            ) : null}
          </div>
          {feedError ? <p className="text-xs text-warning mb-3">{feedError}</p> : null}
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {isLoadingFeed
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={`feed-skeleton-${index}`} className="space-y-2">
                    <Skeleton className="h-3 w-24 animate-shimmer" />
                    <Skeleton className="h-4 w-full animate-shimmer" />
                    <Skeleton className="h-3 w-1/2 animate-shimmer" />
                  </div>
                ))
              : visibleFeed.slice(0, 10).map((item) => (
                  <article key={item.id} className="p-3 rounded-xl bg-muted/40">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-muted-foreground">{sourceLabel(item.source)}</span>
                      <span className="text-[11px] text-muted-foreground">{toRelativeTime(item.timestamp)}</span>
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-foreground hover:text-primary line-clamp-2 inline-flex gap-1"
                      aria-label={`Open ${item.title} from ${sourceLabel(item.source)}`}
                    >
                      {item.title}
                      <ExternalLink className="w-3 h-3 shrink-0 mt-1" />
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">{item.meta}</p>
                    {item.relatedIdea ? (
                      <button
                        type="button"
                        onClick={() => navigateToIdea(item.relatedIdea as IdeaRecord)}
                        className="mt-2 text-xs rounded-full bg-primary/10 text-primary px-2 py-1 hover:bg-primary/15"
                      >
                        {"->"} {item.relatedIdea.idea}
                      </button>
                    ) : null}
                  </article>
                ))}
            {!isLoadingFeed && visibleFeed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stories found for this source.</p>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Last refreshed {toRelativeTime(lastRefreshed)}
          </p>
        </div>
      </div>

      {/* Insights Row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="bg-card rounded-2xl p-6 border border-border" style={{ boxShadow: cardShadow }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Top Ideas by Solopreneur Score</h3>
            <span className="text-xs text-muted-foreground">Start cost ≤ $1K</span>
          </div>
          <div className="space-y-2">
            {lowCostTopIdeas.map((idea, index) => (
              <div key={idea.idea} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                <span className="w-6 text-sm text-muted-foreground font-medium">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{idea.idea}</p>
                  <p className="text-xs text-muted-foreground">{formatRevenueK(idea.revNumK ?? 0)}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs bg-success/10 text-success">
                  {idea.scoreNum ?? "—"}
                </span>
                <button
                  type="button"
                  onClick={() => navigateToIdea(idea)}
                  className="p-2 rounded-lg hover:bg-muted"
                  aria-label={`Open ${idea.idea} in ideas section`}
                >
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <GitHubFeedsWidget ideas={ideas} onIdeaSelect={navigateToIdea} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onSectionChange("ideas")}
          className="text-left bg-card rounded-2xl p-5 border border-border hover:bg-muted/40 transition-colors"
          style={{ boxShadow: cardShadow }}
        >
          <Brain className="w-5 h-5 text-chart-1 mb-3" />
          <p className="font-semibold text-foreground">Browse Ideas</p>
          <p className="text-sm text-muted-foreground">Explore all opportunities {"->"}</p>
        </button>

        <button
          type="button"
          onClick={() => onSectionChange("chat")}
          className="text-left bg-card rounded-2xl p-5 border border-border hover:bg-muted/40 transition-colors"
          style={{ boxShadow: cardShadow }}
        >
          <Sparkles className="w-5 h-5 text-chart-2 mb-3" />
          <p className="font-semibold text-foreground">Ask AI</p>
          <p className="text-sm text-muted-foreground">Chat about any idea {"->"}</p>
        </button>

        <button
          type="button"
          onClick={() => {
            onIdeaFiltersChange({
              ...defaultIdeaFilters,
              ...ideaFilters,
              maxCostK: 0,
            });
            onSectionChange("ideas");
          }}
          className="text-left bg-card rounded-2xl p-5 border border-border hover:bg-muted/40 transition-colors"
          style={{ boxShadow: cardShadow }}
        >
          <Clock className="w-5 h-5 text-success mb-3" />
          <p className="font-semibold text-foreground">Zero-Cost Picks</p>
          <p className="text-sm text-muted-foreground">Ideas with $0 to start {"->"}</p>
        </button>
      </div>
    </div>
  );
}
