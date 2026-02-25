"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { POPULAR_SHIFT_COLORS } from "@/lib/popular-shift-colors";
import { revalidatePath } from "next/cache";
import { getWeekStart } from "@/lib/schedule-week";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const TZ = "Europe/Dublin";

type AssignShiftResult =
  | { success: true; shift: { id: string; staffId: string; shiftDate: string; startTime: string; endTime: string; hours: string; breakMinutes: string; color: string } }
  | { success: false; error: string };

/** Extract hours and minutes in Europe/Dublin (matches UI formatTime) */
function getLocalTimeParts(d: Date): { hours: number; minutes: number } {
  const s = d.toLocaleTimeString("en-GB", { timeZone: TZ, hour12: false, hour: "2-digit", minute: "2-digit" });
  const [h, m] = s.split(":").map(Number);
  return { hours: h ?? 0, minutes: m ?? 0 };
}

const timeStrSchema = z.string().regex(/^\d{1,2}:\d{2}$/);

const assignShiftSchema = z.object({
  staffId: z.string().uuid(),
  popularShiftId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.enum(DAYS),
  startTimeStr: timeStrSchema.optional(),
  endTimeStr: timeStrSchema.optional(),
});

function getDateForDay(weekStart: string, dayOfWeek: string): Date {
  const [y, m, d] = weekStart.split("-").map(Number);
  const monday = new Date(y!, m! - 1, d!, 12, 0, 0, 0);
  const dayIndex = DAYS.indexOf(dayOfWeek as (typeof DAYS)[number]);
  const date = new Date(monday);
  date.setDate(monday.getDate() + dayIndex);
  return date;
}

async function checkRosterNotPublished(
  userId: string,
  weekStart: string
): Promise<{ blocked: true; error: string } | { blocked: false }> {
  const weekDate = new Date(weekStart + "T12:00:00");
  const published = await prisma.publishedRoster.findUnique({
    where: {
      userId_weekStart: { userId, weekStart: weekDate },
    },
  });
  if (published) {
    return {
      blocked: true,
      error: "This roster is published. Click 'Edit roster' to unpublish before making changes.",
    };
  }
  return { blocked: false };
}

export async function assignShiftAction(
  data: {
    staffId: string;
    popularShiftId: string;
    weekStart: string;
    dayOfWeek: (typeof DAYS)[number];
    startTimeStr?: string;
    endTimeStr?: string;
  }
): Promise<AssignShiftResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = assignShiftSchema.safeParse(data);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: firstError?.message ?? "Validation failed",
    };
  }

  const { staffId, popularShiftId, weekStart, dayOfWeek, startTimeStr, endTimeStr } = parsed.data;

  const publishedCheck = await checkRosterNotPublished(session.user.id, weekStart);
  if (publishedCheck.blocked) return { success: false, error: publishedCheck.error };

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, userId: session.user.id },
  });

  if (!staff) {
    return { success: false, error: "Staff not found" };
  }

  const popularShift = await prisma.popularShift.findUnique({
    where: { id: popularShiftId },
  });

  if (!popularShift) {
    return { success: false, error: "Shift template not found" };
  }

  const shiftDate = getDateForDay(weekStart, dayOfWeek);

  let startParts: { hours: number; minutes: number };
  let endParts: { hours: number; minutes: number };

  if (startTimeStr && endTimeStr) {
    const [sh, sm] = startTimeStr.split(":").map(Number);
    const [eh, em] = endTimeStr.split(":").map(Number);
    startParts = { hours: sh ?? 0, minutes: sm ?? 0 };
    endParts = { hours: eh ?? 0, minutes: em ?? 0 };
  } else {
    startParts = getLocalTimeParts(popularShift.startTime);
    endParts = getLocalTimeParts(popularShift.endTime);
  }
  const startMins = startParts.hours * 60 + startParts.minutes;
  const endMins = endParts.hours * 60 + endParts.minutes;
  const isOvernight = endMins <= startMins;

  const y = shiftDate.getFullYear();
  const mo = shiftDate.getMonth();
  const d = shiftDate.getDate();

  const startTime = new Date(y, mo, d, startParts.hours, startParts.minutes, 0, 0);
  const endTime = new Date(y, mo, d + (isOvernight ? 1 : 0), endParts.hours, endParts.minutes, 0, 0);

  const dateOnly = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());
  const existing = await prisma.shift.findFirst({
    where: {
      staffId,
      shiftDate: dateOnly,
    },
  });

  if (existing) {
    return { success: false, error: "Staff already has a shift on this day" };
  }

  const shiftColor = popularShift.color ?? "#e5e7eb";

  try {
    const created = await prisma.shift.create({
      data: {
        staffId,
        shiftDate: dateOnly,
        startTime,
        endTime,
        hours: popularShift.hours,
        breakMinutes: popularShift.breakMinutes,
        color: shiftColor,
        role: staff.role,
      },
    });

    revalidatePath("/dashboard/schedule");

    return {
      success: true,
      shift: {
        id: created.id,
        staffId: created.staffId,
        shiftDate: created.shiftDate.toISOString().slice(0, 10),
        startTime: created.startTime.toISOString(),
        endTime: created.endTime.toISOString(),
        hours: created.hours.toString(),
        breakMinutes: created.breakMinutes.toString(),
        color: created.color ?? shiftColor,
      },
    };
  } catch {
    return { success: false, error: "Failed to assign shift" };
  }
}

