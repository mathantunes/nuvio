import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // If exchanging the code fails, send the user back to login.
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Strip query params and send the user into the app.
  return NextResponse.redirect(new URL("/app", request.url));
}

