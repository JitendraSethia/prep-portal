import { prisma } from "@/lib/db";

export async function getDashboardOverview() {
  const [students, submittedAttempts, questions, papers, scoreAgg] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.testAttempt.count({ where: { status: "SUBMITTED" } }),
      prisma.question.count(),
      prisma.paper.count(),
      prisma.testAttempt.aggregate({
        where: { status: "SUBMITTED" },
        _avg: { score: true },
      }),
    ]);

  return {
    students,
    submittedAttempts,
    questions,
    papers,
    avgScore: scoreAgg._avg.score ?? 0,
  };
}

/** Daily event counts for the last `days` days (bucketed in JS). */
export async function getDailyActivity(days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [...buckets.entries()].map(([date, count]) => ({
    date: date.slice(5), // MM-DD
    events: count,
  }));
}

export async function getEventTypeBreakdown() {
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["type"],
    _count: { _all: true },
  });
  return rows
    .map((r) => ({ type: r.type, count: r._count._all }))
    .sort((a, b) => b.count - a.count);
}

export async function getTopPapers() {
  const rows = await prisma.testAttempt.groupBy({
    by: ["paperId"],
    where: { status: "SUBMITTED" },
    _count: { _all: true },
    orderBy: { _count: { paperId: "desc" } },
    take: 6,
  });
  const papers = await prisma.paper.findMany({
    where: { id: { in: rows.map((r) => r.paperId) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(papers.map((p) => [p.id, p.title]));
  return rows.map((r) => ({
    title: titleById.get(r.paperId) ?? "—",
    attempts: r._count._all,
  }));
}

export async function getMostMissedQuestions() {
  const rows = await prisma.attemptAnswer.groupBy({
    by: ["questionId"],
    where: { isCorrect: false },
    _count: { _all: true },
    orderBy: { _count: { questionId: "desc" } },
    take: 6,
  });
  const questions = await prisma.question.findMany({
    where: { id: { in: rows.map((r) => r.questionId) } },
    select: { id: true, stem: true },
  });
  const stemById = new Map(questions.map((q) => [q.id, q.stem]));
  return rows.map((r) => ({
    stem: stemById.get(r.questionId) ?? "—",
    wrong: r._count._all,
  }));
}

export async function getTopPagesByTime() {
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["path"],
    where: { type: "PAGE_VIEW", path: { not: null } },
    _sum: { durationMs: true },
    orderBy: { _sum: { durationMs: "desc" } },
    take: 8,
  });
  return rows.map((r) => ({
    path: r.path ?? "—",
    ms: r._sum.durationMs ?? 0,
  }));
}

/** Per-student activity summary for the students list. */
export async function getStudentActivity() {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { attempts: true } },
    },
  });

  const summaries = await Promise.all(
    students.map(async (s) => {
      const [submitted, lastLogin, timeAgg] = await Promise.all([
        prisma.testAttempt.count({
          where: { userId: s.id, status: "SUBMITTED" },
        }),
        prisma.analyticsEvent.findFirst({
          where: { userId: s.id, type: "LOGIN" },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        }),
        prisma.analyticsEvent.aggregate({
          where: { userId: s.id },
          _sum: { durationMs: true },
        }),
      ]);
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        attempts: submitted,
        lastLogin: lastLogin?.createdAt ?? null,
        totalTimeMs: timeAgg._sum.durationMs ?? 0,
      };
    })
  );

  return summaries;
}
