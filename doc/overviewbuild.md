# Overview Section — Redesign Build Plan
## `overviewbuild.md`

> **Project:** Micro-SaaS Ideas Explorer — Next.js 16 / App Router
> **Section:** `overview` (activeSection = 'overview' in app/page.tsx)
> **File to rewrite:** `components/dashboard/content/overview-content.tsx`
> **Last updated:** April 2026

---

## 1. What We're Replacing and Why

The current `overview-content.tsx` is a mockup built around a generic SRE/DevOps dashboard (request volume charts, service latency, active incidents). None of it relates to the actual product — a Micro-SaaS Ideas Explorer. The data is all hardcoded local constants with no connection to the ideas database, the AI agent, or any live external source.

The redesigned Overview serves as the **command center** for a solopreneur or startup researcher — the page you see every time you open the app that tells you: what's interesting right now, what the database looks like at a glance, and what you were last working on.

---

## 2. What We Keep From the Existing Structure

| Existing element | Decision | Reason |
|---|---|---|
| 4-card metrics grid (grid-cols-4) | **Keep, repurpose** | Good pattern — replace content with idea database stats |
| `cardShadow` inline style / glassy card aesthetic | **Keep** | Consistent with the rest of the dashboard design system |
| `grid-cols-3` two-col + one-col layout | **Keep, repurpose** | Replace chart + incidents with chart + news feed |
| Recharts AreaChart | **Keep, repurpose** | Reuse for ideas score distribution chart |
| Recharts BarChart | **Keep, repurpose** | Reuse for revenue by tactic chart |
| Active Incidents list | **Replace entirely** | Swap with News Feed Widget |
| `requestsData`, `latencyData`, `metrics`, `activeIncidents` constants | **Remove** | Replace with live data from `/api/ideas` and external APIs |
| `"use client"` directive | **Keep** | Still needs client-side data fetching and interactivity |

---

## 3. New Overview Architecture

```
OverviewContent
│
├── [ROW 1] Metrics Grid (grid-cols-4)
│   ├── Card: Total Ideas in Database
│   ├── Card: Avg Solopreneur Score
│   ├── Card: Zero-Cost Ideas Available
│   └── Card: Ideas with $100K+ Revenue
│
├── [ROW 2] Charts + News Feed (grid-cols-3)
│   ├── [col-span-2] Ideas Score Distribution Chart (AreaChart)
│   │   OR Revenue vs Cost Scatter (toggle)
│   └── [col-span-1] News Feed Widget  ← replaces Active Incidents
│       ├── Hacker News top stories
│       ├── Product Hunt launches (if API key set)
│       └── TechCrunch via RSS-to-JSON proxy
│
├── [ROW 3] Insights Grid (grid-cols-2)
│   ├── Top Ideas by Solopreneur Score (ranked list)
│   └── Revenue by Growth Tactic (horizontal BarChart)
│
└── [ROW 4] Quick Actions Bar
    ├── "Browse all ideas →" (→ ideas section)
    ├── "Ask AI a question →" (→ chat section)
    └── "Top zero-cost picks →" (→ ideas section, pre-filtered)
```

---

## 4. Section-by-Section Specification

### 4.1 Metrics Grid (Row 1)

Replaces the existing 4-card grid. Cards now derive from live data fetched from `/api/ideas`.

| Card | Value | Trend logic | Icon |
|---|---|---|---|
| Total Ideas | `ideas.length` (e.g. 192) | Static — "Starter Story database" subtitle | `Database` |
| Avg Solopreneur Score | Mean of all `score` values, rounded | vs. 70 benchmark: up = green | `TrendingUp` |
| Zero-Cost Ideas | Count where `startCost === 0 or null` | Static — "No upfront investment" | `Zap` |
| $100K+ Revenue | Count where `revenue >= 100` ($K) | Static — "Proven at scale" | `DollarSign` |

**Data source:** `fetch('/api/ideas')` on component mount. Compute all four values client-side using the same `filterIdeas` / `computeIdeaStats` functions already in `lib/ideas-data.ts`.

**Trend direction logic** (preserving the existing pattern of domain-aware colour logic):
- Avg score ≥ 75 → green (good for solo builders)
- Avg score < 75 → amber (still buildable)
- All other cards: static emphasis, no up/down trend arrow

### 4.2 Ideas Score Distribution Chart (Row 2, col-span-2)

Replaces the request volume AreaChart. Reuses the same Recharts `AreaChart` + `ResponsiveContainer` pattern.

