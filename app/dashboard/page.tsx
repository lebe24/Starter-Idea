"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardMobileBottomNav } from "@/components/dashboard/dashboard-mobile-bottom-nav";
import { MainContent } from "@/components/dashboard/main-content";
import { RightPanel } from "@/components/dashboard/right-panel";
import { defaultIdeaFilters, type IdeaFilters } from "@/lib/ideas-data";
import type { Section } from "@/lib/dashboard-section";
import type { ChatMessage } from "@/lib/chat-types";

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

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setIsRightPanelOpen(false);
    }
  }, []);

  const handleAskAIAboutIdea = (ideaName: string) => {
    setChatHistory([]);
    setInitialPrompt(
      `Tell me everything about the "${ideaName}" opportunity — the market, real competitors, what I'd actually need to build, and how I'd get first customers.`,
    );
    setActiveSection("chat");
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_55%_42%_at_0%_0%,oklch(0.92_0.04_85/0.18),transparent_62%),radial-gradient(ellipse_48%_38%_at_100%_100%,oklch(0.88_0.06_250/0.1),transparent_58%)]"
      />
      {isRightPanelOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close idea filters"
          onClick={() => setIsRightPanelOpen(false)}
        />
      ) : null}
      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row">
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
          onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)}
          isRightPanelOpen={isRightPanelOpen}
        />

        {isRightPanelOpen ? (
          <RightPanel
            ideaFilters={ideaFilters}
            onIdeaFiltersChange={setIdeaFilters}
            onMobileClose={() => setIsRightPanelOpen(false)}
          />
        ) : null}

        <DashboardMobileBottomNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          hasActiveChat={chatHistory.length > 0}
        />
      </div>
    </div>
  );
}
