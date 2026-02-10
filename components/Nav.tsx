"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ComponentProps, ReactNode } from "react"

export function Nav({ children }: { children: ReactNode }) {
  return (
    <nav className="bg-linear-to-r from-slate-900 to-slate-800 text-white flex gap-3 justify-center px-6 py-4 shadow-lg sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      {children}
    </nav>
  )
}

export function NavLink(props: Omit<ComponentProps<typeof Link>, "className">) {
  const pathname = usePathname()
  return (
    <Link
      {...props}
      className={cn(
        "px-5 py-2 rounded-lg font-medium transition-all duration-300 ease-in-out hover:bg-white hover:text-slate-900 focus-visible:bg-white focus-visible:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
        pathname === props.href && "bg-slate-600 text-white shadow-md"
      )}
    />
  )
}