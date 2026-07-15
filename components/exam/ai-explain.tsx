"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import Markdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Button } from "@/components/ui/button";

/**
 * Normalize LLM markdown so it renders cleanly:
 * - strip a code fence wrapping the whole response (```markdown … ```)
 * - convert LaTeX \( … \) / \[ … \] delimiters into the $ … $ / $$ … $$
 *   forms that remark-math understands (Gemini emits the backslash form).
 */
function normalizeLLMMarkdown(raw: string): string {
  let s = raw.trim();
  const fenced = s.match(/^```[a-zA-Z]*\n([\s\S]*?)\n```$/);
  if (fenced) s = fenced[1];
  return s
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`);
}

/** Renders the AI explanation as Markdown with KaTeX math support. */
function Explanation({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed [&_.katex]:text-[1.05em]">
      <Markdown
        remarkPlugins={[remarkMath]}
        // throwOnError:false keeps partial/malformed LaTeX from crashing mid-stream.
        rehypePlugins={[[rehypeKatex, { throwOnError: false }]]}
        components={{
          p: (props) => <p className="mb-2 last:mb-0" {...props} />,
          strong: (props) => <strong className="font-semibold" {...props} />,
          ul: (props) => (
            <ul className="mb-2 list-disc space-y-1 pl-5" {...props} />
          ),
          ol: (props) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5" {...props} />
          ),
          li: (props) => <li className="leading-relaxed" {...props} />,
          h1: (props) => <p className="font-semibold" {...props} />,
          h2: (props) => <p className="font-semibold" {...props} />,
          h3: (props) => <p className="font-semibold" {...props} />,
          code: (props) => (
            <code
              className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
              {...props}
            />
          ),
          em: (props) => <em className="text-muted-foreground" {...props} />,
        }}
      >
        {normalizeLLMMarkdown(text)}
      </Markdown>
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
        <Explanation text={text} />
      ) : (
        <p className="text-sm text-muted-foreground">Thinking…</p>
      )}
    </div>
  );
}
