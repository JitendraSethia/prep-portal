import Link from "next/link";
import { ArrowRight, Target, Trophy, Timer } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { PaperCard, type PaperCardData } from "@/components/paper-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [papers, attempts, submittedAgg] = await Promise.all([
    prisma.paper.findMany({
      where: { isPublished: true },
      include: { exam: true, _count: { select: { questions: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.testAttempt.findMany({
      where: { userId: user.id, status: "SUBMITTED" },
      include: { paper: { include: { exam: true } } },
      orderBy: { submittedAt: "desc" },
      take: 5,
    }),
    prisma.testAttempt.aggregate({
      where: { userId: user.id, status: "SUBMITTED" },
      _count: true,
      _avg: { score: true },
    }),
  ]);

  const paperCards: PaperCardData[] = papers.map((p) => ({
    id: p.id,
    title: p.title,
    examName: p.exam.name,
    type: p.type,
    durationMins: p.durationMins,
    year: p.year,
    questionCount: p._count.questions,
  }));

  const totalAttempts = submittedAgg._count;
  const avgScore = submittedAgg._avg.score ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user.name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <p className="text-muted-foreground">
          Pick a paper and start practicing under real exam conditions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Target className="size-5" />}
          label="Tests taken"
          value={String(totalAttempts)}
        />
        <StatCard
          icon={<Trophy className="size-5" />}
          label="Average score"
          value={totalAttempts ? avgScore.toFixed(1) : "—"}
        />
        <StatCard
          icon={<Timer className="size-5" />}
          label="Papers available"
          value={String(paperCards.length)}
        />
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Available papers</h2>
          <Link
            href="/papers"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Browse all <ArrowRight className="size-4" />
          </Link>
        </div>
        {paperCards.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paperCards.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Recent attempts</h2>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No attempts yet — take your first test above.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {attempts.map((a) => (
              <Link
                key={a.id}
                href={`/results/${a.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-accent/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.paper.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.paper.exam.name}
                  </p>
                </div>
                <Badge variant="secondary">
                  {a.score?.toFixed(0)} / {a.maxScore?.toFixed(0)}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-muted-foreground">
          No papers published yet. An admin can add papers from the admin panel.
        </p>
        <Link href="/admin/papers">
          <Button variant="outline" size="sm">
            Go to admin
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
