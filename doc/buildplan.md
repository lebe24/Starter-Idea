# Micro-SaaS Ideas Explorer — AI Agent Dashboard
## Build Plan

---

## 1. Project Overview

A single-page web application that renders the full Starter Story Micro-SaaS Ideas Database (190+ records) as an interactive, filterable dashboard — with an embedded AI agent chat panel powered by the Anthropic API. The agent has full awareness of the dataset and the user's active filters, enabling natural language queries, idea comparisons, niche recommendations, and go-to-market planning.

**Source data:** `Micro-SaaS_Ideas_Database__Starter_Story_.xlsx`  
**Deployment target:** Single React JSX artifact (Claude artifact environment)  
**Backend required:** None — fully client-side  
**External API:** Anthropic `/v1/messages` (claude-sonnet-4-20250514)

---

## 2. Goals

| # | Goal |
|---|---|
| G1 | Display all 190+ ideas in a sortable, filterable, paginated table |
| G2 | Provide rich filter controls (score, revenue, cost, tactics, ICP, search) |
| G3 | Show live-recalculating summary stats reflecting current filters |
| G4 | Render a detail drawer for each idea with full data and AI shortcut |
| G5 | Provide three data visualisations (scatter, bar, histogram) |
| G6 | Embed an AI agent that reasons over the full dataset and session context |
| G7 | Keep the entire build as a single self-contained artifact file |

---

## 3. Data Model

### 3.1 Source Fields (from Excel)

| Field | Raw format | Normalised type |
|---|---|---|
| Idea | String | `string` |
| Monthly Revenue | `$24K`, `$1.26M`, `500.0`, `—` | `number \| null` (in $K) |
| Monthly Traffic | `30K`, `—` | `number \| null` (in K) |
| Revenue per Visitor | `0.8`, `—` | `number \| null` |
| Starting Costs | `$200K`, `0`, `—` | `number \| null` (in $K) |
| Solopreneur Score | `73.0`, `—` | `number \| null` |
| ICP | Comma-separated string | `string[]` |
| Growth Tactics | Comma-separated string | `string[]` |

### 3.2 Normalisation Rules

- Strip `$` and `,` from all monetary values
- Convert `M` suffix → multiply by 1000 (store in $K for uniform comparison)
- Convert `K` suffix → store as-is
- Plain numbers with no suffix → divide by 1000 (already in dollars, convert to $K)
- `—` or empty string → `null`
- ICP and Growth Tactics → `split(',').map(s => s.trim()).filter(Boolean)`

### 3.3 Derived Fields (computed at parse time)

| Derived field | Calculation |
|---|---|
| `scoreGroup` | `'high'` (≥80), `'mid'` (60–79), `'low'` (<60), `'unknown'` (null) |
| `revGroup` | `'1M+'`, `'500K+'`, `'100K+'`, `'50K+'`, `'10K+'`, `'sub10K'`, `'unknown'` |
| `costGroup` | `'zero'`, `'sub1K'`, `'sub10K'`, `'sub100K'`, `'100K+'`, `'unknown'` |
| `tacticSet` | Lowercased set of tactics for fast multi-select matching |

### 3.4 Global Stats Object (recomputed on filter change)

```
{
  totalShown: number,
  avgScore: number | null,
  medianRevenue: number | null,        // in $K
  avgStartCost: number | null,         // in $K
  topTactic: string | null,            // most frequent tactic in current subset
  revenueRange: { min, max } | null
}
```

---

## 4. Application Architecture

