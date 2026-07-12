"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Renders text with minimal **bold** and newline support (no MD dependency). */
function RichText({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

export function AIExplain({ questionId }: { questionId: string }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function explain() {
    setStarted(true);
    setLoading(true);
    setError(null);
    setText("");
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setText(acc);
      }
    } catch {
      setError("Couldn't generate an explanation. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!started) {
    return (
      <Button variant="outline" size="sm" onClick={explain}>
        <Sparkles className="size-4" /> Explain with AI
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="size-4" /> AI explanation
        {loading && <Loader2 className="size-3.5 animate-spin" />}
      </div>
      {error ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={explain}>
            Retry
          </Button>
        </div>
      ) : text ? (
        <RichText text={text} />
      ) : (
        <p className="text-sm text-muted-foreground">Thinking…</p>
      )}
    </div>
  );
}
