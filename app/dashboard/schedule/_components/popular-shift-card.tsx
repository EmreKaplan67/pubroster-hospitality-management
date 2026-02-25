"use client";

import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

const DEFAULT_CARD_COLOR = "#e5e7eb";

export type PopularShiftData = {
  id: string;
  startTime: string;
  endTime: string;
  hours: string;
  breakMinutes: string;
  color?: string;
};

function CardContentInner({ shift }: { shift: PopularShiftData }) {
  const hasBreak = parseFloat(shift.breakMinutes) > 0;
  return (
    <>
      <span className="font-medium">
        {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
      </span>
      <span className="text-muted-foreground">
        {formatHoursDisplay(shift.hours)}h
        {hasBreak ? ` (${shift.breakMinutes}m break)` : " (no break)"}
      </span>
    </>
  );
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Dublin",
  });
}

/** Returns "HH:mm" in Europe/Dublin for passing to server actions */
export function formatTimeForServer(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Dublin",
  });
}

/** Format decimal hours as H.mm (e.g. 13.25 → "13.15" for 13h 15m) */
export function formatHoursDisplay(decimalHoursStr: string): string {
  const decimalHours = parseFloat(decimalHoursStr);
  const totalMins = Math.round(decimalHours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}.${m.toString().padStart(2, "0")}`;
}

type PopularShiftCardProps = {
  shift: PopularShiftData;
  onDelete?: (popularShiftId: string) => void;
};

export type AssignedShiftData = {
  id: string;
  staffId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  hours: string;
  breakMinutes: string;
  color?: string;
};

type ShiftCellCardProps = {
  shift: AssignedShiftData;
  onRemove?: (shiftId: string) => void;
  onEdit?: (shift: AssignedShiftData) => void;
  disabled?: boolean;
};

/** Compact shift display for table cells (assigned shifts) - draggable, click to edit */
export function ShiftCellCard({ shift, onRemove, onEdit, disabled }: ShiftCellCardProps) {
  const isOptimistic = shift.id.startsWith("temp-");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `assigned-shift-${shift.id}`,
    data: { assignedShift: shift },
    disabled: disabled || isOptimistic,
  });
  const bgColor = shift.color ?? DEFAULT_CARD_COLOR;
  const hasBreak = (shift.breakMinutes && parseFloat(shift.breakMinutes) > 0) ?? false;
  const canEdit = onEdit && !isOptimistic && !disabled;

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : { ...listeners, ...attributes })}
      className={`flex items-start gap-1 rounded border border-border px-2 py-1 text-sm ${disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"} ${isDragging ? "opacity-40" : ""}`}
      style={{ backgroundColor: bgColor }}
      onClick={canEdit ? () => onEdit(shift) : undefined}
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      onKeyDown={
        canEdit
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEdit(shift);
              }
            }
          : undefined
      }
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium">
          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
        </div>
        <div className="text-muted-foreground">
          {formatHoursDisplay(shift.hours)}h
          {hasBreak ? ` (${shift.breakMinutes}m break)` : " (no break)"}
        </div>
      </div>
      {onRemove && !isOptimistic && !disabled && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(shift.id);
          }}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-60 transition-colors hover:bg-destructive/20 hover:text-destructive hover:opacity-100"
          aria-label="Remove shift"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/** Overlay for dragging an assigned shift from the table */
export function AssignedShiftCardOverlay({ shift }: { shift: AssignedShiftData }) {
  const bgColor = shift.color ?? DEFAULT_CARD_COLOR;
  const hasBreak = (shift.breakMinutes && parseFloat(shift.breakMinutes) > 0) ?? false;
  return (
    <div
      className="flex flex-col gap-0.5 rounded border border-border px-3 py-2 text-sm shadow-lg min-w-40"
      style={{ backgroundColor: bgColor }}
    >
      <div className="font-medium">
        {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
      </div>
      <div className="text-muted-foreground text-xs">
        {formatHoursDisplay(shift.hours)}h
        {hasBreak ? ` (${shift.breakMinutes}m break)` : " (no break)"}
      </div>
    </div>
  );
}

/** Static card for DragOverlay preview (does not use useDraggable) */
export function PopularShiftCardOverlay({ shift }: { shift: PopularShiftData }) {
  const bgColor = shift.color ?? DEFAULT_CARD_COLOR;
  return (
    <Card className="py-0 gap-0 shadow-lg w-56 border-0" style={{ backgroundColor: bgColor }}>
      <CardContent className="py-2 px-3">
        <div className="flex flex-col gap-0.5 text-sm">
          <CardContentInner shift={shift} />
        </div>
      </CardContent>
    </Card>
  );
}

export function PopularShiftCard({ shift, onDelete }: PopularShiftCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `popular-shift-${shift.id}`,
    data: { shift },
  });

  const bgColor = shift.color ?? DEFAULT_CARD_COLOR;

  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group relative py-0 gap-0 cursor-grab active:cursor-grabbing border-0 ${isDragging ? "opacity-40" : ""}`}
      style={{ backgroundColor: bgColor }}
    >
      <CardContent className="py-2 px-3 pr-8">
        <div className="flex flex-col gap-0.5 text-sm">
          <CardContentInner shift={shift} />
        </div>
      </CardContent>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete(shift.id);
          }}
          className="absolute top-1.5 right-1.5 rounded p-1 text-muted-foreground opacity-60 transition-colors hover:bg-destructive/20 hover:text-destructive hover:opacity-100"
          aria-label="Delete popular shift"
        >
          <X className="size-3.5" />
        </button>
      )}
    </Card>
  );
}
