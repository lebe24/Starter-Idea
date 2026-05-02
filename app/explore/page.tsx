"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowUp, Expand, Lightbulb, Minimize2, Square, TrendingUp, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "@/components/prompt-kit/chat-container";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input";
import { ResponseStream } from "@/components/prompt-kit/response-stream";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/prompt-kit/reasoning";
import { Markdown } from "@/components/prompt-kit/markdown";
import type { IdeaRecord } from "@/lib/ideas-data";

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function ExplorePageInner() {
  const searchParams = useSearchParams();
  const selectedIdea = searchParams.get("idea") ?? "";

  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadIdeas() {
      try {
        const response = await fetch("/api/ideas");
        const data = await response.json();
        if (isMounted) {
          setIdeas(data.ideas ?? []);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadIdeas();
    return () => {
      isMounted = false;
    };
  }, []);

  const idea = useMemo(
    () => ideas.find((item) => item.idea.toLowerCase() === selectedIdea.toLowerCase()),
    [ideas, selectedIdea],
  );
  const [promptValue, setPromptValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const promptSuggestions = ["Top player", "Market Cap", "Total revenue"];

  useEffect(() => {
    if (!idea) return;
    setChatMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `I am ready to help you explore "${idea.idea}". Ask about market size, competitors, monetization, risks, or go-to-market.`,
      },
    ]);
    setTypingMessageId(null);
    setChatError(null);
  }, [idea?.idea]);

  const buildSystemPrompt = (selectedIdea: IdeaRecord) => {
    return [
      "You are an expert micro-SaaS research assistant.",
      "Be concise, practical, and decision-oriented.",
      "Use only the provided context for concrete claims; if data is missing, say so clearly.",
      "When helpful, answer in short bullets and include actionable next steps.",
      "",
      "IDEA CONTEXT",
      `Idea: ${selectedIdea.idea}`,
      `Monthly Revenue: ${selectedIdea.monthlyRevenue}`,
      `Monthly Traffic: ${selectedIdea.monthlyTraffic}`,
      `Revenue Per Visitor: ${selectedIdea.revenuePerVisitor}`,
      `Starting Costs: ${selectedIdea.startingCosts}`,
      `Solopreneur Score: ${selectedIdea.solopreneurScore}`,
      `ICP: ${selectedIdea.icp}`,
      `Growth Tactics: ${selectedIdea.growthTactics}`,
    ].join("\n");
  };

  const sendMessage = async (rawMessage: string) => {
    const nextMessage = rawMessage.trim();
    if (isSubmitting || !nextMessage || !idea) return;

    const historyWithUser: ChatMessage[] = [
      ...chatMessages,
      { id: crypto.randomUUID(), role: "user", content: nextMessage },
    ];
    setChatMessages(historyWithUser);
    setPromptValue("");
    setIsSubmitting(true);
    setChatError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(idea),
          messages: historyWithUser,
        }),
      });

      const data = (await response.json()) as { reply?: string; error?: unknown };
      if (!response.ok || !data.reply) {
        const errorMessage =
          typeof data.error === "string"
            ? data.error
            : "The assistant could not respond right now. Please try again.";
        throw new Error(errorMessage);
      }

      const assistantId = crypto.randomUUID();
      setTypingMessageId(assistantId);
      setChatMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: data.reply as string },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      setChatError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (isSubmitting || !promptValue.trim()) return;
    void sendMessage(promptValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    void sendMessage(suggestion);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-5 md:px-6">
          <Skeleton className="h-12 w-full rounded-lg animate-shimmer mb-6" />
          <div className="space-y-5">
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full animate-shimmer" />
              <Skeleton className="h-24 w-full rounded-lg animate-shimmer" />
            </div>
            <div className="flex gap-3 justify-end">
              <Skeleton className="h-16 w-[70%] rounded-lg animate-shimmer" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full animate-shimmer" />
              <Skeleton className="h-40 w-full rounded-lg animate-shimmer" />
            </div>
          </div>
          <Skeleton className="h-14 w-full rounded-lg animate-shimmer mt-6" />
        </div>
      </main>
    );
  }

  if (!selectedIdea || !idea) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-4 py-5 md:px-6">
          <div className="border border-border bg-card rounded-lg p-4 flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">Idea Explorer</p>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Idea not found</h1>
            <p className="text-muted-foreground">
              We could not find the selected idea context. Go back and click Explore again.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6 flex flex-col h-screen">
        <header className="border border-border bg-card rounded-lg p-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
            
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsChatExpanded((prev) => !prev)}
              aria-label={isChatExpanded ? "Collapse chat" : "Expand chat"}
              title={isChatExpanded ? "Collapse chat" : "Expand chat"}
            >
              {isChatExpanded ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
            </Button>
            <div className="w-8 h-8 rounded-xl bg-green-500 text-primary flex items-center justify-center">
              <Lightbulb className="w-4 h-4 " />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Idea Assistant</p>
              <p className="text-sm font-medium text-foreground">{idea.idea}</p>
            </div>
          </div>
         
        </header>

        <section
          className={`flex-1 py-6 min-h-0 grid grid-cols-1 gap-4 ${
            isChatExpanded ? "" : "lg:grid-cols-[minmax(0,1fr)_360px]"
          }`}
        >
          <div className="min-h-0">
            <ChatContainerRoot className="h-full rounded-lg border border-border bg-card/50 px-3 py-4 md:px-4">
              <ChatContainerContent className="space-y-5">
                {chatMessages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser ? (
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                      ) : null}
                      <div
                        className={`max-w-[82%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                          isUser
                            ? "rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-card border border-border text-foreground"
                        }`}
                      >
                        {isUser ? (
                          message.content
                        ) : typingMessageId === message.id ? (
                          <ResponseStream
                            textStream={message.content}
                            speed={55}
                            onComplete={() => setTypingMessageId(null)}
                            className="whitespace-pre-wrap"
                          />
                        ) : (
                          <Markdown>{message.content}</Markdown>
                        )}
                      </div>
                      {isUser ? (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {isSubmitting ? (
                  <div className="rounded-lg border border-border bg-card px-4 py-3">
                    <Reasoning isStreaming>
                      <ReasoningTrigger className="text-sm font-medium">
                        Reasoning
                      </ReasoningTrigger>
                      <ReasoningContent className="pt-2">
                        <p>
                          Analyzing <strong>{idea.idea}</strong> with available context:
                          revenue ({idea.monthlyRevenue}), traffic ({idea.monthlyTraffic}),
                          RPV ({idea.revenuePerVisitor}), ICP, and growth tactics. Preparing
                          a focused answer to your latest prompt.
                        </p>
                      </ReasoningContent>
                    </Reasoning>
                  </div>
                ) : null}

                {chatError ? (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{chatError}</p>
                  </div>
                ) : null}
                <ChatContainerScrollAnchor />
              </ChatContainerContent>
            </ChatContainerRoot>
          </div>

          <aside className={`min-h-0 overflow-y-auto ${isChatExpanded ? "hidden" : ""}`}>
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Idea Snapshot</p>
                <p className="text-sm text-foreground font-medium">{idea.idea}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Revenue</p>
                  <p className="font-medium text-foreground">{idea.monthlyRevenue}</p>
                </div>
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Traffic</p>
                  <p className="font-medium text-foreground">{idea.monthlyTraffic}</p>
                </div>
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Revenue / Visitor</p>
                  <p className="font-medium text-foreground">{idea.revenuePerVisitor}</p>
                </div>
                <div className="rounded-xl bg-muted/60 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Starting Cost</p>
                  <p className="font-medium text-foreground">{idea.startingCosts}</p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Ideal Customer Profiles
                </p>
                <div className="flex flex-wrap gap-2">
                  {splitCsv(idea.icp).map((item) => (
                    <span key={item} className="px-2.5 py-1 rounded-full text-xs bg-muted text-foreground">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Growth Tactics
                </p>
                <div className="flex flex-wrap gap-2">
                  {splitCsv(idea.growthTactics).map((item) => (
                    <span key={item} className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <footer className="shrink-0 pb-4">
          <div className="mb-2 flex flex-wrap gap-2">
            {promptSuggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Button>
            ))}
          </div>
          <PromptInput
            className="w-full bg-card"
            value={promptValue}
            onValueChange={setPromptValue}
            isLoading={isSubmitting}
            onSubmit={handleSubmit}
          >
            <PromptInputTextarea placeholder={`Ask about "${idea.idea}"...`} />
            <PromptInputActions className="justify-end pt-2">
              <PromptInputAction tooltip={isSubmitting ? "Stop generation" : "Send message"}>
                <Button variant="default" size="icon" className="h-8 w-8 rounded-full" onClick={handleSubmit}>
                  {isSubmitting ? (
                    <Square className="size-4 fill-current" />
                  ) : (
                    <ArrowUp className="size-4" />
                  )}
                </Button>
              </PromptInputAction>
            </PromptInputActions>
          </PromptInput>
        </footer>
      </div>
    </main>
  );
}

function ExplorePageFallback() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-5 md:px-6">
        <Skeleton className="mb-6 h-12 w-full animate-shimmer rounded-lg" />
        <div className="space-y-5">
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 animate-shimmer rounded-full" />
            <Skeleton className="h-24 w-full animate-shimmer rounded-lg" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<ExplorePageFallback />}>
      <ExplorePageInner />
    </Suspense>
  );
}
