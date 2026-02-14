import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { NavLink } from "@/components/nav-link";
import { SignOutButton } from "@/components/sign-out-button";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  return (
    <div className="mx-2">
      <Nav>
        <div className="flex gap-3 flex-1 justify-center">
          <NavLink href="/dashboard">Dashboard</NavLink>
          <NavLink href="/dashboard/staff">Staff</NavLink>
          <NavLink href="/dashboard/schedule">Schedule</NavLink>
        </div>
        <SignOutButton />
      </Nav>
      <div className="container my-6">{children}</div>
      <Toaster />
    </div>
  );
}
