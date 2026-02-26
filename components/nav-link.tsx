"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

export function NavLink(props: Omit<ComponentProps<typeof Link>, "className">) {
  const pathname = usePathname();

  return (
    <Link
      {...props}
      className={cn(
        "px-3 py-1.5 sm:px-5 sm:py-2 rounded-lg font-medium transition-all duration-300 ease-in-out hover:bg-white hover:text-slate-900 focus-visible:bg-white focus-visible:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        pathname === props.href && "bg-slate-600 text-white shadow-md"
      )}
    />
  );
}
