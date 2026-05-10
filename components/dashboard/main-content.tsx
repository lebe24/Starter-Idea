"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
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
import { Bell, Calendar, Github, Moon, Plus, RefreshCw, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardMobileHeader } from "@/components/dashboard/dashboard-mobile-header";
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
  onToggleRightPanel?: () => void;
  isRightPanelOpen?: boolean;
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
  onToggleRightPanel,
  isRightPanelOpen,
}: MainContentProps) {
  const config = sectionConfig[activeSection];
  const [isAddIdeaOpen, setIsAddIdeaOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  const isDark = theme === "dark";
  const toggleColorMode = () => setTheme(isDark ? "light" : "dark");

  const mobileToolbar = (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant="ghost"
        className="h-auto justify-start gap-2 py-3 text-muted-foreground hover:text-foreground"
        onClick={() => setMobileMenuOpen(false)}
      >
        <Calendar className="h-4 w-4 shrink-0" />
        Last updated
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-auto justify-start gap-2 py-3 text-muted-foreground hover:text-foreground"
        onClick={() => setMobileMenuOpen(false)}
      >
        <RefreshCw className="h-4 w-4 shrink-0" />
        Refresh
      </Button>
      <div className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-sm text-muted-foreground">
        <Bell className="h-4 w-4 shrink-0" />
        <span>Alerts</span>
        <span className="ml-auto h-2 w-2 rounded-full bg-destructive" aria-hidden />
      </div>
      <a
        href="https://github.com/lebe24/Starter-Idea"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        onClick={() => setMobileMenuOpen(false)}
      >
        <Github className="h-4 w-4 shrink-0" />
        GitHub repository
      </a>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-1 justify-start gap-2 border-border/90"
        onClick={() => {
          setIsAddIdeaOpen(true);
          setMobileMenuOpen(false);
        }}
      >
        <Plus className="h-4 w-4" />
        Add idea
      </Button>
      {onToggleRightPanel ? (
        <Button
          type="button"
          variant="secondary"
          className="justify-start"
          onClick={() => {
            onToggleRightPanel();
            setMobileMenuOpen(false);
          }}
        >
          {isRightPanelOpen ? "Hide idea filters" : "Show idea filters"}
        </Button>
      ) : null}

      <div className="mt-2 border-t border-border/80 pt-3">
        <div className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/50">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted/30">
            <span className="text-sm font-medium text-foreground">JD</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">John Doe</p>
            <p className="truncate text-xs text-muted-foreground">SRE Lead</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleColorMode();
            }}
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Toggle color theme"
            title="Toggle color theme"
          >
            {!themeReady ? (
              <Moon className="h-4 w-4 opacity-40" aria-hidden />
            ) : isDark ? (
              <Sun className="h-4 w-4" aria-hidden />
            ) : (
              <Moon className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </div>
    </div>
  );

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
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0",
        )}
      >
        <DashboardMobileHeader
          title={sectionConfig.chat.title}
          subtitle={sectionConfig.chat.subtitle}
          menuOpen={mobileMenuOpen}
          onMenuOpenChange={setMobileMenuOpen}
          menuContent={mobileToolbar}
        />
        <div key={activeSection} className="animate-fade-in flex min-h-0 flex-1 flex-col">
          {renderContent()}
        </div>
        <AddIdeaModal open={isAddIdeaOpen} onOpenChange={setIsAddIdeaOpen} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col overflow-hidden",
        "pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0",
      )}
    >
      <DashboardMobileHeader
        title={config.title}
        subtitle={config.subtitle}
        menuOpen={mobileMenuOpen}
        onMenuOpenChange={setMobileMenuOpen}
        menuContent={mobileToolbar}
      />

      {/* Header — desktop */}
      <header className="hidden h-[4.25rem] shrink-0 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-[6px] sm:px-8 lg:flex">
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

          <a
            href="https://github.com/lebe24/Starter-Idea"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="View Starter Idea on GitHub"
          >
            <Github className="h-5 w-5" />
          </a>

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
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div key={activeSection} className="animate-fade-in">
          {renderContent()}
        </div>
      </main>
      <AddIdeaModal open={isAddIdeaOpen} onOpenChange={setIsAddIdeaOpen} />
    </div>
  );
}
