import { z } from "zod";

export const trackEventSchema = z.object({
  type: z.enum([
    "PAGE_VIEW",
    "QUESTION_VIEW",
    "EXAM_START",
    "EXAM_SUBMIT",
    "AI_EXPLAIN",
  ]),
  sessionId: z.string().max(64).optional(),
  path: z.string().max(512).optional(),
  entityType: z.string().max(32).optional(),
  entityId: z.string().max(64).optional(),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TrackEventInput = z.infer<typeof trackEventSchema>;
