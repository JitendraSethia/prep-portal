import Link from "next/link";
import { getStudentActivity } from "@/lib/data/analytics";
import { formatDuration } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Students" };

export default async function StudentsPage() {
  const students = await getStudentActivity();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Students</h1>
        <p className="text-muted-foreground">
          {students.length} registered student{students.length === 1 ? "" : "s"}
        </p>
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-muted-foreground">No students yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Tests</th>
                <th className="px-4 py-3 font-medium">Time on site</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </td>
                  <td className="px-4 py-3">{s.attempts}</td>
                  <td className="px-4 py-3">{formatDuration(s.totalTimeMs)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.lastLogin
                      ? s.lastLogin.toLocaleString()
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/students/${s.id}`}>
                      <Button variant="outline" size="sm">
                        View activity
                      </Button>
                    </Link>
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
