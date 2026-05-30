import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { assets, liabilities, assetSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assets: assetMap, liabilities: liabilityMap } = await request.json();

  // Delete and re-insert assets
  await db.delete(assets).where(eq(assets.userId, user.id));
  const assetEntries = Object.entries(assetMap as Record<string, string>)
    .filter(([, v]) => Number(v) > 0)
    .map(([type, amount]) => ({ userId: user.id, type, amount: Number(amount) }));
  if (assetEntries.length > 0) await db.insert(assets).values(assetEntries);

  // Delete and re-insert liabilities
  await db.delete(liabilities).where(eq(liabilities.userId, user.id));
  const liabilityEntries = Object.entries(liabilityMap as Record<string, string>)
    .filter(([, v]) => Number(v) > 0)
    .map(([type, amount]) => ({ userId: user.id, type, amount: Number(amount) }));
  if (liabilityEntries.length > 0) await db.insert(liabilities).values(liabilityEntries);

  // Snapshot
  const totalAssets = assetEntries.reduce((s, a) => s + a.amount, 0);
  const totalLiabs = liabilityEntries.reduce((s, l) => s + l.amount, 0);
  const yearMonth = new Date().toISOString().slice(0, 7);

  await db.insert(assetSnapshots).values({
    userId: user.id,
    yearMonth,
    totalAssets: totalAssets - totalLiabs,
    savings: assetEntries.find((a) => a.type === "cash")?.amount ?? 0,
  }).onConflictDoUpdate({
    target: [assetSnapshots.userId, assetSnapshots.yearMonth],
    set: {
      totalAssets: totalAssets - totalLiabs,
      savings: assetEntries.find((a) => a.type === "cash")?.amount ?? 0,
    },
  });

  return NextResponse.json({ ok: true });
}
