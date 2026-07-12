import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { deleteQuestion } from "@/lib/actions/admin";
import { parseOptions, parseCorrectAnswer } from "@/lib/exam/types";
import type { QuestionInput } from "@/lib/validators/admin";
import { QuestionForm } from "@/components/admin/question-form";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Edit question" };

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [taxonomy, question] = await Promise.all([
    getTaxonomy(),
    prisma.question.findUnique({ where: { id } }),
  ]);
  if (!question) notFound();

  const correct = parseCorrectAnswer(question.type, question.answer);

  const initial: QuestionInput = {
    examId: question.examId,
    subjectId: question.subjectId,
    topicId: question.topicId,
    type: question.type,
    stem: question.stem,
    options: parseOptions(question.options),
    correctKeys: correct.kind === "mcq" ? correct.keys : [],
    numericValue: correct.kind === "numerical" ? correct.value : null,
    numericTolerance: correct.kind === "numerical" ? (correct.tolerance ?? 0) : 0,
    marks: question.marks,
    negativeMarks: question.negativeMarks,
    difficulty: question.difficulty,
    year: question.year,
    shift: question.shift,
    solution: question.solution,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to questions
        </Link>
        <ConfirmDelete
          action={deleteQuestion.bind(null, question.id)}
          label="Delete question"
          redirectTo="/admin/questions"
        />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Edit question</h1>

      <Card>
        <CardContent className="p-6">
          <QuestionForm
            taxonomy={taxonomy}
            initial={initial}
            questionId={question.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
