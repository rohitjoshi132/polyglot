/**
 * AiErrorExplainer
 *
 * Auto-appears below the output panel when a compilation run fails (exitCode !== 0).
 * Streams an AI explanation of the error and a suggested fix.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiStream } from "@/hooks/use-ai-stream";

const MODELS = [
  { id: "google/gemini-3.7-flash",             label: "Gemini 3.7 Flash",  provider: "Google"    },
  { id: "google/gemini-3.5-flash",             label: "Gemini 3.5 Flash",  provider: "Google"    },
  { id: "anthropic/claude-3.7-sonnet",         label: "Claude 3.7 Sonnet", provider: "Anthropic" },
  { id: "anthropic/claude-3-haiku",            label: "Claude 3 Haiku",    provider: "Anthropic" },
  { id: "openai/gpt-4o",                       label: "GPT-4o",            provider: "OpenAI"    },
  { id: "openai/gpt-4o-mini",                  label: "GPT-4o Mini",       provider: "OpenAI"    },
  { id: "meta-llama/llama-3.3-70b-instruct",   label: "Llama 3.3 70B",     provider: "Meta"      },
  { id: "deepseek/deepseek-r1",                label: "DeepSeek R1",       provider: "DeepSeek"  },
  { id: "qwen/qwen-2.5-72b-instruct",          label: "Qwen 2.5 72B",      provider: "Alibaba"   },
  { id: "mistralai/mistral-nemo",              label: "Mistral Nemo",      provider: "Mistral"   },
];

interface AiErrorExplainerProps {
  /** The code that caused the error */
  code: string;
  /** Detected language */
  language: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  /** Unique key — change this whenever a new run happens to re-trigger explanation */
  runKey: number;
  /** Currently selected model (shared with panel/modal) */
  model?: string;
}

export function AiErrorExplainer({
  code,
  language,
  stdout,
  stderr,
  exitCode,
  runKey,
  model: externalModel,
}: AiErrorExplainerProps) {
  const [visible, setVisible] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [selectedModel, setSelectedModel] = useState(externalModel ?? MODELS[0]!.id);

  const { text, isStreaming, error, startStream, abort } = useAiStream();

  // Trigger explanation whenever a new failed run arrives
  useEffect(() => {
    if (exitCode === 0 || runKey === 0) return;
    setVisible(true);
    setCollapsed(false);

    startStream("/api/ai/explain-error", {
      code,
      language,
      stdout,
      stderr,
      exitCode,
      model: selectedModel,
    });

    return () => { abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  const handleRetry = () => {
    startStream("/api/ai/explain-error", {
      code,
      language,
      stdout,
      stderr,
      exitCode,
      model: selectedModel,
    });
  };

  if (!visible || exitCode === 0 || runKey === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.25 }}
        className="mt-3 rounded-xl border border-violet-500/25 bg-violet-500/5 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet-500/15 bg-violet-500/8">
          <div className="w-5 h-5 rounded-md bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Bot className="w-3 h-3 text-violet-400" />
          </div>
          <span className="text-xs font-semibold text-violet-300">AI Error Explanation</span>

          {isStreaming && (
            <span className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
          )}

          {/* Model selector — compact */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isStreaming}
            className="ml-auto text-[10px] font-mono bg-background border border-border rounded-md px-1.5 py-0.5 text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50 cursor-pointer"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          <button
            onClick={handleRetry}
            disabled={isStreaming}
            title="Re-explain with current model"
            className="p-1 rounded text-violet-400/60 hover:text-violet-400 disabled:opacity-30 transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", isStreaming && "animate-spin")} />
          </button>

          <button
            onClick={() => setCollapsed((v) => !v)}
            className="p-1 rounded text-violet-400/60 hover:text-violet-400 transition-colors"
          >
            {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>

          <button
            onClick={() => { abort(); setVisible(false); }}
            className="p-1 rounded text-violet-400/60 hover:text-rose-400 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Content */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 py-3">
                {error ? (
                  <p className="text-rose-400 text-xs">{error}</p>
                ) : text ? (
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {text}
                    {isStreaming && (
                      <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 animate-pulse align-middle" />
                    )}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-violet-400/60 text-xs">
                    <span className="w-3 h-3 border-2 border-violet-400/50 border-t-transparent rounded-full animate-spin" />
                    Analysing your error…
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
