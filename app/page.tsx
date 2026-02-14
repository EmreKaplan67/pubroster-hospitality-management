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
        {/* Headline */}
        <h1 className="text-5xl font-extrabold text-white mb-4">
          Simplify Hospitality <span className="text-[#FFA500]">Staff Management</span>
        </h1>
        <p className="text-white/90 text-lg sm:text-xl mb-8">
          Streamline scheduling, track shifts, and optimize your hospitality
          team’s performance — all in one easy-to-use platform.
        </p>
        <AuthButton />
      </div>
    </div>
  );
}
