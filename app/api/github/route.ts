import { NextRequest, NextResponse } from "next/server";
import type { GHRepo, GHFeedType } from "@/lib/github-types";

const GH_BASE = "https://api.github.com";
const CACHE_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, { data: GHRepo[]; fetchedAt: number }>();

function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN?.trim() || undefined;
}

function daysAgo(n: number): string {
  const date = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return date.toISOString().split("T")[0];
}

function ghHeaders() {
  const token = githubToken();
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function normalizeRepo(raw: {
  id: number;
  name: string;
  full_name: string;
  owner?: { login?: string; avatar_url?: string };
  description?: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language?: string | null;
  topics?: string[];
  pushed_at: string;
  created_at: string;
  license?: { spdx_id?: string | null } | null;
  open_issues_count: number;
}): GHRepo {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    owner: raw.owner?.login ?? "unknown",
    ownerAvatar: raw.owner?.avatar_url ?? "",
    description: raw.description ?? "",
    url: raw.html_url,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    language: raw.language ?? null,
    topics: raw.topics ?? [],
    pushedAt: raw.pushed_at,
    createdAt: raw.created_at,
    license: raw.license?.spdx_id ?? null,
    openIssues: raw.open_issues_count,
  };
}

function dedupeByFullName(repos: GHRepo[]): GHRepo[] {
  const seen = new Set<string>();
  return repos.filter((repo) => {
    if (seen.has(repo.fullName)) return false;
    seen.add(repo.fullName);
    return true;
  });
}

async function searchRepos(query: string): Promise<GHRepo[]> {
  const cached = cache.get(query);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.data;

  const url = `${GH_BASE}/search/repositories?${query}&per_page=10`;
  const response = await fetch(url, { headers: ghHeaders(), cache: "no-store" });

  if (!response.ok) {
    if (cached) return cached.data;
    let detail = "";
    try {
      const payload = (await response.json()) as { message?: string };
      detail = payload.message ? ` - ${payload.message}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`GitHub API error: ${response.status}${detail}`);
  }

  const payload = (await response.json()) as { items?: Array<Parameters<typeof normalizeRepo>[0]> };
  const items = (payload.items ?? []).map(normalizeRepo);
  cache.set(query, { data: items, fetchedAt: Date.now() });
  return items;
}

export async function GET(req: NextRequest) {
  if (!githubToken()) {
    return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 503 });
  }

  const feed = (req.nextUrl.searchParams.get("feed") ?? "saas") as GHFeedType;
  const since7 = daysAgo(7);
  const since14 = daysAgo(14);

  try {
    let repos: GHRepo[] = [];

    if (feed === "saas") {
      const [primary, secondary] = await Promise.all([
        searchRepos(`q=topic:saas+pushed:>${since7}&sort=stars&order=desc`),
        searchRepos(`q=topic:micro-saas+pushed:>${since7}&sort=stars&order=desc`),
      ]);
      repos = dedupeByFullName([...primary, ...secondary]).slice(0, 8);
    } else if (feed === "ai") {
      const [primary, secondary] = await Promise.all([
        searchRepos(`q=topic:automation+stars:>50+pushed:>${since14}&sort=stars&order=desc`),
        searchRepos(`q=topic:ai-agent+stars:>100+pushed:>${since14}&sort=stars&order=desc`),
      ]);
      repos = dedupeByFullName([...primary, ...secondary]).slice(0, 8);
    } else {
      return NextResponse.json({ error: "Unknown feed type" }, { status: 400 });
    }

    return NextResponse.json({
      repos,
      cachedAt: new Date().toISOString(),
      feed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch GitHub data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
