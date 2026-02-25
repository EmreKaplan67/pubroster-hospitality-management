"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignInForm } from "@/components/sign-in-form";
import { SignUpForm } from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";

type AuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "sign-in" | "sign-up";
};

export function AuthModal({
  open,
  onOpenChange,
  initialMode = "sign-in",
}: AuthModalProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setMode(initialMode);
    onOpenChange(nextOpen);
  };

  const handleSuccess = () => {
    handleOpenChange(false);
  };

  

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[25rem]">
        <DialogHeader>
          <DialogTitle>{mode === "sign-in" ? "Sign in" : "Create an account"}</DialogTitle>
          <DialogDescription>
            {mode === "sign-in"
              ? "Enter your credentials to access your account."
              : "Fill in your details to get started."}
          </DialogDescription>
        </DialogHeader>

        {mode === "sign-in" ? (
          <SignInForm onSuccess={handleSuccess} />
        ) : (
          <SignUpForm onSuccess={handleSuccess} />
        )}

        <div className="text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? (
            <>
              Don&apos;t have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-medium"
                onClick={() => setMode("sign-up")}
              >
                Sign up
              </Button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Button
                variant="link"
                className="p-0 h-auto font-medium"
                onClick={() => setMode("sign-in")}
              >
                Sign in
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
