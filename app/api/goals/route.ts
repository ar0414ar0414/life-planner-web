import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { fireSettings } from "@/db/schema";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  await db.insert(fireSettings).values({
    userId: user.id,
    fireType: body.fireType,
    annualExpense: body.annualExpense,
    sideIncome: body.sideIncome,
    currentAge: body.currentAge,
    targetFireAge: body.targetFireAge,
    coastRetireAge: body.coastRetireAge,
    swr: body.swr,
    annualReturnRate: body.annualReturnRate,
  }).onConflictDoUpdate({
    target: fireSettings.userId,
    set: {
      fireType: body.fireType,
      annualExpense: body.annualExpense,
      sideIncome: body.sideIncome,
      currentAge: body.currentAge,
      targetFireAge: body.targetFireAge,
      coastRetireAge: body.coastRetireAge,
      swr: body.swr,
      annualReturnRate: body.annualReturnRate,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
