import { db } from "@/db";
import { assets, liabilities, assetSnapshots } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function ensurePrevMonthSnapshot(userId: string) {
  const now = new Date();
  // 前月の YYYY-MM を計算
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);

  // 前月スナップショットが既にあればスキップ
  const existing = await db
    .select({ id: assetSnapshots.id })
    .from(assetSnapshots)
    .where(and(eq(assetSnapshots.userId, userId), eq(assetSnapshots.yearMonth, prevMonth)))
    .limit(1);

  if (existing.length > 0) return;

  // 現在の資産・負債を取得
  const [assetRows, liabilityRows] = await Promise.all([
    db.select().from(assets).where(eq(assets.userId, userId)),
    db.select().from(liabilities).where(eq(liabilities.userId, userId)),
  ]);

  const totalAssets = assetRows.reduce((s, a) => s + a.amount, 0);
  const totalLiabs = liabilityRows.reduce((s, l) => s + l.amount, 0);

  // 資産が0の場合はスナップショット不要
  if (totalAssets === 0) return;

  await db.insert(assetSnapshots).values({
    userId,
    yearMonth: prevMonth,
    totalAssets: totalAssets - totalLiabs,
    savings: assetRows.find((a) => a.type === "cash")?.amount ?? 0,
  }).onConflictDoNothing();
}
