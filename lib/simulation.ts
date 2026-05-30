import { LifeEvent, FireSettings } from "@/db/schema";

export interface SimulationInput {
  totalAssets: number;
  monthlySavings: number;
  annualBonus: number;
  annualReturnRate: number;
}

export interface GoalResult {
  event: LifeEvent;
  projectedAmount: number;
  gap: number;
  status: "ok" | "warning" | "danger";
  monthlyShortfall: number;
}

export interface YearlyPoint {
  year: number;
  amount: number;
}

export function calcYearlyProjection(
  input: SimulationInput,
  years: number
): YearlyPoint[] {
  const { totalAssets, monthlySavings, annualBonus, annualReturnRate } = input;
  const monthlyRate = annualReturnRate / 100 / 12;
  const points: YearlyPoint[] = [];
  let balance = totalAssets;
  const currentYear = new Date().getFullYear();

  for (let y = 0; y <= years; y++) {
    points.push({ year: currentYear + y, amount: Math.round(balance) });
    for (let m = 0; m < 12; m++) {
      balance += monthlySavings;
      balance *= 1 + monthlyRate;
    }
    balance += annualBonus;
  }
  return points;
}

export function calcGoalResults(
  events: LifeEvent[],
  input: SimulationInput
): GoalResult[] {
  const now = new Date();
  return events.map((event) => {
    const target = new Date(event.targetDate + "-01");
    const monthsLeft = Math.max(
      0,
      (target.getFullYear() - now.getFullYear()) * 12 +
        (target.getMonth() - now.getMonth())
    );
    const monthlyRate = input.annualReturnRate / 100 / 12;

    let projected = input.totalAssets;
    for (let m = 0; m < monthsLeft; m++) {
      projected += input.monthlySavings;
      projected *= 1 + monthlyRate;
      if (m % 12 === 11) projected += input.annualBonus;
    }
    projected = Math.round(projected);

    const gap = projected - event.targetAmount;
    const monthlyShortfall =
      gap < 0 && monthsLeft > 0 ? Math.abs(Math.ceil(gap / monthsLeft)) : 0;

    return {
      event,
      projectedAmount: projected,
      gap,
      status: gap >= 0 ? "ok" : monthlyShortfall <= 5 ? "warning" : "danger",
      monthlyShortfall,
    };
  });
}

export function formatAmount(万円: number): string {
  if (万円 >= 10000) return `${(万円 / 10000).toFixed(1)}億円`;
  return `${万円.toLocaleString()}万円`;
}

export function remainingMonths(targetDate: string): number {
  const now = new Date();
  const target = new Date(targetDate + "-01");
  return Math.max(
    0,
    (target.getFullYear() - now.getFullYear()) * 12 +
      (target.getMonth() - now.getMonth())
  );
}

export function calcFireNumber(settings: FireSettings): number {
  const effectiveExpense =
    settings.fireType === "semi"
      ? Math.max(0, settings.annualExpense - settings.sideIncome * 12)
      : settings.annualExpense;
  return Math.round(effectiveExpense / settings.swr);
}

export function calcCoastFireTarget(
  fireNumber: number,
  yearsToRetire: number,
  returnRate = 0.05
): number {
  if (yearsToRetire <= 0) return fireNumber;
  return Math.round(fireNumber / Math.pow(1 + returnRate, yearsToRetire));
}

export function calcMonthsToFire(
  fireNumber: number,
  netWorth: number,
  monthlySavings: number,
  annualReturnRate: number
): number {
  if (netWorth >= fireNumber) return 0;
  if (monthlySavings <= 0 && annualReturnRate <= 0) return 9999;
  const r = annualReturnRate / 100 / 12;
  let balance = netWorth;
  let months = 0;
  while (balance < fireNumber && months < 600) {
    balance = balance * (1 + r) + monthlySavings;
    months++;
  }
  return months < 600 ? months : 9999;
}

