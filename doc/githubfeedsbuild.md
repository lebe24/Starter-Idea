# GitHub Feeds Widget — Build Plan
## `githubfeedsbuild.md`

> **Project:** Micro-SaaS Ideas Explorer — Next.js 16 / App Router
> **Replaces:** "Revenue by Growth Tactic" horizontal BarChart in Row 3, right column (overviewbuild.md §4 Row 3)
> **Position:** `components/dashboard/overview/GitHubFeedsWidget.tsx`
> **Last updated:** April 2026

---

## 1. What This Replaces and Why

In `overviewbuild.md`, Row 3 is a `grid-cols-2` layout:
- **Left column:** Top 5 Ideas by Solopreneur Score (kept as-is)
- **Right column:** Revenue by Growth Tactic — horizontal Recharts BarChart (REPLACED)

The Revenue by Tactic chart is useful but entirely static — it only shows patterns already in the local database. The GitHub Feeds Widget replaces it with **live external signal**: what the open-source community is actually building and shipping right now in the SaaS and AI automation space. This makes Row 3 a mix of internal intelligence (left) and external market signal (right), which is more valuable for a solopreneur doing idea research.

---

## 2. Widget Overview

The GitHub Feeds Widget shows two curated live feeds pulled from the GitHub Search API via a Next.js server route:

1. **Trending SaaS Repos** — most-starred SaaS repositories pushed in the last 7 days
2. **AI & Automation Tools** — trending AI/automation/n8n-adjacent repos with 50+ stars pushed in the last 14 days

Both feeds are displayed in a single card with a **tab toggle** between them. Each repo card shows:
- Repo name + owner
- Description (truncated)
- Star count + stars gained this period
- Primary language badge
- Topic tags (first 3)
- A **cross-reference chip** if the repo matches any idea in the local database

The widget fits exactly into the right column of the existing `grid-cols-2` Row 3 layout — no structural changes to `overview-content.tsx` beyond swapping the component.

---

## 3. Layout Position in the Updated Overview

```
┌────────────────────────────────────────────────────────────────────┐
│  ROW 1 — grid-cols-4  (Metrics — unchanged)                        │
├────────────────────────────────────────────────────────────────────┤
│  ROW 2 — grid-cols-3  (Score Chart + News Feed — unchanged)        │
├────────────────────────────────────────────────────────────────────┤
│  ROW 3 — grid-cols-2                                               │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐│
│  │  🏆 Top 5 Ideas              │  │  ⚡ GitHub Pulse  ← THIS     ││
│  │  (unchanged from plan)       │  │  [Trending SaaS] [AI Tools]  ││
│  │                              │  │  ──────────────────────────  ││
│  │                              │  │  wasp-lang/open-saas         ││
│  │                              │  │  ★ 9,821  +312 this week     ││
│  │                              │  │  [TypeScript] [saas]         ││
│  │                              │  │  → Checkout software ←chip   ││
│  │                              │  │  ──────────────────────────  ││
│  │                              │  │  n8n-io/n8n                  ││
│  │                              │  │  ★ 47,200  +891 this week    ││
│  │                              │  │  [TypeScript] [automation]   ││
│  │                              │  │  → Automate Data Extraction  ││
│  └──────────────────────────────┘  └──────────────────────────────┘│
├────────────────────────────────────────────────────────────────────┤
│  ROW 4 — Quick Actions  (unchanged)                                │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Sources & API Specification

### 4.1 Feed 1 — Trending SaaS Repos

**GitHub Search API query:**
```
GET https://api.github.com/search/repositories
  ?q=topic:saas+pushed:>{YYYY-MM-DD}
  &sort=stars
  &order=desc
  &per_page=8
```

Where `{YYYY-MM-DD}` is today minus 7 days, computed at request time server-side.

**What "trending" means here:** Most starred repos that have had a commit pushed within the last 7 days. This is the closest approximation to GitHub's own trending algorithm available via the official Search API.

**Supplementary query** (run in parallel, merged into same feed):
```
GET https://api.github.com/search/repositories
  ?q=topic:saas-boilerplate+OR+topic:micro-saas+pushed:>{7_days_ago}
  &sort=stars&order=desc&per_page=5
