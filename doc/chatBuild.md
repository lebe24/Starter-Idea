# AI Agent Chat — Build Plan
## `chatbuildplan.md`

> **Aligned to:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · shadcn/Radix UI
> **Last updated:** April 2026

---

## 1. Overview

The AI Agent Chat is a **dedicated top-level section** in the existing `AppSidebar`, rendered by `MainContent` exactly like the current `overview`, `oncall`, `ideas`, and `settings` sections. It is not a modal, drawer, or overlay — it is a full-height content body registered as a new `activeSection` value in `app/page.tsx`.

The agent has three layers of intelligence:

1. **Dataset awareness** — ideas are fetched from the existing `/api/ideas` endpoint and injected into the system prompt as structured JSON, exactly as `/explore` already does
2. **Filter awareness** — `ideaFilters` from the root page state is passed into the chat section body so the agent knows what the user has filtered in the Ideas section
3. **Session memory** — full conversation history held in React state, sent with every API call

> **Note on `/explore`:** The existing `/explore` page is a standalone Idea Assistant. This new section brings that experience inline into the dashboard shell. The `/explore` route can remain for direct-link use cases (e.g. `?idea=` query param entry points from external links).

---

## 2. How It Fits the Existing Architecture

### 2.1 Current activeSection values (app/page.tsx)

```typescript
// Existing
type Section = 'overview' | 'oncall' | 'ideas' | 'settings'

// After this change
type Section = 'overview' | 'oncall' | 'ideas' | 'chat' | 'settings'
```

### 2.2 Changes to app/page.tsx

Three additions to the root page only:

```typescript
// 1. Add chat history to root state so it survives section switching
const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])

// 2. Pass chatHistory + setChatHistory through MainContent
<MainContent
  activeSection={activeSection}
  ideaFilters={ideaFilters}
  chatHistory={chatHistory}
  onChatHistoryChange={setChatHistory}
/>

// 3. ideaFilters already flows into MainContent — no change needed there
```

Keeping `chatHistory` in root state means navigating Chat → Ideas → Chat does not wipe the conversation. This mirrors how `ideaFilters` already persists across section switches.

### 2.3 Changes to AppSidebar

Add one new nav item to the Operations group, between Ideas and Settings:

```typescript
{ id: 'chat', label: 'Idea Assistant', icon: MessageSquare, section: 'chat' }
```

The sidebar already handles `onSectionChange` — no structural changes needed beyond adding the item.

### 2.4 Changes to MainContent

Add one new case to the `activeSection` switch:

```typescript
case 'chat':
  return (
    <IdeaChatContent
      ideaFilters={ideaFilters}
      chatHistory={chatHistory}
      onChatHistoryChange={onChatHistoryChange}
    />
  )
```

### 2.5 New files to create

```
components/dashboard/content/IdeaChatContent.tsx   ← Main chat section body
components/dashboard/chat/ChatHistory.tsx           ← Scrollable message list
components/dashboard/chat/MessageBubble.tsx         ← User + assistant bubbles
components/dashboard/chat/TypingIndicator.tsx       ← Animated dots
components/dashboard/chat/SuggestedPrompts.tsx      ← Context-aware prompt chips
components/dashboard/chat/ContextBanner.tsx         ← Filter awareness notice
components/dashboard/chat/ChatInputBar.tsx          ← Textarea + send button
app/api/chat/route.ts                               ← Server-side Anthropic API proxy
lib/chat-utils.ts                                   ← buildSystemPrompt, detectMentionedIdea
lib/chat-types.ts                                   ← ChatMessage, ChatContext types
```

### 2.6 What stays unchanged

| Thing | Status |
|---|---|
| `app/page.tsx` shell | Minimal additions only (chat state + new section case) |
| `AppSidebar` | One new nav item added |
| `/api/ideas` route | Used as-is — `IdeaChatContent` fetches from it on mount |
| `lib/ideas-data.ts` | Used as-is — `IdeaRecord`, `filterIdeas`, `IdeaFilters` all reused |
| `components/ui/*` | All existing primitives reused (Button, ScrollArea, Textarea, etc.) |
| `/explore` route | Unchanged — still exists for external `?idea=` deep links |
| `components/prompt-kit/` | Referenced for pattern consistency, not modified |

