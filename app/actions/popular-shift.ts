"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { POPULAR_SHIFT_COLORS } from "@/lib/popular-shift-colors";

type CreatePopularShiftResult =
  | { success: true }
  | { success: false; error: string };

const VALID_MINUTES = [0, 15, 30, 45];
const createPopularShiftSchema = z.object({
  startTime: z
    .string()
    .min(1, "Start time is required")
    .refine(
      (val) => {
        const parts = val.split(":");
        if (parts.length !== 2) return false;
        const min = parseInt(parts[1], 10);
        return !isNaN(min) && VALID_MINUTES.includes(min);
      },
      "Minutes must be 00, 15, 30, or 45"
    ),
  endTime: z
    .string()
    .min(1, "End time is required")
    .refine(
      (val) => {
        const parts = val.split(":");
        if (parts.length !== 2) return false;
        const min = parseInt(parts[1], 10);
        return !isNaN(min) && VALID_MINUTES.includes(min);
      },
      "Minutes must be 00, 15, 30, or 45"
    ),
  breakMinutes: z.string().refine(
    (val) => {
      const n = parseFloat(val);
      const validBreaks = [0, 15, 30, 45, 60, 75, 90, 120];
      return !isNaN(n) && validBreaks.includes(n);
    },
    "Break must be 0–90 minutes or 2 hours, in 15-minute increments"
  ),
  color: z.string().optional(),
});

function parseTimeToDate(timeStr: string, dayOffset = 0): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date(1970, 0, 1 + dayOffset, hours ?? 0, minutes ?? 0, 0, 0);
  return d;
}

function computeHours(startTime: string, endTime: string, breakMinutes: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let startMins = (sh ?? 0) * 60 + (sm ?? 0);
  let endMins = (eh ?? 0) * 60 + (em ?? 0);
  if (endMins <= startMins) {
    endMins += 24 * 60; // overnight shift (e.g. 23:00 – 01:00)
  }
  const breakMins = parseFloat(breakMinutes) || 0;
  const diff = endMins - startMins - breakMins;
  return Math.max(0, diff) / 60;
}

export async function createPopularShiftAction(
  _prevState: CreatePopularShiftResult | null,
  formData: FormData
): Promise<CreatePopularShiftResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const entries = Object.fromEntries(formData.entries());
  const parsed = createPopularShiftSchema.safeParse(entries);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: firstError?.message ?? "Validation failed",
    };
  }

  const { startTime, endTime, breakMinutes, color } = parsed.data;

  const validColor = color && POPULAR_SHIFT_COLORS.includes(color as (typeof POPULAR_SHIFT_COLORS)[number])
    ? color
    : POPULAR_SHIFT_COLORS[0];

  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMins = (sh ?? 0) * 60 + (sm ?? 0);
  const endMins = (eh ?? 0) * 60 + (em ?? 0);
  const isOvernight = endMins <= startMins;

  const startDate = parseTimeToDate(startTime);
  const endDate = parseTimeToDate(endTime, isOvernight ? 1 : 0);

  const hours = Number(computeHours(startTime, endTime, breakMinutes).toFixed(2));

  try {
    await prisma.popularShift.create({
      data: {
        userId: session.user.id,
        startTime: startDate,
        endTime: endDate,
        hours,
        breakMinutes: parseFloat(breakMinutes) || 0,
        color: validColor,
      },
    });

    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create shift";
    return { success: false, error: message };
  }
}

type DeletePopularShiftResult = { success: true } | { success: false; error: string };

export async function deletePopularShiftAction(popularShiftId: string): Promise<DeletePopularShiftResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.popularShift.delete({
      where: { id: popularShiftId, userId: session.user.id },
    });
    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete popular shift" };
  }
}
