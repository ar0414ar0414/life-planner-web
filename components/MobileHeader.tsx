"use client";

import { Flame } from "lucide-react";

export default function MobileHeader() {
  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 h-14 flex items-center px-5">
      <div className="flex items-center gap-2">
        <Flame className="w-5 h-5 text-orange-500" />
        <span className="font-bold text-gray-900 text-base tracking-tight">FIRE Navi</span>
      </div>
    </header>
  );
}
