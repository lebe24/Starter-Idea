import { NextRequest, NextResponse } from "next/server";
import { query } from "@anthropic-ai/claude-agent-sdk";

type ChatMessage = { role: "user" | "assistant"; content: string };

function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .filter(
      (m: unknown): m is { role: string; content: string } =>
        typeof m === "object" &&
        m !== null &&
        "role" in m &&
        "content" in m &&
        ((m as { role: string }).role === "user" || (m as { role: string }).role === "assistant") &&
        typeof (m as { content: unknown }).content === "string",
    )
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

function buildAgentPrompt(systemPrompt: string, messages: ChatMessage[]): string {
  const conversation = messages
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");

  return [
    systemPrompt,
    "",
    "Conversation so far:",
    conversation || "(empty)",
    "",
    "Instructions:",
    "- Answer the latest user question.",
    "- Use available tools (web/api/mcp) whenever they improve accuracy.",
    "- If a tool is unavailable, continue with best effort and say what is missing.",
  ].join("\n");
}

function collectAssistantTextFromEvent(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 ? text : null;
  }

  const chunks: string[] = [];
  const seen = new WeakSet<object>();

  function walk(node: unknown, inAssistantContext: boolean) {
    if (typeof node !== "object" || node === null) return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item, inAssistantContext);
      return;
    }

    const record = node as Record<string, unknown>;
    const isAssistantNode = record.role === "assistant";
    const nextAssistantContext = inAssistantContext || isAssistantNode;

    // Anthropic-style content blocks.
    if (
      nextAssistantContext &&
      record.type === "text" &&
      typeof record.text === "string" &&
      record.text.trim().length > 0
    ) {
      chunks.push(record.text.trim());
    }

    // Some events may expose string content directly on assistant nodes.
    if (
      nextAssistantContext &&
      typeof record.content === "string" &&
      record.content.trim().length > 0
    ) {
      chunks.push(record.content.trim());
    }

    for (const child of Object.values(record)) {
      walk(child, nextAssistantContext);
    }
  }

  walk(value, false);
  if (chunks.length === 0) return null;
  return chunks.join("\n").trim();
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = (body as { messages?: unknown }).messages;
  const systemPrompt = (body as { systemPrompt?: unknown }).systemPrompt;

  if (!Array.isArray(messages) || typeof systemPrompt !== "string") {
    return NextResponse.json({ error: "messages (array) and systemPrompt (string) are required" }, { status: 400 });
  }

  const chatMessages = sanitizeMessages(messages);
  const prompt = buildAgentPrompt(systemPrompt, chatMessages);

  try {
    let reply = "";

    for await (const event of query({
      prompt,
      options: {
        model: "claude-sonnet-4-20250514",
        maxTurns: 20,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        allowedTools: [
          "WebSearch",
          "WebFetch",
          "Read",
          "Write",
          "Bash",
          "mcp__*",
        ],
      },
    })) {
      const text = collectAssistantTextFromEvent(event);
      if (text) {
        reply = text;
      }
    }

    if (!reply) {
      return NextResponse.json(
        { error: "Agent completed without a text response." },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to execute agent query";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
