"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/lib/chat-types";

const FRESH: { label: string; text: string }[] = [
  { label: "💡 Best ideas under $500 to start", text: "What are the best ideas under $500 to start?" },
  { label: "📈 Tactics for $100K+ revenue", text: "Which growth tactics appear most often in ideas doing over $100K/month?" },
  { label: "🧩 Top ideas for developers", text: "What are the top Micro-SaaS ideas for developers in this dataset?" },
  { label: "🏆 Highest solopreneur scores", text: "Which ideas have the highest solopreneur scores overall?" },
  { label: "🔍 Underserved niches", text: "What niches look most underserved in this ideas database?" },
];

const FILTERS: { label: string; text: string }[] = [
  { label: "🔎 Summarise my filtered results", text: "Summarise my current filtered list of ideas — themes, risks, and opportunities." },
  { label: "🏅 Best opportunity in this set", text: "What is the single best opportunity in my current filtered results and why?" },
  { label: "📊 Compare top 3", text: "Compare the top 3 ideas in my current filter set in a markdown table." },
  { label: "💬 What they have in common", text: "What do the ideas in my current filter have in common?" },
];

const MENTIONED: { label: string; text: string }[] = [
  { label: "📋 90-day launch plan", text: "Build a 90-day go-to-market plan for the idea we just discussed." },
  { label: "🤝 Real competitors", text: "Who are the real competitors for the idea we discussed?" },
  { label: "⚙️ n8n automation angle", text: "What is a practical n8n automation angle for the idea we discussed?" },
  { label: "💰 Pricing guidance", text: "How should I price the idea we discussed for early customers?" },
];

const DEEP: { label: string; text: string }[] = [
  { label: "🔄 Start over", text: "Let's start over — give me 5 fresh ideas to consider from the full dataset." },
  { label: "📄 Export reminder", text: "Summarise this thread as bullet points I can paste into a doc." },
  { label: "🔗 Compare to another", text: "Compare the last idea we discussed to another strong idea in the same category." },
  { label: "🧮 Show the numbers", text: "Show the numbers behind your last recommendation (score, revenue, cost, traffic)." },
];

interface SuggestedPromptsProps {
  chatInput: string;
  chatHistory: ChatMessage[];
  filtersActive: boolean;
  lastMentionedIdea: string | null;
  onPick: (text: string) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

export function SuggestedPrompts({
  chatInput,
  chatHistory,
  filtersActive,
  lastMentionedIdea,
  onPick,
  inputRef,
}: SuggestedPromptsProps) {
  if (chatInput.length > 0) return null;

  let prompts = FRESH;
  if (chatHistory.length > 6) prompts = DEEP;
  else if (lastMentionedIdea) prompts = MENTIONED;
  else if (filtersActive) prompts = FILTERS;

  return (
    <div className="shrink-0 border-t border-border bg-card/80 px-3 py-2 backdrop-blur-sm sm:px-4">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max gap-2 pb-1">
          {prompts.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => {
                onPick(p.text);
                window.requestAnimationFrame(() => inputRef?.current?.focus());
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
