import { Router, type IRouter } from "express";
import { streamChat, OPENROUTER_MODELS } from "../lib/openrouter.js";
import type { ChatMessage } from "../lib/openrouter.js";

const router: IRouter = Router();

// ── GET /api/ai/models — return available model list ──────────────────────
router.get("/ai/models", (_req, res) => {
  res.json({ models: OPENROUTER_MODELS });
});

// ── POST /api/ai/assist — multi-turn code assistant chat ──────────────────
/**
 * Body:
 *   code       : string  — current code in the editor (injected as system context)
 *   language   : string  — detected / selected language
 *   messages   : Array<{ role: "user"|"assistant", content: string }>
 *   model?     : string  — optional model override
 */
router.post("/ai/assist", async (req, res) => {
  const { code, language, messages, model } = req.body as {
    code?: string;
    language?: string;
    messages?: ChatMessage[];
    model?: string;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  const systemPrompt = [
    "You are an expert programming assistant embedded in the Polyglot code editor.",
    "Your job is to help the user understand, debug, optimise, and improve their code.",
    "Be concise but thorough. Use code blocks with the correct language tag when showing code.",
    language ? `The current language is: ${language}.` : "",
    code?.trim()
      ? `\n\nHere is the current code in the editor:\n\`\`\`${language ?? ""}\n${code}\n\`\`\``
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  await streamChat(chatMessages, res, { model });
});

// ── POST /api/ai/generate — generate code from a natural language prompt ──
/**
 * Body:
 *   prompt   : string  — what the user wants to generate
 *   language?: string  — preferred output language
 *   model?  : string  — optional model override
 */
router.post("/ai/generate", async (req, res) => {
  const { prompt, language, model } = req.body as {
    prompt?: string;
    language?: string;
    model?: string;
  };

  if (!prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const langHint = language ? ` Write it in ${language}.` : "";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are an expert code generator. When the user describes what they want, " +
        "output ONLY the raw source code — no explanations, no markdown fences, " +
        "no preamble text. Just the code itself, ready to paste into an editor.",
    },
    {
      role: "user",
      content: `${prompt.trim()}${langHint}`,
    },
  ];

  await streamChat(messages, res, { model, temperature: 0.4 });
});

// ── POST /api/ai/explain-error — explain a compile / runtime error ─────────
/**
 * Body:
 *   code     : string
 *   language : string
 *   stdout   : string
 *   stderr   : string
 *   exitCode : number
 *   model?   : string
 */
router.post("/ai/explain-error", async (req, res) => {
  const { code, language, stdout, stderr, exitCode, model } = req.body as {
    code?: string;
    language?: string;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    model?: string;
  };

  if (!code?.trim() && !stderr?.trim()) {
    res.status(400).json({ error: "code or stderr is required" });
    return;
  }

  const outputBlock = [
    stdout?.trim()   ? `stdout:\n${stdout}`   : "",
    stderr?.trim()   ? `stderr:\n${stderr}`   : "",
    exitCode !== undefined ? `exit code: ${exitCode}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a friendly coding tutor. Explain compiler and runtime errors " +
        "in plain language. Be concise — 2–4 sentences max. Then suggest the most " +
        "likely fix with a short code snippet if helpful.",
    },
    {
      role: "user",
      content: [
        language ? `Language: ${language}` : "",
        code?.trim()
          ? `Code:\n\`\`\`${language ?? ""}\n${code}\n\`\`\``
          : "",
        `Output:\n${outputBlock}`,
        "What went wrong and how do I fix it?",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  await streamChat(messages, res, { model, temperature: 0.3 });
});

export default router;