const DEFAULT_SHIFT_COLOR = "#e5e7eb";

type CreateShiftDirectResult =
  | { success: true; shift: { id: string; staffId: string; shiftDate: string; startTime: string; endTime: string; hours: string; breakMinutes: string; color: string } }
  | { success: false; error: string };

const VALID_BREAKS = [0, 15, 30, 45, 60, 75, 90, 120];

const createShiftDirectSchema = z.object({
  staffId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.enum(DAYS),
  startTimeStr: timeStrSchema,
  endTimeStr: timeStrSchema,
  breakMinutes: z.string().refine(
    (val) => {
      const n = parseFloat(val);
      return !isNaN(n) && VALID_BREAKS.includes(n);
    },
    "Break must be 0, 15, 30, 45, 60, 75, 90, or 120 minutes"
  ),
  hours: z.string(),
});

export async function createShiftDirectAction(
  _prevState: CreateShiftDirectResult | null,
  formData: FormData
): Promise<CreateShiftDirectResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const entries = Object.fromEntries(formData.entries());
  const parsed = createShiftDirectSchema.safeParse(entries);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: firstError?.message ?? "Validation failed",
    };
  }

  const { staffId, weekStart, dayOfWeek, startTimeStr, endTimeStr, breakMinutes, hours } = parsed.data;

  const publishedCheck = await checkRosterNotPublished(session.user.id, weekStart);
  if (publishedCheck.blocked) return { success: false, error: publishedCheck.error };

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, userId: session.user.id },
  });

  if (!staff) {
    return { success: false, error: "Staff not found" };
  }

  const shiftDate = getDateForDay(weekStart, dayOfWeek);
  const [sh, sm] = startTimeStr.split(":").map(Number);
  const [eh, em] = endTimeStr.split(":").map(Number);
  const startMins = (sh ?? 0) * 60 + (sm ?? 0);
  const endMins = (eh ?? 0) * 60 + (em ?? 0);
  const isOvernight = endMins <= startMins;

  const y = shiftDate.getFullYear();
  const mo = shiftDate.getMonth();
  const d = shiftDate.getDate();

  const startTime = new Date(y, mo, d, sh ?? 0, sm ?? 0, 0, 0);
  const endTime = new Date(y, mo, d + (isOvernight ? 1 : 0), eh ?? 0, em ?? 0, 0, 0);
  const dateOnly = new Date(y, mo, d);
  const hoursNum = parseFloat(hours) || 0;
  const breakMins = parseFloat(breakMinutes) || 0;

  const existing = await prisma.shift.findFirst({
    where: { staffId, shiftDate: dateOnly },
  });

  if (existing) {
    return { success: false, error: "Staff already has a shift on this day" };
  }

  try {
    const created = await prisma.shift.create({
      data: {
        staffId,
        shiftDate: dateOnly,
        startTime,
        endTime,
        hours: hoursNum,
        breakMinutes: breakMins,
        color: DEFAULT_SHIFT_COLOR,
        role: staff.role,
      },
    });

    revalidatePath("/dashboard/schedule");

    return {
      success: true,
      shift: {
        id: created.id,
        staffId: created.staffId,
        shiftDate: created.shiftDate.toISOString().slice(0, 10),
        startTime: created.startTime.toISOString(),
        endTime: created.endTime.toISOString(),
        hours: created.hours.toString(),
        breakMinutes: created.breakMinutes.toString(),
        color: created.color ?? DEFAULT_SHIFT_COLOR,
      },
    };
  } catch {
    return { success: false, error: "Failed to create shift" };
  }
}

