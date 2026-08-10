/**
 * useAiStream — custom hook to consume SSE streaming from an AI endpoint.
 *
 * Usage:
 *   const { text, isStreaming, startStream, abort } = useAiStream();
 *   await startStream("/api/ai/assist", { code, language, messages, model });
 */
import { useState, useRef, useCallback } from "react";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "https://polyglot-api-okgo.onrender.com";

export function useAiStream() {
  const [text, setText]           = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const abortRef                  = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (
      path: "/api/ai/assist" | "/api/ai/generate" | "/api/ai/explain-error",
      body: Record<string, unknown>,
      opts?: {
        /** Called for every new text token */
        onToken?: (token: string, accumulated: string) => void;
        /** Called when streaming is complete */
        onDone?: (fullText: string) => void;
      }
    ): Promise<string> => {
      abort();
      setText("");
      setError(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      let accumulated = "";

      try {
        const response = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({})) as { error?: string };
          throw new Error(errJson.error || `HTTP ${response.status}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw = decoder.decode(value, { stream: true });

          // Parse SSE lines: "data: {...}\n\n"
          const lines = raw.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") break;

            try {
              const json = JSON.parse(payload) as {
                choices?: { delta?: { content?: string } }[];
                error?: string;
              };

              if (json.error) throw new Error(json.error);

              const token = json.choices?.[0]?.delta?.content ?? "";
              if (token) {
                accumulated += token;
                setText(accumulated);
                opts?.onToken?.(token, accumulated);
              }
            } catch (parseErr) {
              // Skip unparseable chunks (e.g. keep-alive comments)
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }

        opts?.onDone?.(accumulated);
        return accumulated;
      } catch (err) {
        if ((err as Error).name === "AbortError") return accumulated;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        return accumulated;
      } finally {
        setIsStreaming(false);
      }
    },
    [abort]
  );

  return { text, isStreaming, error, startStream, abort, setText };
}
