"use client";

import { MonthlyFinance, AssetSnapshot } from "@/db/schema";
import { formatAmount } from "@/lib/simulation";
import { useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from "recharts";

type Range = "3m" | "6m" | "12m" | "all";

interface Props {
  financeRows: MonthlyFinance[];
  snapshots: AssetSnapshot[];
}

export default function TrendsClient({ financeRows, snapshots }: Props) {
  const [range, setRange] = useState<Range>("6m");

  const sliceCount = range === "3m" ? 3 : range === "6m" ? 6 : range === "12m" ? 12 : 999;

  const financeData = financeRows.slice(-sliceCount).map((f) => {
    const savings = f.income - f.fixedExpense - f.variableExpense;
    const savingsRate = f.income > 0 ? Math.round((savings / f.income) * 100) : 0;
    return {
      month: f.yearMonth.slice(5),
      収入: f.income,
      支出: f.fixedExpense + f.variableExpense,
      貯蓄: savings,
      貯蓄率: savingsRate,
    };
  });

  const snapshotData = snapshots.slice(-sliceCount).map((s) => ({
    month: s.yearMonth.slice(5),
    純資産: s.totalAssets,
  }));

  // 年次集計
  const yearlyMap: Record<string, { income: number; expense: number; savings: number }> = {};
  for (const f of financeRows) {
    const year = f.yearMonth.slice(0, 4);
    if (!yearlyMap[year]) yearlyMap[year] = { income: 0, expense: 0, savings: 0 };
    yearlyMap[year].income += f.income;
    yearlyMap[year].expense += f.fixedExpense + f.variableExpense;
    yearlyMap[year].savings += f.income - f.fixedExpense - f.variableExpense;
  }
  const yearlyData = Object.entries(yearlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, d]) => ({ year, ...d, 貯蓄率: d.income > 0 ? Math.round((d.savings / d.income) * 100) : 0 }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">トレンド分析</h1>
          <p className="text-sm text-gray-500 mt-1">収支・資産の推移を把握</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(["3m", "6m", "12m", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                range === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {r === "all" ? "全期間" : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 収支推移 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">収支推移</h2>
        {financeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={financeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v}万`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v, name) => typeof v === "number" ? (name === "貯蓄率" ? `${v}%` : formatAmount(v)) : String(v)} />
              <Legend />
              <Bar yAxisId="left" dataKey="収入" fill="#60a5fa" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="left" dataKey="支出" fill="#f87171" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="left" dataKey="貯蓄" fill="#34d399" radius={[3, 3, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="貯蓄率" stroke="#f97316" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">収支データを入力してください</p>
        )}
      </div>

      {/* 純資産推移 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">純資産推移</h2>
        {snapshotData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={snapshotData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v}万`} />
              <Tooltip formatter={(v) => typeof v === "number" ? formatAmount(v) : String(v)} />
              <Area type="monotone" dataKey="純資産" stroke="#f97316" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">資産データを入力してください</p>
        )}
      </div>

      {/* 年次集計テーブル */}
      {yearlyData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">年次集計</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["年", "収入", "支出", "貯蓄", "貯蓄率"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {yearlyData.map((row) => (
                <tr key={row.year} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{row.year}</td>
                  <td className="py-2.5 px-3 text-blue-600">{formatAmount(row.income)}</td>
                  <td className="py-2.5 px-3 text-red-500">{formatAmount(row.expense)}</td>
                  <td className="py-2.5 px-3 text-green-600">{formatAmount(row.savings)}</td>
                  <td className="py-2.5 px-3 text-orange-600 font-medium">{row.貯蓄率}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
