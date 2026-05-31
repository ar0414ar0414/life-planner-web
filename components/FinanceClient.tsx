"use client";

import { useState, useEffect } from "react";
import { MonthlyFinance, Asset, Liability } from "@/db/schema";
import { formatAmount } from "@/lib/simulation";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
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

  function handleMonthChange(newMonth: string) {
    setYearMonth(newMonth);
    const row = financeRows.find((f) => f.yearMonth === newMonth);
    setIncome(String(row?.income ?? ""));
    setFixedExpense(String(row?.fixedExpense ?? ""));
    setVariableExpense(String(row?.variableExpense ?? ""));
    setBonus(String(row?.bonus ?? ""));
  }

  const TEMPLATE_KEY = `lp_finance_template_${userId}`;
  const [hasTemplate, setHasTemplate] = useState(false);
  useEffect(() => {
    setHasTemplate(!!localStorage.getItem(TEMPLATE_KEY));
  }, [TEMPLATE_KEY]);

  function saveTemplate() {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify({ income, fixedExpense, variableExpense, bonus }));
    setHasTemplate(true);
    toast.success("テンプレートを保存しました");
  }

  function applyTemplate() {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (!raw) { toast.error("テンプレートがありません"); return; }
    try {
      const t = JSON.parse(raw) as { income: string; fixedExpense: string; variableExpense: string; bonus: string };
      setIncome(t.income ?? "");
      setFixedExpense(t.fixedExpense ?? "");
      setVariableExpense(t.variableExpense ?? "");
      setBonus(t.bonus ?? "");
      toast.success("テンプレートを適用しました");
    } catch {
      localStorage.removeItem(TEMPLATE_KEY);
      setHasTemplate(false);
      toast.error("テンプレートが壊れていたため削除しました");
    }
  }

  function copyPrevMonth() {
    const prev = financeRows.find((f) => f.yearMonth < yearMonth);
    if (!prev) { toast.error("コピー元のデータがありません"); return; }
    setIncome(String(prev.income));
    setFixedExpense(String(prev.fixedExpense));
    setVariableExpense(String(prev.variableExpense));
    setBonus(String(prev.bonus));
    toast.success(`${prev.yearMonth} のデータをコピーしました`);
  }
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"finance" | "assets">("finance");

  const [assetAmounts, setAssetAmounts] = useState<Record<string, string>>(
    Object.fromEntries(assetRows.map((a) => [a.type, String(a.amount)]))
  );
  const [liabilityAmounts, setLiabilityAmounts] = useState<Record<string, string>>(
    Object.fromEntries(liabilityRows.map((l) => [l.type, String(l.amount)]))
  );

  const ALLOC_KEY = `lp_alloc_${userId}`;
  const DEFAULT_ALLOC: Record<string, number> = { cash: 20, stock: 50, ideco: 20, insurance: 5, other: 5 };
  const [targetAlloc, setTargetAlloc] = useState<Record<string, number>>(DEFAULT_ALLOC);
  useEffect(() => {
    const raw = localStorage.getItem(ALLOC_KEY);
    if (!raw) return;
    try {
      setTargetAlloc(JSON.parse(raw) as Record<string, number>);
    } catch {
      localStorage.removeItem(ALLOC_KEY);
    }
  }, [ALLOC_KEY]);

  function updateAlloc(type: string, val: number) {
    setTargetAlloc((prev) => {
      const next = { ...prev, [type]: val };
      localStorage.setItem(ALLOC_KEY, JSON.stringify(next));
      return next;
    });
  }

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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `保存に失敗しました (${res.status})`);
      }
      toast.success("収支を保存しました");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `保存に失敗しました (${res.status})`);
      }
      toast.success("資産・負債を保存しました");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存に失敗しました");
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-semibold text-gray-800">月次収支入力</h2>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={copyPrevMonth}
                  className="text-xs text-orange-500 border border-orange-300 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition"
                >
                  先月コピー
                </button>
                <button
                  onClick={saveTemplate}
                  className="text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition"
                >
                  テンプレート保存
                </button>
                {hasTemplate && (
                  <button
                    onClick={applyTemplate}
                    className="text-xs text-blue-500 border border-blue-300 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                  >
                    テンプレート適用
                  </button>
                )}
                <input
                  type="month"
                  value={yearMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5"
                />
              </div>
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

          <SpendingAlerts
            income={Number(income) || 0}
            fixedExpense={Number(fixedExpense) || 0}
            variableExpense={Number(variableExpense) || 0}
            history={financeRows.filter((f) => f.yearMonth !== yearMonth)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 支出内訳ドーナツ */}
            {(() => {
              const inc = Number(income) || 0;
              const fixed = Number(fixedExpense) || 0;
              const variable = Number(variableExpense) || 0;
              const savings = inc - fixed - variable;
              if (inc === 0) return null;
              const slices = [
                { name: "固定支出", value: fixed, color: "#f87171" },
                { name: "変動支出", value: variable, color: "#fb923c" },
                { name: "貯蓄", value: Math.max(0, savings), color: "#34d399" },
              ].filter((s) => s.value > 0);
              return (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-gray-800 mb-4">
                    今月の収支内訳
                    <span className="ml-2 text-xs font-normal text-gray-400">{yearMonth}</span>
                  </h2>
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={140} height={140}>
                      <PieChart>
                        <Pie
                          data={slices}
                          cx="50%" cy="50%"
                          innerRadius={42} outerRadius={65}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {slices.map((s, i) => <Cell key={i} fill={s.color} />)}
                        </Pie>
                        <Tooltip formatter={(v) => typeof v === "number" ? formatAmount(v) : String(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 flex-1">
                      {slices.map((s) => (
                        <div key={s.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                            <span className="text-gray-600">{s.name}</span>
                          </div>
                          <span className="font-medium text-gray-900">
                            {formatAmount(s.value)}
                            <span className="text-xs text-gray-400 ml-1">
                              ({Math.round((s.value / inc) * 100)}%)
                            </span>
                          </span>
                        </div>
                      ))}
                      {savings < 0 && (
                        <p className="text-xs text-red-500 mt-1">支出が収入を超えています</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 収支推移バーチャート */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">収支推移（直近）</h2>
                <ResponsiveContainer width="100%" height={200}>
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
          </div>
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

      {tab === "assets" && (
        <AllocationCompare
          assetAmounts={assetAmounts}
          targetAlloc={targetAlloc}
          onUpdateTarget={updateAlloc}
        />
      )}
    </div>
  );
}

function avg(nums: number[]) {
  return nums.length === 0 ? 0 : nums.reduce((s, n) => s + n, 0) / nums.length;
}

function SpendingAlerts({ income, fixedExpense, variableExpense, history }: {
  income: number;
  fixedExpense: number;
  variableExpense: number;
  history: MonthlyFinance[];
}) {
  if (history.length < 2) return null;

  const alerts: { level: "warn" | "info"; text: string }[] = [];

  const avgVariable = avg(history.map((h) => h.variableExpense));
  if (avgVariable > 0 && variableExpense > avgVariable * 1.3) {
    const pct = Math.round((variableExpense / avgVariable - 1) * 100);
    alerts.push({ level: "warn", text: `変動支出が過去平均より ${pct}% 高くなっています（平均 ${avgVariable.toFixed(1)}万円）` });
  }

  const avgIncome = avg(history.map((h) => h.income));
  if (avgIncome > 0 && income > 0 && income < avgIncome * 0.7) {
    const diff = Math.round(avgIncome - income);
    alerts.push({ level: "warn", text: `収入が過去平均より ${diff}万円 少なくなっています` });
  }

  if (income > 0) {
    const savingsRate = (income - fixedExpense - variableExpense) / income;
    if (savingsRate < 0.1) {
      alerts.push({ level: "info", text: `貯蓄率 ${Math.round(savingsRate * 100)}% — 目安の10%を下回っています` });
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm ${
            a.level === "warn"
              ? "bg-amber-50 border border-amber-200 text-amber-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          <span className="text-base leading-none mt-0.5">{a.level === "warn" ? "⚠️" : "ℹ️"}</span>
          <span>{a.text}</span>
        </div>
      ))}
    </div>
  );
}

const ALLOC_COLORS: Record<string, string> = {
  cash: "#60a5fa", stock: "#34d399", ideco: "#a78bfa", insurance: "#fbbf24", other: "#94a3b8",
};

function AllocationCompare({ assetAmounts, targetAlloc, onUpdateTarget }: {
  assetAmounts: Record<string, string>;
  targetAlloc: Record<string, number>;
  onUpdateTarget: (type: string, val: number) => void;
}) {
  const totalActual = ASSET_TYPES.reduce((s, { value }) => s + (Number(assetAmounts[value]) || 0), 0);
  if (totalActual === 0) return null;

  const targetSum = ASSET_TYPES.reduce((s, { value }) => s + (targetAlloc[value] ?? 0), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-gray-800">アセットアロケーション</h2>
          <p className="text-xs text-gray-400 mt-0.5">目標と実績の比較</p>
        </div>
        {Math.abs(targetSum - 100) > 1 && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
            目標合計 {targetSum}%（100%にしてください）
          </span>
        )}
      </div>

      <div className="space-y-4">
        {ASSET_TYPES.map(({ value, label }) => {
          const actual = Number(assetAmounts[value]) || 0;
          const actualPct = totalActual > 0 ? (actual / totalActual) * 100 : 0;
          const targetPct = targetAlloc[value] ?? 0;
          const gap = actualPct - targetPct;
          const color = ALLOC_COLORS[value] ?? "#94a3b8";

          return (
            <div key={value} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-gray-700">{label}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500">実績 {actualPct.toFixed(1)}%</span>
                  <span
                    className={`font-medium px-1.5 py-0.5 rounded ${
                      Math.abs(gap) <= 5
                        ? "text-green-700 bg-green-50"
                        : gap > 0
                        ? "text-red-600 bg-red-50"
                        : "text-blue-600 bg-blue-50"
                    }`}
                  >
                    {gap > 0 ? "+" : ""}{gap.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Actual bar */}
              <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, actualPct)}%`, background: color }}
                />
                {/* Target marker */}
                {targetPct > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-500 opacity-50"
                    style={{ left: `${Math.min(100, targetPct)}%` }}
                  />
                )}
              </div>

              {/* Target input */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-12">目標</span>
                <input
                  type="range"
                  min={0} max={100} step={5}
                  value={targetPct}
                  onChange={(e) => onUpdateTarget(value, Number(e.target.value))}
                  className="flex-1 accent-orange-400 h-1"
                />
                <span className="text-xs text-gray-600 w-8 text-right">{targetPct}%</span>
              </div>
            </div>
          );
        })}
      </div>
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
