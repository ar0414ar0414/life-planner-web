import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { fireSettings, assets, liabilities, monthlyFinance } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import GoalsClient from "@/components/GoalsClient";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [rows, assetRows, liabilityRows, recentFinance] = await Promise.all([
    db.select().from(fireSettings).where(eq(fireSettings.userId, user.id)).limit(1),
    db.select().from(assets).where(eq(assets.userId, user.id)),
    db.select().from(liabilities).where(eq(liabilities.userId, user.id)),
    db.select().from(monthlyFinance)
      .where(eq(monthlyFinance.userId, user.id))
      .orderBy(desc(monthlyFinance.yearMonth))
      .limit(1),
  ]);

  const netWorth =
    assetRows.reduce((s, a) => s + a.amount, 0) -
    liabilityRows.reduce((s, l) => s + l.amount, 0);
  const latest = recentFinance[0];
  const monthlySavings = latest
    ? latest.income - latest.fixedExpense - latest.variableExpense
    : 0;

  return (
    <GoalsClient
      userId={user.id}
      settings={rows[0] ?? null}
      netWorth={netWorth}
      monthlySavings={monthlySavings}
    />
  );
}
