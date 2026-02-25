"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleSignOut}
      className="text-black hover:bg-transparent hover:text-white"
    >
      Sign Out
    </Button>
  );
}
