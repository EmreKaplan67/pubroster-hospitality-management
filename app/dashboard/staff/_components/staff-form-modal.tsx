"use client";

import { useEffect, useRef } from "react";
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
import {
  createStaffAction,
  updateStaffFormAction,
} from "@/app/actions/staff";

const STAFF_ROLES = [
  { value: "MANAGER", label: "Manager" },
  { value: "ASSISTANT_MANAGER", label: "Assistant Manager" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "BARTENDER", label: "Bartender" },
  { value: "FLOOR_STAFF", label: "Floor Staff" },
  { value: "BAR_BACK", label: "Bar Back" },
] as const;

const STAFF_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ON_VACATION", label: "On Vacation" },
  { value: "SICK_LEAVE", label: "Sick Leave" },
  { value: "TERMINATED", label: "Terminated" },
] as const;

type Staff = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  hourlyRate: string | null;
  startDate: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

type StaffFormModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff | null;
  onSuccess?: () => void;
};

function StaffFormSubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (isEdit ? "Saving..." : "Adding...") : isEdit ? "Save" : "Add Staff"}
    </Button>
  );
}

export function StaffFormModal({
  open,
  onOpenChange,
  staff,
  onSuccess,
}: StaffFormModalProps) {
  const isEdit = !!staff;

  const [state, formAction] = useActionState(
    isEdit ? updateStaffFormAction : createStaffAction,
    null as { success: true } | { success: false; error: string } | null,
  );

  const error = state && !state.success ? state.error : null;
  const hasHandledSuccess = useRef(false);

  useEffect(() => {
    if (state?.success && !hasHandledSuccess.current) {
      hasHandledSuccess.current = true;
      toast.success(isEdit ? "Staff updated successfully" : "Staff added successfully");
      onOpenChange(false);
      onSuccess?.();
    }
    if (!state?.success) {
      hasHandledSuccess.current = false;
    }
  }, [state, isEdit, onOpenChange, onSuccess]);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[min(28rem,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Staff" : "Add Staff"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update staff member details."
              : "Enter the details to add a new staff member."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          {isEdit && staff && (
            <input type="hidden" name="staffId" value={staff.id} />
          )}
          <FieldSet>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="staff-name">Name</FieldLabel>
                <Input
                  id="staff-name"
                  name="name"
                  defaultValue={staff?.name}
                  placeholder="John Doe"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-email">Email (optional)</FieldLabel>
                <Input
                  id="staff-email"
                  name="email"
                  type="email"
                  defaultValue={staff?.email ?? ""}
                  placeholder="john@example.com"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-phone">Phone (optional)</FieldLabel>
                <Input
                  id="staff-phone"
                  name="phone"
                  defaultValue={staff?.phone ?? ""}
                  placeholder="083 123 4567"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-role">Role</FieldLabel>
                <select
                  id="staff-role"
                  name="role"
                  defaultValue={staff?.role ?? "FLOOR_STAFF"}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none md:text-sm"
                >
                  {STAFF_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-status">Status</FieldLabel>
                <select
                  id="staff-status"
                  name="status"
                  defaultValue={staff?.status ?? "ACTIVE"}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none md:text-sm"
                >
                  {STAFF_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-hourly-rate">Hourly Rate € (optional)</FieldLabel>
                <Input
                  id="staff-hourly-rate"
                  name="hourlyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={staff?.hourlyRate ?? ""}
                  placeholder="0.00"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-start-date">Start Date (optional)</FieldLabel>
                <Input
                  id="staff-start-date"
                  name="startDate"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  defaultValue={staff?.startDate ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-emergency-name">Emergency Contact Name (optional)</FieldLabel>
                <Input
                  id="staff-emergency-name"
                  name="emergencyContactName"
                  defaultValue={staff?.emergencyContactName ?? ""}
                  placeholder="Jane Doe"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="staff-emergency-phone">Emergency Contact Phone (optional)</FieldLabel>
                <Input
                  id="staff-emergency-phone"
                  name="emergencyContactPhone"
                  defaultValue={staff?.emergencyContactPhone ?? ""}
                  placeholder="083 123 4567"
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
            <StaffFormSubmitButton isEdit={isEdit} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
