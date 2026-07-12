"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { scoreAnswer } from "@/lib/exam/scoring";

export interface AnswerPayload {
  questionId: string;
  response: unknown;
  timeSpentMs: number;
  markedForReview: boolean;
}

/**
 * Start (or resume) an attempt for a paper, then navigate to the player.
 * If an in-progress attempt already exists for this user+paper, resume it.
 */
export async function startAttempt(formData: FormData) {
  const user = await requireUser();
  const paperId = String(formData.get("paperId") ?? "");
  if (!paperId) redirect("/papers");

  const paper = await prisma.paper.findUnique({ where: { id: paperId } });
  if (!paper || !paper.isPublished) redirect("/papers");

  const existing = await prisma.testAttempt.findFirst({
    where: { userId: user.id, paperId, status: "IN_PROGRESS" },
  });

  let attemptId: string;
  if (existing) {
    attemptId = existing.id;
  } else {
    const attempt = await prisma.testAttempt.create({
      data: { userId: user.id, paperId, status: "IN_PROGRESS" },
    });
    attemptId = attempt.id;
    await prisma.analyticsEvent
      .create({
        data: {
          userId: user.id,
          type: "EXAM_START",
          entityType: "paper",
          entityId: paperId,
        },
      })
      .catch(() => {});
  }

  redirect(`/test/${attemptId}`);
}

/** Persist in-progress answers without submitting (autosave / resume). */
export async function saveProgress(
  attemptId: string,
  answers: AnswerPayload[]
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId: user.id, status: "IN_PROGRESS" },
  });
  if (!attempt) return { ok: false };

  await Promise.all(
    answers.map((a) =>
      prisma.attemptAnswer.upsert({
        where: {
          attemptId_questionId: { attemptId, questionId: a.questionId },
        },
        create: {
          attemptId,
          questionId: a.questionId,
          response: (a.response ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          timeSpentMs: Math.max(0, Math.round(a.timeSpentMs)),
          markedForReview: a.markedForReview,
        },
        update: {
          response: (a.response ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          timeSpentMs: Math.max(0, Math.round(a.timeSpentMs)),
          markedForReview: a.markedForReview,
        },
      })
    )
  );

  return { ok: true };
}

/**
 * Score and finalize an attempt. Returns the attemptId so the client can
 * navigate to the results page. Scoring happens entirely server-side.
 */
export async function submitAttempt(
  attemptId: string,
  answers: AnswerPayload[]
): Promise<{ ok: boolean; attemptId?: string; error?: string }> {
  const user = await requireUser();

  const attempt = await prisma.testAttempt.findFirst({
    where: { id: attemptId, userId: user.id },
    include: {
      paper: {
        include: {
          questions: { include: { question: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });
  if (!attempt) return { ok: false, error: "Attempt not found" };
  if (attempt.status === "SUBMITTED") {
    return { ok: true, attemptId: attempt.id };
  }

  const responseByQuestion = new Map(answers.map((a) => [a.questionId, a]));

  let score = 0;
  let maxScore = 0;
  let correct = 0;
  let incorrect = 0;
  let unattempted = 0;

  const writes: Prisma.PrismaPromise<unknown>[] = [];

  for (const pq of attempt.paper.questions) {
    const q = pq.question;
    maxScore += q.marks;
    const payload = responseByQuestion.get(q.id);
    const scored = scoreAnswer(q, payload?.response ?? null);

    if (!scored.attempted) unattempted++;
    else if (scored.isCorrect) correct++;
    else incorrect++;

    score += scored.marksAwarded;

    writes.push(
      prisma.attemptAnswer.upsert({
        where: {
          attemptId_questionId: { attemptId, questionId: q.id },
        },
        create: {
          attemptId,
          questionId: q.id,
          response: (payload?.response ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          isCorrect: scored.attempted ? scored.isCorrect : null,
          marksAwarded: scored.marksAwarded,
          timeSpentMs: Math.max(0, Math.round(payload?.timeSpentMs ?? 0)),
          markedForReview: payload?.markedForReview ?? false,
        },
        update: {
          response: (payload?.response ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          isCorrect: scored.attempted ? scored.isCorrect : null,
          marksAwarded: scored.marksAwarded,
          timeSpentMs: Math.max(0, Math.round(payload?.timeSpentMs ?? 0)),
          markedForReview: payload?.markedForReview ?? false,
        },
      })
    );
  }

  writes.push(
    prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        score,
        maxScore,
        correct,
        incorrect,
        unattempted,
      },
    })
  );

  writes.push(
    prisma.analyticsEvent.create({
      data: {
        userId: user.id,
        type: "EXAM_SUBMIT",
        entityType: "paper",
        entityId: attempt.paperId,
        metadata: { score, maxScore, correct, incorrect, unattempted },
      },
    })
  );

  await prisma.$transaction(writes);
  revalidatePath("/history");
  revalidatePath("/dashboard");

  return { ok: true, attemptId };
}