export function monthsToAchieveDate(months: number): string {
  if (months === 0) return "達成済み";
  if (months >= 9999) return "計算不能";
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

export function calcCoastFireMonths(
  fireNumber: number,
  netWorth: number,
  monthlySavings: number,
  coastRetireAge: number,
  currentAge: number,
  returnRate = 0.05
): number {
  const yearsToRetire = coastRetireAge - currentAge;
  if (yearsToRetire <= 0) return 0;
  const coastTarget = calcCoastFireTarget(fireNumber, yearsToRetire, returnRate);
  if (netWorth >= coastTarget) return 0;
  const r = returnRate / 12;
  let balance = netWorth;
  let months = 0;
  while (balance < coastTarget && months < 600) {
    balance = balance * (1 + r) + monthlySavings;
    months++;
  }
  return months < 600 ? months : 9999;
}

// 給与所得控除 (万円)
function employmentDeduction(income: number): number {
  if (income <= 162.5) return 55;
  if (income <= 180) return income * 0.4 - 10;
  if (income <= 360) return income * 0.3 + 8;
  if (income <= 660) return income * 0.2 + 44;
  if (income <= 850) return income * 0.1 + 110;
  return 195;
}

// 所得税の限界税率
function marginalTaxRate(taxableIncome: number): number {
  if (taxableIncome <= 195) return 0.05;
  if (taxableIncome <= 330) return 0.10;
  if (taxableIncome <= 695) return 0.20;
  if (taxableIncome <= 900) return 0.23;
  if (taxableIncome <= 1800) return 0.33;
  if (taxableIncome <= 4000) return 0.40;
  return 0.45;
}

// ふるさと納税上限概算（独身・扶養なし）
export function calcFurusatoLimit(annualIncome: number): number {
  const empIncome = annualIncome - employmentDeduction(annualIncome);
  const socialIns = Math.round(annualIncome * 0.148); // 概算14.8%
  const taxableIncomeTax = Math.max(0, empIncome - socialIns - 48); // 基礎控除48万
  const taxableResident = Math.max(0, empIncome - socialIns - 43);  // 住民税基礎控除43万
  const residentTax = taxableResident * 0.1;
  const incomeTaxRate = marginalTaxRate(taxableIncomeTax);
  const denom = 0.9 - incomeTaxRate * 1.021;
  if (denom <= 0) return 0;
  return Math.max(0, Math.round(residentTax * 0.2 / denom + 0.2));
}

// iDeCo節税額（年間）
export function calcIdecoTaxSaving(monthlyContrib: number, annualIncome: number): number {
  const annual = monthlyContrib * 12;
  const empIncome = annualIncome - employmentDeduction(annualIncome);
  const socialIns = Math.round(annualIncome * 0.148);
  const taxableIncome = Math.max(0, empIncome - socialIns - 48);
  const rate = marginalTaxRate(taxableIncome) + 0.1; // + 住民税10%
  return Math.round(annual * rate);
}

/**
 * 公的年金シミュレーション（概算）
 * @param kosei_months 厚生年金加入月数
 * @param kokumin_months 国民年金総加入月数（厚生年金月数を含む）
 * @param avgMonthlyRemuneration 平均標準報酬月額（万円）
 * @param startAge 受給開始年齢（60〜75）
 * @returns 年間受給額（万円）
 */
export function calcPension(
  kosei_months: number,
  kokumin_months: number,
  avgMonthlyRemuneration: number,
  startAge: number
): { kiso: number; kosei: number; total: number } {
  // 老齢基礎年金（満額79.5万/年 × 加入比率）
  const kiso = 79.5 * Math.min(kokumin_months, 480) / 480;

  // 老齢厚生年金（平均標準報酬月額 × 5.481/1000 × 加入月数）
  const kosei = avgMonthlyRemuneration * (5.481 / 1000) * kosei_months;

  // 受給開始年齢による調整率
  let adjustment: number;
  if (startAge < 65) {
    adjustment = 1 - 0.004 * (65 - startAge) * 12; // 月0.4%減
  } else {
    adjustment = 1 + 0.007 * (startAge - 65) * 12; // 月0.7%増
  }
  adjustment = Math.max(0.24, Math.min(1.84, adjustment));

  const total = Math.round((kiso + kosei) * adjustment * 10) / 10;
  return { kiso: Math.round(kiso * 10) / 10, kosei: Math.round(kosei * 10) / 10, total };
}

export function calcRequiredMonthlySavings(
  fireNumber: number,
  netWorth: number,
  targetYears: number,
  annualReturnRate: number
): number {
  if (netWorth >= fireNumber) return 0;
  const n = targetYears * 12;
  const r = annualReturnRate / 100 / 12;
  if (r === 0) return Math.max(0, Math.round((fireNumber - netWorth) / n));
  const growth = Math.pow(1 + r, n);
  return Math.max(0, Math.round(((fireNumber - netWorth * growth) * r) / (growth - 1)));
}
