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
You are testing tool access.
1) Use web_search to find one 2025 Micro-SaaS trend.
2) Use Read tool to inspect ./README.md and extract one project detail.
3) If MCP tools are available, call one safe read-only MCP tool.
4) Return a concise report with sections: Web, Read, MCP, Risks.
`.trim();

  console.log("Running Claude Agent SDK tooling test...\n");

  try {
    for await (const event of query({
      prompt,
      options: {
        model: "claude-sonnet-4-20250514",
        allowedTools: ["web_search", "Read", "Bash", "mcp__*"],
        maxTurns: 20,
      },
    })) {
      console.log(formatEvent(event));
    }
  } catch (error) {
    console.error("Agent tooling test failed:", error);
    process.exit(1);
  }
}

await main();
