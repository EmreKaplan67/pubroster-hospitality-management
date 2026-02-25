/** Get Monday of the week for a given date (ISO week, Mon–Sun) */
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

/** Get previous Monday from a week start (YYYY-MM-DD) */
export function getPrevWeekStart(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00");
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

/** Get next Monday from a week start (YYYY-MM-DD) */
export function getNextWeekStart(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00");
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

/** Format week range for display, e.g. "10 – 16 Feb 2025" */
export function formatWeekRange(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(y!, m! - 1, d!);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startStr = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const endStr = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${startStr} – ${endStr}`;
}

/** Format a single day for table header, e.g. "Mon 10" */
export function formatDayHeader(weekStart: string, dayIndex: number): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const date = new Date(y!, m! - 1, (d ?? 0) + dayIndex);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
  });
}

/** Get ISO weekday (1=Mon .. 7=Sun) */
function getIsoDay(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

/** Get days for a month grid (Mon–Sun). Returns array of { date, iso, isCurrentMonth } */
export function getMonthGrid(year: number, month: number): { date: Date; iso: string; isCurrentMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = getIsoDay(first) - 1; // 0-6
  const daysInMonth = last.getDate();

  const result: { date: Date; iso: string; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  for (let i = 0; i < startPad; i++) {
    const d = new Date(year, month, -startPad + i + 1);
    result.push({
      date: d,
      iso: getWeekStart(d),
      isCurrentMonth: false,
    });
  }
  // Current month
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    result.push({
      date: d,
      iso: getWeekStart(d),
      isCurrentMonth: true,
    });
  }
  // Next month padding to complete 6 rows (42 cells)
  const total = result.length;
  const needed = Math.max(0, 42 - total);
  for (let i = 0; i < needed; i++) {
    const d = new Date(year, month + 1, i + 1);
    result.push({
      date: d,
      iso: getWeekStart(d),
      isCurrentMonth: false,
    });
  }
  return result;
}