type MoveShiftResult =
  | { success: true; shift: { id: string; staffId: string; shiftDate: string; startTime: string; endTime: string; hours: string; breakMinutes: string; color: string } }
  | { success: false; error: string };

const moveShiftSchema = z.object({
  shiftId: z.string().uuid(),
  newStaffId: z.string().uuid(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.enum(DAYS),
});

export async function moveShiftAction(
  data: { shiftId: string; newStaffId: string; weekStart: string; dayOfWeek: (typeof DAYS)[number] }
): Promise<MoveShiftResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = moveShiftSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError?.message ?? "Validation failed" };
  }

  const { shiftId, newStaffId, weekStart, dayOfWeek } = parsed.data;

  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, staff: { userId: session.user.id } },
  });

  if (!shift) {
    return { success: false, error: "Shift not found" };
  }

  const publishedCheck = await checkRosterNotPublished(session.user.id, weekStart);
  if (publishedCheck.blocked) return { success: false, error: publishedCheck.error };

  const newStaff = await prisma.staff.findFirst({
    where: { id: newStaffId, userId: session.user.id },
  });

  if (!newStaff) {
    return { success: false, error: "Staff not found" };
  }

  const newDate = getDateForDay(weekStart, dayOfWeek);
  const dateOnly = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());

  if (shift.staffId === newStaffId && shift.shiftDate.getTime() === dateOnly.getTime()) {
    return { success: true, shift: { id: shift.id, staffId: shift.staffId, shiftDate: shift.shiftDate.toISOString().slice(0, 10), startTime: shift.startTime.toISOString(), endTime: shift.endTime.toISOString(), hours: shift.hours.toString(), breakMinutes: shift.breakMinutes.toString(), color: shift.color ?? DEFAULT_SHIFT_COLOR } };
  }

  const existing = await prisma.shift.findFirst({
    where: { staffId: newStaffId, shiftDate: dateOnly },
  });

  if (existing) {
    return { success: false, error: "Staff already has a shift on this day" };
  }

  const startParts = getLocalTimeParts(shift.startTime);
  const endParts = getLocalTimeParts(shift.endTime);
  const startMins = startParts.hours * 60 + startParts.minutes;
  const endMins = endParts.hours * 60 + endParts.minutes;
  const isOvernight = endMins <= startMins;

  const y = dateOnly.getFullYear();
  const mo = dateOnly.getMonth();
  const d = dateOnly.getDate();

  const newStartTime = new Date(y, mo, d, startParts.hours, startParts.minutes, 0, 0);
  const newEndTime = new Date(y, mo, d + (isOvernight ? 1 : 0), endParts.hours, endParts.minutes, 0, 0);

  try {
    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        staffId: newStaffId,
        shiftDate: dateOnly,
        startTime: newStartTime,
        endTime: newEndTime,
      },
    });

    revalidatePath("/dashboard/schedule");

    return {
      success: true,
      shift: {
        id: updated.id,
        staffId: updated.staffId,
        shiftDate: updated.shiftDate.toISOString().slice(0, 10),
        startTime: updated.startTime.toISOString(),
        endTime: updated.endTime.toISOString(),
        hours: updated.hours.toString(),
        breakMinutes: updated.breakMinutes.toString(),
        color: updated.color ?? DEFAULT_SHIFT_COLOR,
      },
    };
  } catch {
    return { success: false, error: "Failed to move shift" };
  }
}