---

## 3. Navigation & Layout Position

```
AppSidebar (Operations group)
├── overview    →  Dashboard overview
├── oncall      →  On-Call
├── ideas       →  Ideas (ServicesContent + RightPanel filters)
├── chat        →  Idea Assistant   ← NEW
└── settings    →  Settings
```

The sidebar already uses `activeSection` to highlight the active item and calls `onSectionChange` on click. The new `chat` entry slots directly into this existing pattern with zero structural change to the sidebar logic.

---

## 4. Page Layout

The chat section body fills the same `flex-1 overflow-hidden` main content area that every other section uses. No new layout containers are introduced at the shell level.

```
┌──────────────────────────────────────────────────────────────────────┐
│  AppSidebar  │              MAIN CONTENT AREA                        │
│              │  ┌────────────────────────────────────────────────┐   │
│  overview    │  │  SECTION HEADER (matches sectionConfig pattern) │  │
│  oncall      │  │  "Idea Assistant"  ·  [Clear chat] [Export]    │   │
│  ideas       │  └────────────────────────────────────────────────┘   │
│  chat   ◀    │                                                        │
│  settings    │  ┌────────────────────────────────────────────────┐   │
│              │  │  CONTEXT BANNER (conditional, dismissible)     │   │
│              │  │  "Filtering to: Score ≥80, Tactic: SEO · 12 ideas" │
│              │  └────────────────────────────────────────────────┘   │
│              │                                                        │
│              │  ┌────────────────────────────────────────────────┐   │
│              │  │                                                │   │
│              │  │   CHAT HISTORY                                 │   │
│              │  │   (ScrollArea, flex-grow, overflow-y-auto)     │   │
│              │  │   — Empty state when no messages               │   │
│              │  │   — Message bubbles (user right, AI left)      │   │
│              │  │   — Typing indicator while loading             │   │
│              │  │                                                │   │
│              │  └────────────────────────────────────────────────┘   │
│              │                                                        │
│              │  ┌────────────────────────────────────────────────┐   │
│              │  │  SUGGESTED PROMPTS  (horizontal scroll chips)  │   │
│              │  └────────────────────────────────────────────────┘   │
│              │                                                        │
│              │  ┌────────────────────────────────────────────────┐   │
│              │  │  INPUT BAR  [ textarea              ] [ ↑ ]   │   │
│              │  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**RightPanel behaviour:** The `RightPanel` (Idea Filters) is controlled by `isRightPanelOpen` in root state. When the user switches to the `chat` section, auto-close the right panel — it is Ideas-specific and adds visual noise to the chat layout. Restore it when switching back to Ideas.

---

## 5. Data Types — lib/chat-types.ts

```typescript
import type { IdeaFilters, IdeaRecord } from './ideas-data'

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string                          // crypto.randomUUID()
  role: MessageRole
  content: string
  timestamp: Date
  feedback?: 'up' | 'down' | null     // session-only, never persisted
  isError?: boolean                   // true renders the error bubble variant
}

export interface ChatContext {
  ideaFilters: IdeaFilters            // live filter state from root
  matchingIdeas: IdeaRecord[]         // pre-filtered subset at send time
  totalIdeas: number                  // full dataset length
  lastMentionedIdea: string | null    // detected from most recent assistant message
}
```

---

## 6. API Route — app/api/chat/route.ts

A Next.js server route that proxies the Anthropic API. The API key lives server-side only — never in client code.

```typescript
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { messages, systemPrompt } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages,                       // full conversation history
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json({ error: data }, { status: response.status })
  }

  const reply = data.content
    .filter((block: any) => block.type === 'text')
    .map((block: any) => block.text)
    .join('\n')

  return NextResponse.json({ reply })
}
```

**Environment variable required:**
```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...
```

Also add to Vercel → Settings → Environment Variables for Preview and Production deployments.

This follows the same server-route pattern as `/api/ideas` — all data operations go through Next.js API routes, nothing sensitive touches the client.

---

## 7. Utility Functions — lib/chat-utils.ts

```typescript
import type { IdeaRecord } from './ideas-data'
import type { ChatContext } from './chat-types'

