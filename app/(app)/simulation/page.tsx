import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { lifeEvents, assets, liabilities, fireSettings, monthlyFinance } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import SimulationClient from "@/components/SimulationClient";

export default async function SimulationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [events, assetRows, liabilityRows, settings, recentFinance] = await Promise.all([
    db.select().from(lifeEvents).where(eq(lifeEvents.userId, user.id)),
    db.select().from(assets).where(eq(assets.userId, user.id)),
    db.select().from(liabilities).where(eq(liabilities.userId, user.id)),
    db.select().from(fireSettings).where(eq(fireSettings.userId, user.id)).limit(1),
    db.select().from(monthlyFinance)
      .where(eq(monthlyFinance.userId, user.id))
      .orderBy(desc(monthlyFinance.yearMonth))
      .limit(1),
  ]);

  const totalAssets = assetRows.reduce((s, a) => s + a.amount, 0);
  const totalLiabilities = liabilityRows.reduce((s, l) => s + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;
  const latest = recentFinance[0];
  const monthlySavings = latest ? latest.income - latest.fixedExpense - latest.variableExpense : 0;
  const annualBonus = latest?.bonus ?? 0;

  return (
    <SimulationClient
      userId={user.id}
      events={events}
      netWorth={netWorth}
      monthlySavings={monthlySavings}
      annualBonus={annualBonus}
      annualReturnRate={settings[0]?.annualReturnRate ?? 5}
    />
  );
}
