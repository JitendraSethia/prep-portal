import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { deletePaper } from "@/lib/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/admin/confirm-delete";

export const metadata = { title: "Papers" };

export default async function AdminPapersPage() {
  const papers = await prisma.paper.findMany({
    include: { exam: true, _count: { select: { questions: true, attempts: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Papers</h1>
          <p className="text-muted-foreground">
            Mock tests & previous-year papers
          </p>
        </div>
        <Link href="/admin/papers/new">
          <Button>
            <Plus className="size-4" /> New paper
          </Button>
        </Link>
      </div>

      {papers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No papers yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Exam</th>
                <th className="px-4 py-3 font-medium">Questions</th>
                <th className="px-4 py-3 font-medium">Attempts</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {papers.map((p) => (
                <tr key={p.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.exam.name}
                  </td>
                  <td className="px-4 py-3">{p._count.questions}</td>
                  <td className="px-4 py-3">{p._count.attempts}</td>
                  <td className="px-4 py-3">
                    {p.isPublished ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/admin/papers/${p.id}`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="size-4" /> Edit
                        </Button>
                      </Link>
                      <ConfirmDelete action={deletePaper.bind(null, p.id)} />
                    </div>
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
