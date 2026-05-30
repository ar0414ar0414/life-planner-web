"use client";

import { useState } from "react";
import { FireSettings } from "@/db/schema";
import { calcFireNumber, calcRequiredMonthlySavings, formatAmount } from "@/lib/simulation";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toaster";

interface Props {
  userId: string;
  settings: FireSettings | null;
}

export default function GoalsClient({ settings }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    fireType: settings?.fireType ?? "fire",
    annualExpense: String(settings?.annualExpense ?? 240),
    sideIncome: String(settings?.sideIncome ?? 0),
    currentAge: String(settings?.currentAge ?? 30),
    targetFireAge: String(settings?.targetFireAge ?? 50),
    coastRetireAge: String(settings?.coastRetireAge ?? 65),
    swr: String((settings?.swr ?? 0.04) * 100),
    annualReturnRate: String(settings?.annualReturnRate ?? 5),
  });
  const [saving, setSaving] = useState(false);

  const previewSettings = {
    ...settings,
    fireType: form.fireType,
    annualExpense: Number(form.annualExpense) || 0,
    sideIncome: Number(form.sideIncome) || 0,
    currentAge: Number(form.currentAge) || 30,
    targetFireAge: Number(form.targetFireAge) || 50,
    coastRetireAge: Number(form.coastRetireAge) || 65,
    swr: (Number(form.swr) || 4) / 100,
    annualReturnRate: Number(form.annualReturnRate) || 5,
  } as FireSettings;

  const fireNumber = calcFireNumber(previewSettings);
  const targetYears = previewSettings.targetFireAge - previewSettings.currentAge;
  const requiredSavings = calcRequiredMonthlySavings(fireNumber, 0, targetYears, previewSettings.annualReturnRate);

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          annualExpense: Number(form.annualExpense),
          sideIncome: Number(form.sideIncome),
          currentAge: Number(form.currentAge),
          targetFireAge: Number(form.targetFireAge),
          coastRetireAge: Number(form.coastRetireAge),
          swr: (Number(form.swr) || 4) / 100,
          annualReturnRate: Number(form.annualReturnRate),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("FIRE設定を保存しました");
      router.refresh();
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">FIRE設定</h1>
        <p className="text-sm text-gray-500 mt-1">目標FIRE数字と条件を設定</p>
      </div>

      {/* FIRE種別 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-3">FIREの種類</h2>
        <div className="grid grid-cols-5 gap-2">
          {(["fire", "semi", "coast", "fat", "lean"] as const).map((type) => {
            const labels: Record<string, { label: string; desc: string }> = {
              fire: { label: "FIRE", desc: "完全リタイア" },
              semi: { label: "セミFIRE", desc: "副業あり" },
              coast: { label: "Coast", desc: "積立停止後運用" },
              fat: { label: "Fat FIRE", desc: "豊かなリタイア" },
              lean: { label: "Lean FIRE", desc: "倹約リタイア" },
            };
            const active = form.fireType === type;
            return (
              <button
                key={type}
                onClick={() => set("fireType", type)}
                className={`rounded-xl p-3 text-center border transition-colors ${
                  active ? "bg-orange-50 border-orange-300" : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <p className={`text-sm font-semibold ${active ? "text-orange-600" : "text-gray-700"}`}>
                  {labels[type].label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{labels[type].desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 各種設定 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">詳細設定</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="年間生活費（万円）" value={form.annualExpense} onChange={(v) => set("annualExpense", v)} />
          {form.fireType === "semi" && (
            <Field label="年間副業収入（万円）" value={form.sideIncome} onChange={(v) => set("sideIncome", v)} />
          )}
          <Field label="現在年齢" value={form.currentAge} onChange={(v) => set("currentAge", v)} />
          <Field label="FIRE目標年齢" value={form.targetFireAge} onChange={(v) => set("targetFireAge", v)} />
          {form.fireType === "coast" && (
            <Field label="リタイア年齢（Coast）" value={form.coastRetireAge} onChange={(v) => set("coastRetireAge", v)} />
          )}
          <Field label="SWR（%、例: 4）" value={form.swr} onChange={(v) => set("swr", v)} />
          <Field label="年利（%）" value={form.annualReturnRate} onChange={(v) => set("annualReturnRate", v)} />
        </div>
      </div>

      {/* プレビュー */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
        <h2 className="font-semibold text-orange-800 mb-4">計算プレビュー</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-orange-600">必要FIRE資産</p>
            <p className="text-xl font-bold text-orange-700">{formatAmount(fireNumber)}</p>
          </div>
          <div>
            <p className="text-xs text-orange-600">年間生活費</p>
            <p className="text-xl font-bold text-orange-700">{formatAmount(previewSettings.annualExpense)}</p>
          </div>
          <div>
            <p className="text-xs text-orange-600">目標まで {targetYears}年</p>
            <p className="text-xl font-bold text-orange-700">必要月次貯蓄: {formatAmount(requiredSavings)}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-50"
        >
          {saving ? "保存中..." : "設定を保存"}
        </button>
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
      />
    </div>
  );
}
