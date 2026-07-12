"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import {
  questionInputSchema,
  paperInputSchema,
  importRowSchema,
  type QuestionInput,
  type PaperInput,
} from "@/lib/validators/admin";

type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

function buildAnswerAndOptions(input: QuestionInput): {
  options: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  answer: Prisma.InputJsonValue;
} {
  if (input.type === "NUMERICAL") {
    return {
      options: Prisma.JsonNull,
      answer: {
        value: input.numericValue ?? 0,
        tolerance: input.numericTolerance ?? 0,
      },
    };
  }
  const keys = new Set(input.options.map((o) => o.key));
  const correct = input.correctKeys.filter((k) => keys.has(k));
  return { options: input.options, answer: correct };
}

// --- Taxonomy ---------------------------------------------------------------

export async function createExam(
  name: string,
  description?: string
): Promise<Result<{ id: string }>> {
  await requireAdmin();
  if (!name.trim()) return { ok: false, error: "Name is required" };
  const slug = slugify(name);
  try {
    const exam = await prisma.exam.create({
      data: { name: name.trim(), slug, description: description?.trim() || null },
    });
    revalidatePath("/admin/questions");
    return { ok: true, data: { id: exam.id } };
  } catch {
    return { ok: false, error: "An exam with that name already exists" };
  }
}

export async function createSubject(
  examId: string,
  name: string
): Promise<Result<{ id: string }>> {
  await requireAdmin();
  if (!examId || !name.trim()) return { ok: false, error: "Missing fields" };
  try {
    const subject = await prisma.subject.create({
      data: { examId, name: name.trim(), slug: slugify(name) },
    });
    revalidatePath("/admin/questions");
    return { ok: true, data: { id: subject.id } };
  } catch {
    return { ok: false, error: "Subject already exists for this exam" };
  }
}

export async function createTopic(
  subjectId: string,
  name: string
): Promise<Result<{ id: string }>> {
  await requireAdmin();
  if (!subjectId || !name.trim()) return { ok: false, error: "Missing fields" };
  try {
    const topic = await prisma.topic.create({
      data: { subjectId, name: name.trim(), slug: slugify(name) },
    });
    revalidatePath("/admin/questions");
    return { ok: true, data: { id: topic.id } };
  } catch {
    return { ok: false, error: "Topic already exists for this subject" };
  }
}

// --- Questions --------------------------------------------------------------

export async function createQuestion(
  raw: QuestionInput
): Promise<Result<{ id: string }>> {
  await requireAdmin();
  const parsed = questionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;
  const { options, answer } = buildAnswerAndOptions(input);

  const q = await prisma.question.create({
    data: {
      type: input.type,
      stem: input.stem,
      options,
      answer,
      solution: input.solution || null,
      marks: input.marks,
      negativeMarks: input.negativeMarks,
      difficulty: input.difficulty,
      year: input.year ?? null,
      shift: input.shift || null,
      examId: input.examId,
      subjectId: input.subjectId,
      topicId: input.topicId || null,
    },
  });
  revalidatePath("/admin/questions");
  return { ok: true, data: { id: q.id } };
}

