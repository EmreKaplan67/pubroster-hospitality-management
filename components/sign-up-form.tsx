"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
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

function toFieldErrors(errors: unknown): Array<{ message?: string }> | undefined {
  if (Array.isArray(errors)) {
    return errors.map((e) => ({ message: typeof e === "string" ? e : String(e) }));
  }
  if (typeof errors === "object" && errors !== null && "errors" in errors) {
    const arr = (errors as { errors: unknown[] }).errors;
    return Array.isArray(arr)
      ? arr.map((e) => ({ message: typeof e === "string" ? e : String(e) }))
      : undefined;
  }
  return undefined;
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
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await signUpAction(formData);
      if (result.success) {
        toast.success("Account created successfully");
        onSuccess?.();
        router.push("/dashboard");
        return { success: true } as const;
      }
      return result;
    },
    null as { success: true } | { success: false; error: Record<string, unknown> } | null
  );

  const formErrors = state && !("success" in state && state.success) ? state.error : undefined;
  const fieldErrors = formErrors as Record<string, { errors?: string[] } | string[] | undefined> | undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldSet>
        <FieldGroup>
          {Array.isArray(fieldErrors?._form) && (
            <div role="alert" className="text-destructive text-sm mb-2">
              {fieldErrors._form.join(" ")}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="signup-name">Name</FieldLabel>
            <Input
              id="signup-name"
              name="name"
              type="text"
              placeholder="John Doe"
              autoComplete="name"
              required
              aria-invalid={!!fieldErrors?.name}
            />
            <FieldError
              errors={toFieldErrors(
                (fieldErrors?.name as { errors?: string[] })?.errors ?? fieldErrors?.name
              )}
            />
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
              aria-invalid={!!fieldErrors?.email}
            />
            <FieldError
              errors={toFieldErrors(
                (fieldErrors?.email as { errors?: string[] })?.errors ?? fieldErrors?.email
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="signup-company">Company (optional)</FieldLabel>
            <Input
              id="signup-company"
              name="company"
              type="text"
              placeholder="Acme Inc"
              autoComplete="organization"
              aria-invalid={!!fieldErrors?.company}
            />
            <FieldError
              errors={toFieldErrors(
                (fieldErrors?.company as { errors?: string[] })?.errors ?? fieldErrors?.company
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="signup-password">Password</FieldLabel>
            <PasswordInput
              id="signup-password"
              name="password"
              placeholder="At least 6 characters"
              autoComplete="new-password"
              required
              aria-invalid={!!fieldErrors?.password}
            />
            <FieldError
              errors={toFieldErrors(
                (fieldErrors?.password as { errors?: string[] })?.errors ?? fieldErrors?.password
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="signup-confirmPassword">Confirm password</FieldLabel>
            <PasswordInput
              id="signup-confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
              aria-invalid={!!fieldErrors?.confirmPassword}
            />
            <FieldError
              errors={toFieldErrors(
                (fieldErrors?.confirmPassword as { errors?: string[] })?.errors ?? fieldErrors?.confirmPassword
              )}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
      <SignUpSubmitButton />
    </form>
  );
}
