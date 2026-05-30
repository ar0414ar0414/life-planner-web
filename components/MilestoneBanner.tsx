"use client";

import { useState, useEffect } from "react";

const MILESTONES = [
  { pct: 100, label: "FIRE達成！", sub: "夢が現実になりました！おめでとうございます！", grad: "from-yellow-400 to-orange-500", icon: "🎉" },
  { pct: 75, label: "75% 突破！", sub: "ゴールまであと25%！もう少しです！", grad: "from-orange-400 to-rose-500", icon: "🔥" },
  { pct: 50, label: "折り返し地点！", sub: "FIRE達成率50%を超えました！", grad: "from-violet-500 to-blue-500", icon: "⚡" },
  { pct: 25, label: "25% 達成！", sub: "着実に資産が育っています！", grad: "from-teal-400 to-cyan-500", icon: "🌱" },
  { pct: 10, label: "10% 達成！", sub: "FIREへの旅が始まりました！", grad: "from-green-400 to-emerald-500", icon: "✨" },
] as const;

type Milestone = (typeof MILESTONES)[number];

export default function MilestoneBanner({ fireProgress, userId }: { fireProgress: number; userId: string }) {
  const [current, setCurrent] = useState<Milestone | null>(null);
  const [progress, setProgress] = useState(100);
  const storageKey = `lp_milestones_${userId}`;
  const DURATION = 6000;

  useEffect(() => {
    const seen: number[] = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    const hit = MILESTONES.find((m) => fireProgress >= m.pct && !seen.includes(m.pct));
    if (!hit) return;

    localStorage.setItem(storageKey, JSON.stringify([...seen, hit.pct]));
    setCurrent(hit);
    setProgress(100);

    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100));
      if (elapsed >= DURATION) { clearInterval(tick); setCurrent(null); }
    }, 50);
    return () => clearInterval(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fireProgress]);

  if (!current) return null;

  return (
    <>
      <style>{`
        @keyframes ms-slide-down {
          from { opacity: 0; transform: translateY(-20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ms-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.4); }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${current.grad} p-6 text-white shadow-lg`}
        style={{ animation: "ms-slide-down 0.45s ease-out" }}
      >
        {/* Confetti dots */}
        {[...Array(16)].map((_, i) => (
          <span
            key={i}
            className="absolute w-2 h-2 rounded-full opacity-30"
            style={{
              background: i % 2 === 0 ? "#fff" : "rgba(255,255,255,0.5)",
              top: `${Math.random() * 100}%`,
              left: `${(i / 16) * 100}%`,
              transform: `scale(${0.5 + Math.random()})`,
            }}
          />
        ))}

        <div className="relative flex items-center gap-4">
          <span className="text-5xl" style={{ animation: "ms-pop 0.6s 0.1s ease-out both" }}>
            {current.icon}
          </span>
          <div className="flex-1">
            <p className="text-xl font-bold leading-tight">{current.label}</p>
            <p className="text-sm opacity-90 mt-0.5">{current.sub}</p>
          </div>
          <button
            onClick={() => setCurrent(null)}
            className="opacity-70 hover:opacity-100 text-lg leading-none px-2"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* Auto-dismiss progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-2xl overflow-hidden">
          <div
            className="h-full bg-white/60 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </>
  );
}