**What it shows:** Distribution of solopreneur scores across all 192 ideas — bucketed into 10-point ranges (0–9, 10–19, … 90–100). Each bucket shows idea count. This immediately tells the user where the density of opportunity lies.

**Chart config:**
- X axis: score bucket label ("90–100", "80–89", etc.)
- Y axis: count of ideas in that bucket
- Single area series: `count`
- Custom gradient fill (reuse `requestsGradient` pattern, rename to `scoreGradient`)
- Tooltip: "X ideas score between 80–89"
- Color: use `oklch` accent colour from existing palette

**Toggle (optional):** A small tab control above the chart switches between:
1. Score Distribution (default)
2. Revenue vs Start Cost — a scatter-style bar chart showing avg revenue grouped by cost tier

Both use the same data from `/api/ideas` — no additional fetch needed.

**Chart subtitle:** "Higher scores = easier to build solo. 80+ is the sweet spot."

### 4.3 News Feed Widget (Row 2, col-span-1) ← Replaces Active Incidents

This is the main new widget. Replaces the Active Incidents list entirely. Shows live content from three sources, displayed as a unified scrollable feed with source badges.

**Feed sources and how to fetch each:**

---

#### Source 1 — Hacker News (Primary, Zero Setup)

**API:** Hacker News Firebase REST API — no auth, no API key, no CORS issues.

```
GET https://hacker-news.firebaseio.com/v0/topstories.json
→ Returns array of top story IDs (up to 500)

GET https://hacker-news.firebaseio.com/v0/item/{id}.json
→ Returns { id, title, url, score, by, time, descendants }
```

**Implementation:**
1. Fetch top 10 story IDs
2. Parallel fetch all 10 item details (`Promise.all`)
3. Filter to only stories with a `url` (skip Ask HN, Show HN without links if desired)
4. Display: title (linked), score (points), comment count, relative time

**Relevance cross-reference:** For each HN story title, run a lightweight keyword match against idea names and ICP tags in the local ideas array. If a match is found, show a small chip: `→ Checkout software` linking to that idea in the Ideas section.

**Refresh:** Re-fetch every 5 minutes using a `setInterval` in `useEffect` or a simple manual refresh button.

---

#### Source 2 — TechCrunch RSS (No Auth, Needs Proxy)

**API:** TechCrunch RSS feed proxied through `rss2json.com` (free, 10K req/month).

```
GET https://api.rss2json.com/v1/api.json?rss_url=https://techcrunch.com/feed/
→ Returns { items: [{ title, link, pubDate, thumbnail, description }] }
```

**CORS:** Handled by rss2json — no CORS issues from the browser.

**Display:** Show top 5 items. Title (linked), publication time, small thumbnail if available.

**Alternative RSS feeds** (same proxy pattern, same implementation):
- The Verge Tech: `https://www.theverge.com/rss/index.xml`
- Indie Hackers: `https://feeds2.feedburner.com/IndieHackers`
- MIT Technology Review: `https://www.technologyreview.com/feed/`

Let the user toggle between feed sources via small tab chips on the widget header.

---

#### Source 3 — Product Hunt (Optional, Requires API Key)

**API:** Product Hunt GraphQL API — requires free developer account at `api.producthunt.com`.

```graphql
POST https://api.producthunt.com/v2/api/graphql
Authorization: Bearer {token}

query {
  posts(first: 5, order: VOTES) {
    edges {
      node {
        name
        tagline
        votesCount
        url
        thumbnail { url }
        topics { edges { node { name } } }
      }
    }
  }
}
```

**Environment variable:** `PRODUCT_HUNT_TOKEN=...` in `.env.local`. Fetch via a Next.js server route `/api/producthunt` (keeps token server-side). If token is not set, this source tab is hidden — the widget gracefully degrades to HN + TechCrunch only.

**Display:** Product name, tagline, vote count (🔼 432), topic tags. Topic tags are cross-referenced against idea ICPs for the relevance chip feature.

---

#### News Feed Widget UI Structure

