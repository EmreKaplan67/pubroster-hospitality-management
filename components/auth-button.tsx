"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";

export function AuthButton() {
  const { data: session, isPending } = useSession();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  if (isPending) {
    return (
      <Button disabled size="default" variant="outline">
        Get Started
      </Button>
    );
  }

  if (session) {
    return (
      <Button asChild size="default" variant="outline">
        <Link href="/dashboard/schedule">Get Started</Link>
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setAuthModalOpen(true)} size="default" variant="outline">
        Get Started
      </Button>
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        initialMode="sign-in"
      />
    </>
  );
}
