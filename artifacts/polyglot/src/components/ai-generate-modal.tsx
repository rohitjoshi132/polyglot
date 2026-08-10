/**
 * AiGenerateModal
 *
 * Modal dialog that generates code from a natural language prompt.
 * The AI response streams token-by-token into a preview pane; the user
 * can then click "Use this code" to push it into the editor.
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ChevronDown, Wand2, Copy, Check, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAiStream } from "@/hooks/use-ai-stream";

const LANGUAGE_OPTIONS = [
  "Auto", "Python", "JavaScript", "TypeScript", "Go", "Rust",
  "C", "C++", "Java", "Kotlin", "Ruby", "Swift", "Haskell",
];

const MODELS = [
  { id: "google/gemini-2.0-flash",             label: "Gemini 2.0 Flash",  provider: "Google"    },
  { id: "google/gemini-2.5-flash",             label: "Gemini 2.5 Flash",  provider: "Google"    },
  { id: "anthropic/claude-3.5-sonnet",         label: "Claude 3.5 Sonnet", provider: "Anthropic" },
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

const EXAMPLE_PROMPTS = [
  "Binary search in Python",
  "REST API server with Express",
  "Fibonacci with memoization",
  "Merge sort algorithm in Go",
  "React hook for dark mode",
  "Rust command-line argument parser",
];

interface AiGenerateModalProps {
  open: boolean;
  onClose: () => void;
  /** Callback: inject code into editor */
  onUseCode: (code: string, language?: string) => void;
  currentLanguage?: string;
}

export function AiGenerateModal({ open, onClose, onUseCode, currentLanguage }: AiGenerateModalProps) {
  const [prompt, setPrompt]           = useState("");
  const [language, setLanguage]       = useState(currentLanguage || "Auto");
  const [model, setModel]             = useState(MODELS[0]!.id);
  const [langOpen, setLangOpen]       = useState(false);
  const [modelOpen, setModelOpen]     = useState(false);
  const [copied, setCopied]           = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const langRef   = useRef<HTMLDivElement>(null);
  const modelRef  = useRef<HTMLDivElement>(null);

  const { text: generated, isStreaming, error, startStream, abort, setText } = useAiStream();

  // Focus on open
  useEffect(() => {
    if (open) setTimeout(() => promptRef.current?.focus(), 200);
  }, [open]);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (langRef.current  && !langRef.current.contains(e.target  as Node)) setLangOpen(false);
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selectedModel = MODELS.find((m) => m.id === model) ?? MODELS[0]!;

  const handleGenerate = async () => {
    if (!prompt.trim() || isStreaming) return;
    setText("");
    await startStream("/api/ai/generate", {
      prompt: prompt.trim(),
      language: language === "Auto" ? undefined : language,
      model,
    });
  };

  const handleUseCode = () => {
    if (!generated.trim()) return;
    onUseCode(generated, language === "Auto" ? undefined : language);
    onClose();
  };

  const handleCopy = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleClose = () => {
    abort();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-2xl glass-panel rounded-2xl border border-border/80 shadow-2xl pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 bg-secondary/50 border-b border-border">
                <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Generate Code</p>
                  <p className="text-xs text-muted-foreground">Describe what you want and AI will write it</p>
                </div>
                <button
                  onClick={handleClose}
                  className="ml-auto p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/8 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Prompt */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Describe what to generate
                  </label>
                  <textarea
                    ref={promptRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleGenerate();
                    }}
                    rows={3}
                    placeholder="e.g. A binary search function that works on a sorted array of integers…"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none transition-all"
                  />

                  {/* Example chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {EXAMPLE_PROMPTS.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setPrompt(ex)}
                        className="text-[10px] px-2 py-1 rounded-md bg-secondary border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language + Model selectors */}
                <div className="flex gap-3">
                  {/* Language */}
                  <div ref={langRef} className="relative flex-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Language</label>
                    <button
                      onClick={() => setLangOpen((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono hover:border-primary/30 transition-all"
                    >
                      <span className="flex-1 text-left text-foreground">{language}</span>
                      <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform", langOpen && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {langOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full mt-1 left-0 right-0 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto"
                        >
                          {LANGUAGE_OPTIONS.map((lang) => (
                            <button
                              key={lang}
                              onClick={() => { setLanguage(lang); setLangOpen(false); }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-xs font-mono hover:bg-primary/8 hover:text-primary transition-colors",
                                language === lang ? "text-primary bg-primary/8 font-semibold" : "text-foreground"
                              )}
                            >
                              {lang}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Model */}
                  <div ref={modelRef} className="relative flex-[2]">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">Model</label>
                    <button
                      onClick={() => setModelOpen((v) => !v)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border text-xs font-mono hover:border-primary/30 transition-all"
                    >
                      <Cpu className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-left text-foreground truncate">{selectedModel.label}</span>
                      <span className={cn("text-[9px] font-sans px-1.5 py-0.5 rounded border shrink-0", PROVIDER_COLORS[selectedModel.provider])}>
                        {selectedModel.provider}
                      </span>
                      <ChevronDown className={cn("w-3 h-3 text-muted-foreground transition-transform shrink-0", modelOpen && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {modelOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full mt-1 left-0 right-0 z-50 bg-background border border-border rounded-xl shadow-lg overflow-hidden"
                        >
                          {MODELS.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => { setModel(m.id); setModelOpen(false); }}
                              className={cn(
                                "w-full flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-primary/8 hover:text-primary transition-colors",
                                model === m.id ? "text-primary bg-primary/8 font-semibold" : "text-foreground"
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
                </div>

                {/* Generated preview */}
                {(generated || isStreaming) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-xl overflow-hidden border border-border bg-[#1a1d27]"
                  >
                    <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-xs text-zinc-400 font-mono">
                          {isStreaming ? "Generating…" : "Generated code"}
                        </span>
                        {isStreaming && (
                          <span className="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <pre className="p-4 text-zinc-200 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                      {generated}
                      {isStreaming && <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 animate-pulse align-middle" />}
                    </pre>
                  </motion.div>
                )}

                {error && (
                  <div className="px-4 py-3 rounded-xl bg-rose-500/8 border border-rose-500/20 text-rose-400 text-sm">
                    {error}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border bg-secondary/30 flex justify-end gap-2.5">
                <button
                  onClick={handleClose}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Cancel
                </button>
                {generated && !isStreaming ? (
                  <button
                    onClick={handleUseCode}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    <Wand2 className="w-4 h-4" />
                    Use this code
                  </button>
                ) : (
                  <button
                    onClick={isStreaming ? abort : handleGenerate}
                    disabled={!isStreaming && !prompt.trim()}
                    className={cn(
                      "btn-primary text-sm py-2 px-4",
                      isStreaming && "bg-rose-500/80 from-rose-500 to-rose-600"
                    )}
                  >
                    {isStreaming ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate
                        <span className="text-[10px] opacity-60 font-mono ml-1">Ctrl+Enter</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
