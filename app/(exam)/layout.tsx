import { requireUser } from "@/lib/auth";

// Minimal, chrome-free layout for the in-test experience.
export default async function ExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <div className="min-h-screen bg-muted/30">{children}</div>;
}
