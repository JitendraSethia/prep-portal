import Link from "next/link";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="size-5" />
              </span>
              <span className="hidden sm:inline">Admin</span>
            </Link>
            <nav className="flex items-center gap-1">
              <NavLink href="/admin">Analytics</NavLink>
              <NavLink href="/admin/questions">Questions</NavLink>
              <NavLink href="/admin/papers">Papers</NavLink>
              <NavLink href="/admin/import">Import</NavLink>
              <NavLink href="/admin/students">Students</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Student view
            </Link>
            <UserMenu name={user.name} email={user.email} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
