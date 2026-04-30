import { query } from "@anthropic-ai/claude-agent-sdk";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFromDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function formatEvent(event) {
  if (typeof event === "string") return event;
  if (!event || typeof event !== "object") return String(event);

  const record = /** @type {Record<string, unknown>} */ (event);
  const type = typeof record.type === "string" ? record.type : "event";
  const summary =
    typeof record.message === "string"
      ? record.message
      : typeof record.text === "string"
        ? record.text
        : JSON.stringify(event);

  return `[${type}] ${summary}`;
}

async function main() {
  loadEnvFromDotEnv();

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Missing ANTHROPIC_API_KEY in environment.");
    process.exit(1);
  }

  const prompt = `
Research the market for "one page checkout software" using web tools.

Requirements:
1) Market size (TAM/SAM/SOM if available) with evidence and caveats.
2) Competitors: list at least 8 notable players.
3) Monetization models used in this category.
4) Key risks (product, GTM, regulatory, platform dependency).
5) Go-to-market recommendations for a new entrant.
6) Top player recommendation with direct link and why.

Output format:
- Use markdown headings for each section.
- Include a "Sources" section with bullet links.
- Keep it concise but data-backed.
`.trim();

  console.log("Running one-page checkout market insight test...\n");

  try {
    for await (const event of query({
      prompt,
      options: {
        model: "claude-sonnet-4-20250514",
        allowedTools: ["web_search", "WebFetch"],
        maxTurns: 20,
      },
    })) {
      console.log(formatEvent(event));
    }
  } catch (error) {
    console.error("Insight query failed:", error);
    process.exit(1);
  }
}

await main();
