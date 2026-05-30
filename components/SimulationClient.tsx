"use client";

import { useState } from "react";
import { LifeEvent } from "@/db/schema";
import { calcGoalResults, calcYearlyProjection, formatAmount } from "@/lib/simulation";
import { useRouter } from "next/navigation";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
}

const emptyForm = {
  name: "", type: "other", targetAmount: "", targetDate: "", priority: "2", memo: "",
};

export default function SimulationClient({
  events, netWorth, monthlySavings, annualBonus, annualReturnRate,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        targetAmount: Number(form.targetAmount),
        priority: Number(form.priority),
      }),
    });
    setForm({ ...emptyForm });
    setShowForm(false);
    router.refresh();
    setSaving(false);
  }

  async function deleteEvent(id: string) {
    setDeleting(id);
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    router.refresh();
    setDeleting(null);
  }

  const statusColor = { ok: "text-green-600 bg-green-50", warning: "text-yellow-600 bg-yellow-50", danger: "text-red-600 bg-red-50" };
  const statusLabel = { ok: "達成見込", warning: "要注意", danger: "不足" };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">シミュレーション</h1>
          <p className="text-sm text-gray-500 mt-1">ライフイベントと将来資産の見通し</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          + イベント追加
        </button>
      </div>

      {/* イベント追加フォーム */}
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

      {/* イベント一覧 */}
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
  );
}
