"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { signUpAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
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

function SignUpSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}

export function SignUpForm({ onSuccess }: { onSuccess?: () => void }) {
  const handled = useRef(false);
  const [state, formAction] = useActionState(signUpAction, null);

  useEffect(() => {
    if (state?.success && !handled.current) {
      handled.current = true;
      toast.success("Account created successfully");
      onSuccess?.();
      window.location.href = "/dashboard";
    }
    if (!state?.success) handled.current = false;
  }, [state, onSuccess]);

  const errors = state?.success === false ? state.errors : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldSet>
        <FieldGroup>
          {errors?._form?.length ? (
            <div role="alert" className="text-destructive text-sm mb-2">
              {errors._form.join(" ")}
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="signup-name">Name</FieldLabel>
            <Input
              id="signup-name"
              name="name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              required
              aria-invalid={!!errors?.name?.length}
            />
            <FieldError errors={fieldErrors(errors?.name)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="signup-email">Email</FieldLabel>
            <Input
              id="signup-email"
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
            <FieldLabel htmlFor="signup-company">Company (optional)</FieldLabel>
            <Input
              id="signup-company"
              name="company"
              type="text"
              placeholder="Acme Inc"
              autoComplete="organization"
              aria-invalid={!!errors?.company?.length}
            />
            <FieldError errors={fieldErrors(errors?.company)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="signup-password">Password</FieldLabel>
            <PasswordInput
              id="signup-password"
              name="password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
              aria-invalid={!!errors?.password?.length}
            />
            <FieldError errors={fieldErrors(errors?.password)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="signup-confirmPassword">Confirm password</FieldLabel>
            <PasswordInput
              id="signup-confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
              aria-invalid={!!errors?.confirmPassword?.length}
            />
            <FieldError errors={fieldErrors(errors?.confirmPassword)} />
          </Field>
        </FieldGroup>
      </FieldSet>
      <SignUpSubmitButton />
    </form>
  );
}
