import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { users, profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { validateSignupInput } from "@/lib/auth-validation";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  const validation = validateSignupInput(email ?? "", password ?? "");
  if (!("ok" in validation)) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .returning({ id: users.id, email: users.email });

  // Create a default profile for the new user.
  await db.insert(profiles).values({ id: user.id }).onConflictDoNothing();

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  await session.save();

  return NextResponse.json({ ok: true });
}
