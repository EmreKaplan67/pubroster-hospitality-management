"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

export function SignInForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email?.trim() || !password) {
      setError("Email and password are required");
      return;
    }

    setPending(true);
    const { data, error: err } = await authClient.signIn.email({
      email: email.trim(),
      password,
    });
    setPending(false);

    if (err) {
      setError(err.message ?? "Invalid email or password");
      return;
    }

    if (data) {
      toast.success("Signed in successfully");
      onSuccess?.();
      router.refresh();
      router.push("/dashboard/schedule");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FieldSet>
        <FieldGroup>
          {error ? (
            <div role="alert" className="text-destructive text-sm">
              {error}
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="signin-email">Email</FieldLabel>
            <Input
              id="signin-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="signin-password">Password</FieldLabel>
            <PasswordInput
              id="signin-password"
              name="password"
              autoComplete="current-password"
              placeholder="********"
              required
            />
          </Field>
        </FieldGroup>
      </FieldSet>
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
