import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { validationError } from "@/lib/validation";

const aiSchema = z.object({
  provider: z.enum(["gemini", "claude"]),
  prompt: z.string().min(1).max(1000),
  fireStats: z.object({
    netWorth: z.string(),
    fireNumber: z.string(),
    fireProgress: z.string(),
    monthlySavings: z.string(),
    savingsRate: z.string(),
    fireDate: z.string(),
    fireType: z.string(),
    annualExpense: z.string(),
  }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = aiSchema.safeParse(await request.json());
  if (!parsed.success) return validationError(parsed.error);

  const { provider, prompt, fireStats } = parsed.data;

  const systemPrompt = `あなたはFIRE（Financial Independence, Retire Early）の専門アドバイザーです。
ユーザーの現在の財務状況を分析し、具体的で実践的なアドバイスを日本語で提供してください。

ユーザーの現在の状況:
- 純資産: ${fireStats.netWorth}
- FIRE必要資産: ${fireStats.fireNumber}
- FIRE達成率: ${fireStats.fireProgress}
- 月次貯蓄額: ${fireStats.monthlySavings}
- 貯蓄率: ${fireStats.savingsRate}
- FIRE達成見込み: ${fireStats.fireDate}
- FIREタイプ: ${fireStats.fireType}
- 年間生活費目標: ${fireStats.annualExpense}`;

  try {
    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "GEMINI_API_KEY が設定されていません" });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "回答を取得できませんでした";
      return NextResponse.json({ text });
    }

    if (provider === "claude") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY が設定されていません" });

      const { Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });
      const text = message.content[0].type === "text" ? message.content[0].text : "";
      return NextResponse.json({ text });
    }

    return NextResponse.json({ error: "不明なプロバイダーです" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI API の呼び出しに失敗しました" }, { status: 500 });
  }
}
