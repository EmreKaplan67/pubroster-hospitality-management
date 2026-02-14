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
import { toast } from "sonner";
import { createPopularShiftAction } from "@/app/actions/popular-shift";
import { POPULAR_SHIFT_COLORS } from "@/lib/popular-shift-colors";

const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const TIME_MINUTES = ["00", "15", "30", "45"] as const;

// Break: 0, 15, 30, 45, 60, 75, 90, 120 (2 hours max; skip 105)
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
    endMins += 24 * 60; // overnight shift (e.g. 23:00 – 01:00)
  }
  const breakMins = Math.max(0, parseFloat(breakMinutes) || 0);
  const diff = endMins - startMins - breakMins;
  return Math.max(0, diff) / 60;
}

/** Format decimal hours as H.mm (e.g. 13.25 → "13.15" for 13h 15m) */
function formatHoursDisplay(decimalHours: number): string {
  const totalMins = Math.round(decimalHours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h}.${m.toString().padStart(2, "0")}`;
}

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none md:text-sm";

type AddPopularShiftModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

function AddShiftSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding..." : "Add Shift"}
    </Button>
  );
}

export function AddPopularShiftModal({
  open,
  onOpenChange,
  onSuccess,
}: AddPopularShiftModalProps) {
  const [startHour, setStartHour] = useState("09");
  const [startMin, setStartMin] = useState("00");
  const [endHour, setEndHour] = useState("17");
  const [endMin, setEndMin] = useState("00");
  const [breakMinutes, setBreakMinutes] = useState("0");
  const [color, setColor] = useState<string>(POPULAR_SHIFT_COLORS[0]);

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
    createPopularShiftAction,
    null as { success: true } | { success: false; error: string } | null
  );

  const error = state && !state.success ? state.error : null;
  const hasHandledSuccess = useRef(false);

  useEffect(() => {
    if (state?.success && !hasHandledSuccess.current) {
      hasHandledSuccess.current = true;
      toast.success("Shift added successfully");
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
          <DialogTitle>Add New Shift</DialogTitle>
          <DialogDescription>
            Create a new popular shift template for quick scheduling.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
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
                  <input type="hidden" name="startTime" value={startTime} />
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
                  <input type="hidden" name="endTime" value={endTime} />
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="shift-break-minutes">Break</FieldLabel>
                <select
                  id="shift-break-minutes"
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
                <FieldLabel htmlFor="shift-hours">Hours</FieldLabel>
                <Input
                  id="shift-hours"
                  type="text"
                  value={formatHoursDisplay(hours)}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  aria-readonly="true"
                  aria-label="Calculated hours (read-only)"
                />
                <input type="hidden" name="hours" value={hours.toFixed(2)} />
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
            <AddShiftSubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
