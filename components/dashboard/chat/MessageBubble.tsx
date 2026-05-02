"use client";

import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { Bot, Copy, ThumbsDown, ThumbsUp, User, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/chat-types";
import { ResponseStream } from "@/components/prompt-kit/response-stream";

interface MessageBubbleProps {
  message: ChatMessage;
  onFeedback: (id: string, value: "up" | "down") => void;
  onRetry?: () => void;
  animateTyping?: boolean;
  onTypingComplete?: () => void;
}

export function MessageBubble({
  message,
  onFeedback,
  onRetry,
  animateTyping = false,
  onTypingComplete,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [typingDone, setTypingDone] = useState(!animateTyping);

  useEffect(() => {
    setTypingDone(!animateTyping);
  }, [animateTyping, message.id]);

  if (message.role === "user") {
    return (
      <div className="flex items-end justify-end gap-3">
        <div className="max-w-[min(100%,85%)] rounded-lg rounded-br-sm bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          <p className="mt-2 text-right text-[11px] text-primary-foreground/75">
            {message.timestamp.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (message.isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm text-foreground">{message.content}</p>
            {onRetry ? (
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const isNotice = message.isNotice === true;

  return (
    <div className="flex items-end justify-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Bot className="h-4 w-4 text-muted-foreground" />
      </div>
      <div
        className={cn(
          "max-w-[min(100%,85%)] rounded-lg border px-4 py-3 text-sm leading-relaxed shadow-sm",
          isNotice
            ? "border-border bg-muted/40 text-muted-foreground"
            : "rounded-bl-sm border-border bg-background text-foreground",
        )}
      >
        {isNotice ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : animateTyping && !typingDone ? (
          <div className="whitespace-pre-wrap">
            <ResponseStream
              textStream={message.content}
              speed={55}
              onComplete={() => {
                setTypingDone(true);
                onTypingComplete?.();
              }}
            />
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-2 prose-li:my-0.5 prose-table:text-xs prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1">
            <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
          </div>
        )}
        {!isNotice ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
            <span className="text-[11px] text-muted-foreground">
              {formatDistanceToNow(message.timestamp, { addSuffix: true })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={async () => {
                await navigator.clipboard.writeText(message.content);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              <Copy className="mr-1 h-3.5 w-3.5" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Thumbs up"
              onClick={() => onFeedback(message.id, "up")}
            >
              <ThumbsUp
                className={cn("h-3.5 w-3.5", message.feedback === "up" ? "text-primary" : "text-muted-foreground")}
              />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Thumbs down"
              onClick={() => onFeedback(message.id, "down")}
            >
              <ThumbsDown
                className={cn("h-3.5 w-3.5", message.feedback === "down" ? "text-destructive" : "text-muted-foreground")}
              />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
