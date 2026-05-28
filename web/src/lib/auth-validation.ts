export type SignupValidationResult =
  | { ok: true }
  | { error: string; status: number };

export function validateSignupInput(email: string, password: string): SignupValidationResult {
  if (!email || !password) {
    return { error: "Email and password are required", status: 400 };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters", status: 400 };
  }
  return { ok: true };
}
