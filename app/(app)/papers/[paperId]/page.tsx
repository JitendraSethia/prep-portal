import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  ListChecks,
  AlertTriangle,
  ArrowLeft,
  PlayCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { startAttempt } from "@/lib/actions/attempts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function PaperDetailPage({
  params,
}: {
  params: Promise<{ paperId: string }>;
}) {
  const { paperId } = await params;
  const user = await requireUser();

  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    include: {
      exam: true,
      questions: { select: { section: true, question: { select: { marks: true } } } },
    },
  });
  if (!paper || !paper.isPublished) notFound();

  const inProgress = await prisma.testAttempt.findFirst({
    where: { userId: user.id, paperId, status: "IN_PROGRESS" },
  });

  const totalMarks = paper.questions.reduce(
    (sum, q) => sum + q.question.marks,
    0
  );
  const sections = [
    ...new Set(paper.questions.map((q) => q.section).filter(Boolean)),
  ] as string[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/papers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All papers
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{paper.exam.name}</Badge>
          <Badge variant={paper.type === "MOCK" ? "outline" : "default"}>
            {paper.type === "MOCK" ? "Mock test" : "Previous year"}
          </Badge>
          {paper.year && <Badge variant="outline">{paper.year}</Badge>}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{paper.title}</h1>
        {paper.description && (
          <p className="text-muted-foreground">{paper.description}</p>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-3">
          <Info
            icon={<ListChecks className="size-5" />}
            label="Questions"
            value={String(paper.questions.length)}
          />
          <Info
            icon={<Clock className="size-5" />}
            label="Duration"
            value={`${paper.durationMins} min`}
          />
          <Info
            icon={<AlertTriangle className="size-5" />}
            label="Total marks"
            value={String(totalMarks)}
          />
        </CardContent>
      </Card>

      {sections.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Sections: {sections.join(", ")}
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Instructions</p>
          <ul className="list-inside list-disc space-y-1">
            <li>The timer starts as soon as you begin and auto-submits at zero.</li>
            <li>Each correct answer: +4 marks. Each wrong answer: −1 mark.</li>
            <li>Unattempted questions carry no penalty.</li>
            <li>
              You can mark questions for review and navigate freely using the
              question palette.
            </li>
          </ul>
        </CardContent>
      </Card>

      <form action={startAttempt}>
        <input type="hidden" name="paperId" value={paper.id} />
        <Button type="submit" size="lg" className="w-full">
          <PlayCircle className="size-5" />
          {inProgress ? "Resume test" : "Start test"}
        </Button>
      </form>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
