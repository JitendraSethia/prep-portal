import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseOptions, parseCorrectAnswer } from "@/lib/exam/types";
import {
  AI_MODEL,
  isAIConfigured,
  streamExplanation,
  fallbackExplanation,
  type ExplainInput,
} from "@/lib/ai/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let questionId: string;
  try {
    const body = await request.json();
    questionId = String(body.questionId ?? "");
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!questionId) return new Response("Missing questionId", { status: 400 });

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { exam: true, subject: true, topic: true },
  });
  if (!question) return new Response("Question not found", { status: 404 });

  // Build a human-readable correct answer.
  const options = parseOptions(question.options);
  const correct = parseCorrectAnswer(question.type, question.answer);
  let correctText: string;
  if (correct.kind === "numerical") {
    correctText = String(correct.value);
  } else {
    correctText = correct.keys
      .map((k) => {
        const opt = options.find((o) => o.key === k);
        return opt ? `${k}. ${opt.text}` : k;
      })
      .join("; ");
  }

  const input: ExplainInput = {
    examName: question.exam.name,
    subject: question.subject.name,
    topic: question.topic?.name,
    stem: question.stem,
    options,
    correctText,
    authorSolution: question.solution,
  };

  const encoder = new TextEncoder();

  // Cache hit — return stored explanation immediately.
  const cached = await prisma.aIExplanation.findUnique({
    where: { questionId_model: { questionId, model: AI_MODEL } },
  });
  if (cached) {
    void logExplain(session.user.id, questionId, true);
    return new Response(cached.content, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Cache": "HIT" },
    });
  }

  // Not configured — return fallback without caching.
  if (!isAIConfigured()) {
    return new Response(fallbackExplanation(input), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Cache": "FALLBACK",
      },
    });
  }

  // Stream from the model, accumulate, then cache + log on completion.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      let failed = false;
      try {
        for await (const chunk of streamExplanation(input)) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch {
        failed = true;
        const fb = fallbackExplanation(input);
        controller.enqueue(encoder.encode("\n\n" + fb));
      }

      if (!failed && full.trim()) {
        await prisma.aIExplanation
          .create({
            data: { questionId, model: AI_MODEL, content: full },
          })
          .catch(() => {});
        await logExplain(session.user.id, questionId, false);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Cache": "MISS" },
  });
}

function logExplain(userId: string, questionId: string, cached: boolean) {
  return prisma.analyticsEvent
    .create({
      data: {
        userId,
        type: "AI_EXPLAIN",
        entityType: "question",
        entityId: questionId,
        metadata: { cached },
      },
    })
    .catch(() => {});
}
