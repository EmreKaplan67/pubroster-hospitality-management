import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { StaffTable } from "./_components/staff-table";

export default async function StaffPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  const staff = await prisma.staff.findMany({
    where: { userId: session?.user?.id },
    orderBy: { createdAt: "desc" },
  });

  const serializedStaff = staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    role: s.role,
    status: s.status,
    hourlyRate: s.hourlyRate ? s.hourlyRate.toString() : null,
    startDate: s.startDate ? s.startDate.toISOString().slice(0, 10) : null,
    emergencyContactName: s.emergencyContactName,
    emergencyContactPhone: s.emergencyContactPhone,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <p className="text-muted-foreground">
          Manage your staff members and their details.
        </p>
      </div>
      <StaffTable staff={serializedStaff} />
    </div>
  );
}
