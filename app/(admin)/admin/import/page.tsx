import { prisma } from "@/lib/db";
import { ImportForm } from "@/components/admin/import-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Bulk import" };

export default async function ImportPage() {
  const exams = await prisma.exam.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk import</h1>
        <p className="text-muted-foreground">
          Import many questions at once. Subjects and topics are created
          automatically by name.
        </p>
      </div>

      {exams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create an exam first from the Questions page.
        </p>
      ) : (
        <Card>
          <CardContent className="p-6">
            <ImportForm exams={exams} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-2 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">CSV columns</p>
          <p className="font-mono text-xs">
            subject, topic, type, stem, optionA, optionB, optionC, optionD,
            correct, marks, negativeMarks, difficulty, year, shift, solution
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <code>type</code>: MCQ_SINGLE (default), MCQ_MULTI, or NUMERICAL.
            </li>
            <li>
              <code>correct</code>: option key(s) like <code>A</code> or{" "}
              <code>A,C</code>; for NUMERICAL, the numeric answer.
            </li>
            <li>
              <code>difficulty</code>: EASY, MEDIUM (default), or HARD.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
