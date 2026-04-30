# Project breakdown

High-level map of the **Saas-ideas** repository: layout, responsibilities, and how the main pieces connect.

## What this project is

A **Next.js 16** single-page dashboard shell (branded in the UI as “Starter Idea” / engineering-style “Pulse” framing in metadata). The home route composes a **three-column layout**: collapsible left navigation, a main area that switches by section, and an optional right panel for filters. The **Ideas** section loads micro-SaaS records from an **Excel workbook** via a **Route Handler**, normalizes them in `lib/ideas-data.ts`, and surfaces them in the main grid plus the filter panel.

Other sidebar sections (incidents, deployments, performance, and so on) render **placeholder / demo dashboard content** from `components/dashboard/content/*` and are not backed by live APIs in this repo.

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | [Next.js](https://nextjs.org/) 16 (App Router) |
| UI | React 19, Tailwind CSS 4, [Radix UI](https://www.radix-ui.com/) primitives, [lucide-react](https://lucide.dev/) icons |
| Components | shadcn-style primitives under `components/ui/` (see `components.json`) |
| Forms / validation | react-hook-form, zod, @hookform/resolvers |
| Charts | recharts |
| Analytics | @vercel/analytics |
| Data (ideas) | `xlsx` reads `db/Micro-SaaS Ideas Database [Starter Story].xlsx` at request time |
| Package manager | pnpm (`pnpm-lock.yaml`) |

## Repository structure

```
saas-ideas/
├── app/
│   ├── api/
│   │   └── ideas/
│   │       └── route.ts          # GET: read XLSX, return JSON { ideas }
│   ├── globals.css               # App-level styles (imported by layout)
│   ├── layout.tsx                # Root layout, fonts, metadata, Analytics
│   └── page.tsx                  # Client dashboard shell; Section state + filters
├── components/
│   ├── dashboard/
│   │   ├── app-sidebar.tsx       # Left nav, collapse, Ideas / Overview / On-Call, etc.
│   │   ├── main-content.tsx      # Header + section switch → content components
│   │   ├── right-panel.tsx       # Idea filters (fetches /api/ideas for tactic list)
│   │   └── content/
│   │       ├── overview-content.tsx
│   │       ├── incidents-content.tsx
│   │       ├── deployments-content.tsx
│   │       ├── performance-content.tsx
│   │       ├── errors-content.tsx
│   │       ├── sla-content.tsx
│   │       ├── oncall-content.tsx
│   │       ├── services-content.tsx   # “Ideas” main grid (uses ideaFilters + fetch)
│   │       ├── postmortems-content.tsx
│   │       └── settings-content.tsx
│   ├── theme-provider.tsx        # next-themes wrapper (if used by subtree)
│   └── ui/                       # Shared primitives (button, card, sidebar, table, …)
├── db/
│   └── Micro-SaaS Ideas Database [Starter Story].xlsx   # Source data for /api/ideas
├── doc/
│   ├── buildplan.md              # Planning notes (existing)
│   └── breakdown.md              # This file
├── hooks/
│   ├── use-mobile.ts
│   └── use-toast.ts
├── lib/
│   ├── ideas-data.ts             # Idea types, filters, normalization, stats helpers
│   ├── data.ts                   # Static demo data (studies, insights, …) for other UIs
│   ├── types.ts                  # Types aligned with lib/data.ts
│   └── utils.ts                  # cn() and shared utilities
├── public/                       # Icons, placeholders, static assets
├── styles/
│   └── globals.css               # Additional global styles (project may use app/globals)
├── components.json               # shadcn/ui style paths and aliases
├── next.config.mjs               # images.unoptimized; typescript.ignoreBuildErrors
├── postcss.config.mjs
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
├── README.md
└── .gitignore
```

## Application flow

1. **`app/page.tsx`** (client) holds `activeSection`, `ideaFilters`, and `isRightPanelOpen`, and exports the `Section` union type used across the dashboard.
2. **`AppSidebar`** updates the active section and toggles the right panel.
3. **`MainContent`** maps each `Section` to a content component; **`ideas`** renders **`ServicesContent`** with `ideaFilters`.
4. **`RightPanel`** edits `IdeaFilters` and may call **`GET /api/ideas`** to populate tactic options.
5. **`app/api/ideas/route.ts`** reads the workbook from **`db/`**, parses rows with `xlsx`, builds `RawIdeaRow[]`, then **`normalizeIdeaRows`** from **`lib/ideas-data.ts`** before returning JSON.

## Ideas domain (`lib/ideas-data.ts`)

- **Types**: `RawIdeaRow`, `IdeaRecord` (parsed lists, numeric fields, grouping enums), `IdeaFilters`, `IdeaStats`.
- **Defaults**: `defaultIdeaFilters`.
- **Logic**: parsing currency/scores, CSV-style fields, grouping (score / revenue / cost), filter application, and aggregate stats used by the Ideas UI.

## Legacy / parallel data (`lib/data.ts`, `lib/types.ts`)

Structured **demo** entities (e.g. `Study`, `Insight`, `Participant`) for research-style dashboards. They are **not** wired to `app/page.tsx` in the current Ideas-focused shell but remain available for components that import them.

## Configuration highlights

- **`next.config.mjs`**: TypeScript errors are ignored during `next build`; use with care in CI.
- **`components.json`**: `@/components` and `@/lib` aliases for UI generation and imports.
- **Dev script** (`package.json`): `WATCHPACK_POLLING=true` and bound host `127.0.0.1` for local dev reliability.

## Related documentation

- **`doc/buildplan.md`**: Build / product planning notes for the project.
