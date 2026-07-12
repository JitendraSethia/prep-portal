"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
});

export type ProfileState = { error?: string; success?: boolean } | undefined;

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });
  revalidatePath("/profile");
  return { success: true };
}
