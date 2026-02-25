"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";

export type AuthResult =
  | { success: true }
  | { success: false; errors: Record<string, string[]> };

function parseForm<T>(formData: FormData, schema: z.ZodSchema<T>) {
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (parsed.success) return { data: parsed.data, errors: null };
  const flat = parsed.error.flatten();
  return {
    data: null,
    errors: { _form: flat.formErrors, ...flat.fieldErrors } as Record<
      string,
      string[]
    >,
  };
}

const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
    company: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function signUpAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const { data, errors } = parseForm(formData, signUpSchema);
  if (errors) return { success: false, errors };

  const { name, email, password, company } = data!;

  try {
    const { user } = await auth.api.signUpEmail({
      body: { email, password, name },
      headers: await headers(),
    });
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { company: company?.trim() || null },
      });
    } catch {
      return {
        success: false,
        errors: {
          _form: [
            "Account created but failed to save company. Please contact support.",
          ],
        },
      };
    }
    return { success: true };
  } catch {
    return {
      success: false,
      errors: {
        _form: ["This email is already registered. Please sign in instead."],
      },
    };
  }
}

export async function signInAction(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const { data, errors } = parseForm(formData, signInSchema);
  if (errors) {
    console.log("[signIn] validation failed:", errors);
    return { success: false, errors };
  }

  try {
    console.log("[signIn] calling auth.api.signInEmail for", data!.email);
    const result = await auth.api.signInEmail({
      body: { email: data!.email, password: data!.password },
      headers: await headers(),
    });
    console.log("[signIn] server action succeeded, session token exists:", !!result?.token);
    return { success: true };
  } catch (err) {
    console.error("[signIn] server action failed:", err);
    return {
      success: false,
      errors: { _form: ["Invalid email or password."] },
    };
  }
}
