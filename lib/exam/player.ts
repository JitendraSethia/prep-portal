import type { QuestionType } from "@prisma/client";
import type { QuestionOption } from "@/lib/exam/types";

/** Question data sent to the client player — deliberately omits answer/solution. */
export interface PlayerQuestion {
  id: string;
  order: number;
  section: string | null;
  subject: string;
  type: QuestionType;
  stem: string;
  options: QuestionOption[];
  marks: number;
  negativeMarks: number;
}

/** Restored answer state for resuming an in-progress attempt. */
export interface PlayerInitialAnswer {
  questionId: string;
  response: unknown;
  timeSpentMs: number;
  markedForReview: boolean;
}

export type QuestionStatus =
  | "not-visited"
  | "not-answered"
  | "answered"
  | "marked"
  | "answered-marked";
