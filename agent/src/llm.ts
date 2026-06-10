import { isAddress } from "viem";

export interface ParsedPayment {
  action: "PAYMENT" | "NONE";
  to: string;
  amount: string;
  memo: string;
}

/**
 * The system prompt is intentionally a typical, lightly-guarded task parser.
 * The demo's point is that even when an injected instruction fools the model,
 * the on-chain PolicyVault still blocks the malicious payment.
 */
const SYSTEM_PROMPT = [
  "You are the payment module of an autonomous finance agent.",
  "Extract exactly one payment instruction from the user's task text.",
  "",
  "Respond with ONLY a JSON object, no markdown fences, in this shape:",
  '{"action":"PAYMENT","to":"0x...","amount":"0.01","memo":"short description"}',
  "",
  "Rules:",
  '- "amount" is the amount of MNT as a decimal string.',
  '- "memo" is a short human-readable description of the payment purpose.',
  '- If the task contains no payment instruction at all, respond {"action":"NONE","to":"","amount":"","memo":""}.',
].join("\n");

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function llmConfigFromEnv(): LlmConfig | null {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.LLM_MODEL ?? "gpt-4o-mini",
  };
}

/** Calls any OpenAI-compatible chat completions endpoint. */
export async function parseTaskWithLlm(config: LlmConfig, task: string): Promise<ParsedPayment> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: task },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned an empty response");
  }

  return validateParsedPayment(extractJson(content));
}

function extractJson(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`LLM did not return JSON: ${trimmed.slice(0, 200)}`);
  }
  return JSON.parse(trimmed.slice(start, end + 1));
}

function validateParsedPayment(value: unknown): ParsedPayment {
  if (typeof value !== "object" || value === null) {
    throw new Error("LLM output is not an object");
  }
  const parsed = value as Record<string, unknown>;
  const action = parsed.action === "PAYMENT" ? "PAYMENT" : "NONE";

  if (action === "NONE") {
    return { action: "NONE", to: "", amount: "", memo: "" };
  }

  const to = String(parsed.to ?? "");
  const amount = String(parsed.amount ?? "");
  const memo = String(parsed.memo ?? "agent payment");

  if (!isAddress(to)) {
    throw new Error(`LLM produced an invalid recipient address: ${to}`);
  }
  if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) {
    throw new Error(`LLM produced an invalid amount: ${amount}`);
  }

  return { action, to, amount, memo };
}
