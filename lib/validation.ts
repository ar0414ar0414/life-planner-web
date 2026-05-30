import { z } from "zod";
import { NextResponse } from "next/server";

const nonNegInt = z.number().int().min(0);
const posInt = z.number().int().min(1);
const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM形式で入力してください");

export const financeSchema = z.object({
  yearMonth,
  income: nonNegInt,
  fixedExpense: nonNegInt,
  variableExpense: nonNegInt,
  bonus: nonNegInt,
});

export const assetsSchema = z.object({
  assets: z.record(z.string(), z.number().min(0)),
  liabilities: z.record(z.string(), z.number().min(0)),
});

export const goalsSchema = z.object({
  fireType: z.enum(["fire", "semi", "coast", "fat", "lean"]),
  annualExpense: nonNegInt,
  sideIncome: nonNegInt,
  currentAge: z.number().int().min(1).max(120),
  targetFireAge: z.number().int().min(1).max(120),
  coastRetireAge: z.number().int().min(1).max(120),
  swr: z.number().min(0.01).max(0.2),
  annualReturnRate: z.number().min(0).max(50),
});

export const eventSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["housing", "retirement", "wedding", "education", "travel", "other"]),
  targetAmount: posInt,
  targetDate: yearMonth,
  priority: z.number().int().min(1).max(3).default(2),
  memo: z.string().max(500).nullable().optional(),
});

export const aiSchema = z.object({
  provider: z.enum(["gemini", "claude"]),
  question: z.string().min(1).max(1000),
  context: z.string().max(5000).optional(),
});

export function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: "Invalid input", details: error.issues.map((i) => ({ path: i.path, message: i.message })) },
    { status: 400 }
  );
}
