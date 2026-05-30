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
