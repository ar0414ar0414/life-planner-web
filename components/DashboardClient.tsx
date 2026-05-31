"use client";

import { Asset, FireSettings, AssetSnapshot, Liability, MonthlyFinance } from "@/db/schema";
import MilestoneBanner from "@/components/MilestoneBanner";
import EmptyState from "@/components/EmptyState";
import {
  calcFireNumber, calcMonthsToFire, monthsToAchieveDate, formatAmount,
} from "@/lib/simulation";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Coins, FileText, TrendingUp } from "lucide-react";

const ASSET_TYPES_REPORT: [string, string][] = [
  ["cash", "現金・預金"], ["stock", "株・投信"],
  ["ideco", "iDeCo"], ["insurance", "保険"], ["other", "その他"],
];

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
  liabilityRows: Liability[];
  snapshots: AssetSnapshot[];
  recentFinance: MonthlyFinance[];
  userId: string;
}

export default function DashboardClient({
  netWorth, monthlySavings,
  settings, assetRows, liabilityRows, snapshots, recentFinance, userId,
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

  function openReport() {
    const latest = recentFinance[0];
    const prev = recentFinance[1];
    const month = latest?.yearMonth ?? new Date().toISOString().slice(0, 7);
    const prevNetWorth = snapshots.length > 0 ? snapshots[snapshots.length - 1].totalAssets : null;
    const netWorthDiff = prevNetWorth !== null ? netWorth - prevNetWorth : null;
    const totalLiab = liabilityRows.reduce((s, l) => s + l.amount, 0);
    const totalAsset = assetRows.reduce((s, a) => s + a.amount, 0);

    const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(1)}億円` : `${n.toLocaleString()}万円`;
    const pct = (n: number) => `${n.toFixed(1)}%`;
    const fireProgressStr = fireNumber > 0 ? pct(fireProgress) : "—";
    const fireDateStr = fireDate ?? "—";

    const assetTable = ASSET_TYPES_REPORT
      .map(([key, label]) => {
        const row = assetRows.find((a) => a.type === key);
        const amount = row?.amount ?? 0;
        const share = totalAsset > 0 ? pct((amount / totalAsset) * 100) : "0%";
        return `<tr><td>${label}</td><td style="text-align:right">${fmt(amount)}</td><td style="text-align:right">${share}</td></tr>`;
      }).join("");

    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<title>月次FIREレポート ${month}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#1f2937;padding:24px 32px;max-width:740px;margin:0 auto}
  h1{font-size:20px;font-weight:700;margin-bottom:4px}
  h2{font-size:13px;font-weight:600;margin:20px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:4px;color:#374151}
  .sub{font-size:11px;color:#6b7280;margin-bottom:16px}
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:4px}
  .kpi{background:#f9fafb;border-radius:8px;padding:10px 12px}
  .kpi .label{font-size:10px;color:#6b7280;margin-bottom:2px}
  .kpi .value{font-size:16px;font-weight:700;color:#111827}
  .kpi .diff{font-size:10px;margin-top:2px}
  .up{color:#16a34a}.down{color:#dc2626}.neu{color:#6b7280}
  table{width:100%;border-collapse:collapse;font-size:11px}
  th{background:#f3f4f6;text-align:left;padding:6px 8px;font-weight:600;color:#374151}
  td{padding:5px 8px;border-bottom:1px solid #f3f4f6}
  .fire-bar-wrap{background:#e5e7eb;border-radius:99px;height:10px;overflow:hidden;margin:6px 0}
  .fire-bar{height:10px;border-radius:99px;background:linear-gradient(to right,#f97316,#fb923c)}
  .footer{margin-top:24px;font-size:10px;color:#9ca3af;text-align:center}
  @media print{body{padding:0}}
</style></head><body>
<h1>月次FIREレポート</h1>
<div class="sub">${month.replace("-", "年")}月 作成日: ${new Date().toLocaleDateString("ja-JP")}</div>

<h2>📊 FIRE進捗サマリー</h2>
<div class="kpi-grid">
  <div class="kpi"><div class="label">純資産</div><div class="value">${fmt(netWorth)}</div>
    <div class="diff ${netWorthDiff === null ? "" : netWorthDiff >= 0 ? "up" : "down"}">${netWorthDiff !== null ? (netWorthDiff >= 0 ? "▲" : "▼") + fmt(Math.abs(netWorthDiff)) : "—"}</div></div>
  <div class="kpi"><div class="label">FIRE必要額</div><div class="value">${fireNumber > 0 ? fmt(fireNumber) : "—"}</div></div>
  <div class="kpi"><div class="label">FIRE達成率</div><div class="value">${fireProgressStr}</div>
    <div class="diff neu">達成見込: ${fireDateStr}</div></div>
  <div class="kpi"><div class="label">月次貯蓄</div><div class="value">${fmt(monthlySavings)}</div></div>
</div>
${fireNumber > 0 ? `<div class="fire-bar-wrap"><div class="fire-bar" style="width:${Math.min(100, fireProgress)}%"></div></div>` : ""}

<h2>💴 今月の収支 (${latest?.yearMonth ?? "—"})</h2>
<table>
  <tr><th>項目</th><th style="text-align:right">今月</th><th style="text-align:right">先月</th></tr>
  <tr><td>手取り収入</td><td style="text-align:right">${fmt(latest?.income ?? 0)}</td><td style="text-align:right">${fmt(prev?.income ?? 0)}</td></tr>
  <tr><td>固定支出</td><td style="text-align:right">${fmt(latest?.fixedExpense ?? 0)}</td><td style="text-align:right">${fmt(prev?.fixedExpense ?? 0)}</td></tr>
  <tr><td>変動支出</td><td style="text-align:right">${fmt(latest?.variableExpense ?? 0)}</td><td style="text-align:right">${fmt(prev?.variableExpense ?? 0)}</td></tr>
  <tr><td>ボーナス</td><td style="text-align:right">${fmt(latest?.bonus ?? 0)}</td><td style="text-align:right">${fmt(prev?.bonus ?? 0)}</td></tr>
  <tr style="font-weight:600"><td>貯蓄額</td>
    <td style="text-align:right;color:#16a34a">${fmt((latest?.income ?? 0) - (latest?.fixedExpense ?? 0) - (latest?.variableExpense ?? 0))}</td>
    <td style="text-align:right;color:#16a34a">${fmt((prev?.income ?? 0) - (prev?.fixedExpense ?? 0) - (prev?.variableExpense ?? 0))}</td>
  </tr>
</table>

<h2>🏦 資産内訳</h2>
<table>
  <tr><th>種類</th><th style="text-align:right">金額</th><th style="text-align:right">割合</th></tr>
  ${assetTable}
  <tr><th>負債合計</th><th style="text-align:right;color:#dc2626">-${fmt(totalLiab)}</th><th></th></tr>
  <tr style="font-weight:700"><td>純資産</td><td style="text-align:right">${fmt(netWorth)}</td><td></td></tr>
</table>

${settings ? `
<h2>🎯 FIRE設定</h2>
<table>
  <tr><th>項目</th><th>設定値</th></tr>
  <tr><td>FIREタイプ</td><td>${settings.fireType.toUpperCase()}</td></tr>
  <tr><td>年間生活費目標</td><td>${fmt(settings.annualExpense)}</td></tr>
  <tr><td>現在年齢 / 目標FIRE年齢</td><td>${settings.currentAge}歳 / ${settings.targetFireAge}歳</td></tr>
  <tr><td>取崩率 (SWR)</td><td>${(settings.swr * 100).toFixed(1)}%</td></tr>
  <tr><td>想定運用利回り</td><td>${settings.annualReturnRate}%</td></tr>
</table>` : ""}

<div class="footer">このレポートはLife Planner by Claude Codeで自動生成されました</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

    const win = window.open("", "_blank", "width=820,height=1060");
    if (win) { win.document.write(html); win.document.close(); }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {fireNumber > 0 && (
        <MilestoneBanner fireProgress={fireProgress} userId={userId} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">FIRE達成までの進捗</p>
        </div>
        <button
          onClick={openReport}
          className="text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-xl transition flex items-center gap-1.5"
        >
          <FileText className="w-4 h-4" /> 月次レポート
        </button>
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

      {/* FIRE カウントダウン */}
      {settings && (
        <FireCountdown
          currentAge={settings.currentAge}
          targetFireAge={settings.targetFireAge}
          monthsToFire={monthsToFire}
          fireDate={fireDate}
        />
      )}

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
            <EmptyState icon={Coins} title="資産がまだありません" action={{ label: "資産を登録する", href: "/finance" }} />
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
            <EmptyState icon={TrendingUp} title="純資産の推移データがありません" description="資産スナップショットは月初に自動記録されます" />
          )}
        </div>
      </div>
    </div>
  );
}

function FireCountdown({ currentAge, targetFireAge, monthsToFire, fireDate }: {
  currentAge: number;
  targetFireAge: number;
  monthsToFire: number | null;
  fireDate: string | null;
}) {
  const yearsLeft = monthsToFire !== null
    ? Math.floor(monthsToFire / 12)
    : Math.max(0, targetFireAge - currentAge);
  const monthsLeft = monthsToFire !== null ? monthsToFire % 12 : 0;
  const alreadyFired = currentAge >= targetFireAge;

  // Timeline: 0–100 range; sections: lived / countdown / post-FIRE
  const livedPct = Math.min(currentAge, 100);
  const firePct = Math.min(targetFireAge, 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
        <h2 className="text-base font-semibold text-gray-800">FIREまでの道のり</h2>
        <div className="text-right">
          {alreadyFired ? (
            <p className="text-xl font-bold text-green-600">FIRE達成圏内!</p>
          ) : (
            <>
              <p className="text-2xl font-bold text-orange-600">
                あと {yearsLeft}年{monthsLeft > 0 ? ` ${monthsLeft}ヶ月` : ""}
              </p>
              {fireDate && <p className="text-xs text-gray-400 mt-0.5">{fireDate} 達成見込み</p>}
            </>
          )}
        </div>
      </div>

      {/* Age timeline bar */}
      <div className="relative">
        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
          {/* Lived section */}
          <div
            className="h-full bg-blue-300 transition-all"
            style={{ width: `${livedPct}%` }}
          />
          {/* Countdown section */}
          <div
            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
            style={{ width: `${Math.max(0, firePct - livedPct)}%` }}
          />
          {/* Post-FIRE section (rest is gray-100 from parent) */}
        </div>

        {/* Current age marker */}
        <div
          className="absolute -top-1 transform -translate-x-1/2"
          style={{ left: `${livedPct}%` }}
        >
          <div className="w-2 h-5 bg-blue-500 rounded-full" />
        </div>

        {/* FIRE age marker */}
        <div
          className="absolute -top-1 transform -translate-x-1/2"
          style={{ left: `${firePct}%` }}
        >
          <div className="w-2 h-5 bg-orange-500 rounded-full" />
        </div>
      </div>

      <div className="flex justify-between text-xs mt-3">
        <span className="text-gray-400">0歳</span>
        <span className="text-blue-500 font-medium">{currentAge}歳（現在）</span>
        <span className="text-orange-500 font-medium">{targetFireAge}歳（FIRE目標）</span>
        <span className="text-gray-400">100歳</span>
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
