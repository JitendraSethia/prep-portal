import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, FileCheck2, Trophy } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Student activity" };

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const student = await prisma.user.findUnique({ where: { id } });
  if (!student) notFound();

  const [attempts, scoreAgg, timeAgg, pageViews, questionViewsRaw, recent] =
    await Promise.all([
      prisma.testAttempt.findMany({
        where: { userId: id, status: "SUBMITTED" },
        include: { paper: { include: { exam: true } } },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.testAttempt.aggregate({
        where: { userId: id, status: "SUBMITTED" },
        _avg: { score: true },
      }),
      prisma.analyticsEvent.aggregate({
        where: { userId: id },
        _sum: { durationMs: true },
      }),
      prisma.analyticsEvent.groupBy({
        by: ["path"],
        where: { userId: id, type: "PAGE_VIEW", path: { not: null } },
        _sum: { durationMs: true },
        _count: { _all: true },
        orderBy: { _sum: { durationMs: "desc" } },
        take: 15,
      }),
      prisma.analyticsEvent.groupBy({
        by: ["entityId"],
        where: { userId: id, type: "QUESTION_VIEW", entityId: { not: null } },
        _sum: { durationMs: true },
        _count: { _all: true },
        orderBy: { _sum: { durationMs: "desc" } },
        take: 15,
      }),
      prisma.analyticsEvent.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);

  const questionIds = questionViewsRaw
    .map((q) => q.entityId)
    .filter((x): x is string => !!x);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: { id: true, stem: true },
  });
  const stemById = new Map(questions.map((q) => [q.id, q.stem]));

  return (
    <div className="space-y-6">
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All students
      </Link>

      <div className="flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
          {(student.name ?? student.email).charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {student.name ?? "Unnamed"}
          </h1>
          <p className="text-muted-foreground">{student.email}</p>
        </div>
        <Badge
          variant={student.role === "ADMIN" ? "default" : "secondary"}
          className="ml-auto"
        >
          {student.role}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi
          icon={<FileCheck2 className="size-5" />}
          label="Tests taken"
          value={String(attempts.length)}
        />
        <Kpi
          icon={<Trophy className="size-5" />}
          label="Avg score"
          value={attempts.length ? (scoreAgg._avg.score ?? 0).toFixed(1) : "—"}
        />
        <Kpi
          icon={<Clock className="size-5" />}
          label="Total time tracked"
          value={formatDuration(timeAgg._sum.durationMs ?? 0)}
        />
      </div>

      {/* Attempts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submitted tests.</p>
          ) : (
            <div className="divide-y divide-border">
              {attempts.map((a) => (
                <Link
                  key={a.id}
                  href={`/results/${a.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-primary"
                >
                  <div>
                    <p className="font-medium">{a.paper.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.paper.exam.name} ·{" "}
                      {a.submittedAt?.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {a.score?.toFixed(0)} / {a.maxScore?.toFixed(0)}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pages visited */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pages visited (by time)</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTable
              rows={pageViews.map((p) => ({
                label: p.path ?? "—",
                count: p._count._all,
                ms: p._sum.durationMs ?? 0,
              }))}
              labelHeader="Page"
            />
          </CardContent>
        </Card>

        {/* Questions viewed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questions viewed (by time)</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTable
              rows={questionViewsRaw.map((q) => ({
                label: q.entityId
                  ? (stemById.get(q.entityId) ?? q.entityId)
                  : "—",
                count: q._count._all,
                ms: q._sum.durationMs ?? 0,
              }))}
              labelHeader="Question"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {recent.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 last:border-0"
              >
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{e.type}</Badge>
                  <span className="text-muted-foreground">
                    {e.path ?? e.entityType ?? ""}
                  </span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {e.createdAt.toLocaleString()}
                </span>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="text-muted-foreground">No activity recorded.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityTable({
  rows,
  labelHeader,
}: {
  rows: { label: string; count: number; ms: number }[];
  labelHeader: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No data yet.</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="pb-2 font-medium">{labelHeader}</th>
          <th className="pb-2 font-medium">Views</th>
          <th className="pb-2 text-right font-medium">Time</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="max-w-[16rem] py-2">
              <span className="line-clamp-1">{r.label}</span>
            </td>
            <td className="py-2">{r.count}</td>
            <td className="py-2 text-right">{formatDuration(r.ms)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Kpi({
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