```
┌─────────────────────────────────────────────────┐
│  📰 Startup Feed              [HN] [TC] [PH]    │
│  Live from the builder community    [↻ refresh]  │
├─────────────────────────────────────────────────┤
│  ● Hacker News                         2 min ago │
│  "One-page checkout startup raises $2M"          │
│  ▲ 342 pts · 87 comments                        │
│  → Checkout software  (cross-reference chip)    │
├─────────────────────────────────────────────────┤
│  ● TechCrunch                          1 hr ago  │
│  "AI video tools are replacing UGC agencies"    │
│  → AI video generation (cross-reference chip)   │
├─────────────────────────────────────────────────┤
│  ● Product Hunt                        Today     │
│  Notion Forms 2.0  — 🔼 621                     │
│  "The simplest way to collect data in Notion"   │
│  → forms for Notion users (cross-reference chip)│
├─────────────────────────────────────────────────┤
│  [Load more]                                    │
└─────────────────────────────────────────────────┘
```

**Source tab badges:** `[HN]` `[TC]` `[PH]` — clicking a tab filters the feed to that source only. Default shows all three interleaved, sorted by recency.

**Cross-reference chip logic:**
```typescript
function findRelatedIdea(headline: string, ideas: IdeaRecord[]): IdeaRecord | null {
  const lower = headline.toLowerCase()
  return ideas.find(idea =>
    idea.name.toLowerCase().split(' ').some(word =>
      word.length > 4 && lower.includes(word)
    ) ||
    idea.icp.some(tag => lower.includes(tag.toLowerCase()))
  ) ?? null
}
```

Clicking the chip navigates to the Ideas section with that idea pre-selected in the detail drawer.

---

### 4.4 Insights Grid (Row 3)

Two cards side by side (grid-cols-2).

**Left card — Top 5 Ideas by Solopreneur Score:**

A simple ranked list, not a chart. Shows the top 5 ideas sorted by score descending where `startCost <= 1` ($K — i.e. under $1K to start). This is the "best bang for effort" shortlist.

Each row:
- Rank number
- Idea name (truncated to 40 chars)
- Score badge (green pill)
- Revenue label (`$24K/mo`)
- "→" button that navigates to Ideas section and opens that idea's detail drawer

This is the most actionable widget on the page — the user can come back to the overview every day and immediately see the best low-investment opportunities.

**Right card — Revenue by Growth Tactic (Horizontal BarChart):**

Recharts horizontal `BarChart`. For each of the top 8 growth tactics, show the average monthly revenue (in $K) across all ideas that use that tactic.

- X axis: avg revenue ($K)
- Y axis: tactic name
- Single bar series
- Sorted descending by avg revenue
- Tooltip: "Avg $87K/mo across 23 ideas using this tactic"
- Color: matches the accent palette from existing theme

This answers the question "which growth strategy leads to the most money?" at a glance.

**Data for both:** Derived from `/api/ideas` — no additional API calls. Computed in component using `lib/ideas-data.ts` utilities.

---

### 4.5 Quick Actions Bar (Row 4)

A horizontal row of three action cards/buttons. Not a chart, not a list — just big tappable shortcuts.

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  💡              │  │  🤖              │  │  ⚡              │
│  Browse Ideas    │  │  Ask AI          │  │  Zero-Cost Picks │
│  Explore all     │  │  Chat about      │  │  Ideas with $0   │
│  192 ideas →     │  │  any idea →      │  │  to start →      │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

Each card calls `onSectionChange('ideas' | 'chat')` from root state, with the third card also pre-setting `ideaFilters` to `{ maxCost: 0 }` before navigating.

---

## 5. Public APIs Selected for the Project

From the `public-api-lists/public-api-lists` repository, here are the APIs that are genuinely useful for the Micro-SaaS Ideas Explorer, ranked by relevance:

### Tier 1 — Incorporate Now (Zero or Low Setup)

| API | Category | What it adds | Auth | Endpoint |
|---|---|---|---|---|
| **Hacker News** | News | Live startup/tech stories, founder discussions | None | `hacker-news.firebaseio.com/v0/` |
| **RSS2JSON proxy** | News | TechCrunch, Indie Hackers, Verge via RSS | None | `api.rss2json.com` |
| **ExchangeRate-API** | Finance | Show revenue figures in user's local currency | None (free tier) | `open.er-api.com/v6/latest/USD` |
| **Clearbit Logo** | Business | Show company logos for competitors mentioned by the AI | `apiKey` | `logo.clearbit.com/{domain}` |

### Tier 2 — High Value, Incorporate in Next Sprint

| API | Category | What it adds | Auth | Endpoint |
|---|---|---|---|---|
| **Product Hunt** | Business | Today's top launches — direct signal of what people are building | `apiKey` | `api.producthunt.com/v2/api/graphql` |
| **GitHub Trending** (unofficial) | Development | What repos are hot — signals emerging tech opportunities | None | `gh-trending-api.vercel.app` |
| **CoinGecko** | Cryptocurrency | If any ideas relate to crypto/web3, show live market data | None | `api.coingecko.com/api/v3/` |
| **Domainsdb.info** | Business | Check if a domain name is available for a selected idea | None | `api.domainsdb.info/v1/domains/search` |

