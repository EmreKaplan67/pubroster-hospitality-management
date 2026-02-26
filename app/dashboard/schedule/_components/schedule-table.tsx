"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDayHeader } from "@/lib/schedule-week";
import { ShiftCellCard } from "./popular-shift-card";
import { GripVertical } from "lucide-react";

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
  isEditable?: boolean;
  canReorderRows?: boolean;
  onRemoveShift?: (shiftId: string) => void;
  onCellClick?: (staffId: string, staffName: string, day: (typeof DAYS)[number]) => void;
  onShiftClick?: (shift: ShiftData) => void;
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
  disabled,
  onCellClick,
  children,
}: {
  id: string;
  staffId: string;
  staffName: string;
  day: string;
  isEmpty: boolean;
  disabled?: boolean;
  onCellClick?: (staffId: string, staffName: string, day: (typeof DAYS)[number]) => void;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { staffId, day },
    disabled,
  });

  const handleClick = (e: React.MouseEvent) => {
    if (!disabled && isEmpty && onCellClick) {
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
          if (!disabled && (e.key === "Enter" || e.key === " ") && isEmpty && onCellClick) {
            e.preventDefault();
            onCellClick(staffId, staffName, day as (typeof DAYS)[number]);
          }
        }}
        role={!disabled && isEmpty && onCellClick ? "button" : undefined}
        tabIndex={!disabled && isEmpty && onCellClick ? 0 : undefined}
      >
        {children}
      </div>
    </TableCell>
  );
}

function SortableTableRow({
  staffMember,
  shiftMap,
  shifts,
  weekStart,
  isEditable,
  onRemoveShift,
  onCellClick,
  onShiftClick,
}: {
  staffMember: Staff;
  shiftMap: Map<string, ShiftData>;
  shifts: ShiftData[];
  weekStart: string;
  isEditable: boolean;
  onRemoveShift?: (shiftId: string) => void;
  onCellClick?: (staffId: string, staffName: string, day: (typeof DAYS)[number]) => void;
  onShiftClick?: (shift: ShiftData) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: staffMember.id,
  });
  const staffShifts = shifts.filter((sh) => sh.staffId === staffMember.id);
  const staffTotal = staffShifts.reduce((sum, sh) => sum + parseFloat(sh.hours), 0);
  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : undefined;

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "opacity-50 bg-muted/50" : ""}>
      <TableCell className="font-medium border-r w-10 p-0 align-middle">
        <div
          {...attributes}
          {...listeners}
          className="flex h-full min-h-12 cursor-grab active:cursor-grabbing items-center justify-center text-muted-foreground touch-none"
          aria-label="Drag to reorder row"
        >
          <GripVertical className="size-4" />
        </div>
      </TableCell>
      <TableCell className="font-medium border-r">
        {truncateName(staffMember.name)}
      </TableCell>
      {DAYS.map((day) => {
        const cellId = `cell-${staffMember.id}-${day}`;
        const shift = shiftMap.get(`${staffMember.id}-${day}`);
        return (
          <DroppableCell
            key={cellId}
            id={cellId}
            staffId={staffMember.id}
            staffName={staffMember.name}
            day={day}
            isEmpty={!shift}
            disabled={!isEditable}
            onCellClick={onCellClick}
          >
            {shift && (
              <ShiftCellCard
                shift={shift}
                onRemove={onRemoveShift}
                onEdit={onShiftClick}
                disabled={!isEditable}
              />
            )}
          </DroppableCell>
        );
      })}
      <TableCell className="tabular-nums text-muted-foreground">
        {staffTotal > 0 ? staffTotal.toFixed(2) : "—"}
      </TableCell>
    </TableRow>
  );
}

function NormalTableRow({
  staffMember,
  shiftMap,
  shifts,
  weekStart,
  isEditable,
  onRemoveShift,
  onCellClick,
  onShiftClick,
}: {
  staffMember: Staff;
  shiftMap: Map<string, ShiftData>;
  shifts: ShiftData[];
  weekStart: string;
  isEditable: boolean;
  onRemoveShift?: (shiftId: string) => void;
  onCellClick?: (staffId: string, staffName: string, day: (typeof DAYS)[number]) => void;
  onShiftClick?: (shift: ShiftData) => void;
}) {
  const staffShifts = shifts.filter((sh) => sh.staffId === staffMember.id);
  const staffTotal = staffShifts.reduce((sum, sh) => sum + parseFloat(sh.hours), 0);
  return (
    <TableRow>
      <TableCell className="font-medium border-r">
        {truncateName(staffMember.name)}
      </TableCell>
      {DAYS.map((day) => {
        const cellId = `cell-${staffMember.id}-${day}`;
        const shift = shiftMap.get(`${staffMember.id}-${day}`);
        return (
          <DroppableCell
            key={cellId}
            id={cellId}
            staffId={staffMember.id}
            staffName={staffMember.name}
            day={day}
            isEmpty={!shift}
            disabled={!isEditable}
            onCellClick={onCellClick}
          >
            {shift && (
              <ShiftCellCard
                shift={shift}
                onRemove={onRemoveShift}
                onEdit={onShiftClick}
                disabled={!isEditable}
              />
            )}
          </DroppableCell>
        );
      })}
      <TableCell className="tabular-nums text-muted-foreground">
        {staffTotal > 0 ? staffTotal.toFixed(2) : "—"}
      </TableCell>
    </TableRow>
  );
}

export function ScheduleTable({ staff, popularShifts, shifts, weekStart, isEditable = true, canReorderRows = false, onRemoveShift, onCellClick, onShiftClick }: ScheduleTableProps) {
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

  const RowComponent = canReorderRows ? SortableTableRow : NormalTableRow;

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {canReorderRows && (
              <TableHead className="w-10 p-0 font-medium border-r bg-muted/50" />
            )}
            <TableHead className="min-w-[180px] font-medium border-r bg-muted/50">
              Staff
            </TableHead>
            {DAYS.map((day, i) => (
              <TableHead key={day} className="min-w-[128px] font-medium border-r bg-muted/50">
                {formatDayHeader(weekStart, i)}
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
              <TableCell colSpan={canReorderRows ? 10 : 9} className="text-muted-foreground text-center py-8">
                No staff members yet. Add staff to see them here.
              </TableCell>
            </TableRow>
          ) : canReorderRows ? (
            <SortableContext items={staff.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {staff.map((s) => (
                <RowComponent
                  key={s.id}
                  staffMember={s}
                  shiftMap={shiftMap}
                  shifts={shifts}
                  weekStart={weekStart}
                  isEditable={isEditable}
                  onRemoveShift={onRemoveShift}
                  onCellClick={onCellClick}
                  onShiftClick={onShiftClick}
                />
              ))}
            </SortableContext>
          ) : (
            staff.map((s) => (
              <RowComponent
                key={s.id}
                staffMember={s}
                shiftMap={shiftMap}
                shifts={shifts}
                weekStart={weekStart}
                isEditable={isEditable}
                onRemoveShift={onRemoveShift}
                onCellClick={onCellClick}
                onShiftClick={onShiftClick}
              />
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            {canReorderRows && <TableHead className="font-medium border-r bg-muted/50" />}
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
