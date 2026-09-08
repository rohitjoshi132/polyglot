/**
 * AiAssistantPanel
 *
 * A collapsible sliding side-panel with a multi-turn chat UI.
 * Context-aware: the current code is silently injected into every system prompt.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiStream } from "@/hooks/use-ai-stream";

// ── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AiModel {
  id: string;
  label: string;
  provider: string;
}

interface AiAssistantPanelProps {
  open: boolean;
  onClose: () => void;
  code: string;
  language: string;
}

// ── Model list (mirrors backend allow-list) ────────────────────────────────
const MODELS: AiModel[] = [
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

const PROVIDER_COLORS: Record<string, string> = {
  Google:    "bg-blue-500/15 text-blue-400 border-blue-500/25",
  Anthropic: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  OpenAI:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  Meta:      "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  DeepSeek:  "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  Alibaba:   "bg-rose-500/15 text-rose-400 border-rose-500/25",
  Mistral:   "bg-violet-500/15 text-violet-400 border-violet-500/25",
};

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg, isLast, isStreaming }: { msg: ChatMessage; isLast: boolean; isStreaming: boolean }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const copyText = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group flex gap-2.5 mb-4", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 shrink-0 rounded-lg flex items-center justify-center border text-xs",
          isUser
            ? "bg-primary/15 border-primary/25 text-primary"
            : "bg-violet-500/15 border-violet-500/25 text-violet-400"
        )}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "relative px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words max-w-full",
            isUser
              ? "bg-primary/10 border border-primary/20 text-foreground rounded-tr-sm"
              : "bg-secondary/60 border border-border/50 text-foreground rounded-tl-sm"
          )}
        >
          {msg.content}
          {isLast && isStreaming && !isUser && (
            <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 animate-pulse align-middle" />
          )}
        </div>

        {/* Copy button */}
        {!isStreaming && msg.content && (
          <button
            onClick={copyText}
            className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-1"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────
export function AiAssistantPanel({ open, onClose, code, language }: AiAssistantPanelProps) {
  const [messages, setMessages]       = useState<ChatMessage[]>([]);
  const [input, setInput]             = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]!.id);
  const [modelDropdown, setModelDropdown] = useState(false);
  const [includeCode, setIncludeCode] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const modelRef  = useRef<HTMLDivElement>(null);

  const { text: streamingText, isStreaming, startStream, abort } = useAiStream();

  // Close model dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) {
        setModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  const selectedModelObj = MODELS.find((m) => m.id === selectedModel) ?? MODELS[0]!;

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");

    // Placeholder assistant message for streaming
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const fullText = await startStream("/api/ai/assist", {
      code: includeCode ? code : undefined,
      language,
      messages: updatedMessages,
      model: selectedModel,
    }, {
      onToken: (_, accumulated) => {
        setMessages((prev) => {
          const clone = [...prev];
          clone[clone.length - 1] = { role: "assistant", content: accumulated };
          return clone;
        });
      },
    });

    // Ensure final text is committed
    setMessages((prev) => {
      const clone = [...prev];
      clone[clone.length - 1] = { role: "assistant", content: fullText };
      return clone;
    });
  }, [input, isStreaming, messages, code, language, selectedModel, includeCode, startStream]);

  const clearChat = () => {
    abort();
    setMessages([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 60, width: 0 }}
          animate={{ opacity: 1, x: 0, width: 380 }}
          exit={{ opacity: 0, x: 60, width: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="flex flex-col h-full min-h-[540px] overflow-hidden glass-panel rounded-2xl border border-border/60 shrink-0"
          style={{ minWidth: 340, maxWidth: 420 }}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2.5 px-4 py-3 bg-secondary/60 border-b border-border shrink-0">
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-none">AI Assistant</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Ask anything about your code</p>
            </div>

            {/* Include code toggle */}
            <button
              onClick={() => setIncludeCode((v) => !v)}
              title={includeCode ? "Code context ON — click to disable" : "Code context OFF — click to enable"}
              className={cn(
                "text-[10px] px-2 py-1 rounded-md border font-mono transition-all",
                includeCode
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:border-primary/25"
              )}
            >
              {includeCode ? "⌥ ctx" : "⌥ ctx"}
            </button>

            {messages.length > 0 && (
              <button
                onClick={clearChat}
                title="Clear conversation"
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/8 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ── Model selector ─────────────────────────────────────────── */}
          <div ref={modelRef} className="relative px-3 py-2 border-b border-border/50 bg-secondary/30">
            <button
              onClick={() => setModelDropdown((v) => !v)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-background border border-border text-xs font-mono hover:border-primary/30 transition-all"
            >
              <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1 text-left text-foreground truncate">{selectedModelObj.label}</span>
              <span className={cn("text-[9px] font-sans px-1.5 py-0.5 rounded border", PROVIDER_COLORS[selectedModelObj.provider])}>
                {selectedModelObj.provider}
              </span>
              <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform shrink-0", modelDropdown && "rotate-180")} />
            </button>

            <AnimatePresence>
              {modelDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-3 right-3 z-50 mt-1 bg-background border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto"
                >
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedModel(m.id); setModelDropdown(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-primary/8 hover:text-primary transition-colors",
                        selectedModel === m.id ? "bg-primary/8 text-primary font-semibold" : "text-foreground"
                      )}
                    >
                      <span className="flex-1 text-left truncate">{m.label}</span>
                      <span className={cn("text-[9px] font-sans px-1.5 py-0.5 rounded border", PROVIDER_COLORS[m.provider])}>
                        {m.provider}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Messages ───────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4 space-y-0">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <Bot className="w-7 h-7 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground/80 mb-1">AI Code Assistant</p>
                  <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
                    Ask me to explain, debug, refactor, or optimise your code.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full mt-2">
                  {["Explain this code", "Find bugs in this code", "Optimise for performance", "Add error handling"].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="text-xs text-left px-3 py-2 rounded-lg bg-secondary/60 border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/25 hover:bg-primary/5 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                msg={msg}
                isLast={i === messages.length - 1}
                isStreaming={isStreaming}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ──────────────────────────────────────────────────── */}
          <div className="px-3 py-3 border-t border-border bg-secondary/30 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                placeholder="Ask about your code… (Enter to send, Shift+Enter for newline)"
                rows={2}
                className="flex-1 resize-none bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all disabled:opacity-50 leading-relaxed"
              />
              <button
                onClick={isStreaming ? abort : sendMessage}
                disabled={!isStreaming && !input.trim()}
                className={cn(
                  "p-2.5 rounded-xl border font-medium text-sm transition-all shrink-0",
                  isStreaming
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25"
                    : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
                )}
                title={isStreaming ? "Stop generation" : "Send (Enter)"}
              >
                {isStreaming
                  ? <span className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin block" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
