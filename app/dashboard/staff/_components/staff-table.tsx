"use client";

import { useState, useMemo } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StaffFormModal } from "./staff-form-modal";
import { deleteStaffAction } from "@/app/actions/staff";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  MANAGER: "Manager",
  ASSISTANT_MANAGER: "Assistant Manager",
  SUPERVISOR: "Supervisor",
  BARTENDER: "Bartender",
  FLOOR_STAFF: "Floor Staff",
  BAR_BACK: "Bar Back",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_VACATION: "On Vacation",
  SICK_LEAVE: "Sick Leave",
  TERMINATED: "Terminated",
};

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

type StaffTableProps = {
  staff: Staff[];
};

type SortColumn = "name" | "startDate" | "hourlyRate";
type SortOrder = "asc" | "desc" | null;

export function StaffTable({ staff }: StaffTableProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [sort, setSort] = useState<{ column: SortColumn; order: SortOrder }>({ column: "name", order: null });

  const sortedStaff = useMemo(() => {
    if (!sort.order) return staff;
    return [...staff].sort((a, b) => {
      if (sort.column === "name") {
        const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        return sort.order === "asc" ? cmp : -cmp;
      }
      if (sort.column === "startDate") {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : -Infinity;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : -Infinity;
        return sort.order === "asc" ? dateA - dateB : dateB - dateA;
      }
      if (sort.column === "hourlyRate") {
        const rateA = a.hourlyRate ? parseFloat(a.hourlyRate) : -Infinity;
        const rateB = b.hourlyRate ? parseFloat(b.hourlyRate) : -Infinity;
        return sort.order === "asc" ? rateA - rateB : rateB - rateA;
      }
      return 0;
    });
  }, [staff, sort]);

  function cycleSort(column: SortColumn) {
    setSort((prev) => {
      if (prev.column !== column) {
        return { column, order: "asc" as const };
      }
      if (prev.order === null) return { column, order: "asc" as const };
      if (prev.order === "asc") return { column, order: "desc" as const };
      return { column, order: null };
    });
  }

  async function handleDelete(staffMember: Staff) {
    if (!confirm(`Are you sure you want to delete ${staffMember.name}?`)) return;
    const result = await deleteStaffAction(staffMember.id);
    if (result.success) {
      toast.success("Staff member deleted");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                type="button"
                onClick={() => cycleSort("name")}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Name
                <ArrowUpDown
                  className={`h-4 w-4 ${sort.column === "name" && sort.order ? "opacity-100" : "opacity-50"}`}
                />
              </button>
            </TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <button
                type="button"
                onClick={() => cycleSort("startDate")}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Start Date
                <ArrowUpDown
                  className={`h-4 w-4 ${sort.column === "startDate" && sort.order ? "opacity-100" : "opacity-50"}`}
                />
              </button>
            </TableHead>
            <TableHead>
              <button
                type="button"
                onClick={() => cycleSort("hourlyRate")}
                className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Hourly Rate
                <ArrowUpDown
                  className={`h-4 w-4 ${sort.column === "hourlyRate" && sort.order ? "opacity-100" : "opacity-50"}`}
                />
              </button>
            </TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No staff members yet. Click &quot;Add Staff&quot; to get started.
              </TableCell>
            </TableRow>
          ) : (
            sortedStaff.map((staffMember) => (
              <TableRow key={staffMember.id}>
                <TableCell className="font-medium">{staffMember.name}</TableCell>
                <TableCell>{staffMember.email ?? "—"}</TableCell>
                <TableCell>{staffMember.phone ?? "—"}</TableCell>
                <TableCell>{ROLE_LABELS[staffMember.role] ?? staffMember.role}</TableCell>
                <TableCell>{STATUS_LABELS[staffMember.status] ?? staffMember.status}</TableCell>
                <TableCell>
                  {staffMember.startDate
                    ? new Date(staffMember.startDate).toLocaleDateString("en-IE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </TableCell>
                <TableCell>
                  {staffMember.hourlyRate
                    ? `€${staffMember.hourlyRate}`
                    : "—"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingStaff(staffMember)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleDelete(staffMember)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={8} className="text-right">
              <Button onClick={() => setAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Staff
              </Button>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
      </div>

      <StaffFormModal
        key={addModalOpen ? "add-open" : "add-closed"}
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => setAddModalOpen(false)}
      />

      <StaffFormModal
        key={editingStaff ? `edit-${editingStaff.id}` : "edit-closed"}
        open={!!editingStaff}
        onOpenChange={(open) => !open && setEditingStaff(null)}
        staff={editingStaff ?? undefined}
        onSuccess={() => setEditingStaff(null)}
      />
    </div>
  );
}