type RemoveShiftResult = { success: true } | { success: false; error: string };

export async function removeShiftAction(shiftId: string): Promise<RemoveShiftResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const shift = await prisma.shift.findFirst({
    where: {
      id: shiftId,
      staff: { userId: session.user.id },
    },
  });

  if (!shift) {
    return { success: false, error: "Shift not found" };
  }

  const weekStart = getWeekStart(shift.shiftDate);
  const publishedCheck = await checkRosterNotPublished(session.user.id, weekStart);
  if (publishedCheck.blocked) return { success: false, error: publishedCheck.error };

  try {
    await prisma.shift.delete({
      where: { id: shiftId },
    });
    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to remove shift" };
  }
}

type UpdateShiftResult =
  | { success: true; shift: { id: string; staffId: string; shiftDate: string; startTime: string; endTime: string; hours: string; breakMinutes: string; color: string } }
  | { success: false; error: string };

const updateShiftSchema = z.object({
  shiftId: z.string().uuid(),
  startTimeStr: timeStrSchema,
  endTimeStr: timeStrSchema,
  breakMinutes: z.string().refine(
    (val) => {
      const n = parseFloat(val);
      return !isNaN(n) && VALID_BREAKS.includes(n);
    },
    "Break must be 0, 15, 30, 45, 60, 75, 90, or 120 minutes"
  ),
  hours: z.string(),
  color: z.string().optional(),
});

export async function updateShiftAction(
  _prevState: UpdateShiftResult | null,
  formData: FormData
): Promise<UpdateShiftResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const entries = Object.fromEntries(formData.entries());
  const parsed = updateShiftSchema.safeParse(entries);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: firstError?.message ?? "Validation failed",
    };
  }

  const { shiftId, startTimeStr, endTimeStr, breakMinutes, hours, color } = parsed.data;

  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, staff: { userId: session.user.id } },
  });

  if (!shift) {
    return { success: false, error: "Shift not found" };
  }

  const weekStart = getWeekStart(shift.shiftDate);
  const publishedCheck = await checkRosterNotPublished(session.user.id, weekStart);
  if (publishedCheck.blocked) return { success: false, error: publishedCheck.error };

  const [sh, sm] = startTimeStr.split(":").map(Number);
  const [eh, em] = endTimeStr.split(":").map(Number);
  const startMins = (sh ?? 0) * 60 + (sm ?? 0);
  const endMins = (eh ?? 0) * 60 + (em ?? 0);
  const isOvernight = endMins <= startMins;

  const y = shift.shiftDate.getFullYear();
  const mo = shift.shiftDate.getMonth();
  const d = shift.shiftDate.getDate();

  const startTime = new Date(y, mo, d, sh ?? 0, sm ?? 0, 0, 0);
  const endTime = new Date(y, mo, d + (isOvernight ? 1 : 0), eh ?? 0, em ?? 0, 0, 0);
  const hoursNum = parseFloat(hours) || 0;
  const breakMins = parseFloat(breakMinutes) || 0;
  const validColor =
    color && (POPULAR_SHIFT_COLORS as readonly string[]).includes(color)
      ? (color as (typeof POPULAR_SHIFT_COLORS)[number])
      : undefined;

  try {
    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        startTime,
        endTime,
        hours: hoursNum,
        breakMinutes: breakMins,
        ...(validColor && { color: validColor }),
      },
    });

    revalidatePath("/dashboard/schedule");

    return {
      success: true,
      shift: {
        id: updated.id,
        staffId: updated.staffId,
        shiftDate: updated.shiftDate.toISOString().slice(0, 10),
        startTime: updated.startTime.toISOString(),
        endTime: updated.endTime.toISOString(),
        hours: updated.hours.toString(),
        breakMinutes: updated.breakMinutes.toString(),
        color: updated.color ?? DEFAULT_SHIFT_COLOR,
      },
    };
  } catch {
    return { success: false, error: "Failed to update shift" };
  }
}

type ClearWeekResult = { success: true } | { success: false; error: string };

