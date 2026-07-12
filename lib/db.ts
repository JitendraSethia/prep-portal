import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// Reuse a single PrismaClient across hot-reloads in development to avoid
// exhausting the database connection pool.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma Postgres / Accelerate connection strings use the `prisma+postgres://`
// (or `prisma://`) protocol and require the Accelerate extension. A plain
// `postgresql://` URL (local Postgres, Neon, RDS) uses the standard client.
const url = process.env.DATABASE_URL ?? "";
const useAccelerate =
  url.startsWith("prisma+postgres://") || url.startsWith("prisma://");

function createClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
  // The extended client is a superset of PrismaClient at runtime; cast the
  // type back so all call sites remain typed against PrismaClient.
  return useAccelerate
    ? (client.$extends(withAccelerate()) as unknown as PrismaClient)
    : client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