export function buildSystemPrompt(
  dataset: IdeaRecord[],
  context: ChatContext
): string {
  const filtersActive = context.matchingIdeas.length !== context.totalIdeas
  const filteredNames = context.matchingIdeas.map(i => i.name)

  return `
You are an expert startup analyst and business advisor specialising in 
Micro-SaaS businesses, solopreneur ventures, and indie hacking. You have 
deep knowledge of the Starter Story Micro-SaaS Ideas Database — 190+ 
validated ideas with real revenue data, solopreneur scores, ICP profiles, 
starting costs, and growth tactics.

<dataset>
${JSON.stringify(dataset)}
</dataset>

<filter_context>
${filtersActive
  ? `Filters are active. Reason within this subset by default unless the user asks otherwise.
     Matching ideas (${context.matchingIdeas.length}): ${JSON.stringify(filteredNames)}
     Filter state: ${JSON.stringify(context.ideaFilters)}`
  : `No filters active. All ${context.totalIdeas} ideas are in scope.`
}
</filter_context>

${context.lastMentionedIdea
  ? `<last_discussed>${context.lastMentionedIdea}</last_discussed>`
  : ''
}

Behaviour rules:
- Always cite specific idea names when making recommendations
- Format revenue as $24K/mo or $1.2M/mo; starting costs as $XK or $0
- Use markdown tables for side-by-side comparisons
- Use phased structure for go-to-market plans (Week 1-4, Month 2-3, etc.)
- Keep responses concise unless asked for detail
- When filters are active, state this explicitly: "Within your current filter..."
- Solopreneur score is out of 100 — higher = easier to build solo
- If the dataset doesn't have enough info to answer confidently, say so
`.trim()
}

export function detectMentionedIdea(
  text: string,
  dataset: IdeaRecord[]
): string | null {
  const lower = text.toLowerCase()
  const matches = dataset.filter(idea =>
    lower.includes(idea.name.toLowerCase())
  )
  return matches.length > 0 ? matches[matches.length - 1].name : null
}
```

---

## 8. Component Specifications

### 8.1 IdeaChatContent.tsx

The top-level section body. Lives in `components/dashboard/content/` alongside `ServicesContent`, `OverviewContent`, etc. Matches their pattern: receives props from `MainContent`, owns its own local state and data fetching.

**Props:**
```typescript
interface IdeaChatContentProps {
  ideaFilters: IdeaFilters
  chatHistory: ChatMessage[]
  onChatHistoryChange: (history: ChatMessage[]) => void
}
```

**Local state:**
```typescript
const [ideas, setIdeas] = useState<IdeaRecord[]>([])
const [isLoadingIdeas, setIsLoadingIdeas] = useState(true)
const [chatInput, setChatInput] = useState('')
const [isLoading, setIsLoading] = useState(false)
const [bannerDismissed, setBannerDismissed] = useState(false)
const [lastMentionedIdea, setLastMentionedIdea] = useState<string | null>(null)
const abortRef = useRef<AbortController | null>(null)
```

**Data fetch (on mount — same pattern as `/explore`):**
```typescript
useEffect(() => {
  fetch('/api/ideas')
    .then(r => r.json())
    .then(data => { setIdeas(data); setIsLoadingIdeas(false) })
}, [])
```

**Derived (useMemo):**
```typescript
const matchingIdeas = useMemo(
  () => filterIdeas(ideas, ideaFilters),
  [ideas, ideaFilters]
)
```

**sendMessage flow:**
```
1. Append { role: 'user', content: input } to chatHistory
2. Clear input, set isLoading = true
3. Build systemPrompt via buildSystemPrompt(ideas, context)
4. Create AbortController, store in abortRef
5. POST /api/chat with { messages: chatHistory (after append), systemPrompt }
6. On success:
   a. Parse reply from response
   b. Run detectMentionedIdea(reply, ideas) → update lastMentionedIdea
   c. Append { role: 'assistant', content: reply } to chatHistory
