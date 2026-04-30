import type { IdeaRecord } from "@/lib/ideas-data";

export function findRelatedIdea(repoText: string, ideas: IdeaRecord[]): IdeaRecord | null {
  const lower = repoText.toLowerCase();
  return (
    ideas.find((idea) => {
      const ideaWords = idea.idea
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 4);

      if (ideaWords.some((word) => lower.includes(word))) return true;

      const icpMatch = idea.icpList.some((tag) => {
        const firstWord = tag.toLowerCase().split(/\s+/)[0];
        return firstWord.length > 2 && lower.includes(firstWord);
      });
      if (icpMatch) return true;

      const tacticMatch = idea.tacticsList.some((tactic) => {
        const firstWord = tactic.toLowerCase().split(/\s+/)[0];
        return firstWord.length > 3 && lower.includes(firstWord);
      });
      return tacticMatch;
    }) ?? null
  );
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function languageColor(lang: string | null): string {
  const map: Record<string, string> = {
    TypeScript: "text-blue-400",
    JavaScript: "text-yellow-400",
    Python: "text-yellow-300",
    Go: "text-cyan-400",
    Rust: "text-orange-500",
    Ruby: "text-red-400",
    Java: "text-orange-400",
    "C#": "text-purple-400",
    PHP: "text-indigo-400",
    Swift: "text-orange-300",
    Kotlin: "text-purple-300",
    Dart: "text-blue-300",
  };
  return lang ? (map[lang] ?? "text-muted-foreground") : "text-muted-foreground";
}

export function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}
