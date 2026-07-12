import type { Question } from "@prisma/client";
import {
  parseCorrectAnswer,
  parseResponse,
  type StudentResponse,
} from "@/lib/exam/types";

export interface ScoredAnswer {
  isCorrect: boolean;
  attempted: boolean;
  marksAwarded: number;
}

/** True if the response is a genuine attempt (non-empty). */
export function isAttempted(response: StudentResponse): boolean {
  if (response.kind === "numerical") return response.value !== null;
  return response.keys.length > 0;
}

/**
 * Score a single question given a student's response.
 * - MCQ (single/multi): all-or-nothing exact match.
 * - Numerical: within tolerance of the correct value.
 * Unattempted questions score 0 with no penalty.
 */
export function scoreAnswer(
  question: Pick<Question, "type" | "answer" | "marks" | "negativeMarks">,
  rawResponse: unknown
): ScoredAnswer {
  const correct = parseCorrectAnswer(question.type, question.answer);
  const response = parseResponse(question.type, rawResponse);

  if (!isAttempted(response)) {
    return { isCorrect: false, attempted: false, marksAwarded: 0 };
  }

  let isCorrect = false;
  if (correct.kind === "numerical" && response.kind === "numerical") {
    const tol = correct.tolerance ?? 0;
    isCorrect =
      response.value !== null &&
      Math.abs(response.value - correct.value) <= tol;
  } else if (correct.kind === "mcq" && response.kind === "mcq") {
    const a = [...correct.keys].sort();
    const b = [...response.keys].sort();
    isCorrect = a.length === b.length && a.every((k, i) => k === b[i]);
  }

  return {
    isCorrect,
    attempted: true,
    marksAwarded: isCorrect ? question.marks : -Math.abs(question.negativeMarks),
  };
}
