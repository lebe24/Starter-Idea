"use client";

import { forwardRef, useEffect, useRef, type MutableRefObject, type Ref } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function mergeRefs<T>(...refs: (Ref<T> | null | undefined)[]) {
  return (value: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(value);
      else (ref as MutableRefObject<T | null>).current = value;
    }
  };
}

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onStop: () => void;
}

export const ChatInputBar = forwardRef<HTMLTextAreaElement, ChatInputBarProps>(function ChatInputBar(
  { value, onChange, onSend, isLoading, onStop },
  forwardedRef,
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  return (
    <div className="border-t border-border bg-card p-3 sm:p-4 shrink-0">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-lg border border-border bg-background p-2 shadow-sm">
        <Textarea
          ref={mergeRefs(textareaRef, forwardedRef)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask about ideas, filters, GTM plans…"
          rows={1}
          className={cn(
            "min-h-[44px] max-h-[120px] resize-none border-0 bg-transparent px-2 py-2.5 shadow-none focus-visible:ring-0",
          )}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onChange("");
              return;
            }
            if (e.key === "Enter" && !e.shiftKey && !isLoading) {
              e.preventDefault();
              if (value.trim()) onSend();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl"
          disabled={!isLoading && value.trim() === ""}
          onClick={() => {
            if (isLoading) onStop();
            else onSend();
          }}
          aria-label={isLoading ? "Stop" : "Send"}
        >
          {isLoading ? <Square className="h-4 w-4 fill-current" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
});