```

De-duplicate by `full_name` before returning. Max 8 unique repos shown.

---

### 4.2 Feed 2 — AI & Automation Tools

**GitHub Search API query:**
```
GET https://api.github.com/search/repositories
  ?q=topic:ai-tools+OR+topic:automation+OR+topic:n8n+stars:>50+pushed:>{14_days_ago}
  &sort=stars
  &order=desc
  &per_page=8
```

14-day window instead of 7 because this space is slightly less active — wider window gives better results.

**Supplementary query** (run in parallel):
```
GET https://api.github.com/search/repositories
  ?q=topic:llm+OR+topic:langchain+OR+topic:ai-agent+stars:>100+pushed:>{14_days_ago}
  &sort=stars&order=desc&per_page=5
```

De-duplicate by `full_name`. Max 8 unique repos shown.

---

### 4.3 Rate Limit Strategy

| Auth method | Limit |
|---|---|
| No auth | 60 req/hour total, 10 req/min for Search |
| Personal Access Token (PAT) | 5,000 req/hour total, 30 req/min for Search |

**Decision: Always use a PAT via server route.** For a personal tool with 15-minute caching, a free GitHub PAT with `public_repo` read scope is more than sufficient. No unauthenticated calls are made — the token lives exclusively in `.env.local` and the server route.

**Caching:** All 4 search queries are cached server-side for 15 minutes using an in-memory `Map`. The dashboard refreshes at most 4 times per hour across both feeds — well within limits.

**Request budget per refresh cycle:**
- Feed 1: 2 parallel Search API calls
- Feed 2: 2 parallel Search API calls
- Total: 4 requests per refresh cycle
- At 15-minute cache: max 16 requests/hour → trivially within 5,000/hour PAT limit

---

## 5. Server Route — app/api/github/route.ts

```typescript
// app/api/github/route.ts
import { NextRequest, NextResponse } from 'next/server'

const GH_TOKEN = process.env.GITHUB_TOKEN
const GH_BASE = 'https://api.github.com'
const GH_HEADERS = {
  'Accept': 'application/vnd.github+json',
  'Authorization': `Bearer ${GH_TOKEN}`,
  'X-GitHub-Api-Version': '2022-11-28',
}

// In-memory cache keyed by query string
const cache = new Map<string, { data: GHRepo[]; fetchedAt: number }>()
const CACHE_TTL_MS = 15 * 60 * 1000  // 15 minutes

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000)
  return d.toISOString().split('T')[0]
}

async function searchRepos(query: string): Promise<GHRepo[]> {
  const cacheKey = query
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data
  }

  const url = `${GH_BASE}/search/repositories?${query}&per_page=10`
  const res = await fetch(url, { headers: GH_HEADERS })

  if (!res.ok) {
    // Return stale cache if available rather than erroring
    if (cached) return cached.data
    throw new Error(`GitHub API error: ${res.status}`)
  }

  const json = await res.json()
  const items: GHRepo[] = (json.items ?? []).map(normalizeRepo)
  cache.set(cacheKey, { data: items, fetchedAt: Date.now() })
  return items
}

function normalizeRepo(raw: any): GHRepo {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    owner: raw.owner.login,
    ownerAvatar: raw.owner.avatar_url,
    description: raw.description ?? '',
    url: raw.html_url,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    language: raw.language ?? null,
    topics: raw.topics ?? [],
    pushedAt: raw.pushed_at,
    createdAt: raw.created_at,
    license: raw.license?.spdx_id ?? null,
    openIssues: raw.open_issues_count,
  }
}

function dedupeByFullName(repos: GHRepo[]): GHRepo[] {
  const seen = new Set<string>()
  return repos.filter(r => {
    if (seen.has(r.fullName)) return false
    seen.add(r.fullName)
    return true
  })
}