7. On error:
   a. Append { role: 'assistant', content: errorMessage, isError: true }
8. Set isLoading = false
```

**History truncation:** If `chatHistory.length > 50`, drop the oldest 10 messages before sending. Show a one-time notice in the chat when this first occurs.

### 8.2 ChatHistory.tsx

Scrollable message list. Uses shadcn `ScrollArea` (already in `components/ui/scroll-area.tsx`).

Auto-scroll: `useEffect` watches `chatHistory.length` and `isLoading`. Scrolls a `bottomRef` div into view on change.

**Empty state:**
```
     [Bot icon — lucide MessageSquare or Bot]

  Ask me anything about the Micro-SaaS Ideas Database

  I can help you:
  • Find the right idea for your budget and skills
  • Compare ideas side by side
  • Build a 90-day go-to-market plan
  • Analyse patterns across the 190+ ideas
  • Explain what any idea actually involves building

        ↓  Try a suggested prompt below
```

### 8.3 MessageBubble.tsx

Handles both user and assistant rendering. Accepts a `ChatMessage` and renders the appropriate variant.

**User variant:** Right-aligned. Background uses `bg-primary text-primary-foreground` (picks up theme tokens from `globals.css` / Tailwind config). User initial in a small avatar circle.

**Assistant variant:** Left-aligned. `bg-muted` background. Bot icon (`lucide-react` Bot or Sparkles). Content rendered through `react-markdown` with `remark-gfm` plugin for tables and task lists. Code blocks use `font-mono` (JetBrains Mono is already configured in the root layout).

**Per-message footer (assistant only):**
- Relative timestamp — computed from `message.timestamp` using `Intl.RelativeTimeFormat` or a simple helper
- Copy button — `navigator.clipboard.writeText(message.content)` with a transient "Copied!" tooltip
- Thumbs up / down — calls `onFeedback(message.id, 'up' | 'down')`; feedback stored in session state, no API call

**Error variant:** Full-width warning card (`bg-destructive/10 border-destructive/20`). Shows error text + Retry button. Retry re-sends the last user message.

### 8.4 TypingIndicator.tsx

Three dots using `lucide-react` or plain `div` elements. Tailwind `animate-bounce` with `animation-delay` utilities for stagger effect. Rendered as a left-aligned assistant bubble while `isLoading` is true.

### 8.5 ContextBanner.tsx

Shown only when `matchingIdeas.length !== ideas.length` (filters are active) and `!bannerDismissed`.

```
┌──────────────────────────────────────────────────────────────────┐
│  🔍  Filtering to: Score ≥ 80 · Tactic: SEO · 12 ideas in scope  │
│  The agent reasons within this subset.   [View in Ideas] [✕]    │
└──────────────────────────────────────────────────────────────────┘
```

Uses shadcn `Alert` component (already in `components/ui/alert.tsx`) for consistent styling.

"View in Ideas" receives an `onViewIdeas` prop — calls `onSectionChange('ideas')` passed down from root.

### 8.6 SuggestedPrompts.tsx

Horizontal scroll row of pill chips. Renders above the input bar. Hidden when `chatInput.length > 0`.

Uses shadcn `Button` with `variant="outline"` and `rounded-full` className — consistent with existing UI.

**Four context states:**

| State | Trigger condition |
|---|---|
| Fresh | `chatHistory.length === 0` |
| Filters active | `matchingIdeas.length !== ideas.length` |
| Idea mentioned | `lastMentionedIdea !== null` |
| Deep conversation | `chatHistory.length > 6` |

**Prompts per state:**

```
Fresh:
  💡 Best ideas under $500 to start
  📈 Which tactics drive $100K+ revenue?
  🧩 Top ideas for developers
  🏆 Highest solopreneur scores overall
  🔍 What niches are most underserved?

