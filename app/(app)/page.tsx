import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { assets, liabilities, fireSettings, monthlyFinance, assetSnapshots } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import DashboardClient from "@/components/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [assetRows, liabilityRows, settings, recentFinance, snapshots] = await Promise.all([
    db.select().from(assets).where(eq(assets.userId, user.id)),
    db.select().from(liabilities).where(eq(liabilities.userId, user.id)),
    db.select().from(fireSettings).where(eq(fireSettings.userId, user.id)).limit(1),
    db.select().from(monthlyFinance)
      .where(eq(monthlyFinance.userId, user.id))
      .orderBy(desc(monthlyFinance.yearMonth))
      .limit(1),
    db.select().from(assetSnapshots)
      .where(eq(assetSnapshots.userId, user.id))
      .orderBy(desc(assetSnapshots.yearMonth))
      .limit(6),
  ]);

  const totalAssets = assetRows.reduce((s, a) => s + a.amount, 0);
  const totalLiabilities = liabilityRows.reduce((s, l) => s + l.amount, 0);
  const netWorth = totalAssets - totalLiabilities;
  const latest = recentFinance[0];
  const monthlySavings = latest
    ? latest.income - latest.fixedExpense - latest.variableExpense
    : 0;

  return (
    <DashboardClient
      netWorth={netWorth}
      monthlySavings={monthlySavings}
      settings={settings[0] ?? null}
      assetRows={assetRows}
      snapshots={[...snapshots].reverse()}
    />
  );
}
