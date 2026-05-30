import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { monthlyFinance, assetSnapshots, fireSettings } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import TrendsClient from "@/components/TrendsClient";

export default async function TrendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [financeRows, snapshots, settings] = await Promise.all([
    db.select().from(monthlyFinance)
      .where(eq(monthlyFinance.userId, user.id))
      .orderBy(desc(monthlyFinance.yearMonth))
      .limit(24),
    db.select().from(assetSnapshots)
      .where(eq(assetSnapshots.userId, user.id))
      .orderBy(desc(assetSnapshots.yearMonth))
      .limit(24),
    db.select().from(fireSettings).where(eq(fireSettings.userId, user.id)).limit(1),
  ]);

  return (
    <TrendsClient
      financeRows={[...financeRows].reverse()}
      snapshots={[...snapshots].reverse()}
      targetAnnualExpense={settings[0]?.annualExpense ?? null}
    />
  );
}
