import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.exchangeCodeForSession(code);

    if (user) {
      await db.insert(users).values({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name ?? null,
      }).onConflictDoNothing();
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