export async function clearWeekShiftsAction(weekStart: string): Promise<ClearWeekResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(weekStart);
  if (!parsed.success) {
    return { success: false, error: "Invalid week" };
  }

  const publishedCheck = await checkRosterNotPublished(session.user.id, weekStart);
  if (publishedCheck.blocked) return { success: false, error: publishedCheck.error };

  const [y, m, d] = weekStart.split("-").map(Number);
  const monday = new Date(y!, m! - 1, d!, 0, 0, 0, 0);
  const sunday = new Date(y!, m! - 1, (d ?? 0) + 6, 0, 0, 0, 0);

  try {
    await prisma.shift.deleteMany({
      where: {
        staff: { userId: session.user.id },
        shiftDate: {
          gte: monday,
          lte: sunday,
        },
      },
    });

    revalidatePath("/dashboard/schedule");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to clear shifts" };
  }
}

type ReplaceRosterShift = {
  staffId: string;
  dayOfWeek: (typeof DAYS)[number];
  startTimeStr: string;
  endTimeStr: string;
  hours: string;
  breakMinutes?: string;
};

type ReplaceRosterResult = { success: true } | { success: false; error: string };

/** Replace entire week's roster with new shifts. Used by AI agent and revert. */
export async function replaceRosterAction(
  weekStart: string,
  shifts: ReplaceRosterShift[]
): Promise<ReplaceRosterResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const weekParsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(weekStart);
  if (!weekParsed.success) {
    return { success: false, error: "Invalid week" };
  }

  const publishedCheck = await checkRosterNotPublished(session.user.id, weekStart);
  if (publishedCheck.blocked) return { success: false, error: publishedCheck.error };

  const clearResult = await clearWeekShiftsAction(weekStart);
  if (!clearResult.success) return clearResult;

  const staffIds = new Set(
    (
      await prisma.staff.findMany({
        where: { userId: session.user.id },
        select: { id: true },
      })
    ).map((s) => s.id)
  );

  const [y, m, d] = weekStart.split("-").map(Number);
  const monday = new Date(y!, m! - 1, d!, 0, 0, 0, 0);

  for (const s of shifts) {
    if (!staffIds.has(s.staffId)) continue;
    const timeStrRegex = /^\d{1,2}:\d{2}$/;
    if (
      !timeStrRegex.test(s.startTimeStr) ||
      !timeStrRegex.test(s.endTimeStr) ||
      !DAYS.includes(s.dayOfWeek)
    )
      continue;

    const shiftDate = getDateForDay(weekStart, s.dayOfWeek);
    const [sh, sm] = s.startTimeStr.split(":").map(Number);
    const [eh, em] = s.endTimeStr.split(":").map(Number);
    const startMins = (sh ?? 0) * 60 + (sm ?? 0);
    const endMins = (eh ?? 0) * 60 + (em ?? 0);
    const isOvernight = endMins <= startMins;
    const staff = await prisma.staff.findFirst({
      where: { id: s.staffId, userId: session.user.id },
    });
    if (!staff) continue;

    const dateOnly = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());
    const startTime = new Date(
      dateOnly.getFullYear(),
      dateOnly.getMonth(),
      dateOnly.getDate(),
      sh ?? 0,
      sm ?? 0,
      0,
      0
    );
    const endTime = new Date(
      dateOnly.getFullYear(),
      dateOnly.getMonth(),
      dateOnly.getDate() + (isOvernight ? 1 : 0),
      eh ?? 0,
      em ?? 0,
      0,
      0
    );
    const hoursNum = parseFloat(s.hours) || 0;
    const breakMins = Math.min(120, Math.max(0, parseFloat(s.breakMinutes ?? "0") || 0));

    const existing = await prisma.shift.findFirst({
      where: { staffId: s.staffId, shiftDate: dateOnly },
    });
    if (existing) continue;

    await prisma.shift.create({
      data: {
        staffId: s.staffId,
        shiftDate: dateOnly,
        startTime,
        endTime,
        hours: hoursNum,
        breakMinutes: breakMins,
        color: DEFAULT_SHIFT_COLOR,
        role: staff.role,
      },
    });
  }

  revalidatePath("/dashboard/schedule");
  return { success: true };
}
