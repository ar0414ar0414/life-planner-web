import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { monthlyFinance } from "@/db/schema";
import { NextResponse } from "next/server";
import { financeSchema, validationError } from "@/lib/validation";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = financeSchema.safeParse(await request.json());
  if (!parsed.success) return validationError(parsed.error);

  const { yearMonth, income, fixedExpense, variableExpense, bonus } = parsed.data;

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
