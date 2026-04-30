"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { MainContent } from "@/components/dashboard/main-content";
import { RightPanel } from "@/components/dashboard/right-panel";
import { defaultIdeaFilters, type IdeaFilters } from "@/lib/ideas-data";
import type { ChatMessage } from "@/lib/chat-types";

export type Section =
  | "overview"
  | "incidents"
  | "deployments"
  | "performance"
  | "errors"
  | "sla"
  | "oncall"
  | "ideas"
  | "chat"
  | "postmortems"
  | "settings";

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [ideaFilters, setIdeaFilters] = useState<IdeaFilters>(defaultIdeaFilters);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (activeSection === "chat") {
      setIsRightPanelOpen(false);
    }
  }, [activeSection]);

  const handleAskAIAboutIdea = (ideaName: string) => {
    setChatHistory([]);
    setInitialPrompt(
      `Tell me everything about the "${ideaName}" opportunity — the market, real competitors, what I'd actually need to build, and how I'd get first customers.`,
    );
    setActiveSection("chat");
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isRightPanelOpen={isRightPanelOpen}
        onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)}
        hasActiveChat={chatHistory.length > 0}
      />

      <MainContent
        activeSection={activeSection}
        ideaFilters={ideaFilters}
        onIdeaFiltersChange={setIdeaFilters}
        chatHistory={chatHistory}
        onChatHistoryChange={setChatHistory}
        onSectionChange={setActiveSection}
        initialPrompt={initialPrompt}
        onInitialPromptConsumed={() => setInitialPrompt(null)}
        onAskAIAboutIdea={handleAskAIAboutIdea}
      />

      {isRightPanelOpen && (
        <RightPanel ideaFilters={ideaFilters} onIdeaFiltersChange={setIdeaFilters} />
      )}
    </div>
  );
}
