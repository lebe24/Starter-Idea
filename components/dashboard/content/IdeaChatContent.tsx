"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Section } from "@/lib/dashboard-section";
import { filterIdeas, type IdeaFilters, type IdeaRecord } from "@/lib/ideas-data";
import type { ChatContext, ChatMessage } from "@/lib/chat-types";
import { buildSystemPrompt, detectMentionedIdea } from "@/lib/chat-utils";
import { ChatHistory } from "@/components/dashboard/chat/ChatHistory";
import { ChatInputBar } from "@/components/dashboard/chat/ChatInputBar";
import { ContextBanner } from "@/components/dashboard/chat/ContextBanner";
import { SuggestedPrompts } from "@/components/dashboard/chat/SuggestedPrompts";

function newMessage(
  partial: Omit<ChatMessage, "id" | "timestamp"> & Partial<Pick<ChatMessage, "id" | "timestamp">>,
): ChatMessage {
  const { id, timestamp, ...rest } = partial;
  return {
    ...rest,
    id: id ?? crypto.randomUUID(),
    timestamp: timestamp ?? new Date(),
  } as ChatMessage;
}

function isAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

function toApiMessages(messages: ChatMessage[]): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && !m.isError)
    .map((m) => ({ role: m.role, content: m.content }));
}

function formatFiltersLine(filters: IdeaFilters): string {
  const parts: string[] = [];
  if (filters.search) parts.push(`Search: ${filters.search}`);
  if (filters.minScore > 0) parts.push(`Score ≥ ${filters.minScore}`);
  if (filters.minRevenueK > 0) parts.push(`Revenue ≥ ${filters.minRevenueK}K`);
  if (Number.isFinite(filters.maxCostK)) parts.push(`Cost ≤ ${filters.maxCostK}K`);
  if (filters.icpKeyword) parts.push(`ICP: ${filters.icpKeyword}`);
  for (const t of filters.tactics) parts.push(`Tactic: ${t}`);
  return parts.length > 0 ? parts.join(", ") : "None";
}

export interface IdeaChatContentProps {
  ideaFilters: IdeaFilters;
  chatHistory: ChatMessage[];
  onChatHistoryChange: (history: ChatMessage[]) => void;
  onSectionChange: (section: Section) => void;
  initialPrompt?: string | null;
  onInitialPromptConsumed?: () => void;
}