Filters active:
  🔎 Summarise my filtered results
  🏅 Best opportunity in this filter set
  📊 Compare the top 3 in this filter
  💬 What do these ideas have in common?

Idea mentioned:
  📋 Build a 90-day launch plan for this
  🤝 Who are the real competitors?
  ⚙️  What's the n8n automation angle?
  💰 How should I price this?

Deep conversation:
  🔄 Start over with a new idea
  📄 Export this conversation
  🔗 Compare this to another idea
  🧮 Show me the numbers behind this
```

Chip click → `setChatInput(promptText)` → focus textarea. Does not auto-send.

### 8.7 ChatInputBar.tsx

Sticky bottom bar. Uses shadcn `Textarea` (`components/ui/textarea.tsx`).

```typescript
// Auto-resize
useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto'
    textareaRef.current.style.height =
      Math.min(textareaRef.current.scrollHeight, 120) + 'px'
  }
}, [value])

// Enter to send
onKeyDown={(e) => {
  if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
    e.preventDefault()
    onSend()
  }
}}
```

Send button: `lucide-react` `ArrowUp` icon. Disabled when `isLoading || value.trim() === ''`.

Loading state: send button swaps to `Square` (stop) icon. Clicking it calls `abortRef.current?.abort()` — cancels the in-flight fetch.

---

## 9. Filter State Integration

`ideaFilters` flows from `app/page.tsx` → `MainContent` → `IdeaChatContent` without any new lifting. It already follows this path to `ServicesContent`. The only addition is passing it one step further into the new chat content body.

```typescript
// IdeaChatContent — computed on every render
const matchingIdeas = useMemo(
  () => filterIdeas(ideas, ideaFilters),
  [ideas, ideaFilters]
)

// Context rebuilt fresh at the moment sendMessage() is called
const buildContext = (): ChatContext => ({
  ideaFilters,
  matchingIdeas,
  totalIdeas: ideas.length,
  lastMentionedIdea,
})
```

Because `matchingIdeas` is recomputed via `useMemo`, the system prompt always reflects the filter state at the exact moment the user sends — not a stale snapshot.

---

## 10. Cross-Section Integration

### 10.1 "Ask AI about this idea →" from Ideas section

In `ServicesContent`, the idea detail view gets a new button:

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    onChatHistoryChange([])  // clear history for clean context
    onInitialPromptChange(
      `Tell me everything about the "${idea.name}" opportunity — ` +
      `the market, real competitors, what I'd actually need to build, ` +
      `and how I'd get first customers.`
    )
    onSectionChange('chat')
  }}
>
  Ask AI about this →
