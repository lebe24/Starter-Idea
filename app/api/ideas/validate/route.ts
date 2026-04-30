import { NextRequest, NextResponse } from "next/server";

type IdeaPayload = {
  idea: string;
  monthlyRevenue: string;
  monthlyTraffic: string;
  revenuePerVisitor: string;
  startingCosts: string;
  solopreneurScore: string;
  icp: string;
  growthTactics: string;
  validationReason: string;
};

function collectText(event: unknown): string {
  if (typeof event === "string") return event;
  if (!event || typeof event !== "object") return "";

  const chunks: string[] = [];
  const seen = new WeakSet<object>();
  function walk(node: unknown) {
    if (typeof node !== "object" || node === null) return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    const record = node as Record<string, unknown>;
    if (typeof record.text === "string" && record.text.trim()) chunks.push(record.text.trim());
    if (typeof record.message === "string" && record.message.trim()) chunks.push(record.message.trim());
    if (typeof record.content === "string" && record.content.trim()) chunks.push(record.content.trim());

    for (const value of Object.values(record)) walk(value);
  }

  walk(event);
  return chunks.join("\n");
}

function extractJson(text: string): { isValid: boolean; score: number; summary: string; suggestions: string[] } | null {
  const cleaned = text.replace(/```json|```/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as {
      isValid?: boolean;
      score?: number;
      summary?: string;
      suggestions?: string[];
    };
    return {
      isValid: Boolean(parsed.isValid),
      score: Number.isFinite(parsed.score) ? Number(parsed.score) : 0,
      summary: parsed.summary ?? "No summary returned.",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
    };
  } catch {
    return null;
  }
}

async function callAnthropicJson(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 700,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    content?: Array<{ type?: string; text?: string }>;
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Anthropic API failed (${response.status})`);
  }

  const text = (payload.content ?? [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Anthropic API returned an empty response.");
  }

  return text;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });
  }

  let payload: IdeaPayload;
  try {
    payload = (await req.json()) as IdeaPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = `
You are validating whether a user-submitted micro-SaaS idea should be added to a curated ideas database.
Return JSON only with this exact shape:
{
  "isValid": boolean,
  "score": number,
  "summary": string,
  "suggestions": string[]
}

Validation criteria:
- Is the problem clear and specific?
- Is there realistic demand or evidence?
- Is scope feasible for a solo builder?
- Does the provided reason support validity?

Idea submission:
${JSON.stringify(payload, null, 2)}
`.trim();

  try {
    const finalText = await callAnthropicJson(prompt, process.env.ANTHROPIC_API_KEY);
    const parsed = extractJson(finalText);
    if (!parsed) {
      return NextResponse.json(
        {
          isValid: false,
          score: 0,
          summary: "AI validator returned an unreadable response.",
          suggestions: ["Try again with a clearer market pain point and validation reason."],
        },
        { status: 200 },
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed." },
      { status: 502 },
    );
  }
}
