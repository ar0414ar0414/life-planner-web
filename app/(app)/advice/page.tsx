import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { assets, liabilities, fireSettings, monthlyFinance } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import AdviceClient from "@/components/AdviceClient";
import {
  calcFireNumber, calcMonthsToFire, monthsToAchieveDate, formatAmount,
} from "@/lib/simulation";

export default async function AdvicePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [assetRows, liabilityRows, settingsRows, recentFinance] = await Promise.all([
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
  const savingsRate = latest && latest.income > 0
    ? Math.round((monthlySavings / latest.income) * 100)
    : 0;

  const settings = settingsRows[0] ?? null;
  const fireNumber = settings ? calcFireNumber(settings) : 0;
  const fireProgress = fireNumber > 0 ? Math.round((netWorth / fireNumber) * 100) : 0;
  const months = settings ? calcMonthsToFire(fireNumber, netWorth, monthlySavings, settings.annualReturnRate) : null;
  const fireDate = months !== null ? monthsToAchieveDate(months) : "—";

  const fireStats = {
    netWorth: formatAmount(netWorth),
    fireNumber: settings ? formatAmount(fireNumber) : "—",
    fireProgress: `${fireProgress}%`,
    monthlySavings: formatAmount(monthlySavings),
    savingsRate: `${savingsRate}%`,
    fireDate,
    fireType: settings?.fireType ?? "未設定",
    annualExpense: settings ? formatAmount(settings.annualExpense) : "—",
  };

  return <AdviceClient fireStats={fireStats} />;
}
