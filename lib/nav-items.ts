import {
  LayoutDashboard, Wallet, Target, TrendingUp, BarChart2, MessageSquare,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/",           label: "ダッシュボード",   shortLabel: "ホーム",   icon: LayoutDashboard },
  { href: "/finance",    label: "収支・資産",       shortLabel: "収支",     icon: Wallet },
  { href: "/goals",      label: "FIRE設定",         shortLabel: "FIRE",     icon: Target },
  { href: "/simulation", label: "シミュレーション", shortLabel: "シミュ",   icon: TrendingUp },
  { href: "/trends",     label: "トレンド",         shortLabel: "トレンド", icon: BarChart2 },
  { href: "/advice",     label: "AI相談",           shortLabel: "AI相談",   icon: MessageSquare },
];
