import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { fireSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import GoalsClient from "@/components/GoalsClient";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await db.select().from(fireSettings).where(eq(fireSettings.userId, user.id)).limit(1);

  return <GoalsClient userId={user.id} settings={rows[0] ?? null} />;
}
