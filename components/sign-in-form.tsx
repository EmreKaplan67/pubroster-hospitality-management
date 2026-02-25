"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { signInAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

function fieldErrors(messages?: string[]) {
  return messages?.map((m) => ({ message: m }));
}

function SignInSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export function SignInForm({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const handled = useRef(false);
  const [state, formAction] = useActionState(signInAction, null);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success("Signed in successfully");
      onSuccess?.();
      router.push("/dashboard");
    }
    if (!state?.success) handled.current = false;
  }, [state, onSuccess, router]);

  const errors = state?.success === false ? state.errors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldSet>
        <FieldGroup>
          {errors?._form?.length ? (
            <div role="alert" className="text-destructive text-sm">
              {errors._form.join(" ")}
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
              aria-invalid={!!errors?.email?.length}
            />
            <FieldError errors={fieldErrors(errors?.email)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="signin-password">Password</FieldLabel>
            <PasswordInput
              id="signin-password"
              name="password"
              autoComplete="current-password"
              placeholder="********"
              required
              aria-invalid={!!errors?.password?.length}
            />
            <FieldError errors={fieldErrors(errors?.password)} />
          </Field>
        </FieldGroup>
      </FieldSet>
      <SignInSubmitButton />
    </form>
  );
}
