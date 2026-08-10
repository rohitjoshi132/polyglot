/**
 * OpenRouter streaming helper
 *
 * Calls OpenRouter's OpenAI-compatible Chat Completions API with SSE streaming
 * and pipes the token stream directly to the Express response.
 *
 * The client receives raw `data: ...` SSE events so it can consume them with
 * a standard ReadableStream reader.
 */

import type { Response } from "express";

// ── Available models exposed to the UI ─────────────────────────────────────
export const OPENROUTER_MODELS = [
  { id: "google/gemini-2.0-flash",             label: "Gemini 2.0 Flash",       provider: "Google"    },
  { id: "google/gemini-2.5-flash",             label: "Gemini 2.5 Flash",       provider: "Google"    },
  { id: "anthropic/claude-3.5-sonnet",         label: "Claude 3.5 Sonnet",      provider: "Anthropic" },
  { id: "anthropic/claude-3-haiku",            label: "Claude 3 Haiku",         provider: "Anthropic" },
  { id: "openai/gpt-4o",                       label: "GPT-4o",                 provider: "OpenAI"    },
  { id: "openai/gpt-4o-mini",                  label: "GPT-4o Mini",            provider: "OpenAI"    },
  { id: "meta-llama/llama-3.3-70b-instruct",   label: "Llama 3.3 70B",          provider: "Meta"      },
  { id: "deepseek/deepseek-r1",                label: "DeepSeek R1",            provider: "DeepSeek"  },
  { id: "qwen/qwen-2.5-72b-instruct",          label: "Qwen 2.5 72B",           provider: "Alibaba"   },
  { id: "mistralai/mistral-nemo",              label: "Mistral Nemo",           provider: "Mistral"   },
] as const;

export type ModelId = (typeof OPENROUTER_MODELS)[number]["id"];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Validate that the requested model is in our allow-list. Falls back to default if not. */
function resolveModel(requested?: string): string {
  const env  = process.env["OPENROUTER_MODEL"] ?? "google/gemini-2.0-flash";
  if (!requested) return env;
  const found = OPENROUTER_MODELS.find((m) => m.id === requested);
  return found ? found.id : env;
}

/**
 * Stream a chat completion from OpenRouter into the Express response.
 *
 * Sets the response headers for SSE, then streams the raw `data:` lines from
 * OpenRouter.  The final `data: [DONE]` event is forwarded as-is so the
 * client knows the stream has ended.
 */
export async function streamChat(
  messages: ChatMessage[],
  res: Response,
  opts?: { model?: string; temperature?: number }
): Promise<void> {
  const apiKey = process.env["OPENROUTER_API_KEY"];
  if (!apiKey || apiKey.startsWith("sk-or-v1-your-key-here")) {
    res.status(503).json({
      error: "OpenRouter API key not configured. Add OPENROUTER_API_KEY to your .env file.",
    });
    return;
  }

  const model       = resolveModel(opts?.model);
  const temperature = opts?.temperature ?? 0.7;

  // ── SSE headers ────────────────────────────────────────────────────────
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering if present
  res.flushHeaders();

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization":  `Bearer ${apiKey}`,
        "Content-Type":   "application/json",
        "HTTP-Referer":   "https://polyglot.app",
        "X-Title":        "Polyglot Code Editor",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      res.write(`data: ${JSON.stringify({ error: `OpenRouter error ${response.status}: ${errBody}` })}\n\n`);
      res.end();
      return;
    }

    if (!response.body) {
      res.write(`data: ${JSON.stringify({ error: "No response body from OpenRouter" })}\n\n`);
      res.end();
      return;
    }

    // ── Pipe the SSE stream from OpenRouter → client ──────────────────
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      // OpenRouter already sends properly formatted SSE lines — forward them.
      res.write(chunk);
      // Flush immediately so the client gets each token without buffering
      if (typeof (res as unknown as { flush?: () => void }).flush === "function") {
        (res as unknown as { flush: () => void }).flush();
      }
    }

    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
}