export async function GET(req: NextRequest) {
  if (!GH_TOKEN) {
    return NextResponse.json(
      { error: 'GITHUB_TOKEN not configured' },
      { status: 503 }
    )
  }

  const feed = req.nextUrl.searchParams.get('feed') ?? 'saas'
  const since7  = daysAgo(7)
  const since14 = daysAgo(14)

  try {
    let repos: GHRepo[]

    if (feed === 'saas') {
      const [primary, secondary] = await Promise.all([
        searchRepos(`q=topic:saas+pushed:>${since7}&sort=stars&order=desc`),
        searchRepos(`q=topic:saas-boilerplate+OR+topic:micro-saas+pushed:>${since7}&sort=stars&order=desc`),
      ])
      repos = dedupeByFullName([...primary, ...secondary]).slice(0, 8)

    } else if (feed === 'ai') {
      const [primary, secondary] = await Promise.all([
        searchRepos(`q=topic:ai-tools+OR+topic:automation+OR+topic:n8n+stars:>50+pushed:>${since14}&sort=stars&order=desc`),
        searchRepos(`q=topic:llm+OR+topic:ai-agent+stars:>100+pushed:>${since14}&sort=stars&order=desc`),
      ])
      repos = dedupeByFullName([...primary, ...secondary]).slice(0, 8)

    } else {
      return NextResponse.json({ error: 'Unknown feed type' }, { status: 400 })
    }

    return NextResponse.json({
      repos,
      cachedAt: new Date().toISOString(),
      feed,
    })

  } catch (err) {
    console.error('GitHub API error:', err)
    return NextResponse.json({ error: 'Failed to fetch GitHub data' }, { status: 500 })
  }
}
```

---

## 6. Data Types — lib/github-types.ts (new file)

```typescript
// lib/github-types.ts

export interface GHRepo {
  id: number
  name: string
  fullName: string            // "owner/repo"
  owner: string
  ownerAvatar: string         // avatar URL for optional display
  description: string
  url: string                 // github.com URL
  stars: number
  forks: number
  language: string | null
  topics: string[]
  pushedAt: string            // ISO date string
  createdAt: string           // ISO date string
  license: string | null      // SPDX identifier e.g. "MIT"
  openIssues: number
}

export type GHFeedType = 'saas' | 'ai'

export interface GHFeedState {
  saas: GHRepo[]
  ai: GHRepo[]
  isLoading: boolean
  error: string | null
  cachedAt: Date | null
}

