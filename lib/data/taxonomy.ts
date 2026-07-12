import { prisma } from "@/lib/db";
import type { TaxonomyExam } from "@/components/admin/question-form";

/** Full exam → subject → topic tree for admin selectors. */
export async function getTaxonomy(): Promise<TaxonomyExam[]> {
  const exams = await prisma.exam.findMany({
    orderBy: { name: "asc" },
    include: {
      subjects: {
        orderBy: { name: "asc" },
        include: { topics: { orderBy: { name: "asc" } } },
      },
    },
  });

  return exams.map((e) => ({
    id: e.id,
    name: e.name,
    subjects: e.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      topics: s.topics.map((t) => ({ id: t.id, name: t.name })),
    })),
  }));
}
