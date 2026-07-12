"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import type {
  PlayerInitialAnswer,
  PlayerQuestion,
  QuestionStatus,
} from "@/lib/exam/player";
import { saveProgress, submitAttempt, type AnswerPayload } from "@/lib/actions/attempts";
import { track } from "@/lib/analytics/client";
import { formatClock, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LocalAnswer {
  keys: string[];
  numeric: string;
  timeSpentMs: number;
  markedForReview: boolean;
  visited: boolean;
}

function buildInitial(
  questions: PlayerQuestion[],
  initial: PlayerInitialAnswer[]
): Record<string, LocalAnswer> {
  const byId = new Map(initial.map((a) => [a.questionId, a]));
  const out: Record<string, LocalAnswer> = {};
  for (const q of questions) {
    const prior = byId.get(q.id);
    const resp = prior?.response as
      | { kind?: string; keys?: string[]; value?: number | null }
      | null
      | undefined;
    out[q.id] = {
      keys: Array.isArray(resp?.keys) ? (resp!.keys as string[]) : [],
      numeric:
        resp?.kind === "numerical" && typeof resp.value === "number"
          ? String(resp.value)
          : "",
      timeSpentMs: prior?.timeSpentMs ?? 0,
      markedForReview: prior?.markedForReview ?? false,
      visited: !!prior,
    };
  }
  return out;
}

function toResponse(q: PlayerQuestion, a: LocalAnswer): unknown {
  if (q.type === "NUMERICAL") {
    const value = a.numeric.trim() === "" ? null : Number(a.numeric);
    return { kind: "numerical", value: Number.isFinite(value) ? value : null };
  }
  return { kind: "mcq", keys: a.keys };
}

function statusOf(a: LocalAnswer | undefined): QuestionStatus {
  if (!a || !a.visited) return "not-visited";
  const answered = a.keys.length > 0 || a.numeric.trim() !== "";
  if (a.markedForReview) return answered ? "answered-marked" : "marked";
  return answered ? "answered" : "not-answered";
}

const statusStyles: Record<QuestionStatus, string> = {
  "not-visited": "bg-card border-border text-muted-foreground",
  "not-answered": "bg-destructive/15 border-destructive/40 text-destructive",
  answered: "bg-success/20 border-success/50 text-success",
  marked: "bg-warning/25 border-warning/60 text-warning-foreground",
  "answered-marked": "bg-primary/20 border-primary/50 text-primary",
};

export function ExamPlayer({
  attemptId,
  paperTitle,
  examName,
  questions,
  initialAnswers,
  remainingSeconds,
}: {
  attemptId: string;
  paperTitle: string;
  examName: string;
  questions: PlayerQuestion[];
  initialAnswers: PlayerInitialAnswer[];
  remainingSeconds: number;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LocalAnswer>>(() =>
    buildInitial(questions, initialAnswers)
  );
  const [secondsLeft, setSecondsLeft] = useState(remainingSeconds);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const current = questions[index];

  // Refs to read latest state inside timers / unload handlers.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const activeSince = useRef<number>(Date.now());
  const activeQuestionId = useRef<string>(current?.id ?? "");
  const submittedRef = useRef(false);

  // Accumulate elapsed time onto the currently-active question.
  const commitTime = useCallback(() => {
    const now = Date.now();
    const delta = now - activeSince.current;
    activeSince.current = now;
    const qid = activeQuestionId.current;
    if (!qid || delta <= 0) return delta;
    setAnswers((prev) => ({
      ...prev,
      [qid]: {
        ...prev[qid],
        timeSpentMs: (prev[qid]?.timeSpentMs ?? 0) + delta,
      },
    }));
    return delta;
  }, []);

  const buildPayload = useCallback((): AnswerPayload[] => {
    return questions.map((q) => {
      const a = answersRef.current[q.id];
      return {
        questionId: q.id,
        response: a ? toResponse(q, a) : null,
        timeSpentMs: a?.timeSpentMs ?? 0,
        markedForReview: a?.markedForReview ?? false,
      };
    });
  }, [questions]);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    commitTime();
    const result = await submitAttempt(attemptId, buildPayload());
    if (result.ok && result.attemptId) {
      router.push(`/results/${result.attemptId}`);
    } else {
      submittedRef.current = false;
      setSubmitting(false);
      alert(result.error ?? "Could not submit. Please try again.");
    }
  }, [attemptId, buildPayload, commitTime, router]);

  // Countdown timer with auto-submit at zero.
  useEffect(() => {
    if (secondsLeft <= 0) {
      void doSubmit();
      return;
    }
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          void doSubmit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark first question visited on mount.
  useEffect(() => {
    if (current) {
      setAnswers((prev) => ({
        ...prev,
        [current.id]: { ...prev[current.id], visited: true },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave + flush time when the tab is hidden or closed.
  useEffect(() => {
    const flush = () => {
      if (submittedRef.current) return;
      commitTime();
      const qid = activeQuestionId.current;
      if (qid) {
        track({
          type: "QUESTION_VIEW",
          entityType: "question",
          entityId: qid,
          durationMs: answersRef.current[qid]?.timeSpentMs ?? 0,
        });
      }
      void saveProgress(attemptId, buildPayload());
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", onBeforeUnload);
    const periodic = setInterval(() => {
      if (!submittedRef.current) {
        commitTime();
        void saveProgress(attemptId, buildPayload());
      }
    }, 30000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearInterval(periodic);
    };
  }, [attemptId, buildPayload, commitTime]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= questions.length) return;
      // Commit time and emit a QUESTION_VIEW for the question being left.
      const delta = commitTime();
      const leavingId = activeQuestionId.current;
      if (leavingId && delta > 0) {
        track({
          type: "QUESTION_VIEW",
          entityType: "question",
          entityId: leavingId,
          durationMs: delta,
        });
      }
      const nextId = questions[nextIndex].id;
      activeQuestionId.current = nextId;
      activeSince.current = Date.now();
      setIndex(nextIndex);
      setAnswers((prev) => ({
        ...prev,
        [nextId]: { ...prev[nextId], visited: true },
      }));
    },
    [commitTime, questions]
  );

  const updateCurrent = (patch: Partial<LocalAnswer>) => {
    setAnswers((prev) => ({
      ...prev,
      [current.id]: { ...prev[current.id], ...patch, visited: true },
    }));
  };

  const toggleOption = (key: string) => {
    const a = answers[current.id];
    if (current.type === "MCQ_MULTI") {
      const has = a.keys.includes(key);
      updateCurrent({
        keys: has ? a.keys.filter((k) => k !== key) : [...a.keys, key],
      });
    } else {
      updateCurrent({ keys: [key] });
    }
  };

  const counts = useMemo(() => {
    let answered = 0,
      marked = 0,
      notAnswered = 0;
    for (const q of questions) {
      const s = statusOf(answers[q.id]);
      if (s === "answered" || s === "answered-marked") answered++;
      if (s === "marked" || s === "answered-marked") marked++;
      if (s === "not-answered") notAnswered++;
    }
    return { answered, marked, notAnswered };
  }, [answers, questions]);

  if (!current) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">This paper has no questions.</p>
      </div>
    );
  }

  const a = answers[current.id];
  const lowTime = secondsLeft <= 60;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{paperTitle}</p>
            <p className="text-xs text-muted-foreground">{examName}</p>
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-lg font-semibold tabular-nums",
              lowTime
                ? "border-destructive/50 bg-destructive/10 text-destructive"
                : "border-border bg-card"
            )}
          >
            <Clock className="size-4" />
            {formatClock(secondsLeft)}
          </div>
          <Button onClick={() => setShowConfirm(true)} disabled={submitting}>
            Submit test
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        {/* Question */}
        <div className="flex-1">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Question {index + 1} of {questions.length}
                {current.section ? ` · ${current.section}` : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                +{current.marks} / −{current.negativeMarks}
              </span>
            </div>

            <p className="whitespace-pre-wrap text-base leading-relaxed">
              {current.stem}
            </p>

            <div className="mt-6 space-y-3">
              {current.type === "NUMERICAL" ? (
                <input
                  type="number"
                  inputMode="decimal"
                  value={a.numeric}
                  onChange={(e) => updateCurrent({ numeric: e.target.value })}
                  placeholder="Enter your answer"
                  className="h-11 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                current.options.map((opt) => {
                  const selected = a.keys.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      onClick={() => toggleOption(opt.key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-accent/50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border"
                        )}
                      >
                        {opt.key}
                      </span>
                      <span>{opt.text}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Action bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
              >
                <ChevronLeft className="size-4" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateCurrent({ keys: [], numeric: "" })
                }
              >
                Clear
              </Button>
              <Button
                variant={a.markedForReview ? "secondary" : "outline"}
                size="sm"
                onClick={() =>
                  updateCurrent({ markedForReview: !a.markedForReview })
                }
              >
                <Flag className="size-4" />
                {a.markedForReview ? "Unmark" : "Mark for review"}
              </Button>
            </div>
            <Button
              size="sm"
              onClick={() => goTo(index + 1)}
              disabled={index === questions.length - 1}
            >
              Save &amp; Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Palette */}
        <aside className="lg:w-72">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
              <Legend swatch="bg-success/60" label={`Answered ${counts.answered}`} />
              <Legend swatch="bg-warning/70" label={`Marked ${counts.marked}`} />
              <Legend
                swatch="bg-destructive/50"
                label={`Skipped ${counts.notAnswered}`}
              />
            </div>
            <div className="grid grid-cols-6 gap-2 lg:grid-cols-5">
              {questions.map((q, i) => {
                const s = statusOf(answers[q.id]);
                return (
                  <button
                    key={q.id}
                    onClick={() => goTo(i)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md border text-sm font-medium transition-transform hover:scale-105",
                      statusStyles[s],
                      i === index && "ring-2 ring-ring ring-offset-1 ring-offset-card"
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Submit confirmation */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="size-5 text-warning-foreground" />
              <h2 className="text-lg font-semibold">Submit test?</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              You answered <strong>{counts.answered}</strong> of{" "}
              {questions.length} questions.{" "}
              {counts.marked > 0 && (
                <>
                  <strong>{counts.marked}</strong> marked for review.{" "}
                </>
              )}
              This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
              >
                Keep going
              </Button>
              <Button onClick={doSubmit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit now"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className={cn("size-3 rounded-sm", swatch)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