export function IdeaChatContent({
  ideaFilters,
  chatHistory,
  onChatHistoryChange,
  onSectionChange,
  initialPrompt,
  onInitialPromptConsumed,
}: IdeaChatContentProps) {
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [isLoadingIdeas, setIsLoadingIdeas] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [lastMentionedIdea, setLastMentionedIdea] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const truncateNoticeShownRef = useRef(false);
  const initialSendGuardRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/ideas");
        const data = await res.json();
        if (mounted) setIdeas(data.ideas ?? []);
      } finally {
        if (mounted) setIsLoadingIdeas(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const matchingIdeas = useMemo(() => filterIdeas(ideas, ideaFilters), [ideas, ideaFilters]);

  useEffect(() => {
    if (!initialPrompt?.trim() || isLoadingIdeas) return;
    if (initialSendGuardRef.current === initialPrompt) return;
    initialSendGuardRef.current = initialPrompt;
    onInitialPromptConsumed?.();
    void sendUserMessage(initialPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guarded one-shot send
  }, [initialPrompt, isLoadingIdeas]);

  const buildContext = useCallback((): ChatContext => {
    return {
      ideaFilters,
      matchingIdeas,
      totalIdeas: ideas.length,
      lastMentionedIdea,
    };
  }, [ideaFilters, matchingIdeas, ideas.length, lastMentionedIdea]);

  const runCompletion = useCallback(
    async (historyForDisplay: ChatMessage[]) => {
      const systemPrompt = buildSystemPrompt(ideas, buildContext());
      const payloadMessages = toApiMessages(historyForDisplay);
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payloadMessages, systemPrompt }),
        signal: controller.signal,
      });

      const raw: unknown = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errText =
          typeof raw === "object" && raw && "error" in raw
            ? JSON.stringify((raw as { error: unknown }).error)
            : "Unknown error";
        throw new Error(`The AI returned an error — try rephrasing. (${errText})`);
      }
      const reply = typeof (raw as { reply?: unknown }).reply === "string" ? (raw as { reply: string }).reply : "";
      if (!reply.trim()) {
        throw new Error("No response received — please try again");
      }
      return reply;
    },
    [ideas, buildContext],
  );

  const sendUserMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isLoading || isLoadingIdeas) return;

    let nextHistory = [...chatHistory];

    if (nextHistory.length > 50) {
      nextHistory = nextHistory.slice(10);
      if (!truncateNoticeShownRef.current) {
        truncateNoticeShownRef.current = true;
        nextHistory = [
          ...nextHistory,
          newMessage({
            role: "assistant",
            content:
              "Note: Older messages were removed to stay within the conversation limit. Your most recent messages are kept.",
            isNotice: true,
          }),
        ];
      }
    }

    nextHistory = [...nextHistory, newMessage({ role: "user", content: text })];
    onChatHistoryChange(nextHistory);
    setChatInput("");
    setIsLoading(true);

    try {
      const reply = await runCompletion(nextHistory);
      const mentioned = detectMentionedIdea(reply, ideas);
      if (mentioned) setLastMentionedIdea(mentioned);
      onChatHistoryChange([...nextHistory, newMessage({ role: "assistant", content: reply })]);
    } catch (e) {
      if (isAbortError(e)) {
        return;
      }
      const msg =
        e instanceof Error && e.message.includes("Failed to fetch")
          ? "Couldn't reach the AI. Check your connection."
          : e instanceof Error
            ? e.message
            : "The AI returned an error — try rephrasing";
      onChatHistoryChange([
        ...nextHistory,
        newMessage({ role: "assistant", content: msg, isError: true }),
      ]);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setIsLoading(false);
    abortRef.current = null;
  };

  const handleFeedback = (id: string, value: "up" | "down") => {
    onChatHistoryChange(
      chatHistory.map((m) => (m.id === id ? { ...m, feedback: m.feedback === value ? null : value } : m)),
    );
  };

  const systemPrompt = useMemo(
    () => buildSystemPrompt(ideas, buildContext()),
    [ideas, buildContext],
  );

  const exportMarkdown = () => {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const lines: string[] = [
      "# Idea Assistant — Conversation Export",
      `Date: ${y}-${m}-${d}`,
      `Ideas loaded: ${ideas.length}`,
      `Active filters: ${formatFiltersLine(ideaFilters)}`,
      "",
      "---",
      "",
    ];
    for (const msg of chatHistory) {
      if (msg.isNotice) continue;
      const who = msg.role === "user" ? "You" : "Idea Assistant";
      const time = msg.timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      lines.push(`**${who}** · ${time}`, "", msg.content, "", "---", "");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `idea-assistant-${y}-${m}-${d}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmClear = () => {
    onChatHistoryChange([]);
    setLastMentionedIdea(null);
    truncateNoticeShownRef.current = false;
    initialSendGuardRef.current = null;
    setClearOpen(false);
  };

  const filtersActive = matchingIdeas.length !== ideas.length && ideas.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <header className="flex shrink-0 flex-col gap-2 border-b border-border bg-card px-4 py-2 sm:gap-3 sm:px-6 sm:py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="hidden lg:block">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Idea Assistant</h1>
          <p className="text-sm text-muted-foreground">Chat with your Micro-SaaS ideas dataset</p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setClearOpen(true)}
            disabled={chatHistory.length === 0}
          >
            <Trash2 className="h-4 w-4" />
            Clear chat
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={exportMarkdown} disabled={chatHistory.length === 0}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-3 pt-3 sm:px-6">
          <ContextBanner
            ideaFilters={ideaFilters}
            matchingCount={matchingIdeas.length}
            totalCount={ideas.length}
            dismissed={bannerDismissed}
            onDismiss={() => setBannerDismissed(true)}
            onViewIdeas={() => onSectionChange("ideas")}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatHistory
            chatHistory={chatHistory}
            isLoading={isLoading}
            systemPrompt={systemPrompt}
            onLoadingChange={setIsLoading}
            onChatHistoryChange={onChatHistoryChange}
            onFeedback={handleFeedback}
          />
        </div>

        <SuggestedPrompts
          chatInput={chatInput}
          chatHistory={chatHistory}
          filtersActive={filtersActive}
          lastMentionedIdea={lastMentionedIdea}
          onPick={setChatInput}
          inputRef={textareaRef}
        />

        <ChatInputBar
          ref={textareaRef}
          value={chatInput}
          onChange={setChatInput}
          onSend={() => void sendUserMessage(chatInput)}
          isLoading={isLoading}
          onStop={handleStop}
        />
      </div>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear conversation?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone. Your messages in this session will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClear}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
