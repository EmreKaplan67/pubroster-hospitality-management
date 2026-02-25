"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/** Publish a roster for a week - makes it non-editable. */
export async function publishRosterAction(weekStart: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" };
  }

  const weekDate = new Date(weekStart + "T12:00:00");
  if (isNaN(weekDate.getTime()) || weekDate.getDay() !== 1) {
    return { success: false as const, error: "Invalid week start date" };
  }

  await prisma.publishedRoster.upsert({
    where: {
      userId_weekStart: {
        userId: session.user.id,
        weekStart: weekDate,
      },
    },
    create: {
      userId: session.user.id,
      weekStart: weekDate,
    },
    update: {},
  });

  revalidatePath("/dashboard/schedule");
  revalidatePath(`/dashboard/schedule?week=${weekStart}`);
  return { success: true as const };
}

/** Unpublish a roster (enable editing again). */
export async function unpublishRosterAction(weekStart: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false as const, error: "Not authenticated" };
  }

  const weekDate = new Date(weekStart + "T12:00:00");
  if (isNaN(weekDate.getTime())) {
    return { success: false as const, error: "Invalid week start date" };
  }

  await prisma.publishedRoster.deleteMany({
    where: {
      userId: session.user.id,
      weekStart: weekDate,
    },
  });

  revalidatePath("/dashboard/schedule");
  revalidatePath(`/dashboard/schedule?week=${weekStart}`);
  return { success: true as const };
}
