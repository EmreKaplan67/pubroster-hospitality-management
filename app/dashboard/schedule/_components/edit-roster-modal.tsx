"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type EditRosterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending?: boolean;
};

export function EditRosterModal({
  open,
  onOpenChange,
  onConfirm,
  pending = false,
}: EditRosterModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true}>
        <DialogHeader>
          <DialogTitle>Edit roster</DialogTitle>
          <DialogDescription>
            Are you sure you want to enable editing? Recipients may have already
            received the published roster. You can publish again after making
            changes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton={false}>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? "Unlocking…" : "Yes, enable editing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
