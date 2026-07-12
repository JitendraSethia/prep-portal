import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "History" };

export default async function HistoryPage() {
  const user = await requireUser();

  const attempts = await prisma.testAttempt.findMany({
    where: { userId: user.id },
    include: {
      paper: { include: { exam: true } },
      _count: { select: { answers: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your attempts</h1>
        <p className="text-muted-foreground">
          Every test you&apos;ve taken, with scores and time.
        </p>
      </div>

      {attempts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t taken any tests yet.{" "}
          <Link href="/papers" className="text-primary hover:underline">
            Browse papers
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Paper</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attempts.map((a) => (
                <tr key={a.id} className="hover:bg-accent/40">
                  <td className="px-4 py-3 font-medium">{a.paper.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.paper.exam.name}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "SUBMITTED" ? (
                      <Badge variant="success">Submitted</Badge>
                    ) : (
                      <Badge variant="warning">In progress</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {a.status === "SUBMITTED"
                      ? `${a.score?.toFixed(0)} / ${a.maxScore?.toFixed(0)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.startedAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {a.status === "SUBMITTED" ? (
                      <Link href={`/results/${a.id}`}>
                        <Button size="sm" variant="outline">
                          View result
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/test/${a.id}`}>
                        <Button size="sm">Resume</Button>
                      </Link>
                    )}
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
