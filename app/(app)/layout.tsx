import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import Toaster from "@/components/Toaster";
import { ensurePrevMonthSnapshot } from "@/lib/autoSnapshot";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 前月スナップショットを自動保存（資産データがある場合のみ）
  void ensurePrevMonthSnapshot(user.id);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-8 min-h-screen pb-20 md:pb-8">{children}</main>
      <BottomNav />
      <Toaster />
    </div>
  );
}