</Button>
```

`initialPrompt` is a new optional prop on `IdeaChatContent`. On mount, if `initialPrompt` is set, it auto-sends via a `useEffect` with a `hasSentRef` guard to prevent double-sends under React 19 Strict Mode.

### 10.2 Sidebar conversation badge

When `chatHistory.length > 0`, show a small filled dot on the "Idea Assistant" sidebar nav item — signals an active conversation. Same pattern that would be used for alert counts on On-Call.

### 10.3 RightPanel auto-close

In `app/page.tsx`, add an effect:

```typescript
useEffect(() => {
  if (activeSection === 'chat' && isRightPanelOpen) {
    setIsRightPanelOpen(false)
  }
}, [activeSection])
```

Restoring the panel when switching back to Ideas is left to user control (toggle button in header) rather than auto-restoring, to avoid surprising the user.

---

## 11. Environment Setup

```bash
# .env.local — add this line
ANTHROPIC_API_KEY=sk-ant-...
```

**Vercel:** Add `ANTHROPIC_API_KEY` under Project Settings → Environment Variables. Apply to both Preview and Production environments.

**Dependency check — verify before building:**

| Package | Used for | Action |
|---|---|---|
| `lucide-react` | Icons (MessageSquare, ArrowUp, Square, Bot, ThumbsUp, ThumbsDown, X) | Already installed via shadcn |
| `react-markdown` | Markdown rendering in assistant bubbles | Check `package.json` — add if missing |
| `remark-gfm` | Tables, task lists in markdown | Check `package.json` — add if missing |

If missing: `npm install react-markdown remark-gfm`

---

## 12. Conversation Scenarios & Expected Behaviour

**Scenario 1 — Ranked list by criteria**
> "Which ideas have the highest solopreneur score and under $1K to start?"

Response format: numbered list with idea name, score, cost, revenue. Offer to re-rank or build a shortlist.

**Scenario 2 — Side-by-side comparison**
> "Compare the checkout software idea to the social proof tool"

Response format: markdown table with rows for score, revenue, cost, ICP, tactics. Followed by a short written recommendation.

**Scenario 3 — Personalised recommendation**
> "I'm a developer with $500 to start — what are my top 5 options?"

Response format: numbered list. Each entry: idea name, score, revenue, cost, one-sentence "why this fits you" note.

**Scenario 4 — Go-to-market plan**
> "Build me a 90-day go-to-market plan for the YouTube thumbnail A/B testing idea"

Response format:
```
**90-Day GTM Plan: YouTube Thumbnail A/B Testing**
Score: 91 | Revenue: $16K/mo | Start cost: $99

**Phase 1 — Foundation (Days 1–30)**
...
**Phase 2 — Traction (Days 31–60)**
...
**Phase 3 — Scale (Days 61–90)**
...
**Key risk:** [honest risk + mitigation]
```

**Scenario 5 — Pattern analysis**
> "What growth tactics appear most in ideas doing over $100K/month?"

Response format: ranked tactic list with count and average revenue. 2–3 sentence strategic insight.

**Scenario 6 — Filter-aware reasoning**
> *(Filters: SEO + score 80+)* "What's the best opportunity here?"

Expected: agent opens with "Within your current filter (SEO-driven, score ≥ 80)..." and reasons only over the matching subset.

**Scenario 7 — Multi-turn follow-up**
> Turn 1: "Tell me about the social proof marketing platform"
> Turn 2: "How does it compare to the YouTube thumbnail tool?"
> Turn 3: "Which one would you actually build first?"

Expected: agent maintains full context across all three turns and gives a direct recommendation on Turn 3.

---

## 13. Error Handling

| Scenario | Behaviour |
|---|---|
| `/api/chat` returns non-200 | Inline error bubble: "The AI returned an error — try rephrasing" + Retry |
| Network timeout / fetch aborted by user | Inline: "Request cancelled" — no error bubble, just clear loading state |
| Network failure | Inline error bubble: "Couldn't reach the AI. Check your connection." + Retry |
| Empty reply from API | Inline: "No response received — please try again" + Retry |
| Send while loading | Send button disabled — impossible to trigger duplicate request |
| History > 50 turns | Drop oldest 10, show one-time system notice in chat |
| Clear chat | shadcn `AlertDialog` confirmation: "Clear conversation? This can't be undone." |

---

## 14. Export Feature

The Export button in the section header downloads the full conversation as a markdown file via a client-side Blob.

**Filename:** `idea-assistant-{YYYY-MM-DD}.md`

**Format:**
```markdown
# Idea Assistant — Conversation Export
Date: 2026-04-26
Ideas loaded: 192
Active filters: Score ≥ 80, Tactic: SEO

---

**You** · 2:14 PM
Which ideas have the highest solopreneur score and under $1K to start?

**Idea Assistant** · 2:14 PM
Here are the top ideas...

