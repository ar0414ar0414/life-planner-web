import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { validationError } from "@/lib/validation";
import { db } from "@/db";
import { aiRequests } from "@/db/schema";
import { eq, gte, count } from "drizzle-orm";

const RATE_LIMIT = 10;

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

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ value: reqCount }] = await db
    .select({ value: count() })
    .from(aiRequests)
    .where(eq(aiRequests.userId, user.id) && gte(aiRequests.createdAt, oneHourAgo));

  if (reqCount >= RATE_LIMIT) {
    return NextResponse.json(
      { error: `1時間あたり${RATE_LIMIT}回までご利用いただけます。しばらく経ってから再試行してください。` },
      { status: 429 },
    );
  }

  await db.insert(aiRequests).values({ userId: user.id });

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

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: prompt }] }],
          }),
        },
      );
      if (!geminiRes.ok || !geminiRes.body) {
        return NextResponse.json({ error: "Gemini API エラー" }, { status: 500 });
      }

      const body = geminiRes.body;
      const readable = new ReadableStream({
        async start(controller) {
          const reader = body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";
              for (const line of lines) {
                if (line.startsWith("data: ") && !line.includes("[DONE]")) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                    if (text) controller.enqueue(new TextEncoder().encode(text));
                  } catch { /* skip malformed chunks */ }
                }
              }
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    if (provider === "claude") {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return NextResponse.json({ error: "ANTHROPIC_API_KEY が設定されていません" });

      const { Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const stream = client.messages.stream({
              model: "claude-sonnet-4-6",
              max_tokens: 1024,
              system: systemPrompt,
              messages: [{ role: "user", content: prompt }],
            });
            for await (const event of stream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                controller.enqueue(new TextEncoder().encode(event.delta.text));
              }
            }
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    return NextResponse.json({ error: "不明なプロバイダーです" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "AI API の呼び出しに失敗しました" }, { status: 500 });
  }
}
