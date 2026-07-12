import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  parseOptions,
  parseCorrectAnswer,
  parseResponse,
} from "@/lib/exam/types";
import { formatDuration, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AIExplain } from "@/components/exam/ai-explain";

export const metadata = { title: "Results" };

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const user = await requireUser();

  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: {
      paper: {
        include: {
          exam: true,
          questions: {
            orderBy: { order: "asc" },
            include: { question: { include: { subject: true } } },
          },
        },
      },
      answers: true,
    },
  });

  if (!attempt) notFound();
  if (attempt.status !== "SUBMITTED") redirect(`/test/${attempt.id}`);

  const answerByQ = new Map(attempt.answers.map((a) => [a.questionId, a]));

  // Subject-wise breakdown.
  const bySubject = new Map<
    string,
    { correct: number; incorrect: number; unattempted: number; time: number }
  >();
  for (const pq of attempt.paper.questions) {
    const subj = pq.question.subject.name;
    const row =
      bySubject.get(subj) ??
      { correct: 0, incorrect: 0, unattempted: 0, time: 0 };
    const ans = answerByQ.get(pq.question.id);
    if (!ans || ans.isCorrect === null) row.unattempted++;
    else if (ans.isCorrect) row.correct++;
    else row.incorrect++;
    row.time += ans?.timeSpentMs ?? 0;
    bySubject.set(subj, row);
  }

  const totalQ = attempt.paper.questions.length;
  const accuracy =
    (attempt.correct ?? 0) + (attempt.incorrect ?? 0) > 0
      ? ((attempt.correct ?? 0) /
          ((attempt.correct ?? 0) + (attempt.incorrect ?? 0))) *
        100
      : 0;
  const totalTime = attempt.answers.reduce((s, a) => s + a.timeSpentMs, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary" className="mb-2">
            {attempt.paper.exam.name}
          </Badge>
          <h1 className="text-2xl font-bold tracking-tight">
            {attempt.paper.title}
          </h1>
          <p className="text-muted-foreground">Your result & solutions</p>
        </div>
        <div className="flex gap-2">
          <Link href="/papers">
            <Button variant="outline">More papers</Button>
          </Link>
          <Link href="/history">
            <Button variant="outline">History</Button>
          </Link>
        </div>
      </div>

      {/* Score summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Score</p>
            <p className="text-3xl font-bold">
              {attempt.score?.toFixed(0)}
              <span className="text-lg font-medium text-muted-foreground">
                {" "}
                / {attempt.maxScore?.toFixed(0)}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Accuracy</p>
            <p className="text-3xl font-bold">{accuracy.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex flex-col text-sm">
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="size-4" /> {attempt.correct} correct
              </span>
              <span className="inline-flex items-center gap-1 text-destructive">
                <XCircle className="size-4" /> {attempt.incorrect} wrong
              </span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MinusCircle className="size-4" /> {attempt.unattempted} skipped
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total time</p>
            <p className="text-3xl font-bold">{formatDuration(totalTime)}</p>
            <p className="text-xs text-muted-foreground">{totalQ} questions</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject breakdown */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subject-wise performance</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Subject</th>
                <th className="px-4 py-2 font-medium">Correct</th>
                <th className="px-4 py-2 font-medium">Wrong</th>
                <th className="px-4 py-2 font-medium">Skipped</th>
                <th className="px-4 py-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...bySubject.entries()].map(([subject, r]) => (
                <tr key={subject}>
                  <td className="px-4 py-2 font-medium">{subject}</td>
                  <td className="px-4 py-2 text-success">{r.correct}</td>
                  <td className="px-4 py-2 text-destructive">{r.incorrect}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {r.unattempted}
                  </td>
                  <td className="px-4 py-2">{formatDuration(r.time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Question review */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Review & solutions</h2>
        <div className="space-y-4">
          {attempt.paper.questions.map((pq, i) => {
            const q = pq.question;
            const ans = answerByQ.get(q.id);
            const options = parseOptions(q.options);
            const correct = parseCorrectAnswer(q.type, q.answer);
            const response = parseResponse(q.type, ans?.response ?? null);
            const state =
              !ans || ans.isCorrect === null
                ? "skipped"
                : ans.isCorrect
                  ? "correct"
                  : "wrong";

            return (
              <Card key={q.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">
                      <span className="text-muted-foreground">Q{i + 1}.</span>{" "}
                      {q.stem}
                    </p>
                    <Badge
                      variant={
                        state === "correct"
                          ? "success"
                          : state === "wrong"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {state === "correct"
                        ? `+${ans?.marksAwarded}`
                        : state === "wrong"
                          ? `${ans?.marksAwarded}`
                          : "0"}
                    </Badge>
                  </div>

                  {q.type !== "NUMERICAL" ? (
                    <div className="space-y-2">
                      {options.map((opt) => {
                        const isCorrect = correct.kind === "mcq" && correct.keys.includes(opt.key);
                        const isChosen =
                          response.kind === "mcq" &&
                          response.keys.includes(opt.key);
                        return (
                          <div
                            key={opt.key}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border p-2.5 text-sm",
                              isCorrect
                                ? "border-success/50 bg-success/10"
                                : isChosen
                                  ? "border-destructive/50 bg-destructive/10"
                                  : "border-border"
                            )}
                          >
                            <span className="flex size-6 items-center justify-center rounded-full border border-border text-xs font-semibold">
                              {opt.key}
                            </span>
                            <span>{opt.text}</span>
                            {isCorrect && (
                              <CheckCircle2 className="ml-auto size-4 text-success" />
                            )}
                            {isChosen && !isCorrect && (
                              <XCircle className="ml-auto size-4 text-destructive" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span>
                        Your answer:{" "}
                        <strong>
                          {response.kind === "numerical" &&
                          response.value !== null
                            ? response.value
                            : "—"}
                        </strong>
                      </span>
                      <span className="text-success">
                        Correct:{" "}
                        <strong>
                          {correct.kind === "numerical" ? correct.value : ""}
                        </strong>
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Time spent: {formatDuration(ans?.timeSpentMs ?? 0)}</span>
                  </div>

                  <AIExplain questionId={q.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