```
App (root state: filters, sort, page, selected idea, chat history, panel visibility)
│
├── TopNav
│   ├── Title + tagline
│   ├── View toggle (Table / Cards)
│   ├── Charts toggle button
│   ├── AI panel toggle button
│   └── Export CSV button
│
├── FilterSidebar (left, collapsible on mobile)
│   ├── SearchInput          — searches idea, ICP, tactics
│   ├── ScoreSlider          — min threshold 0–100
│   ├── RevenueSelect        — dropdown tiers
│   ├── CostSelect           — dropdown tiers
│   ├── TacticMultiSelect    — checkboxes, 8 options
│   ├── ICPKeywordInput      — free text match against ICP tags
│   ├── ActiveFilterTags     — dismissible chips showing active filters
│   └── ResetFiltersButton
│
├── MainContent
│   ├── StatsBar             — 5 metric cards, live-updating
│   ├── ResultsHeader        — "Showing X of 190 ideas", sort indicator
│   │
│   ├── TableView (conditional)
│   │   ├── TableHeader      — sortable column headers
│   │   ├── TableBody        — paginated rows, score badges, truncated ICP
│   │   └── Pagination       — prev/next, page X of Y
│   │
│   ├── CardView (conditional)
│   │   └── CardGrid         — responsive grid, same data as table
│   │
│   └── IdeaDetailDrawer     — slide-in from right on row/card click
│       ├── Full data display
│       ├── ICP tag cloud
│       ├── Tactic tag list
│       └── "Ask AI about this idea →" button
│
├── ChartsPanel (collapsible, below main content)
│   ├── ScatterPlot          — Score (x) vs Revenue (y), bubble = cost
│   ├── TacticBarChart       — avg revenue by primary growth tactic
│   └── ScoreHistogram       — distribution of solopreneur scores
│
└── AIAgentPanel (right side, collapsible)
    ├── ChatHistory          — message bubbles, user + assistant
    ├── SuggestedPrompts     — 3–4 context-aware chips
    ├── ChatInput            — textarea + send button
    └── StatusIndicator      — idle / thinking / error
```

---

## 5. Component Specifications

### 5.1 StatsBar

Five metric cards displayed in a horizontal row:

| Card | Value | Fallback |
|---|---|---|
| Ideas shown | Integer count | — |
| Avg solo score | Rounded integer | "—" |
| Median revenue | Formatted $K / $M | "—" |
| Avg start cost | Formatted $K / $M | "—" |
| Top tactic | Tactic name string | "—" |

Recalculates on every filter or sort change. Uses only records in the current filtered set (not paginated — all matching records).

### 5.2 Table View

