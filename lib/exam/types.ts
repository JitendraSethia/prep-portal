import type { QuestionType } from "@prisma/client";

/** A selectable option for an MCQ question. */
export interface QuestionOption {
  key: string; // "A" | "B" | ...
  text: string;
}

/** Correct answer, stored in Question.answer (Json). */
export type CorrectAnswer =
  | { kind: "mcq"; keys: string[] } // one or more correct option keys
  | { kind: "numerical"; value: number; tolerance?: number };

/** A student's response, stored in AttemptAnswer.response (Json). */
export type StudentResponse =
  | { kind: "mcq"; keys: string[] }
  | { kind: "numerical"; value: number | null };

export function parseOptions(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (o): o is QuestionOption =>
      !!o &&
      typeof o === "object" &&
      typeof (o as QuestionOption).key === "string" &&
      typeof (o as QuestionOption).text === "string"
  );
}

export function parseCorrectAnswer(
  type: QuestionType,
  value: unknown
): CorrectAnswer {
  if (type === "NUMERICAL") {
    const v = value as { value?: number; tolerance?: number } | null;
    return {
      kind: "numerical",
      value: typeof v?.value === "number" ? v.value : 0,
      tolerance: typeof v?.tolerance === "number" ? v.tolerance : 0,
    };
  }
  // MCQ (single or multi): answer is an array of keys.
  const keys = Array.isArray(value)
    ? (value.filter((k) => typeof k === "string") as string[])
    : [];
  return { kind: "mcq", keys };
}

export function parseResponse(
  type: QuestionType,
  value: unknown
): StudentResponse {
  if (value == null) {
    return type === "NUMERICAL"
      ? { kind: "numerical", value: null }
      : { kind: "mcq", keys: [] };
  }
  if (type === "NUMERICAL") {
    const v = value as { value?: number | null };
    return {
      kind: "numerical",
      value: typeof v?.value === "number" ? v.value : null,
    };
  }
  const keys = Array.isArray(value)
    ? (value.filter((k) => typeof k === "string") as string[])
    : [];
  return { kind: "mcq", keys };
}
