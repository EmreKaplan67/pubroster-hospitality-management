"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/* --------------------------- Types --------------------------- */

type AuthResult =
  | { success: true }
  | { success: false; error: Record<string, unknown> };

/* --------------------------- Schemas --------------------------- */

const signUpSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
    company: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/* --------------------------- Sign Up --------------------------- */

export async function signUpAction(formData: FormData): Promise<AuthResult> {
  const entries = Object.fromEntries(formData.entries());
  const parsed = signUpSchema.safeParse(entries);

  if (!parsed.success) {
    return {
      success: false,
      error: z.treeifyError(parsed.error).properties ?? {},
    };
  }

  const { name, email, password, company } = parsed.data;

  let createdUser;
  try {
    createdUser = await auth.api.signUpEmail({
      body: { email, password, name },
      headers: await headers(),
    });
  } catch {
    return {
      success: false,
      error: { _form: ["This email is already registered. Please sign in instead."] },
    };
  }

  try {
    await prisma.user.update({
      where: { id: createdUser.user.id },
      data: { company: company?.trim() || null },
    });
  } catch {
    return {
      success: false,
      error: { _form: ["Account created but failed to save company. Please contact support."] },
    };
  }

  return { success: true };
}

/* --------------------------- Sign In --------------------------- */

export async function signInAction(formData: FormData): Promise<AuthResult> {
  const entries = Object.fromEntries(formData.entries());
  const parsed = signInSchema.safeParse(entries);

  if (!parsed.success) {
    return {
      success: false,
      error: z.treeifyError(parsed.error).properties ?? {},
    };
  }

  const { email, password } = parsed.data;

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });
  } catch {
    return {
      success: false,
      error: { _form: ["Invalid email or password."] },
    };
  }

  return { success: true };
}

/* --------------------------- Sign Out --------------------------- */

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() }); 
  revalidatePath("/", "layout");
  redirect("/");
}
