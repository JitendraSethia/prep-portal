import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { trackEventSchema } from "@/lib/validators/track";

/**
 * Records a single analytics event. The user is resolved from the session
 * cookie server-side (the client cannot spoof `userId`). Called via
 * `navigator.sendBeacon` and `fetch(keepalive)` from the client tracker.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = trackEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event" }, { status: 422 });
  }

  const session = await auth();
  const data = parsed.data;

  try {
    await prisma.analyticsEvent.create({
      data: {
        userId: session?.user?.id ?? null,
        sessionId: data.sessionId ?? null,
        type: data.type,
        path: data.path ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        durationMs: data.durationMs ?? 0,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch {
    // Analytics must never break the app; swallow write errors.
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
