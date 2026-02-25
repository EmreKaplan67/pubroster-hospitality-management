"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { publishRosterAction } from "@/app/actions/publish-roster";
import { sendRosterEmailsAction } from "@/app/actions/send-roster-email";

type StaffWithEmail = { id: string; name: string; email: string };
type Staff = { id: string; name: string };
type Shift = {
  staffId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  hours: string;
};

type PublishRosterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffWithEmail[];
  staffForPdf: Staff[];
  shifts: Shift[];
  weekStart: string;
  onSuccess?: () => void;
};

export function PublishRosterModal({
  open,
  onOpenChange,
  staff,
  staffForPdf,
  shifts,
  weekStart,
  onSuccess,
}: PublishRosterModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const allIds = useMemo(() => staff.map((s) => s.id), [staff]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  useEffect(() => {
    if (open) {
      if (staff.length > 0) setSelectedIds(new Set(allIds));
      setPublishError(null);
    }
  }, [open, allIds, staff.length]);

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(allIds) : new Set());
  }

  function handleToggle(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function handlePublish() {
    const toSend = staff.filter((s) => selectedIds.has(s.id));
    if (toSend.length === 0) {
      toast.error("Select at least one recipient");
      return;
    }

    setPublishError(null);
    setPending(true);
    try {
      // Send emails first — if this fails, roster stays editable
      const sendResult = await sendRosterEmailsAction(
        weekStart,
        toSend,
        staffForPdf,
        shifts
      );
      if (!sendResult.success) {
        setPublishError(sendResult.error);
        return;
      }

      const result = await publishRosterAction(weekStart);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        `Roster published! ${toSend.length} email${toSend.length === 1 ? "" : "s"} sent with PDF attachment.`
      );
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setPublishError(
        "Something went wrong. Please try again or use Download PDF to share the roster manually."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Publish roster</DialogTitle>
          <DialogDescription>
            Select who should receive the roster by email. After publishing, this
            week&apos;s roster will be locked for editing until you click Edit.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto rounded-md border border-border p-3">
          <label className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2 -my-1.5">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              aria-label="Select all"
            />
            <span className="font-medium text-sm">Select all</span>
          </label>
          {staff.map((s) => (
            <label
              key={s.id}
              className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5 -mx-2 -my-1.5"
            >
              <Checkbox
                checked={selectedIds.has(s.id)}
                onCheckedChange={(checked) => handleToggle(s.id, !!checked)}
                aria-label={`Select ${s.name}`}
              />
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-sm truncate">{s.name}</span>
                <span className="text-muted-foreground text-xs truncate">
                  {s.email}
                </span>
              </div>
            </label>
          ))}
        </div>

        {staff.length === 0 && (
          <p className="text-muted-foreground text-sm">
            No staff with email addresses. Add emails in the Staff section to send
            rosters.
          </p>
        )}

        {publishError && (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-3 text-sm text-amber-900 dark:text-amber-200"
          >
            <p className="font-medium">Publish didn&apos;t work</p>
            <p className="mt-1 text-amber-800 dark:text-amber-300/90">
              {publishError}
            </p>
            <p className="mt-2 text-xs opacity-90">
              You can still use Download PDF to share the roster with your team.
            </p>
          </div>
        )}

        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={pending || staff.length === 0}>
            {pending ? "Sending…" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
