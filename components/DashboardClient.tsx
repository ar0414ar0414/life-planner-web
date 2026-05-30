"use client";

import { Asset, FireSettings, AssetSnapshot } from "@/db/schema";
import {
  calcFireNumber, calcMonthsToFire, monthsToAchieveDate, formatAmount,
} from "@/lib/simulation";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";

const ASSET_COLORS: Record<string, string> = {
  cash: "#60a5fa",
  stock: "#34d399",
  ideco: "#a78bfa",
  insurance: "#fbbf24",
  other: "#94a3b8",
};

const ASSET_LABELS: Record<string, string> = {
  cash: "現金・預金",
  stock: "株・投信",
  ideco: "iDeCo",
  insurance: "保険",
  other: "その他",
};

interface Props {
  netWorth: number;
  monthlySavings: number;
  settings: FireSettings | null;
  assetRows: Asset[];
  snapshots: AssetSnapshot[];
}

export default function DashboardClient({
  netWorth, monthlySavings,
  settings, assetRows, snapshots,
}: Props) {
  const fireNumber = settings ? calcFireNumber(settings) : 0;
  const fireProgress = fireNumber > 0 ? Math.min(100, (netWorth / fireNumber) * 100) : 0;
  const monthsToFire = settings
    ? calcMonthsToFire(fireNumber, netWorth, monthlySavings, settings.annualReturnRate)
    : null;
  const fireDate = monthsToFire !== null ? monthsToAchieveDate(monthsToFire) : null;

  const pieData = assetRows
    .filter((a) => a.amount > 0)
    .map((a) => ({ name: ASSET_LABELS[a.type] ?? a.type, value: a.amount, type: a.type }));

  const snapshotData = snapshots.map((s) => ({
    month: s.yearMonth.slice(0, 7),
    資産: Math.round(s.totalAssets),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">FIRE達成までの進捗</p>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="純資産" value={`${formatAmount(netWorth)}`} sub="総資産 − 負債" />
        <KpiCard label="FIRE数字" value={settings ? formatAmount(fireNumber) : "—"} sub="必要資産額" />
        <KpiCard
          label="FIRE達成率"
          value={fireNumber > 0 ? `${fireProgress.toFixed(1)}%` : "—"}
          sub={fireDate ? `達成見込: ${fireDate}` : "設定が必要"}
          accent
        />
        <KpiCard
          label="月次貯蓄"
          value={`${monthlySavings >= 0 ? "+" : ""}${formatAmount(monthlySavings)}`}
          sub="収入 − 支出"
        />
      </div>

      {/* FIRE進捗バー */}
      {fireNumber > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex justify-between text-sm mb-3">
            <span className="font-medium text-gray-700">FIRE進捗</span>
            <span className="text-orange-600 font-bold">{fireProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
              style={{ width: `${fireProgress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{formatAmount(netWorth)}</span>
            <span>{formatAmount(fireNumber)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 資産内訳ドーナツ */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">資産内訳</h2>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={ASSET_COLORS[entry.type] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => typeof v === "number" ? formatAmount(v) : String(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {pieData.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: ASSET_COLORS[entry.type] ?? "#94a3b8" }}
                      />
                      <span className="text-gray-600">{entry.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatAmount(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">資産を登録してください</p>
          )}
        </div>

        {/* 純資産推移 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">純資産推移</h2>
          {snapshotData.length > 1 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={snapshotData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v}万`} />
                <Tooltip formatter={(v) => typeof v === "number" ? formatAmount(v) : String(v)} />
                <Area type="monotone" dataKey="資産" stroke="#f97316" strokeWidth={2} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">データが不足しています</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent = false }: {
  label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? "bg-orange-50 border-orange-100" : "bg-white border-gray-100"}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? "text-orange-600" : "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
