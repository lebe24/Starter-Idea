export interface RawIdeaRow {
  idea: string;
  monthlyRevenue: string;
  monthlyTraffic: string;
  revenuePerVisitor: string;
  startingCosts: string;
  solopreneurScore: string;
  icp: string;
  growthTactics: string;
}

export type ScoreGroup = "high" | "mid" | "low" | "unknown";
export type RevenueGroup = "1M+" | "500K+" | "100K+" | "50K+" | "10K+" | "sub10K" | "unknown";
export type CostGroup = "zero" | "sub1K" | "sub10K" | "sub100K" | "100K+" | "unknown";

export interface IdeaRecord extends RawIdeaRow {
  icpList: string[];
  tacticsList: string[];
  scoreNum: number | null;
  revNumK: number | null;
  costNumK: number | null;
  scoreGroup: ScoreGroup;
  revGroup: RevenueGroup;
  costGroup: CostGroup;
  tacticSet: Set<string>;
}

export interface IdeaFilters {
  search: string;
  minScore: number;
  minRevenueK: number;
  maxCostK: number;
  tactics: string[];
  icpKeyword: string;
}

export interface IdeaStats {
  totalShown: number;
  avgScore: number | null;
  medianRevenueK: number | null;
  avgStartCostK: number | null;
  topTactic: string | null;
  revenueRange: { min: number; max: number } | null;
}

const DASH = "—";

export const defaultIdeaFilters: IdeaFilters = {
  search: "",
  minScore: 0,
  minRevenueK: 0,
  maxCostK: Number.POSITIVE_INFINITY,
  tactics: [],
  icpKeyword: "",
};

function parseToNumberOrNull(raw: string): number | null {
  const value = raw.trim();
  if (!value || value === DASH) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCurrencyToK(raw: string): number | null {
  const value = raw.trim();
  if (!value || value === DASH) return null;

  const normalized = value.replace(/\$/g, "").replace(/,/g, "").trim();
  const unit = normalized.slice(-1).toUpperCase();
  const numericPart = unit === "K" || unit === "M" ? normalized.slice(0, -1) : normalized;
  const amount = Number.parseFloat(numericPart);
  if (!Number.isFinite(amount)) return null;

  if (unit === "M") return amount * 1000;
  if (unit === "K") return amount;
  return amount / 1000;
}

function parseCsvList(raw: string): string[] {
  if (!raw || raw === DASH) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function toScoreGroup(scoreNum: number | null): ScoreGroup {
  if (scoreNum === null) return "unknown";
  if (scoreNum >= 80) return "high";
  if (scoreNum >= 60) return "mid";
  return "low";
}

function toRevenueGroup(revNumK: number | null): RevenueGroup {
  if (revNumK === null) return "unknown";
  if (revNumK >= 1000) return "1M+";
  if (revNumK >= 500) return "500K+";
  if (revNumK >= 100) return "100K+";
  if (revNumK >= 50) return "50K+";
  if (revNumK >= 10) return "10K+";
  return "sub10K";
}

function toCostGroup(costNumK: number | null): CostGroup {
  if (costNumK === null) return "unknown";
  if (costNumK === 0) return "zero";
  if (costNumK < 1) return "sub1K";
  if (costNumK < 10) return "sub10K";
  if (costNumK < 100) return "sub100K";
  return "100K+";
}

export function normalizeIdeaRow(raw: RawIdeaRow): IdeaRecord {
  const scoreNum = parseToNumberOrNull(raw.solopreneurScore);
  const revNumK = parseCurrencyToK(raw.monthlyRevenue);
  const costNumK = parseCurrencyToK(raw.startingCosts);
  const icpList = parseCsvList(raw.icp);
  const tacticsList = parseCsvList(raw.growthTactics);

  return {
    ...raw,
    scoreNum,
    revNumK,
    costNumK,
    icpList,
    tacticsList,
    scoreGroup: toScoreGroup(scoreNum),
    revGroup: toRevenueGroup(revNumK),
    costGroup: toCostGroup(costNumK),
    tacticSet: new Set(tacticsList.map((t) => t.toLowerCase())),
  };
}

export function normalizeIdeaRows(rows: RawIdeaRow[]): IdeaRecord[] {
  return rows.map(normalizeIdeaRow);
}

export function filterIdeas(records: IdeaRecord[], filters: IdeaFilters): IdeaRecord[] {
  const searchQuery = filters.search.trim().toLowerCase();
  const icpQuery = filters.icpKeyword.trim().toLowerCase();
  const tacticFilters = filters.tactics.map((t) => t.toLowerCase());

  return records.filter((record) => {
    const tacticSet =
      record.tacticSet instanceof Set
        ? record.tacticSet
        : new Set((record.tacticsList ?? []).map((tactic) => tactic.toLowerCase()));

    if (searchQuery) {
      const haystack = `${record.idea} ${record.icpList.join(" ")} ${record.tacticsList.join(" ")}`.toLowerCase();
      if (!haystack.includes(searchQuery)) return false;
    }

    if (filters.minScore > 0) {
      if (record.scoreNum === null || record.scoreNum < filters.minScore) return false;
    }

    if (filters.minRevenueK > 0) {
      if (record.revNumK === null || record.revNumK < filters.minRevenueK) return false;
    }

    if (Number.isFinite(filters.maxCostK)) {
      if (record.costNumK !== null && record.costNumK > filters.maxCostK) return false;
    }

    if (tacticFilters.length > 0) {
      const hasMatch = tacticFilters.some((tactic) => tacticSet.has(tactic));
      if (!hasMatch) return false;
    }

    if (icpQuery) {
      const icpText = record.icpList.join(" ").toLowerCase();
      if (!icpText.includes(icpQuery)) return false;
    }

    return true;
  });
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function computeIdeaStats(records: IdeaRecord[]): IdeaStats {
  const scoreValues = records.map((r) => r.scoreNum).filter((v): v is number => v !== null);
  const revenueValues = records.map((r) => r.revNumK).filter((v): v is number => v !== null);
  const costValues = records.map((r) => r.costNumK).filter((v): v is number => v !== null);

  const tacticFrequency = new Map<string, number>();
  for (const record of records) {
    for (const tactic of record.tacticsList) {
      tacticFrequency.set(tactic, (tacticFrequency.get(tactic) ?? 0) + 1);
    }
  }

  let topTactic: string | null = null;
  let topTacticCount = 0;
  for (const [tactic, count] of tacticFrequency) {
    if (count > topTacticCount) {
      topTactic = tactic;
      topTacticCount = count;
    }
  }

  return {
    totalShown: records.length,
    avgScore: average(scoreValues),
    medianRevenueK: median(revenueValues),
    avgStartCostK: average(costValues),
    topTactic,
    revenueRange: revenueValues.length > 0
      ? { min: Math.min(...revenueValues), max: Math.max(...revenueValues) }
      : null,
  };
}
