import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PaperForm } from "@/components/admin/paper-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "New paper" };

export default async function NewPaperPage() {
  const exams = await prisma.exam.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/papers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to papers
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">New paper</h1>
      <p className="text-sm text-muted-foreground">
        Create the paper, then add questions to it on the next screen.
      </p>

      {exams.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create an exam first from the Questions page.
        </p>
      ) : (
        <Card>
          <CardContent className="p-6">
            <PaperForm exams={exams} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