---
```

---

## 15. Build Phases

### Phase 1 — Routing & Shell
**Files touched:** `app/page.tsx`, `AppSidebar.tsx`, `MainContent.tsx`
**New files:** `IdeaChatContent.tsx` (skeleton), `lib/chat-types.ts`

- [ ] Add `'chat'` to `Section` type in `app/page.tsx`
- [ ] Add `chatHistory` and `setChatHistory` to root state
- [ ] Thread `chatHistory` + `onChatHistoryChange` through `MainContent` props and types
- [ ] Add `chat` nav item to `AppSidebar` Operations group (icon: `MessageSquare`)
- [ ] Add `case 'chat'` to `MainContent` switch → renders `IdeaChatContent` skeleton
- [ ] Create `lib/chat-types.ts` with `ChatMessage` and `ChatContext`
- [ ] Add RightPanel auto-close effect for `chat` section
- [ ] Confirm navigation works and chat state persists across section switches

**Acceptance criteria:** "Idea Assistant" sidebar item renders the section. Switching away and back preserves state. No TypeScript errors. RightPanel closes when entering chat section.

---

### Phase 2 — Chat UI
**New files:** `ChatHistory.tsx`, `MessageBubble.tsx`, `TypingIndicator.tsx`, `ChatInputBar.tsx`

- [ ] Build `ChatHistory` with `ScrollArea`, empty state, auto-scroll ref
- [ ] Build `MessageBubble` — user and assistant variants with correct alignment/styling
- [ ] Implement `react-markdown` + `remark-gfm` in assistant bubbles
- [ ] Build `TypingIndicator` with staggered bounce animation
- [ ] Build `ChatInputBar` with auto-resize textarea, Enter-to-send, disabled states, stop button
- [ ] Wire all into `IdeaChatContent` with hardcoded mock messages to validate layout
- [ ] Copy button on assistant messages
- [ ] Relative timestamp display

**Acceptance criteria:** Mock messages render correctly. Markdown tables display. Auto-scroll fires on new message. Input resizes up to cap. Copy writes to clipboard.

---

### Phase 3 — API Integration
**New files:** `app/api/chat/route.ts`, `lib/chat-utils.ts`

- [ ] Create `app/api/chat/route.ts` — Anthropic proxy
- [ ] Add `ANTHROPIC_API_KEY` to `.env.local`
- [ ] Create `lib/chat-utils.ts` — `buildSystemPrompt()` and `detectMentionedIdea()`
- [ ] Implement full `sendMessage()` in `IdeaChatContent`
- [ ] Wire `AbortController` to stop button
- [ ] Wire loading state to `TypingIndicator` and input bar disabled state
- [ ] Implement history truncation at 50 turns
- [ ] Test: "Which ideas have score above 90?" → verify agent cites real database values

**Acceptance criteria:** Agent responds with accurate data. Conversation maintains context across turns. Cancel stops the fetch cleanly. Errors show inline with retry.

---

### Phase 4 — Suggested Prompts & Context Banner
**New files:** `SuggestedPrompts.tsx`, `ContextBanner.tsx`

- [ ] Build `SuggestedPrompts` with four context states and horizontal scroll
- [ ] Wire `detectMentionedIdea()` output to `lastMentionedIdea` state
- [ ] Wire prompt state selection to context conditions
- [ ] Build `ContextBanner` using shadcn `Alert` — shown when filters active
- [ ] Wire "View in Ideas" in banner to `onSectionChange('ideas')`
- [ ] Hide prompt chips when `chatInput.length > 0`

**Acceptance criteria:** Chips update context correctly. Clicking chip populates (not sends) input. Banner appears/disappears correctly. Banner dismiss persists for session.

---

### Phase 5 — Cross-Section Integration
**Files touched:** `ServicesContent.tsx`, `AppSidebar.tsx`, `app/page.tsx`

- [ ] Add `initialPrompt` prop + state to `IdeaChatContent` and root page
- [ ] Add "Ask AI about this →" button to idea detail view in `ServicesContent`
- [ ] Wire button: clear history → set initial prompt → switch to `chat`
- [ ] Implement `initialPrompt` auto-send on mount with `hasSentRef` guard
- [ ] Add conversation-active dot badge on sidebar "Idea Assistant" item when `chatHistory.length > 0`

**Acceptance criteria:** Button navigates to chat and auto-sends. No double-send in React 19 Strict Mode. Badge appears when conversation is active.

---

### Phase 6 — Export, Polish & Mobile
**Files touched:** `IdeaChatContent.tsx`, `MessageBubble.tsx`

- [ ] Implement export to markdown (Blob download)
- [ ] Implement clear chat with shadcn `AlertDialog`
- [ ] Thumbs up/down feedback on assistant messages
- [ ] `Escape` key handler: clears input when textarea is focused
- [ ] Mobile layout: verify full-height chat, input bar not obscured by keyboard on iOS
- [ ] Verify `ScrollArea` scrolls correctly on iOS Safari

**Acceptance criteria:** Export downloads correct markdown. Clear confirmation works. Feedback buttons update state. Keyboard shortcut fires. Mobile layout functional at 390px.

---

## 16. Full File Map

```
app/
├── page.tsx                              MODIFY — Section type, chatHistory state, RightPanel effect
├── api/
│   ├── ideas/route.ts                    UNCHANGED
│   └── chat/route.ts                     NEW — Anthropic API server proxy

