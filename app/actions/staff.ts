"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const STAFF_ROLES = [
  "MANAGER",
  "ASSISTANT_MANAGER",
  "SUPERVISOR",
  "BARTENDER",
  "FLOOR_STAFF",
  "BAR_BACK",
] as const;

const STAFF_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "ON_VACATION",
  "SICK_LEAVE",
  "TERMINATED",
] as const;

type StaffResult =
  | { success: true }
  | { success: false; error: string };

const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z
    .union([z.string().email("Invalid email"), z.literal("")])
    .optional(),
  phone: z.string().optional(),
  role: z.enum(STAFF_ROLES),
  status: z.enum(STAFF_STATUSES),
  hourlyRate: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
      "Must be a positive number"
    ),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  startDate: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date.getTime() <= today.getTime();
      },
      "Start date cannot be in the future"
    ),
});

export async function createStaffAction(
  _prevState: StaffResult | null,
  formData: FormData
): Promise<StaffResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const entries = Object.fromEntries(formData.entries());
  const parsed = staffSchema.safeParse({
    ...entries,
    email: entries.email || undefined,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: firstError?.message ?? "Validation failed",
    };
  }

  const {
    name,
    email,
    phone,
    role,
    status,
    hourlyRate,
    emergencyContactName,
    emergencyContactPhone,
    startDate,
  } = parsed.data;

  const emailValue = email?.trim() || null;

  if (emailValue) {
    const existing = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        email: emailValue,
      },
    });
    if (existing) {
      return { success: false, error: "A staff member with this email already exists" };
    }
  }

  try {
    await prisma.staff.create({
      data: {
        user: { connect: { id: session.user.id } },
        name,
        email: emailValue,
        phone: phone || null,
        role: role as "MANAGER" | "ASSISTANT_MANAGER" | "SUPERVISOR" | "BARTENDER" | "FLOOR_STAFF" | "BAR_BACK",
        status: status as "ACTIVE" | "INACTIVE" | "ON_VACATION" | "SICK_LEAVE" | "TERMINATED",
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        startDate: startDate ? new Date(startDate) : null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create staff member";
    return { success: false, error: message };
  }

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function updateStaffFormAction(
  _prevState: StaffResult | null,
  formData: FormData
): Promise<StaffResult> {
  const staffId = formData.get("staffId");
  if (typeof staffId !== "string") {
    return { success: false, error: "Staff ID is required" };
  }
  return updateStaffAction(formData, staffId);
}

export async function updateStaffAction(
  formData: FormData,
  staffId: string
): Promise<StaffResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const entries = Object.fromEntries(formData.entries());
  delete (entries as Record<string, unknown>)["staffId"];
  const parsed = staffSchema.safeParse({
    ...entries,
    email: entries.email || undefined,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return {
      success: false,
      error: firstError?.message ?? "Validation failed",
    };
  }

  const {
    name,
    email,
    phone,
    role,
    status,
    hourlyRate,
    emergencyContactName,
    emergencyContactPhone,
    startDate,
  } = parsed.data;

  const existing = await prisma.staff.findFirst({
    where: { id: staffId, userId: session.user.id },
  });
  if (!existing) {
    return { success: false, error: "Staff member not found" };
  }

  const emailValue = email?.trim() || null;
  if (emailValue && emailValue !== existing.email) {
    const duplicate = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        email: emailValue,
        id: { not: staffId },
      },
    });
    if (duplicate) {
      return { success: false, error: "A staff member with this email already exists" };
    }
  }

  try {
    await prisma.staff.update({
      where: { id: staffId },
      data: {
        name,
        email: emailValue,
        phone: phone || null,
        role: role as "MANAGER" | "ASSISTANT_MANAGER" | "SUPERVISOR" | "BARTENDER" | "FLOOR_STAFF" | "BAR_BACK",
        status: status as "ACTIVE" | "INACTIVE" | "ON_VACATION" | "SICK_LEAVE" | "TERMINATED",
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        startDate: startDate ? new Date(startDate) : null,
      },
    });
  } catch {
    return { success: false, error: "Failed to update staff member" };
  }

  revalidatePath("/dashboard/staff");
  return { success: true };
}

export async function deleteStaffAction(staffId: string): Promise<StaffResult> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const existing = await prisma.staff.findFirst({
    where: { id: staffId, userId: session.user.id },
  });
  if (!existing) {
    return { success: false, error: "Staff member not found" };
  }

  try {
    await prisma.staff.delete({
      where: { id: staffId },
    });
  } catch {
    return { success: false, error: "Failed to delete staff member" };
  }

  revalidatePath("/dashboard/staff");
  return { success: true };
}