- **Columns:** Idea name, Monthly revenue, Solopreneur score, Starting cost, ICP (first 2 tags + overflow count), Top tactics (first 2)
- **Sorting:** All numeric columns + idea name. Click to sort ascending; click again to sort descending. Active sort column shows arrow indicator.
- **Score badge:** Pill with colour coding — green (#EAF3DE / #3B6D11) for ≥80, amber (#FAEEDA / #854F0B) for 60–79, red (#FCEBEB / #A32D2D) for <60
- **Row hover:** Subtle background highlight
- **Row click:** Opens IdeaDetailDrawer
- **Pagination:** 25 rows per page, previous/next buttons, page indicator

### 5.3 Card View

- 3-column responsive grid (collapses to 2, then 1 on narrow viewports)
- Each card: idea name (title), score badge, revenue, cost, top 2 ICP tags, top 2 tactics
- Click → opens IdeaDetailDrawer
- Same pagination as table view

### 5.4 IdeaDetailDrawer

Slides in from the right as an overlay panel. Content:

1. **Header** — Idea name + close button
2. **Key metrics row** — Revenue, Score, Starting cost, Traffic, RPV
3. **ICP section** — All ICP entries as individual tags
4. **Growth tactics section** — All tactics as individual tags
5. **CTA button** — "Ask AI about this idea →" — sets AI panel to open and pre-fills a prompt: *"Tell me everything about the [idea name] opportunity and how I could pursue it."*

### 5.5 Charts Panel

All charts use Recharts. Charts reflect the **currently filtered dataset**, not the full 190 records.

**Chart 1 — Scatter Plot: Score vs Revenue**
- X axis: Solopreneur Score (0–100)
- Y axis: Monthly Revenue ($K)
- Each bubble: one idea. Bubble radius = starting cost (normalised, capped for display). Null cost = default size.
- Tooltip on hover: idea name, score, revenue, cost
- Only renders records where both score and revenue are non-null

**Chart 2 — Bar Chart: Avg Revenue by Tactic**
- X axis: Growth tactic name (top 8 most common)
- Y axis: Average monthly revenue ($K) across all ideas that use that tactic
- Horizontal bar orientation for label readability
- Only includes tactics appearing in at least 3 ideas in the current filter set

**Chart 3 — Score Histogram**
- X axis: Score buckets (0–9, 10–19, … 90–100)
- Y axis: Count of ideas in that bucket
- Color-coded bars matching score badge colours (green for 80+, amber for 60–79, red below 60)

### 5.6 AI Agent Panel

**Layout:** Fixed right-side panel, 380px wide, full viewport height. Collapsible via toggle button in TopNav. On mobile: full-screen overlay.

**System prompt (sent on every API call):**
```
You are a startup analyst and advisor with deep knowledge of the 
Micro-SaaS Ideas Database from Starter Story. You have access to 
all 190+ ideas with their revenue, solopreneur scores, ICPs, starting 
costs, and growth tactics.

[FULL DATASET JSON — injected at runtime]

Current filter state: [FILTER STATE JSON — injected per message]

Help the user explore ideas, compare opportunities, identify patterns, 
and build actionable plans. Be specific, cite actual data from the 
database, and keep responses concise unless asked for detail.
```

**Conversation management:** Full message history sent with every request. History stored in React state as `[{ role: 'user' | 'assistant', content: string }]`.

**Suggested prompt chips** — rendered below input, update based on context:

| Context | Suggested prompts |
|---|---|
| No filters active, no idea selected | "What's easiest to build solo?", "Best ideas under $500 to start", "Which tactics drive the most $100K+ revenue?" |
| Filters active | "Summarise what these filtered results have in common", "What's the best opportunity in this filtered set?" |
| Idea selected via drawer | "Build a 90-day launch plan for this idea", "Who are the real competitors?", "What's the n8n automation angle here?" |

**Error handling:** If API call fails, show inline error message with retry button. Never lose message history on error.

**Loading state:** Animated ellipsis indicator in the assistant bubble while streaming/waiting.

---

## 6. Filter Logic

All filters are ANDed together. A record must pass every active filter to be included.

| Filter | Logic |
|---|---|
| Search | Case-insensitive substring match against `idea + ICP.join(' ') + tactics.join(' ')` |
| Score min | `record.scoreNum >= threshold` (null scores excluded when threshold > 0) |
| Revenue min | `record.revNum >= threshold` (null revenues excluded when threshold > 0) |
| Cost max | `record.costNum <= threshold` OR `record.costNum === null` (null = unknown, include unless "zero cost" selected) |
| Tactic | At least one selected tactic appears in `record.tacticSet` |
| ICP keyword | Case-insensitive match in `record.icp.join(' ')` |

**Reset:** Single "Reset all filters" button restores all filters to default state and returns to page 1.

---

## 7. State Management

All state lives in the root `App` component using `useState` and `useReducer`. No external state library.

```javascript
// Filter state
const [filters, dispatch] = useReducer(filterReducer, defaultFilters)

// defaultFilters shape:
{
  search: '',
  minScore: 0,
  minRevenue: 0,
  maxCost: Infinity,
  tactics: [],          // [] = no filter (show all)
  icpKeyword: ''
}

// UI state
const [viewMode, setViewMode] = useState('table')        // 'table' | 'cards'
const [sortCol, setSortCol] = useState('score')
const [sortDir, setSortDir] = useState('desc')
const [page, setPage] = useState(0)
const [selectedIdea, setSelectedIdea] = useState(null)
const [chartsOpen, setChartsOpen] = useState(false)
const [aiPanelOpen, setAiPanelOpen] = useState(false)

// AI state
const [chatHistory, setChatHistory] = useState([])
const [aiInput, setAiInput] = useState('')
const [aiLoading, setAiLoading] = useState(false)
const [aiError, setAiError] = useState(null)
const [prefilledPrompt, setPrefilledPrompt] = useState(null)  // set by drawer CTA
```

**Filter change side effect:** Whenever `filters` changes, reset `page` to 0.

---

## 8. AI Agent API Integration

### 8.1 API Call Structure

```javascript
POST https://api.anthropic.com/v1/messages
{
  model: "claude-sonnet-4-20250514",
  max_tokens: 1000,
  system: buildSystemPrompt(fullDataset, currentFilters),
  messages: [
    ...chatHistory,
    { role: "user", content: userMessage }
  ]
}
```

### 8.2 System Prompt Builder

`buildSystemPrompt(dataset, filters)` returns a string containing:
1. Role and capability description
2. Full dataset as compact JSON (all 190+ records)
3. Current filter state as JSON (so the agent knows what the user is looking at)
4. Behavioural instructions (be concise, cite data, use $ and K/M formatting)

### 8.3 Response Handling

```javascript
const data = await response.json()
const reply = data.content
  .filter(block => block.type === 'text')
  .map(block => block.text)
  .join('\n')
```

Append reply to `chatHistory` as `{ role: 'assistant', content: reply }`.

### 8.4 Error States

| Error | User-facing message |
|---|---|
| Network failure | "Couldn't reach the AI — check your connection and try again." |
| API error (non-200) | "The AI returned an error. Try rephrasing your question." |
| Empty response | "No response received. Please try again." |

---

## 9. Build Phases

### Phase 1 — Data + Shell
**Deliverable:** App renders with layout, nav, and raw data in table. No filters or AI yet.

- [ ] Parse all 190+ rows into normalised JSON (hardcoded in component file)
- [ ] Build app shell: TopNav, FilterSidebar placeholder, MainContent area, panel placeholders
- [ ] Render basic table with all records (no sort, no filter, no pagination)
- [ ] Confirm all data fields display correctly

**Acceptance criteria:** All 190+ ideas visible in table. No console errors. Layout renders correctly.

---

### Phase 2 — Table + Filters
**Deliverable:** Fully functional data explorer without AI.

- [ ] Implement all filter controls with live filtering logic
- [ ] Implement sort on all columns (asc/desc toggle)
- [ ] Add pagination (25 per page, prev/next, page indicator)
- [ ] Build StatsBar with live-recalculating metrics
- [ ] Build IdeaDetailDrawer (opens on row click, shows full data)
- [ ] Add score badges (colour-coded)
- [ ] Add ICP tag truncation with overflow count
- [ ] Add ActiveFilterTags (dismissible chips)
- [ ] Add Reset filters button
- [ ] Implement Card view and view toggle

**Acceptance criteria:** Filtering, sorting, and pagination all work correctly. Stats bar updates live. Drawer opens and closes cleanly.

---

### Phase 3 — Charts Panel
**Deliverable:** Three Recharts visualisations reflecting active filters.

- [ ] Build collapsible ChartsPanel component
- [ ] Implement Scatter Plot (score vs revenue, bubble = cost)
- [ ] Implement Tactic Bar Chart (avg revenue per tactic)
- [ ] Implement Score Histogram (distribution)
- [ ] Wire all charts to filtered dataset (not full dataset)
- [ ] Add chart tooltips with formatted values
- [ ] Add toggle button in TopNav

**Acceptance criteria:** Charts update when filters change. Null values handled gracefully (excluded from charts). Charts render without errors on all filter combinations including empty states.

---

### Phase 4 — AI Agent
**Deliverable:** Functional AI chat panel integrated with data and filter context.

- [ ] Build AIAgentPanel component with chat history display and input
- [ ] Implement `buildSystemPrompt()` with full dataset injection
- [ ] Wire Anthropic API call with full conversation history
- [ ] Implement response parsing and history append
- [ ] Add loading indicator
- [ ] Add error handling and retry UI
- [ ] Implement suggested prompt chips (context-aware)
- [ ] Wire "Ask AI about this idea →" CTA from IdeaDetailDrawer
- [ ] Inject active filter state into system prompt per message
- [ ] Add AI panel toggle in TopNav

**Acceptance criteria:** Agent responds correctly to dataset questions. Conversation history persists across turns. Filter context is reflected in agent answers. Drawer CTA pre-fills and sends correctly.

---

### Phase 5 — Polish
**Deliverable:** Production-quality UX.

- [ ] Keyboard shortcuts: `Escape` closes drawer/AI panel, `/` focuses search
- [ ] Export filtered results as CSV (client-side, using Blob download)
- [ ] Mobile-responsive layout (sidebar collapses, AI panel becomes full-screen overlay)
- [ ] Empty state messages (e.g. "No ideas match your filters — try adjusting the score threshold")
- [ ] Smooth open/close animations on drawer and panels
- [ ] Accessible markup: ARIA labels on interactive elements, keyboard-navigable table
- [ ] Performance: memoise filtered/sorted dataset with `useMemo` to prevent redundant recalculation

**Acceptance criteria:** App is usable on mobile. CSV export works. No layout regressions. Keyboard shortcuts functional.

---

## 10. File Structure

Since this is a single-artifact build, everything lives in one JSX file. Logical organisation within the file:

```
// 1. Imports (React, Recharts)
// 2. Raw data constant — full 190+ record JSON array
// 3. Parse/normalise helpers — parseRevenue(), parseCost(), parseScore(), etc.
// 4. Filter logic — filterRecords(data, filters)
// 5. Sort logic — sortRecords(records, col, dir)
// 6. Stats logic — computeStats(records)
// 7. System prompt builder — buildSystemPrompt(data, filters)
// 8. Sub-components — StatsBar, TableView, CardView, FilterSidebar,
//                      IdeaDetailDrawer, ChartsPanel, AIAgentPanel
// 9. Root App component — all state, layout composition
// 10. Default export
```

---

## 11. Known Constraints & Mitigations

| Constraint | Mitigation |
|---|---|
| Artifact environment has no `localStorage` | All state is in-memory (React state). Session resets on refresh — acceptable for this use case. |
| Full dataset in system prompt = large API call | At ~190 records × ~100 chars avg = ~19KB of JSON. Well within model context limits. Token cost is acceptable for a tool/research use case. |
| No streaming support in artifact API calls | Use standard request/response. Show loading indicator for perceived responsiveness. |
| Recharts may not handle null values gracefully | Filter out null-value records before passing data to each chart. |
| Tailwind only provides pre-built utility classes in artifact env | Use only core Tailwind utilities. No custom config or `@apply`. Fall back to inline styles for anything Tailwind can't cover. |
| Very long ICP strings in some records | Truncate in table/card to first 2 tags + "+N more". Full list in detail drawer only. |

---

## 12. Success Criteria (Full Project)

| Criterion | Definition of done |
|---|---|
| Data completeness | All 190+ ideas display with correct values across all fields |
| Filter accuracy | Every filter combination returns exactly the correct subset |
| AI data awareness | Agent correctly answers factual questions about the dataset (e.g. "how many ideas have a score above 90?") |
| AI context awareness | Agent references active filters in its answers when relevant |
| Performance | Filter/sort/paginate operations feel instant (< 50ms) |
| Stability | No crashes on any filter combination including empty results |
| Mobile usability | Core table, filters, and AI panel all usable on a 390px viewport |

---

## 13. Future Enhancements (Post-MVP)

| Enhancement | Description |
|---|---|
| Idea bookmarking | Save favourite ideas to a local shortlist panel |
| Side-by-side comparison | Select 2–3 ideas and compare them in a structured table |
| AI-generated business plan PDF | Export a full go-to-market plan for a selected idea |
| Custom scoring weights | Let the user reweight the solopreneur score based on their own priorities |
| n8n workflow mapper | AI suggests which n8n nodes/workflows are relevant to a selected idea |
| Opportunity gap finder | AI identifies under-served niches based on score/revenue ratio patterns |

---

*Last updated: April 2026*  
*Source data: Micro-SaaS Ideas Database — Starter Story*
