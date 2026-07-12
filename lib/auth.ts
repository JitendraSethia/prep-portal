import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Returns the current session's user, or null. */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Require a logged-in user; redirect to /login otherwise. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require an ADMIN user; redirect otherwise. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
