import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { monthlyFinance, assets, liabilities } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import FinanceClient from "@/components/FinanceClient";

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [financeRows, assetRows, liabilityRows] = await Promise.all([
    db.select().from(monthlyFinance)
      .where(eq(monthlyFinance.userId, user.id))
      .orderBy(desc(monthlyFinance.yearMonth))
      .limit(24),
    db.select().from(assets).where(eq(assets.userId, user.id)),
    db.select().from(liabilities).where(eq(liabilities.userId, user.id)),
  ]);

  return (
    <FinanceClient
      userId={user.id}
      financeRows={financeRows}
      assetRows={assetRows}
      liabilityRows={liabilityRows}
    />
  );
}
