import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { Role } from "@prisma/client";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Prep Portal";

export function TopNav({
  role,
  name,
  email,
}: {
  role: Role;
  name?: string | null;
  email?: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="hidden sm:inline">{appName}</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/papers">Papers</NavLink>
            <NavLink href="/history">History</NavLink>
            {role === "ADMIN" && <NavLink href="/admin">Admin</NavLink>}
          </nav>
        </div>
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
