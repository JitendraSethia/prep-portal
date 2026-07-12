import { z } from "zod";

export const optionSchema = z.object({
  key: z.string().min(1).max(4),
  text: z.string().min(1),
});

export const questionInputSchema = z
  .object({
    examId: z.string().min(1, "Exam is required"),
    subjectId: z.string().min(1, "Subject is required"),
    topicId: z.string().nullable().optional(),
    type: z.enum(["MCQ_SINGLE", "MCQ_MULTI", "NUMERICAL"]),
    stem: z.string().min(3, "Question text is required"),
    options: z.array(optionSchema).default([]),
    correctKeys: z.array(z.string()).default([]),
    numericValue: z.number().nullable().optional(),
    numericTolerance: z.number().min(0).nullable().optional(),
    marks: z.number().default(4),
    negativeMarks: z.number().min(0).default(1),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    year: z.number().int().nullable().optional(),
    shift: z.string().nullable().optional(),
    solution: z.string().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "NUMERICAL") {
      if (val.numericValue == null || Number.isNaN(val.numericValue)) {
        ctx.addIssue({
          code: "custom",
          message: "A numeric answer value is required",
          path: ["numericValue"],
        });
      }
    } else {
      if (val.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Provide at least two options",
          path: ["options"],
        });
      }
      const keys = new Set(val.options.map((o) => o.key));
      const validCorrect = val.correctKeys.filter((k) => keys.has(k));
      if (validCorrect.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Mark at least one correct option",
          path: ["correctKeys"],
        });
      }
      if (val.type === "MCQ_SINGLE" && validCorrect.length > 1) {
        ctx.addIssue({
          code: "custom",
          message: "Single-answer questions can have only one correct option",
          path: ["correctKeys"],
        });
      }
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

export const paperInputSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().nullable().optional(),
  examId: z.string().min(1, "Exam is required"),
  type: z.enum(["PREVIOUS_YEAR", "MOCK"]),
  durationMins: z.number().int().min(1).max(600),
  year: z.number().int().nullable().optional(),
  isPublished: z.boolean().default(true),
});

export type PaperInput = z.infer<typeof paperInputSchema>;

/** One row of a bulk import (JSON/CSV). Kept lenient; coerced server-side. */
export const importRowSchema = z.object({
  subject: z.string().min(1),
  topic: z.string().optional().nullable(),
  type: z.enum(["MCQ_SINGLE", "MCQ_MULTI", "NUMERICAL"]).default("MCQ_SINGLE"),
  stem: z.string().min(1),
  optionA: z.string().optional().nullable(),
  optionB: z.string().optional().nullable(),
  optionC: z.string().optional().nullable(),
  optionD: z.string().optional().nullable(),
  correct: z.string().min(1), // e.g. "A" or "A,C" or numeric value for NUMERICAL
  marks: z.coerce.number().default(4),
  negativeMarks: z.coerce.number().default(1),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  year: z.coerce.number().int().optional().nullable(),
  shift: z.string().optional().nullable(),
  solution: z.string().optional().nullable(),
});

export type ImportRow = z.infer<typeof importRowSchema>;
