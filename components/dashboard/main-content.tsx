"use client";

import { useState } from "react";
import type { Section } from "@/app/page";
import type { IdeaFilters } from "@/lib/ideas-data";
import type { ChatMessage } from "@/lib/chat-types";
import { OverviewContent } from "./content/overview-content";
import { IncidentsContent } from "./content/incidents-content";
import { DeploymentsContent } from "./content/deployments-content";
import { PerformanceContent } from "./content/performance-content";
import { ErrorsContent } from "./content/errors-content";
import { SlaContent } from "./content/sla-content";
import { OncallContent } from "./content/oncall-content";
import { ServicesContent } from "./content/services-content";
import { PostmortemsContent } from "./content/postmortems-content";
import { SettingsContent } from "./content/settings-content";
import { IdeaChatContent } from "./content/IdeaChatContent";
import { Bell, Calendar, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddIdeaModal } from "./add-idea-modal";

interface MainContentProps {
  activeSection: Section;
  ideaFilters: IdeaFilters;
  onIdeaFiltersChange: (next: IdeaFilters) => void;
  chatHistory: ChatMessage[];
  onChatHistoryChange: (history: ChatMessage[]) => void;
  onSectionChange: (section: Section) => void;
  initialPrompt: string | null;
  onInitialPromptConsumed: () => void;
  onAskAIAboutIdea: (ideaName: string) => void;
}

const sectionConfig: Record<Section, { title: string; subtitle: string }> = {
  overview: {
    title: "Saas Overview",
    subtitle: "Real-time Metrics",
  },
  incidents: {
    title: "Incidents",
    subtitle: "Active & Recent Incidents",
  },
  deployments: {
    title: "Deployments",
    subtitle: "Release Pipeline & History",
  },
  performance: {
    title: "Performance",
    subtitle: "System Latency & Throughput",
  },
  errors: {
    title: "Error Tracking",
    subtitle: "Exceptions & Error Rates",
  },
  sla: {
    title: "SLA & Uptime",
    subtitle: "Service Level Monitoring",
  },
  oncall: {
    title: "On-Call",
    subtitle: "Schedule & Response Metrics",
  },
  ideas: {
    title: "Ideas",
    subtitle: "Micro-SaaS Ideas Database",
  },
  postmortems: {
    title: "Postmortems",
    subtitle: "Incident Reports & Learnings",
  },
  settings: {
    title: "Settings",
    subtitle: "Configuration & Integrations",
  },
  chat: {
    title: "Chat with AI",
    subtitle: "Micro-SaaS ideas chat",
  },
};

export function MainContent({
  activeSection,
  ideaFilters,
  onIdeaFiltersChange,
  chatHistory,
  onChatHistoryChange,
  onSectionChange,
  initialPrompt,
  onInitialPromptConsumed,
  onAskAIAboutIdea,
}: MainContentProps) {
  const config = sectionConfig[activeSection];
  const [isAddIdeaOpen, setIsAddIdeaOpen] = useState(false);

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return (
          <OverviewContent
            onSectionChange={onSectionChange}
            ideaFilters={ideaFilters}
            onIdeaFiltersChange={onIdeaFiltersChange}
          />
        );
      case "incidents":
        return <IncidentsContent />;
      case "deployments":
        return <DeploymentsContent />;
      case "performance":
        return <PerformanceContent />;
      case "errors":
        return <ErrorsContent />;
      case "sla":
        return <SlaContent />;
      case "oncall":
        return <OncallContent />;
      case "ideas":
        return <ServicesContent ideaFilters={ideaFilters} />;
      case "chat":
        return (
          <IdeaChatContent
            ideaFilters={ideaFilters}
            chatHistory={chatHistory}
            onChatHistoryChange={onChatHistoryChange}
            onSectionChange={onSectionChange}
            initialPrompt={initialPrompt}
            onInitialPromptConsumed={onInitialPromptConsumed}
          />
        );
      case "postmortems":
        return <PostmortemsContent />;
      case "settings":
        return <SettingsContent />;
      default:
        return (
          <OverviewContent
            onSectionChange={onSectionChange}
            ideaFilters={ideaFilters}
            onIdeaFiltersChange={onIdeaFiltersChange}
          />
        );
    }
  };

  if (activeSection === "chat") {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div key={activeSection} className="animate-fade-in flex min-h-0 flex-1 flex-col">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            {config.title}
          </h1>
          <p className="text-sm text-muted-foreground">{config.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range */}
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Calendar className="w-4 h-4" />
            <span>Last updated</span>
          </Button>

          {/* Refresh */}
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>

          {/* Alerts */}
          <button
            type="button"
            className="relative p-2 rounded-xl hover:bg-muted transition-colors"
            aria-label="Alerts"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
          </button>

          {/* Primary Action */}
          <Button
            size="sm"
            className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
            onClick={() => setIsAddIdeaOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Add Your Idea</span>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <div key={activeSection} className="animate-fade-in">
          {renderContent()}
        </div>
      </main>
      <AddIdeaModal open={isAddIdeaOpen} onOpenChange={setIsAddIdeaOpen} />
    </div>
  );
}
