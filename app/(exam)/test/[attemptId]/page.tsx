import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseOptions } from "@/lib/exam/types";
import type {
  PlayerInitialAnswer,
  PlayerQuestion,
} from "@/lib/exam/player";
import { ExamPlayer } from "@/components/exam/exam-player";

export const metadata = { title: "Test in progress" };

export default async function TestPage({
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
  if (attempt.status === "SUBMITTED") redirect(`/results/${attempt.id}`);

  const questions: PlayerQuestion[] = attempt.paper.questions.map((pq) => ({
    id: pq.question.id,
    order: pq.order,
    section: pq.section,
    subject: pq.question.subject.name,
    type: pq.question.type,
    stem: pq.question.stem,
    options: parseOptions(pq.question.options),
    marks: pq.question.marks,
    negativeMarks: pq.question.negativeMarks,
  }));

  const initialAnswers: PlayerInitialAnswer[] = attempt.answers.map((a) => ({
    questionId: a.questionId,
    response: a.response,
    timeSpentMs: a.timeSpentMs,
    markedForReview: a.markedForReview,
  }));

  // Seconds remaining based on server-side start time.
  const elapsedMs = Date.now() - attempt.startedAt.getTime();
  const totalMs = attempt.paper.durationMins * 60 * 1000;
  const remainingSeconds = Math.max(0, Math.floor((totalMs - elapsedMs) / 1000));

  return (
    <ExamPlayer
      attemptId={attempt.id}
      paperTitle={attempt.paper.title}
      examName={attempt.paper.exam.name}
      questions={questions}
      initialAnswers={initialAnswers}
      remainingSeconds={remainingSeconds}
    />
  );
}
