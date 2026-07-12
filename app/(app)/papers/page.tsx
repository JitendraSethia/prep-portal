import Link from "next/link";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PaperCard, type PaperCardData } from "@/components/paper-card";

export const metadata = { title: "Papers" };

export default async function PapersPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const { exam } = await searchParams;

  const [exams, papers] = await Promise.all([
    prisma.exam.findMany({ orderBy: { name: "asc" } }),
    prisma.paper.findMany({
      where: {
        isPublished: true,
        ...(exam ? { exam: { slug: exam } } : {}),
      },
      include: { exam: true, _count: { select: { questions: true } } },
      orderBy: { createdAt: "desc" },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Papers</h1>
        <p className="text-muted-foreground">
          Timed mock tests and previous-year papers.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip href="/papers" label="All" active={!exam} />
        {exams.map((e) => (
          <FilterChip
            key={e.id}
            href={`/papers?exam=${e.slug}`}
            label={e.name}
            active={exam === e.slug}
          />
        ))}
      </div>

      {paperCards.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No published papers for this exam yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paperCards.map((p) => (
            <PaperCard key={p.id} paper={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
