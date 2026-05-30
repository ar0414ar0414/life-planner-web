import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { fireSettings } from "@/db/schema";
import { NextResponse } from "next/server";
import { goalsSchema, validationError } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = goalsSchema.safeParse(await request.json());
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;

  await db.insert(fireSettings).values({
    userId: user.id,
    ...data,
  }).onConflictDoUpdate({
    target: fireSettings.userId,
    set: { ...data, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
