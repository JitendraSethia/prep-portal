import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { deleteQuestion } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export const metadata = { title: "Questions" };

const typeLabel: Record<string, string> = {
  MCQ_SINGLE: "MCQ",
  MCQ_MULTI: "Multi",
  NUMERICAL: "Numeric",
};

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string; subject?: string }>;
}) {
  const { exam, subject } = await searchParams;

  const [taxonomy, questions, total] = await Promise.all([
    getTaxonomy(),
    prisma.question.findMany({
      where: {
        ...(exam ? { exam: { slug: exam } } : {}),
        ...(subject ? { subject: { slug: subject } } : {}),
      },
      include: { exam: true, subject: true, topic: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.question.count(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Question bank</h1>
          <p className="text-muted-foreground">{total} questions total</p>
        </div>
        <Link href="/admin/questions/new">
          <Button>
            <Plus className="size-4" /> New question
          </Button>
        </Link>
      </div>

      <TaxonomyManager taxonomy={taxonomy} />

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No questions yet. Create one or use bulk import.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Question</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {questions.map((q) => (
                <tr key={q.id} className="align-top hover:bg-accent/30">
                  <td className="max-w-md px-4 py-3">
                    <p className="line-clamp-2">{q.stem}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {q.exam.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {q.subject.name}
                    {q.topic ? ` › ${q.topic.name}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{typeLabel[q.type]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/questions/${q.id}`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="size-4" /> Edit
                        </Button>
                      </Link>
                      <ConfirmDelete action={deleteQuestion.bind(null, q.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
