import { Database, DollarSign, TrendingUp, Zap } from "lucide-react";
import type { IdeaRecord } from "@/lib/ideas-data";
import type {
  FeedItem,
  HNStory,
  OverviewMetric,
  PHPost,
  RSSItem,
  ScoreBucket,
  TacticRevenue,
} from "@/lib/overview-types";

export function computeMetrics(ideas: IdeaRecord[]): OverviewMetric[] {
  const totalIdeas = ideas.length;
  const scoredIdeas = ideas.filter((idea) => idea.scoreNum !== null);
  const avgScore = scoredIdeas.length
    ? scoredIdeas.reduce((acc, item) => acc + (item.scoreNum ?? 0), 0) / scoredIdeas.length
    : 0;
  const roundedAvgScore = Math.round(avgScore);
  const zeroCostIdeas = ideas.filter((idea) => idea.costNumK === 0 || idea.costNumK === null).length;
  const highRevenueIdeas = ideas.filter((idea) => (idea.revNumK ?? 0) >= 100).length;

  return [
    {
      label: "Total Ideas",
      value: totalIdeas,
      subtitle: "Starter Story database",
      icon: Database,
      color: "bg-chart-1/10",
      iconColor: "text-chart-1",
    },
    {
      label: "Avg Solopreneur Score",
      value: roundedAvgScore || "—",
      subtitle: "Target benchmark: 75+",
      icon: TrendingUp,
      color: roundedAvgScore >= 75 ? "bg-success/10" : "bg-warning/15",
      iconColor: roundedAvgScore >= 75 ? "text-success" : "text-warning",
      trend: roundedAvgScore >= 75 ? "up" : "neutral",
      trendLabel: roundedAvgScore >= 75 ? "Strong buildability" : "Room to optimize",
    },
    {
      label: "Zero-Cost Ideas",
      value: zeroCostIdeas,
      subtitle: "No upfront investment",
      icon: Zap,
      color: "bg-chart-2/10",
      iconColor: "text-chart-2",
    },
    {
      label: "$100K+ Revenue",
      value: highRevenueIdeas,
      subtitle: "Proven at scale",
      icon: DollarSign,
      color: "bg-success/10",
      iconColor: "text-success",
    },
  ];
}

export function computeScoreBuckets(ideas: IdeaRecord[]): ScoreBucket[] {
  const ranges: ScoreBucket[] = [];
  for (let start = 0; start <= 90; start += 10) {
    const end = start === 90 ? 100 : start + 9;
    ranges.push({
      label: `${start}-${end}`,
      count: 0,
      min: start,
      max: end,
    });
  }

  for (const idea of ideas) {
    if (idea.scoreNum === null) continue;
    const clamped = Math.max(0, Math.min(100, idea.scoreNum));
    const bucketIndex = Math.min(9, Math.floor(clamped / 10));
    ranges[bucketIndex].count += 1;
  }

  return ranges;
}

export function computeTacticRevenue(ideas: IdeaRecord[]): TacticRevenue[] {
  const tacticAgg = new Map<string, { totalRevenue: number; count: number }>();

  for (const idea of ideas) {
    if (idea.revNumK === null) continue;
    for (const tactic of idea.tacticsList) {
      const key = tactic.trim();
      if (!key) continue;
      const existing = tacticAgg.get(key) ?? { totalRevenue: 0, count: 0 };
      existing.totalRevenue += idea.revNumK;
      existing.count += 1;
      tacticAgg.set(key, existing);
    }
  }

  return Array.from(tacticAgg.entries())
    .map(([tactic, agg]) => ({
      tactic,
      avgRevenue: agg.totalRevenue / agg.count,
      ideaCount: agg.count,
    }))
    .sort((a, b) => b.avgRevenue - a.avgRevenue)
    .slice(0, 8);
}

export function findRelatedIdea(headline: string, ideas: IdeaRecord[]): IdeaRecord | null {
  const lowerHeadline = headline.toLowerCase();
  return (
    ideas.find((idea) => {
      const ideaWordMatch = idea.idea
        .toLowerCase()
        .split(" ")
        .some((word) => word.length > 4 && lowerHeadline.includes(word));
      const icpMatch = idea.icpList.some((tag) => lowerHeadline.includes(tag.toLowerCase()));
      return ideaWordMatch || icpMatch;
    }) ?? null
  );
}

export function mergeAndSortFeed(hn: HNStory[], rss: RSSItem[], ph: PHPost[]): FeedItem[] {
  const hnItems: FeedItem[] = hn.map((story) => ({
    id: `hn-${story.id}`,
    source: "hn",
    title: story.title,
    url: story.url,
    meta: `▲ ${story.score} pts · ${story.descendants ?? 0} comments`,
    timestamp: new Date(story.time * 1000),
    relatedIdea: null,
  }));

  const rssItems: FeedItem[] = rss.map((item, index) => ({
    id: `${item.source}-${index}-${item.title}`,
    source: item.source,
    title: item.title,
    url: item.link,
    meta: item.source === "techcrunch" ? "TechCrunch" : item.source,
    timestamp: new Date(item.pubDate),
    relatedIdea: null,
  }));

  const phItems: FeedItem[] = ph.map((post) => ({
    id: `ph-${post.id}`,
    source: "producthunt",
    title: `${post.name} — ${post.tagline}`,
    url: post.url,
    meta: `🔼 ${post.votesCount} votes`,
    timestamp: new Date(post.createdAt),
    relatedIdea: null,
  }));

  return [...hnItems, ...rssItems, ...phItems].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
}