### Tier 3 — Contextual / Optional

| API | Category | What it adds | Auth |
|---|---|---|---|
| **Abstract Holiday API** | Calendar | Show if today is a holiday in the user's country (affects outreach timing advice) | `apiKey` |
| **Open Library** | Books | Suggest books related to a selected idea's niche | None |
| **Jikan (MyAnimeList)** | Anime | Only relevant if an anime-adjacent idea is selected — niche but fun | None |
| **VirusTotal** | Security | Validate URLs of competitor sites surfaced by the AI | `apiKey` |

### Why These Specifically

The project is a **Micro-SaaS research and idea discovery tool**. The APIs that genuinely add value are those that:

1. **Show what's happening in the market right now** — HN, Product Hunt, TechCrunch RSS. These make the app feel alive and relevant every time you open it, and the cross-reference feature connects live news directly to ideas in the database.

2. **Add business intelligence** — Clearbit Logo (show competitor logos), Domain availability check (instantly see if a domain for your idea is free), Exchange rate (localise revenue figures).

3. **Require zero auth to start** — HN Firebase API and RSS proxy work out of the box with no API keys, no rate limit headaches. This means the news feed works on day one with no environment variable setup.

APIs that are **not relevant**: Animals, Anime, Art, Books, Food, Games, Sports, Transportation, Weather — none of these connect to the core user task (evaluating and pursuing Micro-SaaS ideas).

---

## 6. Data Flow

```
OverviewContent mounts
        │
        ├── fetch('/api/ideas')
        │   └── → ideas: IdeaRecord[]
        │         └── compute metrics, chart data, top 5 list, tactic averages
        │
        ├── fetch('https://hacker-news.firebaseio.com/v0/topstories.json')
        │   └── → top 10 IDs
        │         └── Promise.all 10x item fetches
        │               └── → hnStories: HNStory[]
        │
        ├── fetch('https://api.rss2json.com/v1/api.json?rss_url=...')
        │   └── → tcItems: RSSItem[]
        │
        └── fetch('/api/producthunt')  [optional — only if token set]
            └── → phPosts: PHPost[]

All three news sources merged → feedItems: FeedItem[] (sorted by date desc)
feedItems × ideas → cross-reference chips computed once
```

**No backend changes needed** for HN and RSS — both are fetched directly from the client component. Product Hunt goes through a small Next.js API route to protect the token.

---

## 7. New Types

```typescript
// lib/overview-types.ts  (new file)

export interface HNStory {
  id: number
  title: string
  url: string
  score: number
  descendants: number   // comment count
  by: string
  time: number          // unix timestamp
}

export interface RSSItem {
  title: string
  link: string
  pubDate: string
  thumbnail: string
  description: string
  source: 'techcrunch' | 'indiehackers' | 'theverge'
}

export interface PHPost {
  name: string
  tagline: string
  votesCount: number
  url: string
  thumbnail: { url: string }
  topics: string[]
}

export interface FeedItem {
  id: string
  source: 'hn' | 'techcrunch' | 'producthunt' | 'indiehackers' | 'theverge'
  title: string
  url: string
  meta: string          // "▲ 342 pts" or "🔼 621 votes" or publication name
  timestamp: Date
  relatedIdea: IdeaRecord | null   // cross-reference result, null if no match
}

export interface OverviewMetric {
  label: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  color: string         // Tailwind bg class
  iconColor: string     // Tailwind text class
}

export interface ScoreBucket {
  label: string         // "90–100"
  count: number
}

export interface TacticRevenue {
  tactic: string
  avgRevenue: number    // in $K
  ideaCount: number
}
```

---

## 8. File Changes

```
components/dashboard/content/overview-content.tsx    REWRITE
app/api/producthunt/route.ts                         NEW (optional, PH token proxy)
lib/overview-types.ts                                NEW
lib/overview-utils.ts                                NEW (computeMetrics, computeScoreBuckets, computeTacticRevenue, findRelatedIdea)
```

