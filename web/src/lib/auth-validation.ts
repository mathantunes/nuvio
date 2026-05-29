import { z } from "zod";

const signupSchema = z.object({
  email: z.string().min(1, "Email and password are required"),
  password: z
    .string()
    .min(1, "Email and password are required")
    .min(8, "Password must be at least 8 characters"),
});

export type SignupValidationResult =
  | { ok: true }
  | { error: string; status: number };

export function validateSignupInput(email: string, password: string): SignupValidationResult {
  const result = signupSchema.safeParse({ email, password });
  if (!result.success) {
    return { error: result.error.issues[0].message, status: 400 };
  }
  return { ok: true };
}
