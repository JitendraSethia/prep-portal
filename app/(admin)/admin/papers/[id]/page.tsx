import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ListChecks } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PublishToggle } from "@/components/admin/publish-toggle";
import {
  PaperQuestionsEditor,
  type EditorQuestion,
} from "@/components/admin/paper-questions-editor";

export const metadata = { title: "Edit paper" };

export default async function AdminPaperDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const paper = await prisma.paper.findUnique({
    where: { id },
    include: {
      exam: true,
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!paper) notFound();

  // Candidate questions are those belonging to the paper's exam.
  const examQuestions = await prisma.question.findMany({
    where: { examId: paper.examId },
    include: { subject: true },
    orderBy: { createdAt: "desc" },
  });

  const available: EditorQuestion[] = examQuestions.map((q) => ({
    id: q.id,
    stem: q.stem,
    subject: q.subject.name,
  }));
  const initialSelected = paper.questions.map((pq) => pq.questionId);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/papers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to papers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{paper.exam.name}</Badge>
            {paper.isPublished ? (
              <Badge variant="success">Published</Badge>
            ) : (
              <Badge variant="secondary">Draft</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{paper.title}</h1>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <ListChecks className="size-4" /> {paper.questions.length} questions
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-4" /> {paper.durationMins} min
            </span>
          </div>
        </div>
        <PublishToggle paperId={paper.id} isPublished={paper.isPublished} />
      </div>

      <Card>
        <CardContent className="p-6">
          <PaperQuestionsEditor
            paperId={paper.id}
            available={available}
            initialSelected={initialSelected}
          />
        </CardContent>
      </Card>
    </div>
  );
}