export interface GHRepoWithMatch extends GHRepo {
  relatedIdea: IdeaRecord | null   // cross-reference result
}
```

---

## 7. Component — GitHubFeedsWidget.tsx

**File location:** `components/dashboard/overview/GitHubFeedsWidget.tsx`

**Props:**
```typescript
interface GitHubFeedsWidgetProps {
  ideas: IdeaRecord[]                    // from parent — already fetched in OverviewContent
  onIdeaSelect: (idea: IdeaRecord) => void  // navigates to Ideas section + opens drawer
}
```

**Local state:**
```typescript
const [activeFeed, setActiveFeed] = useState<GHFeedType>('saas')
const [feedState, setFeedState] = useState<GHFeedState>({
  saas: [], ai: [], isLoading: true, error: null, cachedAt: null
})
const [isRefreshing, setIsRefreshing] = useState(false)
```

**Data fetch:**
```typescript
async function fetchFeed(feed: GHFeedType, silent = false) {
  if (!silent) setFeedState(s => ({ ...s, isLoading: true, error: null }))
  else setIsRefreshing(true)

  try {
    const res = await fetch(`/api/github?feed=${feed}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    setFeedState(s => ({
      ...s,
      [feed]: data.repos,
      isLoading: false,
      cachedAt: new Date(data.cachedAt),
    }))
  } catch (err) {
    setFeedState(s => ({
      ...s,
      isLoading: false,
      error: 'Could not load GitHub data. Showing cached results.',
    }))
  } finally {
    setIsRefreshing(false)
  }
}

// On mount: fetch both feeds in parallel
useEffect(() => {
  Promise.all([fetchFeed('saas', false), fetchFeed('ai', false)])
}, [])

// Auto-refresh every 15 minutes
useEffect(() => {
  const interval = setInterval(() => {
    fetchFeed(activeFeed, true)  // silent refresh
  }, 15 * 60 * 1000)
  return () => clearInterval(interval)
}, [activeFeed])
```

**Cross-reference enrichment:** Before rendering, enrich each repo with a matched idea:

```typescript
const enrichedRepos = useMemo<GHRepoWithMatch[]>(() => {
  const currentRepos = activeFeed === 'saas' ? feedState.saas : feedState.ai
  return currentRepos.map(repo => ({
    ...repo,
    relatedIdea: findRelatedIdea(
      `${repo.name} ${repo.description} ${repo.topics.join(' ')}`,
      ideas
    )
  }))
}, [activeFeed, feedState.saas, feedState.ai, ideas])
```

---

## 8. Sub-Components

### 8.1 FeedTabBar

```
[⚡ Trending SaaS]  [🤖 AI & Automation]          [↻ refreshed 3m ago]
```

- Two tab buttons using shadcn `Button` variant `ghost` with active state indicator
- Right-aligned refresh button — shows relative time since `cachedAt`, spins icon on `isRefreshing`
- Clicking the refresh button calls `fetchFeed(activeFeed, true)` (silent, no full loading state)

### 8.2 RepoCard

Each repo renders as a compact card row. Not a full card component — more like a list item with hover state.

```
┌──────────────────────────────────────────────────────────┐
│  [avatar] wasp-lang / open-saas                [MIT]     │
│  Free open-source SaaS app starter for React & Node.js   │
│  ★ 9,821   🍴 412   [TypeScript]  [saas] [boilerplate]   │
│  → Checkout software                        pushed 2h ago│
└──────────────────────────────────────────────────────────┘
```

**Fields rendered:**
- **Owner avatar** — `<img src={repo.ownerAvatar} />` 20px circle, `alt={repo.owner}`
- **Full name** — `owner / name`, linked to `repo.url` via `target="_blank" rel="noopener"`
- **License badge** — small pill, only shown if `repo.license` is non-null. "MIT", "Apache-2.0", etc.
- **Description** — `line-clamp-2` (2-line truncation via Tailwind)
- **Star count** — `★ {formatCount(repo.stars)}` where `formatCount(9821)` → `"9.8K"`
- **Fork count** — `🍴 {formatCount(repo.forks)}`
- **Language badge** — coloured dot + language name. Colour is derived from a small static lookup for common languages (TypeScript → blue, Python → yellow, Go → cyan, Rust → orange, etc.)
- **Topic tags** — first 3 topics as small grey pills. Overflow count if more than 3: `+2`
- **Cross-reference chip** — `→ {idea.name}` in accent colour, clickable, calls `onIdeaSelect(idea)`. Hidden if `relatedIdea === null`.
- **Pushed at** — relative time string: "pushed 2h ago", "pushed 3d ago"

**Hover state:** subtle `bg-muted/50` background on the full row. Cursor pointer on the cross-reference chip only (the rest of the card links to GitHub).

### 8.3 LoadingSkeleton

Shown while `feedState.isLoading` is true. 4 skeleton rows using Tailwind `animate-pulse`:

```typescript
// 4 rows of:
<div className="flex gap-3 items-start py-3 border-b border-border/50">
  <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
  <div className="flex-1 space-y-2">
    <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
    <div className="h-3 bg-muted rounded w-full animate-pulse" />
    <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
  </div>
</div>
```

### 8.4 ErrorState

Shown when `feedState.error` is non-null and `feedState[activeFeed].length === 0` (no stale data to fall back on):

```
┌─────────────────────────────────────────────────────┐
│  ⚠  Could not load GitHub data                      │
│  Check your GITHUB_TOKEN or network connection.     │
│  [Try again]                                        │
└─────────────────────────────────────────────────────┘
```

"Try again" calls `fetchFeed(activeFeed, false)` (full loading state).

If stale data exists but a refresh failed, show a quiet banner above the list instead:
```
⚠  Showing cached data from 23 min ago  [Try again]
```

### 8.5 EmptyState

Shown when fetch succeeds but returns 0 repos (GitHub trending page is sometimes empty):

```
┌─────────────────────────────────────────────────────┐
│  🔍  No repos found for this feed right now         │
│  GitHub's trending data can be sparse — try again   │
│  in a few minutes.                                  │
└─────────────────────────────────────────────────────┘
```

---

## 9. Cross-Reference Logic — lib/github-utils.ts (new file)

```typescript
// lib/github-utils.ts
import type { IdeaRecord } from './ideas-data'

/**
 * Find the best matching idea for a GitHub repo based on keyword overlap.
 * Matches against idea name, ICP tags, and growth tactics.
 * Returns the first match found (not necessarily the strongest — good enough
 * for a visual hint).
 */
export function findRelatedIdea(
  repoText: string,           // concatenated: name + description + topics
  ideas: IdeaRecord[]
): IdeaRecord | null {
  const lower = repoText.toLowerCase()

  return ideas.find(idea => {
    // Check significant words in the idea name (skip short words)
    const ideaWords = idea.name
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4)

    const nameMatch = ideaWords.some(word => lower.includes(word))
    if (nameMatch) return true

    // Check ICP tags
    const icpMatch = idea.icp.some(tag =>
      lower.includes(tag.toLowerCase().split(/\s+/)[0])   // first word of ICP tag
    )
    if (icpMatch) return true

    return false
  }) ?? null
}

/**
 * Format large numbers: 9821 → "9.8K", 1200000 → "1.2M"
 */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/**
 * Get a Tailwind text colour class for a programming language.
 * Falls back to muted for unknown languages.
 */
export function languageColor(lang: string | null): string {
  const map: Record<string, string> = {
    TypeScript: 'text-blue-400',
    JavaScript: 'text-yellow-400',
    Python:     'text-yellow-300',
    Go:         'text-cyan-400',
    Rust:       'text-orange-500',
    Ruby:       'text-red-400',
    Java:       'text-orange-400',
    'C#':       'text-purple-400',
    PHP:        'text-indigo-400',
    Swift:      'text-orange-300',
    Kotlin:     'text-purple-300',
    Dart:       'text-blue-300',
  }
  return lang ? (map[lang] ?? 'text-muted-foreground') : 'text-muted-foreground'
}

/**
 * Relative time string from ISO date: "2h ago", "3d ago", "just now"
 */
export function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)

  if (mins < 2)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30)  return `${days}d ago`
  return new Date(isoDate).toLocaleDateString()
}
```

---

## 10. Full Component Skeleton

```typescript
// components/dashboard/overview/GitHubFeedsWidget.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Github, RefreshCw, Star, GitFork, ExternalLink, Zap, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { IdeaRecord } from '@/lib/ideas-data'
import type { GHRepo, GHFeedType, GHFeedState, GHRepoWithMatch } from '@/lib/github-types'
import { findRelatedIdea, formatCount, languageColor, relativeTime } from '@/lib/github-utils'

interface GitHubFeedsWidgetProps {
  ideas: IdeaRecord[]
  onIdeaSelect: (idea: IdeaRecord) => void
}

export function GitHubFeedsWidget({ ideas, onIdeaSelect }: GitHubFeedsWidgetProps) {
  const [activeFeed, setActiveFeed] = useState<GHFeedType>('saas')
  const [feedState, setFeedState] = useState<GHFeedState>({
    saas: [], ai: [], isLoading: true, error: null, cachedAt: null
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  // ... fetch logic (see §7)

  const enrichedRepos = useMemo<GHRepoWithMatch[]>(() => {
    const repos = activeFeed === 'saas' ? feedState.saas : feedState.ai
    return repos.map(repo => ({
      ...repo,
      relatedIdea: findRelatedIdea(`${repo.name} ${repo.description} ${repo.topics.join(' ')}`, ideas)
    }))
  }, [activeFeed, feedState.saas, feedState.ai, ideas])

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 h-full flex flex-col" style={cardShadow}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Github className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">GitHub Pulse</span>
        </div>
        {/* Refresh button — see §8.1 */}
      </div>

      {/* Tab bar */}
      <FeedTabBar
        activeFeed={activeFeed}
        onFeedChange={setActiveFeed}
        cachedAt={feedState.cachedAt}
        isRefreshing={isRefreshing}
        onRefresh={() => fetchFeed(activeFeed, true)}
      />

      {/* Feed content */}
      <div className="flex-1 overflow-y-auto mt-3 space-y-0 divide-y divide-border/40">
        {feedState.isLoading && <LoadingSkeleton />}
        {!feedState.isLoading && feedState.error && enrichedRepos.length === 0 && (
          <ErrorState error={feedState.error} onRetry={() => fetchFeed(activeFeed, false)} />
        )}
        {!feedState.isLoading && enrichedRepos.length === 0 && !feedState.error && (
          <EmptyState />
        )}
        {enrichedRepos.map(repo => (
          <RepoCard key={repo.id} repo={repo} onIdeaSelect={onIdeaSelect} />
        ))}
      </div>

      {/* Error banner if stale data shown */}
      {feedState.error && enrichedRepos.length > 0 && (
        <div className="mt-2 text-xs text-amber-500 flex items-center gap-1">
          ⚠ Showing cached data · <button onClick={() => fetchFeed(activeFeed, false)}>Try again</button>
        </div>
      )}
    </div>
  )
}
```

---

## 11. Integration into OverviewContent

The change to `overview-content.tsx` is minimal — swap one component for another in Row 3:

```typescript
// BEFORE (overviewbuild.md Row 3, right column)
<TacticRevenueChart data={computeTacticRevenue(ideas)} />

// AFTER
<GitHubFeedsWidget
  ideas={ideas}
  onIdeaSelect={(idea) => {
    onSectionChange('ideas')
    onIdeaPreselect(idea)   // pre-opens the detail drawer
  }}
/>
```

`ideas` is already fetched in `OverviewContent` on mount — no additional fetch needed at the parent level. The widget handles its own GitHub API calls internally via `/api/github`.

**Props that need to flow down from root:**
- `onSectionChange` — already flows through `MainContent` → `OverviewContent`
- `onIdeaPreselect` — new: sets a preselected idea in root state, opens drawer when Ideas section loads

---

## 12. Environment Setup

```bash
# .env.local — add this line
GITHUB_TOKEN=ghp_...
```

**How to generate a GitHub PAT:**
1. Go to `github.com` → Settings → Developer Settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: `micro-saas-explorer`
4. Scopes: check `public_repo` only (read-only access to public repositories)
5. Copy the token immediately — it won't be shown again
6. Paste into `.env.local`

**Add to Vercel:** Settings → Environment Variables → add `GITHUB_TOKEN` for Preview + Production.

**Graceful degradation when token missing:** The server route returns `HTTP 503` with `{ error: 'GITHUB_TOKEN not configured' }`. The widget shows the `ErrorState` component. No crash, no blank screen.

---

## 13. What Happens to Revenue by Tactic

The `TacticRevenueChart` component and `computeTacticRevenue()` utility function are **not deleted** — they are moved to the Ideas section as a supplementary analytics view. Specifically:

- `computeTacticRevenue()` stays in `lib/overview-utils.ts` (used elsewhere)
- `TacticRevenueChart` moves to `components/dashboard/content/ServicesContent.tsx` as a collapsible analytics panel at the bottom of the Ideas section
- This way the data is still accessible — just in a more contextually appropriate place (alongside the ideas table rather than the overview)

This is better UX: tactic revenue analytics belongs in the Ideas section where the user is actively filtering and comparing ideas, not on the overview.

---

## 14. Build Phases

### Phase 1 — Server Route + Types
**New files:** `app/api/github/route.ts`, `lib/github-types.ts`, `lib/github-utils.ts`

- [ ] Create `lib/github-types.ts` — `GHRepo`, `GHFeedType`, `GHFeedState`, `GHRepoWithMatch`
- [ ] Create `lib/github-utils.ts` — `findRelatedIdea`, `formatCount`, `languageColor`, `relativeTime`
- [ ] Create `app/api/github/route.ts` — both feed queries, caching, normalisation, deduplication
- [ ] Add `GITHUB_TOKEN` to `.env.local`
- [ ] Test route manually: `GET /api/github?feed=saas` and `GET /api/github?feed=ai`
- [ ] Verify cache works: second request within 15 min returns same data instantly
- [ ] Verify graceful 503 when token is missing

**Acceptance criteria:** Both feed endpoints return correctly shaped `GHRepo[]`. Caching reduces duplicate GitHub API calls to zero within TTL window. 503 returned cleanly when token absent.

---

### Phase 2 — RepoCard + LoadingSkeleton
**New file:** `components/dashboard/overview/GitHubFeedsWidget.tsx` (partial)

- [ ] Build `RepoCard` component with all fields: avatar, full name, description, stars, forks, language, topics, pushed time
- [ ] Implement `formatCount` in use — stars and forks display as "9.8K"
- [ ] Implement language colour dot
- [ ] Implement topic tag pills — first 3, overflow count
- [ ] Implement `relativeTime` for pushed date
- [ ] Build `LoadingSkeleton` — 4 pulsing rows
- [ ] Stub with static mock data to validate layout before API wiring

**Acceptance criteria:** Card layout renders correctly with mock data. Language colours correct for common languages. Long descriptions truncate at 2 lines. `formatCount` correct for edge cases (999, 1000, 999999, 1000000).

---

### Phase 3 — Cross-Reference Chip
- [ ] Implement `findRelatedIdea()` in `lib/github-utils.ts`
- [ ] Wire `enrichedRepos` memo in `GitHubFeedsWidget`
- [ ] Render cross-reference chip on `RepoCard` when `relatedIdea !== null`
- [ ] Wire chip `onClick` to `onIdeaSelect` prop
- [ ] Test cross-reference matches with real data — verify at least 2–3 chips appear per feed

**Acceptance criteria:** Cross-reference chip appears on repos with keyword matches. Chip click triggers `onIdeaSelect` with correct idea. No false positives on very short keywords (word length > 4 filter working).

---

### Phase 4 — Tab Bar + Fetch Logic
- [ ] Implement `FeedTabBar` component with two tabs and refresh button
- [ ] Implement `fetchFeed` in `GitHubFeedsWidget` — full and silent modes
- [ ] Wire mount fetch: both feeds fetched in parallel on mount
- [ ] Wire tab switching: switching tab shows already-fetched data instantly (no refetch)
- [ ] Wire auto-refresh: 15-minute interval refetches active feed silently
- [ ] Wire manual refresh button: calls `fetchFeed(activeFeed, true)`
- [ ] Wire `cachedAt` display: "refreshed 3m ago" updates every minute via a small `useEffect`
- [ ] Build `ErrorState` and `EmptyState` components
- [ ] Wire stale-data banner

**Acceptance criteria:** Both tabs show correct feed data. Tab switch is instant (no loading state). Manual refresh spins icon then updates. Error state shows when route returns non-200. Stale banner shows when refresh fails but data exists.

---

### Phase 5 — Integration into OverviewContent
**Files touched:** `overview-content.tsx`, `lib/overview-utils.ts`, `ServicesContent.tsx`

- [ ] Remove `TacticRevenueChart` from Row 3 right column in `overview-content.tsx`
- [ ] Import and render `GitHubFeedsWidget` in its place
- [ ] Pass `ideas` (already available) and `onIdeaSelect` handler
- [ ] Move `TacticRevenueChart` to bottom of `ServicesContent.tsx` as collapsible analytics panel
- [ ] Add `onIdeaPreselect` to root state and thread it to `OverviewContent`
- [ ] Verify Row 3 grid layout unchanged — widget fills same column correctly

**Acceptance criteria:** GitHub Feeds Widget renders in correct position. `TacticRevenueChart` visible in Ideas section. Row 3 layout unchanged. Cross-reference chip navigation works end-to-end.

---

### Phase 6 — Polish
- [ ] Ensure widget height matches `TopIdeasList` left column in Row 3 (use `h-full` + `overflow-y-auto`)
- [ ] Mobile: Row 3 stacks to single column, widget renders full-width without horizontal overflow
- [ ] All external links (`repo.url`) open in new tab with `rel="noopener noreferrer"`
- [ ] All avatars have meaningful `alt` text
- [ ] Keyboard navigation: cross-reference chips are focusable and activatable via Enter
- [ ] `aria-label` on refresh button: `"Refresh GitHub feed, last updated {time}"`

**Acceptance criteria:** No horizontal scroll on mobile. All links open new tab correctly. Keyboard navigation works on chips. No accessibility warnings in axe audit.

---

## 15. File Map

```
app/
└── api/
    └── github/
        └── route.ts                              NEW — GitHub Search API proxy + cache

lib/
├── github-types.ts                               NEW — GHRepo, GHFeedType, GHFeedState
└── github-utils.ts                               NEW — findRelatedIdea, formatCount, languageColor, relativeTime

components/
└── dashboard/
    └── overview/
        └── GitHubFeedsWidget.tsx                 NEW — full widget (tabs + repo cards + loading/error states)
            ├── FeedTabBar                         (sub-component, same file or split)
            ├── RepoCard                           (sub-component, same file or split)
            ├── LoadingSkeleton                    (sub-component, same file)
            ├── ErrorState                         (sub-component, same file)
            └── EmptyState                         (sub-component, same file)

Modified:
overview-content.tsx                              MODIFY — replace TacticRevenueChart with GitHubFeedsWidget
ServicesContent.tsx                               MODIFY — add TacticRevenueChart as collapsible analytics
app/page.tsx                                      MODIFY — add onIdeaPreselect state + threading

.env.local                                        MODIFY — add GITHUB_TOKEN
```

---

## 16. Success Criteria

| Criterion | Definition of done |
|---|---|
| Both feeds load | Trending SaaS and AI Tools tabs both return real repos |
| Caching works | Second widget load within 15 min shows instantly (no GitHub API call) |
| Cross-reference | At least 2–3 chips visible per feed with real ideas-database matches |
| Tab switching | Instant — no loading state when toggling between already-fetched tabs |
| Error handling | ErrorState shown cleanly when GitHub API is down or token missing |
| Stale fallback | Widget shows last cached data + warning banner if refresh fails |
| Navigation | Chip click opens correct idea detail drawer in Ideas section |
| Mobile layout | Widget renders correctly stacked at 390px |
| Revenue by Tactic preserved | `TacticRevenueChart` accessible in Ideas section analytics panel |
| No regressions | All other Overview widgets unaffected |

---

## 17. Token Quick-Reference Card

```
╔═══════════════════════════════════════════════════════╗
║  GITHUB_TOKEN setup (2 minutes)                       ║
╠═══════════════════════════════════════════════════════╣
║  1. github.com → Settings → Developer Settings        ║
║  2. Personal access tokens → Tokens (classic)         ║
║  3. Generate new token (classic)                      ║
║  4. Name: micro-saas-explorer                         ║
║  5. Scope: public_repo ✓ (read-only, public only)     ║
║  6. Copy token → paste into .env.local                ║
║     GITHUB_TOKEN=ghp_...                              ║
║  7. Add to Vercel env vars (Preview + Production)     ║
╚═══════════════════════════════════════════════════════╝

Rate limits with PAT:
  Search API: 30 req/min  (we use max 4 per 15-min refresh)
  General:  5,000 req/hr  (we use max 16 per hour)
  → We are at <1% of limits at all times
```

---

*Document: `githubfeedsbuild.md`*
*Project: Micro-SaaS Ideas Explorer — Next.js 16 App Router*
*Replaces: Revenue by Growth Tactic (overviewbuild.md §4 Row 3 right column)*
*Last updated: April 2026*
