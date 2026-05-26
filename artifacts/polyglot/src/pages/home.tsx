import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  SearchCode,
  Code2,
  TerminalSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Save,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  Zap,
  FileCode,
} from "lucide-react";
import { useDetectLanguage, useCompileCode } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { AuthModal } from "@/components/auth-modal";
import { SaveProjectDialog } from "@/components/save-project-dialog";

const LANGUAGE_OPTIONS = [
  "Auto-detect", "Python", "JavaScript", "TypeScript", "Go", "Rust",
  "C", "C++", "Java", "Kotlin", "Ruby", "Swift", "Haskell",
];

const SAMPLE_SNIPPETS: Record<string, { code: string; filename: string }> = {
  Python: {
    filename: "hello.py",
    code: `def greet(name: str) -> str:\n    return f"Hello, {name}!"\n\nif __name__ == "__main__":\n    print(greet("Polyglot"))\n`,
  },
  JavaScript: {
    filename: "hello.js",
    code: `const greet = (name) => \`Hello, \${name}!\`;\nconsole.log(greet("Polyglot"));\n`,
  },
  Go: {
    filename: "hello.go",
    code: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Polyglot!")\n}\n`,
  },
};

export default function Home() {
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("");
  const [languageOverride, setLanguageOverride] = useState("");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  // Line counter
  useEffect(() => {
    setLineCount(code ? code.split("\n").length : 1);
  }, [code]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load project from profile page
  useEffect(() => {
    const loadProject = sessionStorage.getItem("loadProject");
    if (loadProject) {
      try {
        const project = JSON.parse(loadProject);
        setCode(project.code || "");
        setFilename(project.filename || "");
        setLanguageOverride(project.language || "");
        toast({ title: "✅ Project Loaded", description: `"${project.title}" is ready in the editor.` });
      } catch { /* ignore */ }
      sessionStorage.removeItem("loadProject");
    }
  }, [toast]);

  // Keyboard shortcut: Ctrl+Enter to compile
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (code.trim()) handleCompile();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "d") {
        e.preventDefault();
        if (code.trim()) handleDetect();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const { mutate: detect, isPending: isDetecting, data: detectResult } = useDetectLanguage({
    mutation: {
      onSuccess: (data) => {
        toast({ title: `🔍 Detected: ${data.detected}`, description: `${(data.confidence * 100).toFixed(1)}% confidence — ${data.confidenceLevel}` });
      },
      onError: (error) => {
        toast({ title: "Detection Failed", description: error.error || "An error occurred", variant: "destructive" });
      },
    },
  });

  const { mutate: compile, isPending: isCompiling, data: compileResult } = useCompileCode({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: data.success ? "✅ Run Successful" : "❌ Run Failed",
          description: `${data.detected} · Exit ${data.exitCode} · ${data.compilationMs}ms`,
          variant: data.success ? "default" : "destructive",
        });
      },
      onError: (error) => {
        toast({ title: "Compilation Error", description: error.error || "Failed to compile", variant: "destructive" });
      },
    },
  });

  const handleDetect = () => {
    if (!code.trim()) { toast({ title: "No code", description: "Enter some code first.", variant: "destructive" }); return; }
    detect({ data: { code, filename: filename || undefined } });
  };

  const handleCompile = () => {
    if (!code.trim()) { toast({ title: "No code", description: "Enter some code first.", variant: "destructive" }); return; }
    compile({ data: { code, filename: filename || undefined, language: languageOverride || undefined } });
  };

  const handleSaveClick = () => {
    if (!user) { setAuthModalOpen(true); return; }
    setSaveDialogOpen(true);
  };

  const handleClear = () => {
    setCode("");
    setFilename("");
    setLanguageOverride("");
    textareaRef.current?.focus();
  };

  const handleLoadSample = (lang: string) => {
    const s = SAMPLE_SNIPPETS[lang];
    if (s) { setCode(s.code); setFilename(s.filename); setLanguageOverride(lang); }
    setLangDropdownOpen(false);
  };

  const handleCopyOutput = async () => {
    const text = [compileResult?.stdout, compileResult?.stderr].filter(Boolean).join("\n");
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    }
  };

  const handleSaveProject = async (title: string) => {
    if (!user) return;
    // Force-refresh the ID token so it's never stale/expired
    const token = await user.getIdToken(true);
    // Always call Render directly so the Authorization header is never dropped
    const apiBase = import.meta.env.VITE_API_URL || "https://polyglot-api-okgo.onrender.com";
    const res = await fetch(`${apiBase}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title,
        code,
        language: compileResult?.detected || detectResult?.detected || languageOverride || null,
        filename: filename || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || `Server error ${res.status}`);
    }
    toast({ title: "💾 Saved!", description: `"${title}" added to My Projects.` });
  };

  const showDetection = !!detectResult && !compileResult;
  const showCompilation = !!compileResult;
  const currentLang = compileResult?.detected || detectResult?.detected;
  const currentConf = compileResult?.confidence || detectResult?.confidence;
  const currentLevel = compileResult?.confidenceLevel || detectResult?.confidenceLevel;
  const isBusy = isDetecting || isCompiling;

  const confColor = (lvl?: string) => {
    if (lvl === "high") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
    if (lvl === "medium") return "text-amber-400 bg-amber-500/10 border-amber-500/25";
    return "text-rose-400 bg-rose-500/10 border-rose-500/25";
  };
  const confBar = (lvl?: string) => {
    if (lvl === "high") return "bg-emerald-500";
    if (lvl === "medium") return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Page Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-primary" />
            </span>
            Code Editor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Paste code, auto-detect the language, and run it instantly.
            <span className="ml-2 text-xs text-muted-foreground/60">
              <span className="kbd">Ctrl+Enter</span> to run · <span className="kbd">Ctrl+⇧+D</span> to detect
            </span>
          </p>
        </div>

        {/* Quick sample loader */}
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span>Try a sample:</span>
          {["Python", "JavaScript", "Go"].map((lang) => (
            <button
              key={lang}
              onClick={() => handleLoadSample(lang)}
              className="px-2.5 py-1 rounded-md bg-secondary/60 border border-white/5 hover:border-primary/30 hover:text-primary transition-all"
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-5 flex-1 min-h-[540px]">
        {/* ── Editor Panel ── */}
        <div className="flex-1 flex flex-col glow-border rounded-2xl glass-panel overflow-hidden border border-border/60 focus-within:border-primary/40 focus-within:shadow-[0_0_30px_-8px_hsl(152_72%_47%/0.2)] transition-all duration-300">
          {/* Editor Top Bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary/60 border-b border-border">
            {/* macOS-style dots */}
            <div className="flex gap-1.5 shrink-0">
              <div className="w-3 h-3 rounded-full bg-rose-500/70 hover:bg-rose-500 transition-colors cursor-default" title="Close" />
              <div className="w-3 h-3 rounded-full bg-amber-500/70 hover:bg-amber-500 transition-colors cursor-default" title="Minimise" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/70 hover:bg-emerald-500 transition-colors cursor-default" title="Maximise" />
            </div>

            {/* Filename input */}
            <div className="flex-1 flex items-center relative">
              <FileCode className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="filename.ext  (optional)"
                className="w-full bg-black/30 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-xs font-mono text-emerald-400/80 placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              />
            </div>

            {/* Line count */}
            <span className="text-xs font-mono text-muted-foreground/50 shrink-0">
              {lineCount} {lineCount === 1 ? "line" : "lines"}
            </span>

            {/* Clear button */}
            {code && (
              <button
                onClick={handleClear}
                title="Clear editor"
                className="p-1.5 rounded-md text-muted-foreground/50 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Textarea */}
          <div className="relative flex-1 terminal-bg">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={"// Paste or type your source code here...\n// Press Ctrl+Enter to run, Ctrl+Shift+D to detect language"}
              className="absolute inset-0 w-full h-full p-5 bg-transparent border-none outline-none font-mono text-[13.5px] leading-relaxed text-emerald-300 placeholder:text-zinc-700 resize-none"
              spellCheck={false}
            />
          </div>

          {/* Editor Footer Actions */}
          <div className="px-4 py-3 bg-secondary/50 border-t border-border flex flex-wrap items-center justify-between gap-3">
            {/* Language override dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setLangDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-border text-xs font-mono text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
              >
                <Code2 className="w-3.5 h-3.5" />
                {languageOverride || "Auto-detect"}
                <ChevronDown className={cn("w-3 h-3 transition-transform", langDropdownOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {langDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-1.5 left-0 z-50 w-48 bg-white rounded-xl border border-border shadow-xl overflow-hidden"
                  >
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => {
                          setLanguageOverride(lang === "Auto-detect" ? "" : lang);
                          setLangDropdownOpen(false);
                          if (lang !== "Auto-detect" && SAMPLE_SNIPPETS[lang] && !code) handleLoadSample(lang);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-mono transition-colors hover:bg-primary/10 hover:text-primary",
                          (languageOverride === lang || (lang === "Auto-detect" && !languageOverride))
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground"
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveClick}
                disabled={!code.trim()}
                title={user ? "Save project (Ctrl+S)" : "Sign in to save"}
                className="btn-secondary text-xs py-2 px-3"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
              <button
                onClick={handleDetect}
                disabled={isBusy || !code.trim()}
                title="Detect language (Ctrl+Shift+D)"
                className="btn-secondary text-xs py-2 px-3"
              >
                {isDetecting
                  ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <SearchCode className="w-3.5 h-3.5" />
                }
                Detect
              </button>
              <button
                onClick={handleCompile}
                disabled={isBusy || !code.trim()}
                title="Compile & Run (Ctrl+Enter)"
                className="btn-primary text-xs py-2 px-4"
              >
                {isCompiling
                  ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Play className="w-3.5 h-3.5 fill-current" />
                }
                Run
              </button>
            </div>
          </div>
        </div>

        {/* ── Results Panel ── */}
        <div className="w-full md:w-[400px] lg:w-[440px] flex flex-col">
          <AnimatePresence mode="wait">
            {!showDetection && !showCompilation ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center p-10 glass-panel rounded-2xl border border-dashed border-border/50"
              >
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center border border-white/5">
                    <TerminalSquare className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-40" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary/60" />
                  </span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground/80">Awaiting Input</h3>
                <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed">
                  Write or paste code, then click <strong className="text-foreground/70">Run</strong> or <strong className="text-foreground/70">Detect</strong>.
                </p>
                <div className="mt-6 flex flex-col gap-2 text-xs text-muted-foreground/50">
                  <div className="flex items-center gap-2"><span className="kbd">Ctrl+Enter</span><span>Run code</span></div>
                  <div className="flex items-center gap-2"><span className="kbd">Ctrl+⇧+D</span><span>Detect language</span></div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col rounded-2xl glass-panel border border-border/60 overflow-hidden shadow-2xl"
              >
                {/* Language Detection Header */}
                <div className="p-5 bg-gradient-to-br from-secondary/80 to-white/50 border-b border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">
                        Detected Language
                      </p>
                      <h2 className="text-2xl font-bold text-foreground capitalize tracking-tight">
                        {currentLang}
                      </h2>
                    </div>
                    {currentLevel && (
                      <Badge
                        variant="outline"
                        className={cn("px-2.5 py-1 text-[10px] uppercase tracking-widest font-bold border", confColor(currentLevel))}
                      >
                        {currentLevel}
                      </Badge>
                    )}
                  </div>
                  {currentConf !== undefined && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-mono">Confidence Score</span>
                        <span className="font-mono font-bold text-foreground">{(currentConf * 100).toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={currentConf * 100}
                        className="h-1.5 bg-black/50"
                        indicatorClassName={confBar(currentLevel)}
                      />
                    </div>
                  )}
                </div>

                {/* Tabs */}
                <Tabs defaultValue={showCompilation ? "output" : "signals"} className="flex-1 flex flex-col">
                  <div className="px-4 pt-3 border-b border-border/50">
                    <TabsList className="bg-black/40 border border-white/5 w-full rounded-lg">
                      {showCompilation && (
                        <TabsTrigger value="output" className="flex-1 text-xs data-[state=active]:bg-secondary">
                          Output
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="signals" className="flex-1 text-xs data-[state=active]:bg-secondary">
                        Signals
                      </TabsTrigger>
                      <TabsTrigger value="alts" className="flex-1 text-xs data-[state=active]:bg-secondary">
                        Alternatives
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* Output Tab */}
                  {showCompilation && (
                    <TabsContent value="output" className="flex-1 p-0 m-0 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-secondary/20 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          {compileResult!.success ? (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/15 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Passed
                            </Badge>
                          ) : (
                            <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/25 hover:bg-rose-500/15 text-[10px]">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Failed
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground font-mono">
                            exit {compileResult!.exitCode}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                            <Clock className="w-3 h-3" />
                            {compileResult!.compilationMs}ms
                          </div>
                          <button
                            onClick={handleCopyOutput}
                            title="Copy output"
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copiedOutput
                              ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                              : <Copy className="w-3.5 h-3.5" />
                            }
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 terminal-bg font-mono text-[13px]">
                        {compileResult!.stdout && (
                          <div className="mb-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2 select-none">stdout</p>
                            <pre className="text-zinc-200 whitespace-pre-wrap break-all leading-relaxed">{compileResult!.stdout}</pre>
                          </div>
                        )}
                        {compileResult!.stderr && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700 mb-2 select-none">stderr</p>
                            <pre className="text-rose-400 whitespace-pre-wrap break-all leading-relaxed">{compileResult!.stderr}</pre>
                          </div>
                        )}
                        {!compileResult!.stdout && !compileResult!.stderr && (
                          <p className="text-zinc-700 italic text-sm">No output produced.</p>
                        )}
                        {!compileResult!.toolchainAvailable && (
                          <div className="mt-5 p-4 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-400">
                            <div className="flex items-center gap-2 font-semibold mb-1.5 text-sm">
                              <Info className="w-4 h-4" /> Toolchain Not Available
                            </div>
                            <p className="text-xs opacity-80 leading-relaxed">{compileResult!.installHint}</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  )}

                  {/* Signals Tab */}
                  <TabsContent value="signals" className="flex-1 overflow-y-auto p-4 m-0">
                    {detectResult?.signals?.length ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                          Detection Signals
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {detectResult.signals.map((sig, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs font-mono bg-secondary/80 border border-white/5 text-muted-foreground"
                            >
                              {sig}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 text-center mt-8">
                        No signal data available. Use <strong>Detect</strong> for detailed analysis.
                      </p>
                    )}
                  </TabsContent>

                  {/* Alternatives Tab */}
                  <TabsContent value="alts" className="flex-1 overflow-y-auto p-4 m-0 space-y-2.5">
                    {detectResult?.candidates?.filter((c) => c.language !== currentLang).length ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                          Other Candidates
                        </p>
                        {detectResult.candidates
                          .filter((c) => c.language !== currentLang)
                          .map((c, i) => (
                            <div key={i} className="flex flex-col gap-1.5 p-3 rounded-xl bg-black/20 border border-white/5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-foreground/80 capitalize">{c.language}</span>
                                <span className="font-mono text-muted-foreground">{(c.confidence * 100).toFixed(1)}%</span>
                              </div>
                              <Progress value={c.confidence * 100} className="h-1 bg-black/40" indicatorClassName="bg-zinc-600" />
                            </div>
                          ))}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground/50 text-center mt-8">
                        No alternative candidates detected.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <SaveProjectDialog
        isOpen={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveProject}
        defaultTitle={filename || ""}
      />
    </div>
  );
}
