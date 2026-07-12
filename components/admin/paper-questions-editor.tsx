"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Check } from "lucide-react";
import { setPaperQuestions } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EditorQuestion {
  id: string;
  stem: string;
  subject: string;
}

export function PaperQuestionsEditor({
  paperId,
  available,
  initialSelected,
}: {
  paperId: string;
  available: EditorQuestion[];
  initialSelected: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const byId = useMemo(
    () => new Map(available.map((q) => [q.id, q])),
    [available]
  );

  const toggle = (id: string) => {
    setSaved(false);
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const move = (index: number, dir: -1 | 1) => {
    setSaved(false);
    setSelected((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = () => {
    startTransition(async () => {
      const res = await setPaperQuestions(paperId, selected);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      }
    });
  };

  const unselected = available.filter((q) => !selected.includes(q.id));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Selected / ordered */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            In this paper ({selected.length})
          </h3>
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : saved ? (
              <>
                <Check className="size-4" /> Saved
              </>
            ) : (
              "Save order"
            )}
          </Button>
        </div>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No questions yet — add some from the right.
          </p>
        ) : (
          <ol className="space-y-2">
            {selected.map((id, i) => {
              const q = byId.get(id);
              if (!q) return null;
              return (
                <li
                  key={id}
                  className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm"
                >
                  <span className="mt-0.5 w-5 text-muted-foreground">
                    {i + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2">{q.stem}</p>
                    <span className="text-xs text-muted-foreground">
                      {q.subject}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="size-4" />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === selected.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="size-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggle(id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Available */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          Available questions ({unselected.length})
        </h3>
        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {unselected.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All questions for this exam are added.
            </p>
          ) : (
            unselected.map((q) => (
              <button
                key={q.id}
                onClick={() => toggle(q.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-lg border border-border bg-card p-3 text-left text-sm hover:border-primary hover:bg-accent/40"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2">{q.stem}</p>
                  <span className="text-xs text-muted-foreground">
                    {q.subject}
                  </span>
                </div>
                <span className="text-xs font-medium text-primary">Add</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
