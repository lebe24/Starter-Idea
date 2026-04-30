import type { IdeaFilters, IdeaRecord } from "./ideas-data";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  feedback?: "up" | "down" | null;
  isError?: boolean;
  /** Session notice (e.g. history trimmed) — rendered muted, still sent to model as assistant text */
  isNotice?: boolean;
}

export interface ChatContext {
  ideaFilters: IdeaFilters;
  matchingIdeas: IdeaRecord[];
  totalIdeas: number;
  lastMentionedIdea: string | null;
}
