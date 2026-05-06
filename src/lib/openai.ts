// Minimal OpenAI Chat Completions client. We only ever need JSON mode
// here, so the helper is shaped around that.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "OpenAiError";
  }
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatJson<T>(opts: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
}): Promise<{ data: T; modelUsed: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new OpenAiError("OPENAI_API_KEY is not set.");

  const messages: ChatMessage[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      temperature: opts.temperature ?? 0.8,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body?.error?.message ?? "";
    } catch {
      // ignore
    }
    throw new OpenAiError(
      `OpenAI ${res.status}${detail ? `: ${detail}` : ""}`,
      res.status
    );
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new OpenAiError("Empty response from OpenAI.");

  let parsed: T;
  try {
    parsed = JSON.parse(content) as T;
  } catch {
    throw new OpenAiError("OpenAI returned non-JSON content.");
  }

  return { data: parsed, modelUsed: body.model ?? opts.model };
}