**`lib/overview-utils.ts` exports:**
```typescript
computeMetrics(ideas: IdeaRecord[]): OverviewMetric[]
computeScoreBuckets(ideas: IdeaRecord[]): ScoreBucket[]
computeTacticRevenue(ideas: IdeaRecord[]): TacticRevenue[]
findRelatedIdea(headline: string, ideas: IdeaRecord[]): IdeaRecord | null
mergeAndSortFeed(hn: HNStory[], rss: RSSItem[], ph: PHPost[]): FeedItem[]
```

All pure functions — easy to test, easy to iterate on.

---

## 9. State Management in OverviewContent

```typescript
// Data
const [ideas, setIdeas] = useState<IdeaRecord[]>([])
const [hnStories, setHnStories] = useState<HNStory[]>([])
const [rssItems, setRssItems] = useState<RSSItem[]>([])
const [phPosts, setPhPosts] = useState<PHPost[]>([])

// UI
const [feedSource, setFeedSource] = useState<'all' | 'hn' | 'tc' | 'ph'>('all')
const [chartMode, setChartMode] = useState<'score' | 'revenue'>('score')
const [isLoadingIdeas, setIsLoadingIdeas] = useState(true)
const [isLoadingFeed, setIsLoadingFeed] = useState(true)
const [feedError, setFeedError] = useState<string | null>(null)
const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
```

**Auto-refresh:** `useEffect` sets up a 5-minute interval for the news feed. The ideas data only fetches once on mount (static database).

---

## 10. Build Phases

### Phase 1 — Metrics Grid + Data Hook
- [ ] Create `lib/overview-types.ts` and `lib/overview-utils.ts`
- [ ] Implement `computeMetrics()`, `computeScoreBuckets()`, `computeTacticRevenue()`
- [ ] Rewrite `OverviewContent` to fetch `/api/ideas` on mount
- [ ] Replace existing 4 metric cards with new database-derived metrics
- [ ] Remove all existing `requestsData`, `latencyData`, `metrics`, `activeIncidents` constants

**Acceptance criteria:** Four cards show correct values derived from the real ideas database. No hardcoded numbers. Loading skeleton shown while fetching.

---

### Phase 2 — Charts (Score Distribution + Revenue by Tactic)
- [ ] Implement `ScoreDistributionChart` using existing AreaChart pattern
- [ ] Implement `TacticRevenueChart` using existing horizontal BarChart pattern
- [ ] Add chart toggle (Score Distribution / Revenue view) above Row 2 chart
- [ ] Wire both charts to `computeScoreBuckets()` and `computeTacticRevenue()`
- [ ] Replace existing latency BarChart with `TacticRevenueChart`
- [ ] Update chart gradients and colour tokens

**Acceptance criteria:** Both charts render with real data. Toggle switches chart type. Charts respect existing OKLCH colour palette.

---

### Phase 3 — News Feed Widget (HN + RSS)
- [ ] Implement HN fetch: top stories → parallel item fetches
- [ ] Implement RSS fetch via rss2json proxy (TechCrunch default)
- [ ] Implement `mergeAndSortFeed()` — combine and sort by timestamp
- [ ] Implement `findRelatedIdea()` — keyword cross-reference
- [ ] Build `NewsFeedWidget` component: source tab badges, item list, cross-reference chips
- [ ] Add manual refresh button with `lastRefreshed` timestamp
- [ ] Add 5-minute auto-refresh interval
- [ ] Handle loading and error states gracefully (show last cached feed on error)

**Acceptance criteria:** Feed loads and shows real HN and TechCrunch stories. Cross-reference chips appear when a keyword match is found. Clicking a chip pre-selects that idea in the Ideas section. Refresh button works.

---

### Phase 4 — Top Ideas List + Quick Actions
- [ ] Build `TopIdeasList` component — top 5 ideas by score with cost filter
- [ ] Wire idea row "→" button to navigate to Ideas section with idea pre-selected in drawer
- [ ] Build `QuickActionsBar` with three action cards
- [ ] Wire "Browse Ideas" → `onSectionChange('ideas')`
- [ ] Wire "Ask AI" → `onSectionChange('chat')`
- [ ] Wire "Zero-Cost Picks" → `onSectionChange('ideas')` + set `ideaFilters.maxCost = 0`

**Acceptance criteria:** Top 5 list shows correct ideas. All three quick actions navigate correctly. Zero-Cost filter is applied before navigating.

---

### Phase 5 — Product Hunt Integration (Optional)
- [ ] Create `app/api/producthunt/route.ts` — server proxy for PH GraphQL
- [ ] Add `PRODUCT_HUNT_TOKEN` to `.env.local`
- [ ] Wire PH fetch into `OverviewContent` — only runs if route returns 200
- [ ] Merge PH posts into unified feed
- [ ] Show `[PH]` source tab only when PH data is available

