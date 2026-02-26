import { type ReactNode } from "react";

export function Nav({ children }: { children: ReactNode }) {
  return (
    <nav className="bg-linear-to-r from-slate-900 to-slate-800 text-white flex items-center gap-2 justify-between w-full px-3 py-3 md:px-6 md:py-4 shadow-lg sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      {children}
    </nav>
  );
}
