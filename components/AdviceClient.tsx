"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";

type Provider = "gemini" | "claude";

interface FireStats {
  netWorth: string;
  fireNumber: string;
  fireProgress: string;
  monthlySavings: string;
  savingsRate: string;
  fireDate: string;
  fireType: string;
  annualExpense: string;
}

interface Props {
  fireStats: FireStats;
}

export default function AdviceClient({ fireStats }: Props) {
  const [provider, setProvider] = useState<Provider>("gemini");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState("");
  const [prompt, setPrompt] = useState("現在の状況を分析して、FIRE達成に向けた具体的なアドバイスをください。");

  async function getAdvice() {
    setLoading(true);
    setAdvice("");
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, prompt, fireStats }),
    });
    const data = await res.json();
    setAdvice(data.text ?? data.error ?? "エラーが発生しました");
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI相談</h1>
        <p className="text-sm text-gray-500 mt-1">あなたのFIRE状況をもとにAIがアドバイス</p>
      </div>

      {/* FIRE統計 */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-orange-800 mb-3">AIに渡す現在のデータ</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "純資産", value: fireStats.netWorth },
            { label: "FIRE数字", value: fireStats.fireNumber },
            { label: "達成率", value: fireStats.fireProgress },
            { label: "月次貯蓄", value: fireStats.monthlySavings },
            { label: "貯蓄率", value: fireStats.savingsRate },
            { label: "達成見込", value: fireStats.fireDate },
            { label: "FIREタイプ", value: fireStats.fireType },
            { label: "年間生活費", value: fireStats.annualExpense },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-orange-600">{label}</p>
              <p className="font-semibold text-orange-800 text-sm">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AIプロバイダー選択 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <div className="flex gap-2">
          {(["gemini", "claude"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                provider === p
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {p === "gemini" ? "Gemini" : "Claude"}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">質問・相談内容</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>

        <button
          onClick={getAdvice}
          disabled={loading || !prompt}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-xl transition disabled:opacity-50"
        >
          {loading ? "相談中..." : `${provider === "gemini" ? "Gemini" : "Claude"} に相談する`}
        </button>
      </div>

      {/* 回答 */}
      {advice && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-3">AIからのアドバイス</h2>
          <div className="prose prose-sm max-w-none text-gray-700">
            <ReactMarkdown>{advice}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
