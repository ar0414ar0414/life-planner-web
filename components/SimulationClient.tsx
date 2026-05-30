"use client";

import { useState, useCallback } from "react";
import { LifeEvent } from "@/db/schema";
import {
  calcGoalResults, calcYearlyProjection, formatAmount,
  calcMonthsToFire, monthsToAchieveDate,
  calcFurusatoLimit, calcIdecoTaxSaving,
  calcPension,
} from "@/lib/simulation";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

const EVENT_TYPES = [
  { value: "housing", label: "住宅" },
  { value: "retirement", label: "退職" },
  { value: "wedding", label: "結婚" },
  { value: "education", label: "教育" },
  { value: "travel", label: "旅行" },
  { value: "other", label: "その他" },
];

interface Props {
  userId: string;
  events: LifeEvent[];
  netWorth: number;
  monthlySavings: number;
  annualBonus: number;
  annualReturnRate: number;
  fireNumber: number;
  investableAssets: number;
  targetAnnualExpense: number;
  currentAge: number;
  targetFireAge: number;
  monthlyIncome: number;
}

const emptyForm = {
  name: "", type: "other", targetAmount: "", targetDate: "", priority: "2", memo: "",
};

export default function SimulationClient({
  events, netWorth, monthlySavings, annualBonus, annualReturnRate,
  fireNumber, investableAssets, targetAnnualExpense,
  currentAge, targetFireAge, monthlyIncome,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [simTab, setSimTab] = useState<"fire" | "events" | "tax" | "risk">("fire");
  const [extraSavings, setExtraSavings] = useState(0);
  const [dividendYield, setDividendYield] = useState(3);
  const [annualIncome, setAnnualIncome] = useState(500);
  const [idecoMonthly, setIdecoMonthly] = useState(23);
  const [mcVolatility, setMcVolatility] = useState(15);
  const [mcResults, setMcResults] = useState<{
    successRate: number;
    points: { year: number; p10: number; p50: number; p90: number }[];
  } | null>(null);
  const [mcRunning, setMcRunning] = useState(false);

  const runMonteCarlo = useCallback(() => {
    setMcRunning(true);
    setTimeout(() => {
      const TRIALS = 1000;
      const yearsToSim = Math.max(5, Math.min(50, targetFireAge - currentAge + 5));
      const monthlyMean = annualReturnRate / 100 / 12;
      const monthlyVol = (mcVolatility / 100) / Math.sqrt(12);
      const yearly: number[][] = Array.from({ length: yearsToSim + 1 }, () => []);
      let successes = 0;

      for (let t = 0; t < TRIALS; t++) {
        let bal = netWorth;
        yearly[0].push(bal);
        let hit = bal >= fireNumber;
        for (let m = 1; m <= yearsToSim * 12; m++) {
          const u1 = Math.max(1e-10, Math.random());
          const u2 = Math.random();
          const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          bal = Math.max(0, bal * (1 + monthlyMean + z * monthlyVol) + monthlySavings);
          if (m % 12 === 0) {
            yearly[m / 12].push(bal);
            if (bal >= fireNumber) hit = true;
          }
        }
        if (hit) successes++;
      }

      const pct = (arr: number[], p: number) => {
        const s = [...arr].sort((a, b) => a - b);
        return Math.round(s[Math.floor(s.length * p)] ?? 0);
      };

      const points = yearly.map((data, year) => ({
        year: currentAge + year,
        p10: pct(data, 0.10),
        p50: pct(data, 0.50),
        p90: pct(data, 0.90),
      }));

      setMcResults({ successRate: Math.round((successes / TRIALS) * 100), points });
      setMcRunning(false);
    }, 10);
  }, [netWorth, monthlySavings, annualReturnRate, fireNumber, mcVolatility, currentAge, targetFireAge]);

  const defaultJoinYears = Math.max(0, currentAge - 22);
  const [joinYears, setJoinYears] = useState(defaultJoinYears);
  const [pensionStartAge, setPensionStartAge] = useState(65);

  const simInput = { totalAssets: netWorth, monthlySavings, annualBonus, annualReturnRate };
  const goalResults = calcGoalResults(events, simInput);
  const projection = calcYearlyProjection(simInput, 10);
  const projection2 = calcYearlyProjection({ ...simInput, monthlySavings: monthlySavings + 3 }, 10);
  const projection3 = calcYearlyProjection({ ...simInput, annualReturnRate: annualReturnRate + 2 }, 10);

  const chartData = projection.map((p, i) => ({
    year: String(p.year),
    現状: Math.round(p.amount),
    "貯蓄+3万": Math.round(projection2[i].amount),
    "運用+2%": Math.round(projection3[i].amount),
  }));

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveEvent() {
    setSaving(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          targetAmount: Number(form.targetAmount),
          priority: Number(form.priority),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("イベントを追加しました");
      setForm({ ...emptyForm });
      setShowForm(false);
      router.refresh();
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("イベントを削除しました");
      router.refresh();
    } catch {
      toast.error("削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  }

  const statusColor = { ok: "text-green-600 bg-green-50", warning: "text-yellow-600 bg-yellow-50", danger: "text-red-600 bg-red-50" };
  const statusLabel = { ok: "達成見込", warning: "要注意", danger: "不足" };

  const SIM_TABS = [
    { key: "fire"   as const, label: "FIRE試算"   },
    { key: "events" as const, label: "イベント"   },
    { key: "tax"    as const, label: "節税・年金" },
    { key: "risk"   as const, label: "リスク分析" },
  ];

  /* ── FIRE試算タブ ── */
  const baseMonths  = calcMonthsToFire(fireNumber, netWorth, monthlySavings, annualReturnRate);
  const newMonths   = calcMonthsToFire(fireNumber, netWorth, monthlySavings + extraSavings, annualReturnRate);
  const saved       = Math.max(0, baseMonths - newMonths);
  const savedYears  = Math.floor(saved / 12);
  const savedMo     = saved % 12;
  const newDate     = monthsToAchieveDate(newMonths);
  const baseDate    = monthsToAchieveDate(baseMonths);

  const annualDividend  = Math.round(investableAssets * (dividendYield / 100));
  const monthlyDividend = Math.round(annualDividend / 12);
  const divCoverage     = targetAnnualExpense > 0 ? (annualDividend / targetAnnualExpense) * 100 : 0;
  const investRatio     = netWorth > 0 ? investableAssets / netWorth : 0;
  const fireInvestable  = fireNumber > 0 ? Math.round(fireNumber * investRatio) : 0;
  const fireDividend    = Math.round(fireInvestable * (dividendYield / 100));
  const fireDivCoverage = targetAnnualExpense > 0 ? (fireDividend / targetAnnualExpense) * 100 : 0;

  /* ── 節税・年金タブ ── */
  const furusato    = calcFurusatoLimit(annualIncome);
  const idecoSaving = calcIdecoTaxSaving(idecoMonthly / 10, annualIncome);
  const ideco30y    = idecoSaving * 30;

  const futureMonths     = Math.max(0, (Math.min(targetFireAge, 65) - currentAge) * 12);
  const totalKoseiMonths = Math.min(480, joinYears * 12 + futureMonths);
  const avgRemuneration  = monthlyIncome > 0 ? monthlyIncome : annualIncome / 12;
  const pension          = calcPension(totalKoseiMonths, totalKoseiMonths, avgRemuneration, pensionStartAge);
  const monthlyPension   = Math.round(pension.total / 12 * 10) / 10;
  const penCoverage      = targetAnnualExpense > 0 ? (pension.total / targetAnnualExpense) * 100 : 0;
  const paidTotal        = joinYears * 12 * 1.698 + avgRemuneration * 0.0915 * joinYears * 12;
  const breakEvenYears   = pension.total > 0 ? Math.ceil(paidTotal / pension.total) : 99;
  const breakEvenAge     = pensionStartAge + breakEvenYears;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">シミュレーション</h1>
        <p className="text-sm text-gray-500 mt-1">将来資産・節税・リスク分析</p>
      </div>

      {/* タブナビゲーション */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {SIM_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSimTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-1 ${
              simTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: FIRE試算 ── */}
      {simTab === "fire" && (
        <div className="space-y-6">
          {/* FIREアクセラレーター */}
          {fireNumber > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-gray-800">FIREアクセラレーター</h2>
                <p className="text-xs text-gray-400 mt-0.5">月の追加貯蓄でFIREが何年早まるか確認できます</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">追加貯蓄額</span>
                  <span className="font-bold text-orange-600">+{extraSavings}万円 / 月</span>
                </div>
                <input
                  type="range" min={0} max={30} step={1}
                  value={extraSavings}
                  onChange={(e) => setExtraSavings(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>+0万</span><span>+15万</span><span>+30万</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">現状のFIRE見込み</p>
                  <p className="text-lg font-bold text-gray-700">{baseDate}</p>
                </div>
                <div className={`rounded-xl p-4 ${saved > 0 ? "bg-orange-50" : "bg-gray-50"}`}>
                  <p className="text-xs text-gray-500 mb-1">
                    {extraSavings > 0 ? `+${extraSavings}万追加後` : "追加なし"}
                  </p>
                  <p className={`text-lg font-bold ${saved > 0 ? "text-orange-600" : "text-gray-700"}`}>
                    {newDate}
                  </p>
                </div>
              </div>

              {saved > 0 && (
                <div className="flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-xl px-5 py-4">
                  <span className="text-2xl">🚀</span>
                  <div>
                    <p className="font-bold text-orange-700">
                      {savedYears > 0 && `${savedYears}年`}{savedMo > 0 && `${savedMo}ヶ月`} 早くFIREできます！
                    </p>
                    <p className="text-xs text-orange-500 mt-0.5">月 +{extraSavings}万円の追加貯蓄による効果</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 配当・分配金シミュレーション */}
          {investableAssets > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-gray-800">配当・分配金シミュレーション</h2>
                <p className="text-xs text-gray-400 mt-0.5">株・iDeCoからの不労所得を試算</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">想定配当利回り</span>
                  <span className="font-bold text-green-600">{dividendYield.toFixed(1)}%</span>
                </div>
                <input
                  type="range" min={0.5} max={10} step={0.5}
                  value={dividendYield}
                  onChange={(e) => setDividendYield(Number(e.target.value))}
                  className="w-full accent-green-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0.5%</span><span>5%</span><span>10%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 space-y-1">
                  <p className="text-xs text-gray-500">現在の年間配当</p>
                  <p className="text-xl font-bold text-gray-800">{formatAmount(annualDividend)}</p>
                  <p className="text-xs text-gray-400">月 {formatAmount(monthlyDividend)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 space-y-1">
                  <p className="text-xs text-gray-500">FIRE時の年間配当（推計）</p>
                  <p className="text-xl font-bold text-green-700">{fireNumber > 0 ? formatAmount(fireDividend) : "—"}</p>
                  <p className="text-xs text-green-500">月 {fireNumber > 0 ? formatAmount(Math.round(fireDividend / 12)) : "—"}</p>
                </div>
              </div>

              {targetAnnualExpense > 0 && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span>現在の生活費カバー率</span>
                      <span className="font-medium text-gray-700">{divCoverage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2.5 rounded-full bg-green-400 transition-all" style={{ width: `${Math.min(100, divCoverage)}%` }} />
                    </div>
                  </div>
                  {fireNumber > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                        <span>FIRE時の生活費カバー率（推計）</span>
                        <span className={`font-medium ${fireDivCoverage >= 100 ? "text-green-600" : "text-gray-700"}`}>
                          {fireDivCoverage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full transition-all ${fireDivCoverage >= 100 ? "bg-emerald-500" : "bg-teal-400"}`}
                          style={{ width: `${Math.min(100, fireDivCoverage)}%` }}
                        />
                      </div>
                      {fireDivCoverage >= 100 && (
                        <p className="text-xs text-emerald-600 mt-1.5 font-medium">配当だけで生活費を全額カバーできます！</p>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-400">投資対象: 株・投信 + iDeCo（合計 {formatAmount(investableAssets)}）</p>
                </div>
              )}
            </div>
          )}

          {/* シナリオ比較チャート */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">10年間の資産推移シナリオ</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v}万`} />
                <Tooltip formatter={(v) => typeof v === "number" ? formatAmount(v) : String(v)} />
                <Legend />
                <Line type="monotone" dataKey="現状" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="貯蓄+3万" stroke="#60a5fa" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                <Line type="monotone" dataKey="運用+2%" stroke="#34d399" strokeWidth={2} dot={false} strokeDasharray="5 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Tab: イベント ── */}
      {simTab === "events" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => setShowForm(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
            >
              + イベント追加
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-2xl border border-orange-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-800">ライフイベント登録</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">イベント名</label>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="例: マイホーム購入"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">カテゴリ</label>
                  <select
                    value={form.type}
                    onChange={(e) => setField("type", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">目標金額（万円）</label>
                  <input
                    type="number"
                    value={form.targetAmount}
                    onChange={(e) => setField("targetAmount", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">目標年月</label>
                  <input
                    type="month"
                    value={form.targetDate}
                    onChange={(e) => setField("targetDate", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">キャンセル</button>
                <button
                  onClick={saveEvent}
                  disabled={saving || !form.name || !form.targetAmount || !form.targetDate}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? "保存中..." : "登録"}
                </button>
              </div>
            </div>
          )}

          {goalResults.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">ライフイベント達成見込み</h2>
              <div className="space-y-3">
                {goalResults.map(({ event, projectedAmount, gap, status, monthlyShortfall }) => (
                  <div key={event.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-800">{event.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[status]}`}>
                          {statusLabel[status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        目標: {formatAmount(event.targetAmount)} / {event.targetDate} ·
                        見込み: {formatAmount(projectedAmount)}
                        {gap < 0 && ` · 不足: ${formatAmount(Math.abs(gap))} / 月${formatAmount(monthlyShortfall)}追加必要`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteEvent(event.id)}
                      disabled={deleting === event.id}
                      className="text-gray-300 hover:text-red-400 text-sm ml-4 transition"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {goalResults.length === 0 && !showForm && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-sm">ライフイベントがまだありません</p>
              <p className="text-xs mt-1">「+ イベント追加」から登録してください</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: 節税・年金 ── */}
      {simTab === "tax" && (
        <div className="space-y-6">
          {/* 節税シミュレーション */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
            <div>
              <h2 className="font-semibold text-gray-800">節税シミュレーション</h2>
              <p className="text-xs text-gray-400 mt-0.5">ふるさと納税・iDeCoの概算節税額（独身・扶養なし想定）</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">年収</span>
                <span className="font-bold text-gray-800">{annualIncome}万円</span>
              </div>
              <input
                type="range" min={200} max={2000} step={50}
                value={annualIncome}
                onChange={(e) => setAnnualIncome(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>200万</span><span>1000万</span><span>2000万</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="bg-red-50 rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏯</span>
                  <h3 className="font-semibold text-red-800 text-sm">ふるさと納税</h3>
                </div>
                <p className="text-2xl font-bold text-red-700">{furusato}万円</p>
                <p className="text-xs text-red-500">控除上限の目安（概算）</p>
                <div className="pt-2 border-t border-red-100 text-xs text-red-600 space-y-0.5">
                  <p>実質負担 2,000円でこの金額分の返礼品を受け取れます</p>
                  <p className="text-red-400">※実際の上限額は確定申告等で変わります</p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💜</span>
                  <h3 className="font-semibold text-purple-800 text-sm">iDeCo節税</h3>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-purple-700">
                    <span>月額掛金</span>
                    <span className="font-bold">{idecoMonthly}千円 / 月</span>
                  </div>
                  <input
                    type="range" min={1} max={68} step={1}
                    value={idecoMonthly}
                    onChange={(e) => setIdecoMonthly(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-purple-300">
                    <span>1千円</span><span>23千円</span><span>68千円</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-purple-100 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-700">年間節税額</span>
                    <span className="font-bold text-purple-800">{formatAmount(idecoSaving)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-purple-500">
                    <span>30年累計節税</span>
                    <span className="font-medium">{formatAmount(ideco30y)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 公的年金シミュレーション */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-800">公的年金シミュレーション</h2>
              <p className="text-xs text-gray-400 mt-0.5">老齢基礎年金＋老齢厚生年金の概算（会社員想定）</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">現在の厚生年金加入年数</span>
                <span className="font-bold text-gray-800">{joinYears}年</span>
              </div>
              <input
                type="range" min={0} max={43} step={1}
                value={joinYears}
                onChange={(e) => setJoinYears(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-gray-400">
                FIRE後の加入なし想定 → {currentAge}歳〜{Math.min(targetFireAge, 65)}歳まで合計
                {Math.round(totalKoseiMonths / 12)}年加入
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-600 mb-2">受給開始年齢</p>
              <div className="flex gap-2 flex-wrap">
                {[60, 65, 67, 70, 75].map((age) => (
                  <button
                    key={age}
                    onClick={() => setPensionStartAge(age)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      pensionStartAge === age
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {age}歳
                    {age < 65 && <span className="text-xs ml-1 opacity-70">（減額）</span>}
                    {age > 65 && <span className="text-xs ml-1 opacity-70">（増額）</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-600 mb-1">年間年金（合計）</p>
                <p className="text-xl font-bold text-blue-800">{pension.total}万円</p>
                <p className="text-xs text-blue-400 mt-0.5">月額 {monthlyPension}万円</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">内訳</p>
                <p className="text-sm text-gray-700">基礎 {pension.kiso}万円</p>
                <p className="text-sm text-gray-700">厚生 {pension.kosei}万円</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">損益分岐点</p>
                <p className="text-lg font-bold text-gray-800">{breakEvenAge}歳</p>
                <p className="text-xs text-gray-400 mt-0.5">受給{breakEvenYears}年で回収</p>
              </div>
            </div>

            {targetAnnualExpense > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>年金で生活費をカバーできる割合</span>
                  <span className={`font-medium ${penCoverage >= 100 ? "text-green-600" : "text-blue-600"}`}>
                    {penCoverage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all ${penCoverage >= 100 ? "bg-green-400" : "bg-blue-400"}`}
                    style={{ width: `${Math.min(100, penCoverage)}%` }}
                  />
                </div>
                {penCoverage >= 100 && (
                  <p className="text-xs text-green-600 mt-1.5 font-medium">年金だけで生活費を賄えます！</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: リスク分析 ── */}
      {simTab === "risk" && (
        <div className="space-y-6">
          {fireNumber > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="font-semibold text-gray-800">モンテカルロ・シミュレーション</h2>
                  <p className="text-xs text-gray-400 mt-0.5">1,000回の確率的試行でFIRE達成率を算出</p>
                </div>
                {mcResults && (
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${
                      mcResults.successRate >= 80 ? "text-green-600"
                      : mcResults.successRate >= 50 ? "text-amber-500"
                      : "text-red-500"
                    }`}>
                      {mcResults.successRate}%
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">FIRE達成確率</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">年率ボラティリティ（リスク）</span>
                  <span className="font-bold text-gray-800">{mcVolatility}%</span>
                </div>
                <input
                  type="range" min={5} max={30} step={1}
                  value={mcVolatility}
                  onChange={(e) => { setMcVolatility(Number(e.target.value)); setMcResults(null); }}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>低リスク 5%</span><span>標準 15%</span><span>高リスク 30%</span>
                </div>
              </div>

              <button
                onClick={runMonteCarlo}
                disabled={mcRunning}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-xl transition disabled:opacity-50"
              >
                {mcRunning ? "計算中..." : "シミュレーション実行"}
              </button>

              {mcResults && (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "悲観シナリオ (P10)", val: mcResults.points[mcResults.points.length - 1]?.p10, color: "text-red-500" },
                      { label: "中央値 (P50)",        val: mcResults.points[mcResults.points.length - 1]?.p50, color: "text-blue-600" },
                      { label: "楽観シナリオ (P90)", val: mcResults.points[mcResults.points.length - 1]?.p90, color: "text-green-600" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-500 mb-1">{label}</p>
                        <p className={`text-sm font-bold ${color}`}>{val !== undefined ? formatAmount(val) : "—"}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2">資産推移（P10 / 中央値 / P90）</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={mcResults.points}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${v}歳`} />
                        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={(v) => `${Math.round(v / 100) / 10}千万`} width={48} />
                        <Tooltip formatter={(v) => typeof v === "number" ? formatAmount(v) : String(v)} labelFormatter={(l) => `${l}歳`} />
                        <Legend />
                        {fireNumber > 0 && (
                          <ReferenceLine y={fireNumber} stroke="#f97316" strokeDasharray="5 3"
                            label={{ value: "FIRE目標", position: "insideTopRight", fontSize: 11, fill: "#f97316" }}
                          />
                        )}
                        <Line type="monotone" dataKey="p90" name="楽観 (P90)" stroke="#34d399" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                        <Line type="monotone" dataKey="p50" name="中央値"     stroke="#3b82f6" strokeWidth={2}   dot={false} />
                        <Line type="monotone" dataKey="p10" name="悲観 (P10)" stroke="#f87171" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">⚙️</p>
              <p className="text-sm">FIRE設定を登録するとリスク分析が利用できます</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
