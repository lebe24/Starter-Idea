import type { LucideIcon } from "lucide-react";
import type { IdeaRecord } from "@/lib/ideas-data";

export interface HNStory {
  id: number;
  title: string;
  url: string;
  score: number;
  descendants: number;
  by: string;
  time: number;
}

export type RSSSource = "techcrunch" | "indiehackers" | "theverge";

export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  thumbnail: string;
  description: string;
  source: RSSSource;
}

export interface PHPost {
  id: string;
  name: string;
  tagline: string;
  votesCount: number;
  url: string;
  thumbnail: { url: string } | null;
  topics: string[];
  createdAt: string;
}

export type FeedSource = "hn" | "techcrunch" | "producthunt" | "indiehackers" | "theverge";

export interface FeedItem {
  id: string;
  source: FeedSource;
  title: string;
  url: string;
  meta: string;
  timestamp: Date;
  relatedIdea: IdeaRecord | null;
}

export interface OverviewMetric {
  label: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}

export interface ScoreBucket {
  label: string;
  count: number;
  min: number;
  max: number;
}

export interface TacticRevenue {
  tactic: string;
  avgRevenue: number;
  ideaCount: number;
}
