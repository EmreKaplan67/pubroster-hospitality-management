"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShiftCellCard } from "./popular-shift-card";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

const MAX_NAME_LENGTH = 25;

function truncateName(name: string): string {
  if (name.length <= MAX_NAME_LENGTH) return name;
  return `${name.slice(0, MAX_NAME_LENGTH)}…`;
}

type Staff = { id: string; name: string };

type PopularShift = {
  id: string;
  startTime: string;
  endTime: string;
  hours: string;
  breakMinutes: string;
};

type ShiftData = {
  id: string;
  staffId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  hours: string;
  breakMinutes: string;
  color?: string;
};

type ScheduleTableProps = {
  staff: Staff[];
  popularShifts: PopularShift[];
  shifts: ShiftData[];
  weekStart: string;
  onRemoveShift?: (shiftId: string) => void;
  onCellClick?: (staffId: string, staffName: string, day: (typeof DAYS)[number]) => void;
};

function getDayFromDate(shiftDate: string, weekStart: string): (typeof DAYS)[number] | null {
  const start = new Date(weekStart + "T12:00:00").getTime();
  const date = new Date(shiftDate + "T12:00:00").getTime();
  const diffDays = Math.round((date - start) / (24 * 60 * 60 * 1000));
  if (diffDays >= 0 && diffDays < 7) return DAYS[diffDays];
  return null;
}

function DroppableCell({
  id,
  staffId,
  staffName,
  day,
  isEmpty,
  onCellClick,
  children,
}: {
  id: string;
  staffId: string;
  staffName: string;
  day: string;
  isEmpty: boolean;
  onCellClick?: (staffId: string, staffName: string, day: (typeof DAYS)[number]) => void;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { staffId, day },
  });

  const handleClick = (e: React.MouseEvent) => {
    if (isEmpty && onCellClick) {
      e.preventDefault();
      onCellClick(staffId, staffName, day as (typeof DAYS)[number]);
    }
  };

  return (
    <TableCell
      className={`border-r last:border-r-0 cursor-pointer p-0 ${isOver ? "bg-primary/10" : ""}`}
    >
      <div
        ref={setNodeRef}
        className="min-h-12 w-full min-w-28 p-2"
        onClick={handleClick}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && isEmpty && onCellClick) {
            e.preventDefault();
            onCellClick(staffId, staffName, day as (typeof DAYS)[number]);
          }
        }}
        role={isEmpty && onCellClick ? "button" : undefined}
        tabIndex={isEmpty && onCellClick ? 0 : undefined}
      >
        {children}
      </div>
    </TableCell>
  );
}

export function ScheduleTable({ staff, popularShifts, shifts, weekStart, onRemoveShift, onCellClick }: ScheduleTableProps) {
  void popularShifts;

  const shiftMap = new Map<string, ShiftData>();
  for (const s of shifts) {
    const day = getDayFromDate(s.shiftDate, weekStart);
    if (day) shiftMap.set(`${s.staffId}-${day}`, s);
  }

  const dayTotals = DAYS.map((day) => {
    return shifts
      .filter((s) => getDayFromDate(s.shiftDate, weekStart) === day)
      .reduce((sum, s) => sum + parseFloat(s.hours), 0);
  });
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[180px] font-medium border-r bg-muted/50">
              Staff
            </TableHead>
            {DAYS.map((day) => (
              <TableHead key={day} className="min-w-[128px] font-medium border-r bg-muted/50">
                {day}
              </TableHead>
            ))}
            <TableHead className="min-w-[80px] font-medium bg-muted/50">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-muted-foreground text-center py-8">
                No staff members yet. Add staff to see them here.
              </TableCell>
            </TableRow>
          ) : (
            staff.map((s) => {
              const staffShifts = shifts.filter((sh) => sh.staffId === s.id);
              const staffTotal = staffShifts.reduce((sum, sh) => sum + parseFloat(sh.hours), 0);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium border-r">
                    {truncateName(s.name)}
                  </TableCell>
                  {DAYS.map((day) => {
                    const cellId = `cell-${s.id}-${day}`;
                    const shift = shiftMap.get(`${s.id}-${day}`);
                    return (
                      <DroppableCell
                        key={cellId}
                        id={cellId}
                        staffId={s.id}
                        staffName={s.name}
                        day={day}
                        isEmpty={!shift}
                        onCellClick={onCellClick}
                      >
                        {shift && <ShiftCellCard shift={shift} onRemove={onRemoveShift} />}
                      </DroppableCell>
                    );
                  })}
                  <TableCell className="tabular-nums text-muted-foreground">
                    {staffTotal > 0 ? staffTotal.toFixed(2) : "—"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-medium border-r bg-muted/50">
              Total
            </TableHead>
            {dayTotals.map((hours, i) => (
              <TableCell key={DAYS[i]} className="font-medium tabular-nums border-r last:border-r-0">
                {hours > 0 ? hours.toFixed(2) : "—"}
              </TableCell>
            ))}
            <TableCell className="font-medium tabular-nums">
              {weekTotal > 0 ? weekTotal.toFixed(2) : "—"}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
