"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateShiftAction } from "@/app/actions/shift";
import { formatTimeForServer } from "./popular-shift-card";
import { POPULAR_SHIFT_COLORS } from "@/lib/popular-shift-colors";

const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const TIME_MINUTES = ["00", "15", "30", "45"] as const;
const BREAK_MINUTES = [0, 15, 30, 45, 60, 75, 90, 120];

function computeHours(
  startHour: string,
  startMin: string,
  endHour: string,
  endMin: string,
  breakMinutes: string
): number {
  let startMins = parseInt(startHour, 10) * 60 + parseInt(startMin, 10);
  let endMins = parseInt(endHour, 10) * 60 + parseInt(endMin, 10);
  if (endMins <= startMins) {
    endMins += 24 * 60;
  }
  const breakMins = Math.max(0, parseFloat(breakMinutes) || 0);
  const diff = endMins - startMins - breakMins;
  return Math.max(0, diff) / 60;
}

function formatHoursDisplay(decimalHours: number): string {
  const totalMins = Math.round(decimalHours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}.${m.toString().padStart(2, "0")}`;
}

function parseTimeToParts(isoString: string): { hour: string; min: string } {
  const s = formatTimeForServer(isoString);
  const [h, m] = s.split(":");
  return {
    hour: h?.padStart(2, "0") ?? "00",
    min: m?.padStart(2, "0") ?? "00",
  };
}

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none md:text-sm";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function getDayFromDate(shiftDate: string, weekStart: string): (typeof DAYS)[number] | null {
  const start = new Date(weekStart + "T12:00:00").getTime();
  const date = new Date(shiftDate + "T12:00:00").getTime();
  const diffDays = Math.round((date - start) / (24 * 60 * 60 * 1000));
  if (diffDays >= 0 && diffDays < 7) return DAYS[diffDays];
  return null;
}

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

type EditShiftModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  shift: ShiftData;
  staffName: string;
  weekStart: string;
};

function EditShiftSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save changes"}
    </Button>
  );
}

export function EditShiftModal({
  open,
  onOpenChange,
  onSuccess,
  shift,
  staffName,
  weekStart,
}: EditShiftModalProps) {
  const startParts = parseTimeToParts(shift.startTime);
  const endParts = parseTimeToParts(shift.endTime);
  const day = getDayFromDate(shift.shiftDate, weekStart);

  const DEFAULT_COLOR = POPULAR_SHIFT_COLORS[0];
  const [startHour, setStartHour] = useState(startParts.hour);
  const [startMin, setStartMin] = useState(startParts.min);
  const [endHour, setEndHour] = useState(endParts.hour);
  const [endMin, setEndMin] = useState(endParts.min);
  const [breakMinutes, setBreakMinutes] = useState(
    String(Math.round(parseFloat(shift.breakMinutes) || 0))
  );
  const [color, setColor] = useState<(typeof POPULAR_SHIFT_COLORS)[number]>(
    shift.color && (POPULAR_SHIFT_COLORS as readonly string[]).includes(shift.color)
      ? (shift.color as (typeof POPULAR_SHIFT_COLORS)[number])
      : DEFAULT_COLOR
  );

  useEffect(() => {
    if (open) {
      const s = parseTimeToParts(shift.startTime);
      const e = parseTimeToParts(shift.endTime);
      setStartHour(s.hour);
      setStartMin(s.min);
      setEndHour(e.hour);
      setEndMin(e.min);
      setBreakMinutes(String(Math.round(parseFloat(shift.breakMinutes) || 0)));
      setColor(
        shift.color && (POPULAR_SHIFT_COLORS as readonly string[]).includes(shift.color)
          ? (shift.color as (typeof POPULAR_SHIFT_COLORS)[number])
          : DEFAULT_COLOR
      );
    }
  }, [open, shift.startTime, shift.endTime, shift.breakMinutes, shift.color]);

  const hours = computeHours(
    startHour,
    startMin,
    endHour,
    endMin,
    breakMinutes
  );
  const startTime = `${startHour}:${startMin}`;
  const endTime = `${endHour}:${endMin}`;

  const [state, formAction] = useActionState(
    updateShiftAction as (
      _prev: { success: true; shift?: unknown } | { success: false; error: string } | null,
      formData: FormData
    ) => Promise<{ success: true; shift?: unknown } | { success: false; error: string }>,
    null
  );

  const error = state && !state.success ? state.error : null;
  const hasHandledSuccess = useRef(false);

  useEffect(() => {
    if (state?.success && !hasHandledSuccess.current) {
      hasHandledSuccess.current = true;
      onOpenChange(false);
      onSuccess?.();
    }
    if (!state?.success) {
      hasHandledSuccess.current = false;
    }
  }, [state, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[min(28rem,calc(100vw-2rem))]"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit shift</DialogTitle>
          <DialogDescription>
            Edit shift for {staffName} on {day ?? shift.shiftDate}.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="shiftId" value={shift.id} />
          <input type="hidden" name="startTimeStr" value={startTime} />
          <input type="hidden" name="endTimeStr" value={endTime} />
          <input type="hidden" name="breakMinutes" value={breakMinutes} />
          <input type="hidden" name="hours" value={hours.toFixed(2)} />
          <input type="hidden" name="color" value={color} />

          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel>Start Time (24-hour)</FieldLabel>
                <div className="flex gap-2">
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className={selectClassName}
                    aria-label="Start hour"
                  >
                    {HOURS_24.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="flex items-center text-muted-foreground">:</span>
                  <select
                    value={startMin}
                    onChange={(e) => setStartMin(e.target.value)}
                    className={selectClassName}
                    aria-label="Start minute"
                  >
                    {TIME_MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field>
                <FieldLabel>End Time (24-hour)</FieldLabel>
                <div className="flex gap-2">
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className={selectClassName}
                    aria-label="End hour"
                  >
                    {HOURS_24.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="flex items-center text-muted-foreground">:</span>
                  <select
                    value={endMin}
                    onChange={(e) => setEndMin(e.target.value)}
                    className={selectClassName}
                    aria-label="End minute"
                  >
                    {TIME_MINUTES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-shift-break-minutes">Break</FieldLabel>
                <select
                  id="edit-shift-break-minutes"
                  name="breakMinutes"
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(e.target.value)}
                  className={selectClassName}
                  aria-label="Break duration"
                >
                  {BREAK_MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m === 0
                        ? "No break"
                        : m === 60
                          ? "1 hour"
                          : m === 120
                            ? "2 hours"
                            : `${m} minutes`}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel>Color</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SHIFT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`size-8 rounded-full border-2 transition-all ${
                        color === c
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                      aria-pressed={color === c}
                    />
                  ))}
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-shift-hours">Hours</FieldLabel>
                <Input
                  id="edit-shift-hours"
                  type="text"
                  value={formatHoursDisplay(hours)}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  aria-readonly="true"
                  aria-label="Calculated hours (read-only)"
                />
              </Field>
            </FieldGroup>
          </FieldSet>
          {error && (
            <div role="alert" className="text-destructive text-sm">
              {error}
            </div>
          )}
          <DialogFooter showCloseButton={false}>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <EditShiftSubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
