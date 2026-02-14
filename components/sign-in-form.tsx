"use client";

import { useActionState } from "react";
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

function toFieldErrors(
  errors: unknown,
): Array<{ message?: string }> | undefined {
  if (Array.isArray(errors)) {
    return errors.map((e) => ({
      message: typeof e === "string" ? e : String(e),
    }));
  }
  if (typeof errors === "object" && errors !== null && "errors" in errors) {
    const arr = (errors as { errors: unknown[] }).errors;
    return Array.isArray(arr)
      ? arr.map((e) => ({ message: typeof e === "string" ? e : String(e) }))
      : undefined;
  }
  return undefined;
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
  const [state, formAction] = useActionState(
    async (_: unknown, formData: FormData) => {
      const result = await signInAction(formData);
      if (result.success) {
        toast.success("Signed in successfully");
        onSuccess?.();
        router.push("/dashboard");
        return { success: true } as const;
      }
      return result;
    },
    null as
      | { success: true }
      | { success: false; error: Record<string, unknown> }
      | null,
  );

  const formErrors =
    state && !("success" in state && state.success) ? state.error : undefined;
  const fieldErrors = formErrors as
    | Record<string, { errors?: string[] } | string[] | undefined>
    | undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldSet>
        <FieldGroup>
          {Array.isArray(fieldErrors?._form) && (
            <div role="alert" className="text-destructive text-sm">
              {fieldErrors._form.join(" ")}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="signin-email">Email</FieldLabel>
            <Input
              id="signin-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              aria-invalid={!!fieldErrors?.email}
            />
            <FieldError
              errors={toFieldErrors(
                (fieldErrors?.email as { errors?: string[] })?.errors ??
                  fieldErrors?.email,
              )}
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
              aria-invalid={!!fieldErrors?.password}
            />
            <FieldError
              errors={toFieldErrors(
                (fieldErrors?.password as { errors?: string[] })?.errors ??
                  fieldErrors?.password,
              )}
            />
          </Field>
        </FieldGroup>
      </FieldSet>
      <SignInSubmitButton />
    </form>
  );
}
