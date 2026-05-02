"use client";

import { useState } from "react";
import type { Section } from "@/lib/dashboard-section";
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
      <header className="flex h-[4.25rem] shrink-0 items-center justify-between border-b border-border/80 bg-background/80 px-8 backdrop-blur-[6px]">
        <div className="min-w-0 border-l-2 border-accent pl-4">
          <h1 className="font-serif text-xl font-normal tracking-tight text-foreground md:text-2xl">
            {config.title}
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {config.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Last updated</span>
          </Button>

          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <button
            type="button"
            className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Alerts"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
          </button>

          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-border/90 bg-background hover:bg-muted/50"
            onClick={() => setIsAddIdeaOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Add idea</span>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div key={activeSection} className="animate-fade-in">
          {renderContent()}
        </div>
      </main>
      <AddIdeaModal open={isAddIdeaOpen} onOpenChange={setIsAddIdeaOpen} />
    </div>
  );
}