**Acceptance criteria:** PH tab appears when token is configured. PH posts appear in feed with vote counts. Tab is hidden when token is not set — no errors shown to user.

---

### Phase 6 — Polish
- [ ] Loading skeletons for all four cards and the feed widget
- [ ] Empty state for news feed (network down / all sources failed)
- [ ] Responsive: `grid-cols-4` collapses to `grid-cols-2` on tablet, `grid-cols-1` on mobile
- [ ] `grid-cols-3` row collapses to stacked on tablet
- [ ] Accessibility: all chart tooltips keyboard-accessible, feed links have `aria-label`

**Acceptance criteria:** All loading and error states handled. Layout works at 768px and 390px. No console errors.

---

## 11. Full Layout Reference

```
┌────────────────────────────────────────────────────────────────────┐
│  ROW 1 — grid-cols-4                                               │
│  [Total Ideas: 192]  [Avg Score: 77]  [Zero Cost: 34]  [$100K+: 28]│
├────────────────────────────────────────────────────────────────────┤
│  ROW 2 — grid-cols-3                                               │
│  ┌──────────────────────────────┐  ┌─────────────────────────────┐ │
│  │  col-span-2                  │  │  col-span-1                 │ │
│  │  Score Distribution          │  │  📰 Startup Feed            │ │
│  │  [Score Dist] [Revenue]      │  │  [HN] [TC] [PH]  [↻]       │ │
│  │  AreaChart                   │  │  ─────────────────────────  │ │
│  │                              │  │  ● HN story title · 2m ago  │ │
│  │                              │  │    → Related idea chip       │ │
│  │                              │  │  ─────────────────────────  │ │
│  │                              │  │  ● TC story title · 1h ago  │ │
│  │                              │  │  ─────────────────────────  │ │
│  │                              │  │  ● PH launch · 🔼 342       │ │
│  └──────────────────────────────┘  └─────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│  ROW 3 — grid-cols-2                                               │
│  ┌─────────────────────────────┐  ┌──────────────────────────────┐ │
│  │  🏆 Top 5 Ideas             │  │  Revenue by Tactic           │ │
│  │  (score + low start cost)   │  │  Horizontal BarChart         │ │
│  │  1. [idea] 95 $0 $8K/mo →  │  │  SEO          ████ $87K avg  │ │
│  │  2. [idea] 92 $0 $55K/mo → │  │  Word of mouth ███ $72K avg  │ │
│  │  3. [idea] 91 $99 $16K/mo→ │  │  Affiliate    ██  $58K avg   │ │
│  └─────────────────────────────┘  └──────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────┤
│  ROW 4 — Quick Actions (grid-cols-3)                               │
│  [💡 Browse Ideas →]   [🤖 Ask AI →]   [⚡ Zero-Cost Picks →]      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 12. Success Criteria

| Criterion | Definition of done |
|---|---|
| No hardcoded data | All metric values derive from `/api/ideas` — no local constants |
| Live news feed | HN stories load and refresh automatically every 5 minutes |
| Cross-reference | At least 1 in 3 feed items shows a related idea chip on average |
| Charts accurate | Score distribution and tactic revenue charts match raw data |
| Navigation hooks | All quick actions and idea row buttons navigate to correct sections |
| Graceful degradation | Feed widget shows cached/empty state when all external APIs are down |
| No regressions | Other sections (Ideas, Chat, Settings) unaffected by this rewrite |
| Mobile layout | Overview is usable at 390px — all grids stack correctly |

---

## 13. APIs Summary Card

```
ZERO SETUP (use immediately):
  ✅ Hacker News        hacker-news.firebaseio.com    — No auth, no CORS
  ✅ RSS via rss2json   api.rss2json.com              — No auth, no CORS

FREE API KEY REQUIRED:
  🔑 Product Hunt       api.producthunt.com           — Free developer account
  🔑 Clearbit Logo      logo.clearbit.com/{domain}    — Free tier available
  🔑 ExchangeRate-API   open.er-api.com               — Free tier, 1500 req/mo

NEXT SPRINT:
  📋 Domain Check       api.domainsdb.info            — No auth
  📋 GitHub Trending    gh-trending-api.vercel.app    — No auth
```

---

*Document: `overviewbuild.md`*
*Project: Micro-SaaS Ideas Explorer — Next.js 16 App Router*
*Last updated: April 2026*
