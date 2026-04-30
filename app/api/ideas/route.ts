import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import type { RawIdeaRow } from "@/lib/ideas-data";
import { normalizeIdeaRows } from "@/lib/ideas-data";

const WORKBOOK_PATH = join(process.cwd(), "db", "Micro-SaaS Ideas Database [Starter Story].xlsx");

function asText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const text = String(value).trim();
  return text.length > 0 ? text : "—";
}

export async function GET() {
  const fileBuffer = await readFile(WORKBOOK_PATH);
  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
    header: 1,
    defval: "—",
    raw: false,
  });

  const ideaRows: RawIdeaRow[] = rows
    .slice(2)
    .map((row) => ({
      idea: asText(row[0]),
      monthlyRevenue: asText(row[1]),
      monthlyTraffic: asText(row[2]),
      revenuePerVisitor: asText(row[3]),
      startingCosts: asText(row[4]),
      solopreneurScore: asText(row[5]),
      icp: asText(row[6]),
      growthTactics: asText(row[7]),
    }))
    .filter((row) => row.idea !== "—");

  const normalizedIdeas = normalizeIdeaRows(ideaRows);
  return NextResponse.json({ ideas: normalizedIdeas });
}
