"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "@/components/prompt-kit/chat-container";
import { ScrollButton } from "@/components/prompt-kit/scroll-button";
import type { ChatMessage } from "@/lib/chat-types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface ChatHistoryProps {
  chatHistory: ChatMessage[];
  isLoading: boolean;
  systemPrompt: string;
  onLoadingChange: (value: boolean) => void;
  onChatHistoryChange: (history: ChatMessage[]) => void;
  onFeedback: (id: string, value: "up" | "down") => void;
}

function EmptyState() {
  return (
    <>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <MessageSquare className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="max-w-md space-y-2">
        <p className="text-base font-semibold text-foreground">Ask me anything about the Micro-SaaS Ideas Database</p>
        <p className="text-sm text-muted-foreground">I can help you:</p>
        <ul className="mx-auto inline-block text-left text-sm text-muted-foreground">
          <li>Find the right idea for your budget and skills</li>
          <li>Compare ideas side by side</li>
          <li>Build a 90-day go-to-market plan</li>
          <li>Analyse patterns across the ideas</li>
          <li>Explain what any idea involves building</li>
        </ul>
        <p className="pt-2 text-xs text-muted-foreground">Try a suggested prompt below</p>
      </div>
    </>
  );
}

function makeMessage(
  partial: Omit<ChatMessage, "id" | "timestamp"> & Partial<Pick<ChatMessage, "id" | "timestamp">>,
): ChatMessage {
  const { id, timestamp, ...rest } = partial;
  return {
    ...rest,
    id: id ?? crypto.randomUUID(),
    timestamp: timestamp ?? new Date(),
  } as ChatMessage;
}

function toApiMessages(messages: ChatMessage[]): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && !m.isError)
    .map((m) => ({ role: m.role, content: m.content }));
}

function isAbortError(e: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

export function ChatHistory({
  chatHistory,
  isLoading,
  systemPrompt,
  onLoadingChange,
  onChatHistoryChange,
  onFeedback,
}: ChatHistoryProps) {
  const isEmpty = chatHistory.length === 0 && !isLoading;
  const showScrollToBottom = !isEmpty;
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const msg of chatHistory) {
      if (!seenMessageIdsRef.current.has(msg.id)) {
        seenMessageIdsRef.current.add(msg.id);
        if (msg.role === "assistant" && !msg.isError && !msg.isNotice) {
          setTypingMessageId(msg.id);
        }
      }
    }
  }, [chatHistory]);

  const handleRetryError = useCallback(
    async (errorMessageId: string) => {
      const idx = chatHistory.findIndex((m) => m.id === errorMessageId);
      if (idx <= 0) return;

      const withoutError = chatHistory.filter((m) => m.id !== errorMessageId);
      onChatHistoryChange(withoutError);
      onLoadingChange(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: toApiMessages(withoutError),
            systemPrompt,
          }),
        });

        const raw: unknown = await response.json().catch(() => ({}));
        if (!response.ok) {
          const errText =
            typeof raw === "object" && raw && "error" in raw
              ? JSON.stringify((raw as { error: unknown }).error)
              : "Unknown error";
          throw new Error(`The AI returned an error — try rephrasing. (${errText})`);
        }

        const reply =
          typeof (raw as { reply?: unknown }).reply === "string"
            ? (raw as { reply: string }).reply
            : "";
        if (!reply.trim()) {
          throw new Error("No response received — please try again");
        }

        onChatHistoryChange([...withoutError, makeMessage({ role: "assistant", content: reply })]);
      } catch (e) {
        if (isAbortError(e)) return;
        const msg =
          e instanceof Error && e.message.includes("Failed to fetch")
            ? "Couldn't reach the AI. Check your connection."
            : e instanceof Error
              ? e.message
              : "The AI returned an error — try rephrasing";
        onChatHistoryChange([
          ...withoutError,
          makeMessage({ role: "assistant", content: msg, isError: true }),
        ]);
      } finally {
        onLoadingChange(false);
      }
    },
    [chatHistory, onChatHistoryChange, onLoadingChange, systemPrompt],
  );

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <ChatContainerRoot
        className="h-full min-h-0 w-full flex-1 rounded-2xl border border-border bg-card/50 px-3 py-4 md:px-4"
        aria-busy={isLoading}
        aria-relevant="additions text"
      >
        <ChatContainerContent
          className={
            isEmpty
              ? "flex min-h-[min(380px,48vh)] flex-col items-center justify-center gap-4 px-2 py-8 text-center"
              : "mx-auto w-full max-w-3xl space-y-5 pb-1"
          }
        >
          {isEmpty ? (
            <EmptyState />
          ) : (
            <>
              {chatHistory.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  animateTyping={m.id === typingMessageId}
                  onTypingComplete={() => {
                    setTypingMessageId((current) => (current === m.id ? null : current));
                  }}
                  onFeedback={onFeedback}
                  onRetry={
                    m.isError
                      ? () => {
                          void handleRetryError(m.id);
                        }
                      : undefined
                  }
                />
              ))}
              {isLoading ? <TypingIndicator /> : null}
            </>
          )}
          <ChatContainerScrollAnchor />
        </ChatContainerContent>

        {showScrollToBottom ? (
          <div className="pointer-events-none absolute bottom-3 right-3 z-10 md:bottom-4 md:right-4">
            <ScrollButton
              type="button"
              aria-label="Scroll to latest message"
              className="pointer-events-auto h-10 w-10 border-border/80 bg-background/95 shadow-md backdrop-blur-sm"
            />
          </div>
        ) : null}
      </ChatContainerRoot>
    </div>
  );
}
