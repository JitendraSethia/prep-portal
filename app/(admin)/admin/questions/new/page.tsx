import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTaxonomy } from "@/lib/data/taxonomy";
import { QuestionForm } from "@/components/admin/question-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "New question" };

export default async function NewQuestionPage() {
  const taxonomy = await getTaxonomy();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/questions"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to questions
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">New question</h1>

      {taxonomy.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create an exam and subject first (use the taxonomy manager on the
          questions page).
        </p>
      ) : (
        <Card>
          <CardContent className="p-6">
            <QuestionForm taxonomy={taxonomy} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
