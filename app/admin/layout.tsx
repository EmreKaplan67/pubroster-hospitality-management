import { Nav, NavLink } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mx-2">
    <Nav>
        <NavLink href="/admin">Dashboard</NavLink>
        <NavLink href="/admin/schedule">Schedule</NavLink>
        <NavLink href="/admin/staff">Staff</NavLink>
        <NavLink href="/admin/orders">Statistics</NavLink>
    </Nav>
    <div className="container my-6">{children}</div>
  </div>;
}
