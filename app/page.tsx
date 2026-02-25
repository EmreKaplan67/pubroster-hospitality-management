import Image from "next/image";
import { AuthButton } from "@/components/auth-button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-6 text-center">
      {/* Background Image */}
      <Image
        src="/hero-background-image.jpg"
        alt="Hero Background"
        fill
        className="object-cover"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl">
        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/95 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Beta
        </span>
        <h1 className="text-5xl font-extrabold text-white mb-4">
          Simple <span className="text-[#FFA500]">Rosters</span> for Hospitality
        </h1>
        <p className="text-white/90 text-lg sm:text-xl mb-6">
          A lightweight roster app for hospitality teams who don’t need
          enterprise HR systems. Create rosters in minutes, then download
          or publish — no complexity, no bloat.
        </p>
        <AuthButton />
      </div>
    </div>
  );
}
