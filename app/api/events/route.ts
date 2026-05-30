import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { lifeEvents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { eventSchema, validationError } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) return validationError(parsed.error);

  const { name, type, targetAmount, targetDate, priority, memo } = parsed.data;

  await db.insert(lifeEvents).values({
    userId: user.id,
    name,
    type,
    targetAmount,
    targetDate,
    priority,
    memo: memo ?? null,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(lifeEvents).where(
    and(eq(lifeEvents.id, id), eq(lifeEvents.userId, user.id))
  );

  return NextResponse.json({ ok: true });
}
