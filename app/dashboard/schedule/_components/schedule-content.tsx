"use client";

import { useState, useOptimistic, startTransition, useEffect } from "react";
import { arrayMove } from "@dnd-kit/sortable";
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
import { reorderStaffAction } from "@/app/actions/staff";
import { deletePopularShiftAction } from "@/app/actions/popular-shift";
import { AddPopularShiftModal } from "./add-popular-shift-modal";
import { AddShiftToCellModal } from "./add-shift-to-cell-modal";
import { EditShiftModal } from "./edit-shift-modal";
import { PublishRosterModal } from "./publish-roster-modal";
import { EditRosterModal } from "./edit-roster-modal";
import { WeekNavigator } from "./week-navigator";
import { unpublishRosterAction } from "@/app/actions/publish-roster";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Download, Send, Pencil } from "lucide-react";
import { downloadRosterPdf } from "@/lib/download-roster-pdf";
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

type StaffWithEmail = { id: string; name: string; email: string };

type ScheduleContentProps = {
  staff: Staff[];
  staffWithEmail: StaffWithEmail[];
  popularShifts: PopularShiftData[];
  shifts: ShiftData[];
  weekStart: string;
  isPublished: boolean;
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
  staffWithEmail,
  popularShifts,
  shifts,
  weekStart,
  isPublished,
}: ScheduleContentProps) {
  const [mounted, setMounted] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalKey, setAddModalKey] = useState(0);
  const [clearWeekOpen, setClearWeekOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [editRosterModalOpen, setEditRosterModalOpen] = useState(false);
  const [unpublishPending, setUnpublishPending] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const [addToCellModal, setAddToCellModal] = useState<{
    staffId: string;
    staffName: string;
    day: (typeof DAYS)[number];
  } | null>(null);
  const [editShiftModal, setEditShiftModal] = useState<ShiftData | null>(null);
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

  const [optimisticStaff, addOptimisticStaff] = useOptimistic(
    staff,
    (state, orderedIds: string[]) => {
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
      return [...state].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
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

    if (isPublished) return;
    if (!over) return;

    const staffIds = new Set(staff.map((s) => s.id));
    const isStaffId = (id: unknown): id is string =>
      typeof id === "string" && staffIds.has(id);

    const overId = String(over.id);

    // Resolve over to a staff id (either direct row drop or cell drop)
    let overStaffId: string | null = null;
    if (staffIds.has(overId)) {
      overStaffId = overId;
    } else if (overId.startsWith("cell-")) {
      const parts = overId.split("-");
      const dayPart = parts[parts.length - 1];
      if (DAYS.includes(dayPart as (typeof DAYS)[number])) {
        const uuid = parts.slice(1, -1).join("-");
        if (staffIds.has(uuid)) overStaffId = uuid;
      }
    }

    // Row reorder: we're dragging a staff row and over another row
    if (isStaffId(active.id) && overStaffId && active.id !== overStaffId) {
      const oldIndex = optimisticStaff.findIndex((s) => s.id === active.id);
      const newIndex = optimisticStaff.findIndex((s) => s.id === overStaffId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(optimisticStaff, oldIndex, newIndex);
      const orderedIds = reordered.map((s) => s.id);
      startTransition(() => addOptimisticStaff(orderedIds));
      const result = await reorderStaffAction(orderedIds);
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.error);
        router.refresh();
      }
      return;
    }

    // Shift drop: over is a cell (has staffId and day in data)
    if (!over.data?.current) return;
    const cellData = over.data.current as { staffId?: string; day?: string };
    const { staffId, day } = cellData;
    if (!staffId || !day || !DAYS.includes(day as (typeof DAYS)[number])) return;

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

  async function handleUnpublishRoster() {
    setUnpublishPending(true);
    const result = await unpublishRosterAction(weekStart);
    setUnpublishPending(false);
    setEditRosterModalOpen(false);
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

  function handleShiftClick(shift: ShiftData) {
    setEditShiftModal(shift);
  }

  const staffNameById = new Map(staff.map((s) => [s.id, s.name]));

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
        {/* Week navigator */}
        <div className="flex justify-end">
          <WeekNavigator weekStart={weekStart} />
        </div>

        {/* Popular shifts: Add New Shift, Clear week, and drag-to-schedule cards */}
        {!isPublished && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quick add — drag to schedule
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setAddModalOpen(true)}>
                <Plus className="size-4 mr-1.5" />
                Add New Shift
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setClearWeekOpen(true)}
              >
                <Trash2 className="size-4 mr-1.5" />
                Clear week
              </Button>
              {popularShifts.map((ps) => (
                <PopularShiftCard
                  key={ps.id}
                  shift={ps}
                  onDelete={handleDeletePopularShift}
                />
              ))}
            </div>
          </div>
        )}

        <ScheduleTable
          staff={optimisticStaff}
          popularShifts={popularShifts}
          shifts={optimisticShifts}
          weekStart={weekStart}
          isEditable={!isPublished}
          canReorderRows={!isPublished}
          onRemoveShift={isPublished ? undefined : handleRemoveShift}
          onCellClick={isPublished ? undefined : handleCellClick}
          onShiftClick={isPublished ? undefined : handleShiftClick}
        />

        {/* Actions below table */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isPublished ? (
              <Button
                variant="outline"
                onClick={() => setEditRosterModalOpen(true)}
              >
                <Pencil className="size-4 mr-1.5" />
                Edit roster
              </Button>
            ) : (
              <Button onClick={() => setPublishModalOpen(true)}>
                <Send className="size-4 mr-1.5" />
                Publish
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                downloadRosterPdf(staff, optimisticShifts, weekStart)
              }
            >
              <Download className="size-4 mr-1.5" />
              Download PDF
            </Button>
          </div>
          {!isPublished && (
            <p className="text-xs text-muted-foreground max-w-md text-right">
              Beta (free): This version has limited email capacity. Publish may
              not work if the sending limit is reached.
            </p>
          )}
        </div>

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

        <PublishRosterModal
          open={publishModalOpen}
          onOpenChange={setPublishModalOpen}
          staff={staffWithEmail}
          staffForPdf={staff}
          shifts={optimisticShifts}
          weekStart={weekStart}
          onSuccess={() => router.refresh()}
        />

        <EditRosterModal
          open={editRosterModalOpen}
          onOpenChange={setEditRosterModalOpen}
          onConfirm={handleUnpublishRoster}
          pending={unpublishPending}
        />

        {editShiftModal && (
          <EditShiftModal
            open={!!editShiftModal}
            onOpenChange={(open) => !open && setEditShiftModal(null)}
            onSuccess={() => router.refresh()}
            shift={editShiftModal}
            staffName={staffNameById.get(editShiftModal.staffId) ?? "Staff"}
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
