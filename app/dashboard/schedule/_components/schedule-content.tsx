"use client";

import { useState, useOptimistic, startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MeasuringStrategy,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

function customCollisionDetection(args: Parameters<typeof pointerWithin>[0]) {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  return rectIntersection(args);
}
import { Button } from "@/components/ui/button";
import { ScheduleTable } from "./schedule-table";
import {
  PopularShiftCard,
  PopularShiftCardOverlay,
  AssignedShiftCardOverlay,
  formatTimeForServer,
  type PopularShiftData,
} from "./popular-shift-card";
import {
  assignShiftAction,
  moveShiftAction,
  removeShiftAction,
  clearWeekShiftsAction,
} from "@/app/actions/shift";
import { deletePopularShiftAction } from "@/app/actions/popular-shift";
import { AddPopularShiftModal } from "./add-popular-shift-modal";
import { AddShiftToCellModal } from "./add-shift-to-cell-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Staff = { id: string; name: string };

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

type ScheduleContentProps = {
  staff: Staff[];
  popularShifts: PopularShiftData[];
  shifts: ShiftData[];
  weekStart: string;
};

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function getShiftDateForDay(weekStart: string, day: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const dayIndex = DAYS.indexOf(day as (typeof DAYS)[number]);
  const date = new Date(y!, m! - 1, (d ?? 0) + dayIndex);
  return date.toISOString().slice(0, 10);
}

export function ScheduleContent({
  staff,
  popularShifts,
  shifts,
  weekStart,
}: ScheduleContentProps) {
  const [mounted, setMounted] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalKey, setAddModalKey] = useState(0);
  const [clearWeekOpen, setClearWeekOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const [addToCellModal, setAddToCellModal] = useState<{
    staffId: string;
    staffName: string;
    day: (typeof DAYS)[number];
  } | null>(null);
  const [activePopularShift, setActivePopularShift] =
    useState<PopularShiftData | null>(null);
  const [activeAssignedShift, setActiveAssignedShift] =
    useState<ShiftData | null>(null);
  const router = useRouter();

  type OptimisticUpdate =
    | ShiftData
    | { type: "remove"; shiftId: string }
    | {
        type: "move";
        shiftId: string;
        newStaffId: string;
        newShiftDate: string;
        shift: ShiftData;
      };

  const [optimisticShifts, addOptimisticUpdate] = useOptimistic(
    shifts,
    (state, update: OptimisticUpdate) => {
      if ("type" in update && update.type === "remove") {
        return state.filter((s) => s.id !== update.shiftId);
      }
      if ("type" in update && update.type === "move") {
        return state.map((s) =>
          s.id === update.shiftId
            ? {
                ...update.shift,
                staffId: update.newStaffId,
                shiftDate: update.newShiftDate,
              }
            : s,
        );
      }
      return [...state, update as ShiftData];
    },
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const measuring = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.assignedShift) {
      setActiveAssignedShift(data.assignedShift as ShiftData);
      setActivePopularShift(null);
    } else if (data?.shift) {
      setActivePopularShift(data.shift as PopularShiftData);
      setActiveAssignedShift(null);
    } else {
      setActivePopularShift(null);
      setActiveAssignedShift(null);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActivePopularShift(null);
    setActiveAssignedShift(null);

    if (!over?.data?.current) return;

    const { staffId, day } = over.data.current as {
      staffId: string;
      day: string;
    };
    if (!day || !DAYS.includes(day as (typeof DAYS)[number])) return;

    const newShiftDate = getShiftDateForDay(weekStart, day);

    const assignedShift = active.data.current?.assignedShift as
      | ShiftData
      | undefined;
    if (assignedShift) {
      if (
        assignedShift.staffId === staffId &&
        assignedShift.shiftDate === newShiftDate
      )
        return;

      startTransition(() => {
        addOptimisticUpdate({
          type: "move",
          shiftId: assignedShift.id,
          newStaffId: staffId,
          newShiftDate,
          shift: assignedShift,
        });
      });

      const result = await moveShiftAction({
        shiftId: assignedShift.id,
        newStaffId: staffId,
        weekStart,
        dayOfWeek: day as (typeof DAYS)[number],
      });
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error);
        router.refresh();
      }
      return;
    }

    const shift = active.data.current?.shift as PopularShiftData | undefined;
    if (shift) {
      const optimisticShift: ShiftData = {
        id: `temp-${Date.now()}`,
        staffId,
        shiftDate: newShiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
        hours: shift.hours,
        breakMinutes: shift.breakMinutes,
        color: shift.color,
      };
      startTransition(() => {
        addOptimisticUpdate(optimisticShift);
      });

      const result = await assignShiftAction({
        staffId,
        popularShiftId: shift.id,
        weekStart,
        dayOfWeek: day as (typeof DAYS)[number],
        startTimeStr: formatTimeForServer(shift.startTime),
        endTimeStr: formatTimeForServer(shift.endTime),
      });
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error);
        router.refresh();
      }
    }
  }

  function handleDragCancel() {
    setActivePopularShift(null);
    setActiveAssignedShift(null);
  }

  async function handleClearWeek() {
    setClearWeekOpen(false);
    const result = await clearWeekShiftsAction(weekStart);
    if (result.success) {
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function handleCellClick(
    staffId: string,
    staffName: string,
    day: (typeof DAYS)[number],
  ) {
    setAddToCellModal({ staffId, staffName, day });
  }

  async function handleDeletePopularShift(popularShiftId: string) {
    const result = await deletePopularShiftAction(popularShiftId);
    if (result.success) {
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleRemoveShift(shiftId: string) {
    startTransition(() => {
      addOptimisticUpdate({ type: "remove", shiftId });
    });
    const result = await removeShiftAction(shiftId);
    if (result.success) {
      router.refresh();
    } else {
      toast.error(result.error);
      router.refresh();
    }
  }

  if (!mounted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-8 w-28 rounded-md bg-muted animate-pulse" />
          <div className="h-8 w-28 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="rounded-lg border border-border h-64 bg-muted/30 animate-pulse" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      measuring={measuring}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="size-4 mr-1" />
            Add New Shift
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setClearWeekOpen(true)}
          >
            <Trash2 className="size-4 mr-1" />
            Clear this week
          </Button>

          <div className="flex flex-wrap gap-3">
            {popularShifts.map((ps) => (
              <PopularShiftCard
                key={ps.id}
                shift={ps}
                onDelete={handleDeletePopularShift}
              />
            ))}
          </div>
        </div>

        <ScheduleTable
          staff={staff}
          popularShifts={popularShifts}
          shifts={optimisticShifts}
          weekStart={weekStart}
          onRemoveShift={handleRemoveShift}
          onCellClick={handleCellClick}
        />

        <DragOverlay>
          {activeAssignedShift ? (
            <AssignedShiftCardOverlay shift={activeAssignedShift} />
          ) : activePopularShift ? (
            <PopularShiftCardOverlay shift={activePopularShift} />
          ) : null}
        </DragOverlay>

        <AddPopularShiftModal
          key={addModalKey}
          open={addModalOpen}
          onOpenChange={(open) => {
            setAddModalOpen(open);
            if (!open) setAddModalKey((k) => k + 1);
          }}
          onSuccess={() => router.refresh()}
        />

        {addToCellModal && (
          <AddShiftToCellModal
            open={!!addToCellModal}
            onOpenChange={(open) => !open && setAddToCellModal(null)}
            onSuccess={() => router.refresh()}
            staffId={addToCellModal.staffId}
            staffName={addToCellModal.staffName}
            day={addToCellModal.day}
            weekStart={weekStart}
          />
        )}

        <Dialog open={clearWeekOpen} onOpenChange={setClearWeekOpen}>
          <DialogContent showCloseButton={true}>
            <DialogHeader>
              <DialogTitle>Clear this week</DialogTitle>
              <DialogDescription>
                Are you sure? This will remove all assigned shifts for this
                week. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter showCloseButton={false}>
              <Button variant="outline" onClick={() => setClearWeekOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClearWeek}>
                Yes, clear all
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}
