import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ScheduleContent } from "./_components/schedule-content";

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export default async function SchedulePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  const weekStart = getWeekStart(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const [staff, popularShifts, shifts] = await Promise.all([
    prisma.staff.findMany({
      where: { userId: session.user.id, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
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
  ]);

  const serializedStaff = staff.map((s) => ({
    id: s.id,
    name: s.name,
  }));

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">
          Manage your schedule and shifts.
        </p>
      </div>
      <ScheduleContent
        staff={serializedStaff}
        popularShifts={serializedPopularShifts}
        shifts={serializedShifts}
        weekStart={weekStart}
      />
    </div>
  );
}