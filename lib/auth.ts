import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";
import { nextCookies } from "better-auth/next-js";

const baseURL = process.env.BETTER_AUTH_URL;

export const auth = betterAuth({
  baseURL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
  trustedOrigins: baseURL
    ? (() => {
        const b = baseURL.replace(/\/$/, "");
        const withWww = b.includes("://www.") ? b : b.replace(/^(https?:\/\/)/, "$1www.");
        const withoutWww = b.replace(/^(https?:\/\/)www\./, "$1");
        return [...new Set([b, withWww, withoutWww])];
      })()
    : undefined,
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});