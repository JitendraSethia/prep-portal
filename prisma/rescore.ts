/**
 * One-off backfill: re-score every SUBMITTED attempt from its stored responses.
 *
 * Older attempts were scored while MCQ responses were mis-parsed (every MCQ was
 * counted as unattempted). The response JSON was stored correctly, so we can
 * simply recompute isCorrect / marksAwarded per answer and the denormalized
 * score / correct / incorrect / unattempted columns on the attempt.
 *
 * Run against the target database:
 *   DATABASE_URL="<url>" npx tsx prisma/rescore.ts
 */
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { scoreAnswer } from "../lib/exam/scoring";

// Match lib/db.ts / seed.ts: use Accelerate for Prisma Postgres URLs.
const dbUrl = process.env.DATABASE_URL ?? "";
const useAccelerate =
  dbUrl.startsWith("prisma+postgres://") || dbUrl.startsWith("prisma://");
const baseClient = new PrismaClient();
const prisma = (
  useAccelerate ? baseClient.$extends(withAccelerate()) : baseClient
) as unknown as PrismaClient;

async function main() {
  const attempts = await prisma.testAttempt.findMany({
    where: { status: "SUBMITTED" },
    include: {
      answers: true,
      paper: {
        include: {
          questions: { include: { question: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });

  console.log(`Re-scoring ${attempts.length} submitted attempt(s)…`);
  let changed = 0;

  for (const attempt of attempts) {
    const answerByQ = new Map(attempt.answers.map((a) => [a.questionId, a]));

    let score = 0;
    let maxScore = 0;
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    const updates: Promise<unknown>[] = [];

    for (const pq of attempt.paper.questions) {
      const q = pq.question;
      maxScore += q.marks;
      const ans = answerByQ.get(q.id);
      const scored = scoreAnswer(q, ans?.response ?? null);

      if (!scored.attempted) unattempted++;
      else if (scored.isCorrect) correct++;
      else incorrect++;
      score += scored.marksAwarded;

      if (ans) {
        updates.push(
          prisma.attemptAnswer.update({
            where: { id: ans.id },
            data: {
              isCorrect: scored.attempted ? scored.isCorrect : null,
              marksAwarded: scored.marksAwarded,
            },
          })
        );
      }
    }

    updates.push(
      prisma.testAttempt.update({
        where: { id: attempt.id },
        data: { score, maxScore, correct, incorrect, unattempted },
      })
    );

    await Promise.all(updates);
    changed++;
    console.log(
      `  ${attempt.id}: ${correct} correct / ${incorrect} wrong / ${unattempted} skipped → ${score}/${maxScore}`
    );
  }

  console.log(`Done. Updated ${changed} attempt(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => baseClient.$disconnect());
