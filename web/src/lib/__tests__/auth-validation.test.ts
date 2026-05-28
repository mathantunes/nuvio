import { describe, it, expect } from "vitest";
import { validateSignupInput } from "../auth-validation";

describe("validateSignupInput", () => {
  it("rejects missing email", () => {
    expect(validateSignupInput("", "password123")).toMatchObject({ error: "Email and password are required", status: 400 });
  });

  it("rejects missing password", () => {
    expect(validateSignupInput("user@example.com", "")).toMatchObject({ error: "Email and password are required", status: 400 });
  });

  it("rejects password shorter than 8 characters", () => {
    expect(validateSignupInput("user@example.com", "abc12")).toMatchObject({ error: "Password must be at least 8 characters", status: 400 });
  });

  it("accepts password of exactly 8 characters", () => {
    expect(validateSignupInput("user@example.com", "abcde123")).toEqual({ ok: true });
  });

  it("accepts valid credentials", () => {
    expect(validateSignupInput("user@example.com", "a-very-secure-passphrase")).toEqual({ ok: true });
  });
});
