"use client";

import { useState } from "react";
import { MonthlyFinance, Asset, Liability } from "@/db/schema";
import { formatAmount } from "@/lib/simulation";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const ASSET_TYPES = [
  { value: "cash", label: "現金・預金" },
  { value: "stock", label: "株・投信" },
  { value: "ideco", label: "iDeCo" },
  { value: "insurance", label: "保険" },
  { value: "other", label: "その他" },
];

const LIABILITY_TYPES = [
  { value: "mortgage", label: "住宅ローン" },
  { value: "car", label: "自動車ローン" },
  { value: "student", label: "奨学金" },
  { value: "other", label: "その他負債" },
];

interface Props {
  userId: string;
  financeRows: MonthlyFinance[];
  assetRows: Asset[];
  liabilityRows: Liability[];
}

export default function FinanceClient({ userId, financeRows, assetRows, liabilityRows }: Props) {
  const router = useRouter();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const existing = financeRows.find((f) => f.yearMonth === currentMonth);

  const [yearMonth, setYearMonth] = useState(currentMonth);
  const [income, setIncome] = useState(String(existing?.income ?? ""));
  const [fixedExpense, setFixedExpense] = useState(String(existing?.fixedExpense ?? ""));
  const [variableExpense, setVariableExpense] = useState(String(existing?.variableExpense ?? ""));
  const [bonus, setBonus] = useState(String(existing?.bonus ?? ""));
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"finance" | "assets">("finance");

  const [assetAmounts, setAssetAmounts] = useState<Record<string, string>>(
    Object.fromEntries(assetRows.map((a) => [a.type, String(a.amount)]))
  );
  const [liabilityAmounts, setLiabilityAmounts] = useState<Record<string, string>>(
    Object.fromEntries(liabilityRows.map((l) => [l.type, String(l.amount)]))
  );

  const chartData = [...financeRows].reverse().map((f) => ({
    month: f.yearMonth.slice(5),
    収入: f.income,
    支出: f.fixedExpense + f.variableExpense,
    貯蓄: f.income - f.fixedExpense - f.variableExpense,
  }));

  async function saveFinance() {
    setSaving(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yearMonth,
          income: Number(income) || 0,
          fixedExpense: Number(fixedExpense) || 0,
          variableExpense: Number(variableExpense) || 0,
          bonus: Number(bonus) || 0,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("収支を保存しました");
      router.refresh();
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function saveAssets() {
    setSaving(true);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: assetAmounts, liabilities: liabilityAmounts }),
      });
      if (!res.ok) throw new Error();
      toast.success("資産・負債を保存しました");
      router.refresh();
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">収支・資産</h1>
        <p className="text-sm text-gray-500 mt-1">毎月の収支と資産残高を記録</p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["finance", "assets"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "finance" ? "収支" : "資産・負債"}
          </button>
        ))}
      </div>

      {tab === "finance" && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">月次収支入力</h2>
              <input
                type="month"
                value={yearMonth}
                onChange={(e) => setYearMonth(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="手取り収入（万円）" value={income} onChange={setIncome} />
              <Field label="固定支出（万円）" value={fixedExpense} onChange={setFixedExpense} />
              <Field label="変動支出（万円）" value={variableExpense} onChange={setVariableExpense} />
              <Field label="ボーナス（万円）" value={bonus} onChange={setBonus} />
            </div>
            <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                貯蓄額：
                <span className="font-semibold text-gray-900 ml-1">
                  {formatAmount((Number(income) || 0) - (Number(fixedExpense) || 0) - (Number(variableExpense) || 0))}
                </span>
              </p>
              <button
                onClick={saveFinance}
                disabled={saving}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">収支推移（直近12ヶ月）</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v}万`} />
                  <Tooltip formatter={(v) => typeof v === "number" ? formatAmount(v) : String(v)} />
                  <Legend />
                  <Bar dataKey="収入" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="支出" fill="#f87171" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="貯蓄" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {tab === "assets" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-gray-800 mb-4">資産</h2>
            <div className="grid grid-cols-2 gap-4">
              {ASSET_TYPES.map(({ value, label }) => (
                <Field
                  key={value}
                  label={`${label}（万円）`}
                  value={assetAmounts[value] ?? ""}
                  onChange={(v) => setAssetAmounts((prev) => ({ ...prev, [value]: v }))}
                />
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <h2 className="font-semibold text-gray-800 mb-4">負債</h2>
            <div className="grid grid-cols-2 gap-4">
              {LIABILITY_TYPES.map(({ value, label }) => (
                <Field
                  key={value}
                  label={`${label}（万円）`}
                  value={liabilityAmounts[value] ?? ""}
                  onChange={(v) => setLiabilityAmounts((prev) => ({ ...prev, [value]: v }))}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={saveAssets}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        placeholder="0"
      />
    </div>
  );
}