export async function updateQuestion(
  id: string,
  raw: QuestionInput
): Promise<Result> {
  await requireAdmin();
  const parsed = questionInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;
  const { options, answer } = buildAnswerAndOptions(input);

  await prisma.question.update({
    where: { id },
    data: {
      type: input.type,
      stem: input.stem,
      options,
      answer,
      solution: input.solution || null,
      marks: input.marks,
      negativeMarks: input.negativeMarks,
      difficulty: input.difficulty,
      year: input.year ?? null,
      shift: input.shift || null,
      examId: input.examId,
      subjectId: input.subjectId,
      topicId: input.topicId || null,
    },
  });
  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${id}`);
  return { ok: true };
}

export async function deleteQuestion(id: string): Promise<Result> {
  await requireAdmin();
  await prisma.question.delete({ where: { id } });
  revalidatePath("/admin/questions");
  return { ok: true };
}

// --- Papers -----------------------------------------------------------------

export async function createPaper(
  raw: PaperInput
): Promise<Result<{ id: string }>> {
  await requireAdmin();
  const parsed = paperInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;
  const paper = await prisma.paper.create({
    data: {
      title: input.title,
      description: input.description || null,
      examId: input.examId,
      type: input.type,
      durationMins: input.durationMins,
      year: input.year ?? null,
      isPublished: input.isPublished,
    },
  });
  revalidatePath("/admin/papers");
  return { ok: true, data: { id: paper.id } };
}

export async function togglePaperPublished(
  id: string,
  isPublished: boolean
): Promise<Result> {
  await requireAdmin();
  await prisma.paper.update({ where: { id }, data: { isPublished } });
  revalidatePath("/admin/papers");
  revalidatePath(`/admin/papers/${id}`);
  return { ok: true };
}

export async function deletePaper(id: string): Promise<Result> {
  await requireAdmin();
  await prisma.paper.delete({ where: { id } });
  revalidatePath("/admin/papers");
  return { ok: true };
}

/** Replace the ordered set of questions attached to a paper. */
export async function setPaperQuestions(
  paperId: string,
  questionIds: string[]
): Promise<Result> {
  await requireAdmin();
  // Resolve section from each question's subject for nicer grouping.
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    include: { subject: true },
  });
  const subjectById = new Map(questions.map((q) => [q.id, q.subject.name]));

  await prisma.$transaction([
    prisma.paperQuestion.deleteMany({ where: { paperId } }),
    prisma.paperQuestion.createMany({
      data: questionIds.map((qid, i) => ({
        paperId,
        questionId: qid,
        order: i + 1,
        section: subjectById.get(qid) ?? null,
      })),
    }),
  ]);
  revalidatePath(`/admin/papers/${paperId}`);
  return { ok: true };
}

// --- Bulk import ------------------------------------------------------------

export async function importQuestions(
  examId: string,
  rows: unknown[]
): Promise<Result<{ created: number; errors: string[] }>> {
  await requireAdmin();
  if (!examId) return { ok: false, error: "Select an exam" };
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) return { ok: false, error: "Exam not found" };

  const errors: string[] = [];
  let created = 0;

  // Cache subject/topic lookups within this exam.
  const subjectCache = new Map<string, string>();
  const topicCache = new Map<string, string>();

  const ensureSubject = async (name: string) => {
    const slug = slugify(name);
    const key = slug;
    if (subjectCache.has(key)) return subjectCache.get(key)!;
    const subject = await prisma.subject.upsert({
      where: { examId_slug: { examId, slug } },
      update: {},
      create: { examId, name, slug },
    });
    subjectCache.set(key, subject.id);
    return subject.id;
  };
  const ensureTopic = async (subjectId: string, name: string) => {
    const slug = slugify(name);
    const key = `${subjectId}:${slug}`;
    if (topicCache.has(key)) return topicCache.get(key)!;
    const topic = await prisma.topic.upsert({
      where: { subjectId_slug: { subjectId, slug } },
      update: {},
      create: { subjectId, name, slug },
    });
    topicCache.set(key, topic.id);
    return topic.id;
  };

  for (let i = 0; i < rows.length; i++) {
    const parsed = importRowSchema.safeParse(rows[i]);
    if (!parsed.success) {
      errors.push(`Row ${i + 1}: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    const r = parsed.data;
    try {
      const subjectId = await ensureSubject(r.subject);
      const topicId = r.topic ? await ensureTopic(subjectId, r.topic) : null;

      let options: Prisma.InputJsonValue | typeof Prisma.JsonNull =
        Prisma.JsonNull;
      let answer: Prisma.InputJsonValue;

      if (r.type === "NUMERICAL") {
        const value = Number(r.correct);
        if (!Number.isFinite(value)) {
          errors.push(`Row ${i + 1}: numeric answer "${r.correct}" is invalid`);
          continue;
        }
        answer = { value, tolerance: 0 };
      } else {
        const opts = [
          { key: "A", text: r.optionA },
          { key: "B", text: r.optionB },
          { key: "C", text: r.optionC },
          { key: "D", text: r.optionD },
        ].filter((o) => o.text && String(o.text).trim() !== "") as {
          key: string;
          text: string;
        }[];
        if (opts.length < 2) {
          errors.push(`Row ${i + 1}: needs at least two options`);
          continue;
        }
        const correctKeys = r.correct
          .split(/[,;\s]+/)
          .map((k) => k.trim().toUpperCase())
          .filter(Boolean);
        const validKeys = new Set(opts.map((o) => o.key));
        const valid = correctKeys.filter((k) => validKeys.has(k));
        if (valid.length === 0) {
          errors.push(`Row ${i + 1}: correct key "${r.correct}" not among options`);
          continue;
        }
        options = opts;
        answer = valid;
      }

      await prisma.question.create({
        data: {
          type: r.type,
          stem: r.stem,
          options,
          answer,
          solution: r.solution || null,
          marks: r.marks,
          negativeMarks: r.negativeMarks,
          difficulty: r.difficulty,
          year: r.year ?? null,
          shift: r.shift || null,
          examId,
          subjectId,
          topicId,
        },
      });
      created++;
    } catch (e) {
      errors.push(`Row ${i + 1}: ${(e as Error).message}`);
    }
  }

  revalidatePath("/admin/questions");
  return { ok: true, data: { created, errors } };
}