components/
├── dashboard/
│   ├── AppSidebar.tsx                    MODIFY — add chat nav item + active badge
│   ├── MainContent.tsx                   MODIFY — chat props + case 'chat'
│   ├── content/
│   │   ├── IdeaChatContent.tsx           NEW — chat section body (data fetch + send logic)
│   │   ├── ServicesContent.tsx           MODIFY — add "Ask AI about this →" button
│   │   └── (other content files)        UNCHANGED
│   └── chat/
│       ├── ChatHistory.tsx               NEW
│       ├── MessageBubble.tsx             NEW
│       ├── TypingIndicator.tsx           NEW
│       ├── SuggestedPrompts.tsx          NEW
│       ├── ContextBanner.tsx             NEW
│       └── ChatInputBar.tsx              NEW

lib/
├── chat-types.ts                         NEW — ChatMessage, ChatContext
├── chat-utils.ts                         NEW — buildSystemPrompt, detectMentionedIdea
├── ideas-data.ts                         UNCHANGED — IdeaRecord, filterIdeas, IdeaFilters reused
└── (other lib files)                     UNCHANGED

.env.local                                MODIFY — add ANTHROPIC_API_KEY
```

---

## 17. Success Criteria

| Criterion | Definition of done |
|---|---|
| Architecture fit | `chat` is a proper `activeSection` value — no new routes or layout containers |
| State persistence | `chatHistory` in root state survives all section switches |
| API security | Anthropic key only used server-side in `/api/chat` — never in client bundle |
| Dataset awareness | Agent correctly answers "which ideas score above 90?" with real values |
| Filter awareness | Agent opens answer with "Within your current filter..." when filters active |
| Multi-turn coherence | Agent handles "compare that to the second one you mentioned" correctly |
| Markdown rendering | Tables, lists, bold, code blocks render correctly in assistant bubbles |
| Error resilience | No crash on API failure — inline error bubble + retry always shown |
| Cancel | Stop button aborts fetch cleanly, clears loading state |
| Cross-section flow | "Ask AI about this →" navigates to chat and auto-sends without double-fire |
| Mobile | Chat functional at 390px, input bar visible above keyboard |
| Export | Downloaded markdown is clean and readable |

---

## 18. Out of Scope (Deferred)

| Feature | Reason deferred |
|---|---|
| Streaming responses | Requires SSE in the API route + streaming state management — separate iteration |
| Persisted history (localStorage or DB) | Session-only is correct for MVP |
| Multiple named conversations | Single session conversation is the right MVP scope |
| Deprecating `/explore` | Keep as-is — handles `?idea=` deep links at zero maintenance cost |
| Rate limiting on `/api/chat` | Add before any public/multi-user deployment |

---

