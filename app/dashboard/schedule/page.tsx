import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getWeekStart } from "@/lib/schedule-week";
import { ScheduleContent } from "./_components/schedule-content";

function parseWeekParam(week: string | undefined): string | null {
  if (!week || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return null;
  const d = new Date(week + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  const day = d.getDay();
  if (day !== 1) return null;
  return week;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  const params = await searchParams;
  const weekStart =
    parseWeekParam(params.week) ?? getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const weekStartDate = new Date(weekStart + "T12:00:00");

  const [staff, popularShifts, shifts, publishedRoster] = await Promise.all([
    prisma.staff.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, email: true },
    }),
    prisma.popularShift.findMany(),
    prisma.shift.findMany({
      where: {
        staff: { userId: session.user.id },
        shiftDate: {
          gte: new Date(weekStart),
          lte: weekEnd,
        },
      },
      orderBy: { shiftDate: "asc" },
    }),
    prisma.publishedRoster.findUnique({
      where: {
        userId_weekStart: {
          userId: session.user.id,
          weekStart: weekStartDate,
        },
      },
    }),
  ]);

  const staffWithEmail = staff.filter((s): s is typeof s & { email: string } =>
    Boolean(s.email?.trim())
  );

  const serializedStaff = staff.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const serializedStaffWithEmail = staffWithEmail.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email!,
  }));

  const isPublished = !!publishedRoster;

  const serializedPopularShifts = popularShifts.map((ps) => ({
    id: ps.id,
    startTime: ps.startTime.toISOString(),
    endTime: ps.endTime.toISOString(),
    hours: ps.hours.toString(),
    breakMinutes: ps.breakMinutes.toString(),
    color: ps.color ?? "#e5e7eb",
  }));

  const serializedShifts = shifts.map((s) => ({
    id: s.id,
    staffId: s.staffId,
    shiftDate: s.shiftDate.toISOString().slice(0, 10),
    startTime: s.startTime.toISOString(),
    endTime: s.endTime.toISOString(),
    hours: s.hours.toString(),
    breakMinutes: s.breakMinutes.toString(),
    color: s.color ?? "#e5e7eb",
  }));

  return (
    <ScheduleContent
      staff={serializedStaff}
      staffWithEmail={serializedStaffWithEmail}
      popularShifts={serializedPopularShifts}
      shifts={serializedShifts}
      weekStart={weekStart}
      isPublished={isPublished}
    />
  );
}