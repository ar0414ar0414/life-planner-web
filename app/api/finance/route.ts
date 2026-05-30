import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { monthlyFinance, assetSnapshots } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { yearMonth, income, fixedExpense, variableExpense, bonus } = await request.json();

  await db.insert(monthlyFinance).values({
    userId: user.id,
    yearMonth,
    income,
    fixedExpense,
    variableExpense,
    bonus,
  }).onConflictDoUpdate({
    target: [monthlyFinance.userId, monthlyFinance.yearMonth],
    set: { income, fixedExpense, variableExpense, bonus, updatedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
