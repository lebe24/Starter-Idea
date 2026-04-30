"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddIdeaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface IdeaFormState {
  idea: string;
  monthlyRevenue: string;
  monthlyTraffic: string;
  revenuePerVisitor: string;
  startingCosts: string;
  solopreneurScore: string;
  icp: string;
  growthTactics: string;
  validationReason: string;
}

const initialState: IdeaFormState = {
  idea: "",
  monthlyRevenue: "",
  monthlyTraffic: "",
  revenuePerVisitor: "",
  startingCosts: "",
  solopreneurScore: "",
  icp: "",
  growthTactics: "",
  validationReason: "",
};

type ValidationResponse = {
  isValid: boolean;
  score: number;
  summary: string;
  suggestions: string[];
};

export function AddIdeaModal({ open, onOpenChange }: AddIdeaModalProps) {
  const [form, setForm] = useState<IdeaFormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const canSubmit = useMemo(
    () =>
      form.idea.trim() &&
      form.monthlyRevenue.trim() &&
      form.startingCosts.trim() &&
      form.solopreneurScore.trim() &&
      form.icp.trim() &&
      form.growthTactics.trim() &&
      form.validationReason.trim(),
    [form],
  );

  const update =
    (key: keyof IdeaFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    };

  const resetState = () => {
    setForm(initialState);
    setResult(null);
    setError(null);
    setSaved(null);
  };

  const handleValidateAndAdd = async () => {
    setError(null);
    setSaved(null);
    setResult(null);
    setIsSubmitting(true);
    try {
      const validateResponse = await fetch("/api/ideas/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const validation = (await validateResponse.json()) as ValidationResponse & { error?: string };
      if (!validateResponse.ok) {
        throw new Error(validation.error ?? "Validation failed.");
      }
      setResult(validation);

      if (!validation.isValid) {
        setError("AI validation failed. Please update your idea and try again.");
        return;
      }

      const saveResponse = await fetch("/api/ideas/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          aiValidation: validation,
        }),
      });
      const savePayload = (await saveResponse.json()) as { error?: string; message?: string };
      if (!saveResponse.ok) {
        throw new Error(savePayload.error ?? "Failed to add idea to database.");
      }

      setSaved(savePayload.message ?? "Idea saved to spreadsheet.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit idea.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetState();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Your Idea</DialogTitle>
          <DialogDescription>
            Fill the spreadsheet columns, add why your idea is valid, then run AI validation before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Idea name" value={form.idea} onChange={update("idea")} />
          <Input placeholder="Monthly Revenue (e.g. $12K)" value={form.monthlyRevenue} onChange={update("monthlyRevenue")} />
          <Input placeholder="Monthly Traffic (e.g. 45K)" value={form.monthlyTraffic} onChange={update("monthlyTraffic")} />
          <Input placeholder="Revenue Per Visitor (e.g. $0.25)" value={form.revenuePerVisitor} onChange={update("revenuePerVisitor")} />
          <Input placeholder="Starting Costs (e.g. $0, $1K)" value={form.startingCosts} onChange={update("startingCosts")} />
          <Input placeholder="Solopreneur Score (0-100)" value={form.solopreneurScore} onChange={update("solopreneurScore")} />
          <Input className="md:col-span-2" placeholder="ICP (comma-separated)" value={form.icp} onChange={update("icp")} />
          <Input className="md:col-span-2" placeholder="Growth Tactics (comma-separated)" value={form.growthTactics} onChange={update("growthTactics")} />
          <Textarea
            className="md:col-span-2 min-h-24"
            placeholder="Why is this idea valid? (market gap, demand proof, user pain point)"
            value={form.validationReason}
            onChange={update("validationReason")}
          />
        </div>

        {result ? (
          <div className={`rounded-lg border p-3 text-sm ${result.isValid ? "border-success/30 bg-success/10" : "border-warning/30 bg-warning/10"}`}>
            <p className="font-medium">
              AI score: {result.score}/100 — {result.isValid ? "Valid idea" : "Needs work"}
            </p>
            <p className="text-muted-foreground mt-1">{result.summary}</p>
            {result.suggestions.length > 0 ? (
              <p className="text-muted-foreground mt-1">Suggestions: {result.suggestions.join(" • ")}</p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {saved ? <p className="text-sm text-success">{saved}</p> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleValidateAndAdd} disabled={!canSubmit || isSubmitting} className="gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Validate & Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
