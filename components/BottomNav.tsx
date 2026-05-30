"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Target, TrendingUp, BarChart2, MessageSquare } from "lucide-react";

const navItems = [
  { href: "/", label: "ホーム", icon: LayoutDashboard },
  { href: "/finance", label: "収支", icon: Wallet },
  { href: "/goals", label: "FIRE", icon: Target },
  { href: "/simulation", label: "シミュ", icon: TrendingUp },
  { href: "/trends", label: "トレンド", icon: BarChart2 },
  { href: "/advice", label: "AI相談", icon: MessageSquare },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs font-medium transition-colors ${
                active ? "text-orange-600" : "text-gray-500"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
