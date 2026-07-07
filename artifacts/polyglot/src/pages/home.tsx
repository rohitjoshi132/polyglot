import { useState, useEffect, useRef, useCallback } from "react";
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
  Terminal,
  X,
  Sigma,
  Share2,
  Link,
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

// ── Special / Math Characters ──────────────────────────────────────────────
const SPECIAL_CHARS: { label: string; chars: { sym: string; title: string }[] }[] = [
  {
    label: "Math",
    chars: [
      { sym: "±", title: "Plus-minus" },
      { sym: "×", title: "Multiplication" },
      { sym: "÷", title: "Division" },
      { sym: "√", title: "Square root" },
      { sym: "∛", title: "Cube root" },
      { sym: "∜", title: "Fourth root" },
      { sym: "∑", title: "Summation" },
      { sym: "∏", title: "Product" },
      { sym: "∫", title: "Integral" },
      { sym: "∂", title: "Partial derivative" },
      { sym: "∞", title: "Infinity" },
      { sym: "‰", title: "Per mille" },
      { sym: "%", title: "Percent" },
      { sym: "|", title: "Absolute value / pipe" },
      { sym: "!", title: "Factorial" },
      { sym: "⌊", title: "Floor left" },
      { sym: "⌋", title: "Floor right" },
      { sym: "⌈", title: "Ceil left" },
      { sym: "⌉", title: "Ceil right" },
      { sym: "°", title: "Degree" },
    ],
  },
  {
    label: "Powers",
    chars: [
      { sym: "**", title: "Power (Python/JS)" },
      { sym: "^", title: "Caret / XOR" },
      { sym: "⁰", title: "Superscript 0" },
      { sym: "¹", title: "Superscript 1" },
      { sym: "²", title: "Superscript 2" },
      { sym: "³", title: "Superscript 3" },
      { sym: "⁴", title: "Superscript 4" },
      { sym: "⁵", title: "Superscript 5" },
      { sym: "⁶", title: "Superscript 6" },
      { sym: "⁷", title: "Superscript 7" },
      { sym: "⁸", title: "Superscript 8" },
      { sym: "⁹", title: "Superscript 9" },
      { sym: "ⁿ", title: "Superscript n" },
      { sym: "ˣ", title: "Superscript x" },
    ],
  },
  {
    label: "Sub",
    chars: [
      { sym: "₀", title: "Subscript 0" },
      { sym: "₁", title: "Subscript 1" },
      { sym: "₂", title: "Subscript 2" },
      { sym: "₃", title: "Subscript 3" },
      { sym: "₄", title: "Subscript 4" },
      { sym: "₅", title: "Subscript 5" },
      { sym: "₆", title: "Subscript 6" },
      { sym: "₇", title: "Subscript 7" },
      { sym: "₈", title: "Subscript 8" },
      { sym: "₉", title: "Subscript 9" },
      { sym: "ₙ", title: "Subscript n" },
      { sym: "ₓ", title: "Subscript x" },
    ],
  },
  {
    label: "Greek",
    chars: [
      { sym: "π", title: "Pi" },
      { sym: "α", title: "Alpha" },
      { sym: "β", title: "Beta" },
      { sym: "γ", title: "Gamma" },
      { sym: "δ", title: "Delta" },
      { sym: "ε", title: "Epsilon" },
      { sym: "ζ", title: "Zeta" },
      { sym: "η", title: "Eta" },
      { sym: "θ", title: "Theta" },
      { sym: "λ", title: "Lambda" },
      { sym: "μ", title: "Mu" },
      { sym: "ν", title: "Nu" },
      { sym: "ξ", title: "Xi" },
      { sym: "ρ", title: "Rho" },
      { sym: "σ", title: "Sigma" },
      { sym: "τ", title: "Tau" },
      { sym: "φ", title: "Phi" },
      { sym: "χ", title: "Chi" },
      { sym: "ψ", title: "Psi" },
      { sym: "ω", title: "Omega" },
      { sym: "Γ", title: "Gamma (upper)" },
      { sym: "Δ", title: "Delta (upper)" },
      { sym: "Θ", title: "Theta (upper)" },
      { sym: "Λ", title: "Lambda (upper)" },
      { sym: "Ξ", title: "Xi (upper)" },
      { sym: "Π", title: "Pi (upper)" },
      { sym: "Σ", title: "Sigma (upper)" },
      { sym: "Φ", title: "Phi (upper)" },
      { sym: "Ψ", title: "Psi (upper)" },
      { sym: "Ω", title: "Omega (upper)" },
    ],
  },
  {
    label: "Compare",
    chars: [
      { sym: "≤", title: "Less or equal" },
      { sym: "≥", title: "Greater or equal" },
      { sym: "≠", title: "Not equal" },
      { sym: "≈", title: "Approximately equal" },
      { sym: "≡", title: "Identical / equivalent" },
      { sym: "≢", title: "Not identical" },
      { sym: "∈", title: "Element of" },
      { sym: "∉", title: "Not element of" },
      { sym: "⊂", title: "Subset of" },
      { sym: "⊃", title: "Superset of" },
      { sym: "⊆", title: "Subset or equal" },
      { sym: "⊇", title: "Superset or equal" },
      { sym: "∩", title: "Intersection" },
      { sym: "∪", title: "Union" },
      { sym: "∧", title: "Logical AND" },
      { sym: "∨", title: "Logical OR" },
      { sym: "¬", title: "Logical NOT" },
      { sym: "∀", title: "For all" },
      { sym: "∃", title: "There exists" },
      { sym: "∄", title: "Does not exist" },
    ],
  },
  {
    label: "Arrows",
    chars: [
      { sym: "→", title: "Right arrow" },
      { sym: "←", title: "Left arrow" },
      { sym: "↑", title: "Up arrow" },
      { sym: "↓", title: "Down arrow" },
      { sym: "↔", title: "Left-right arrow" },
      { sym: "↕", title: "Up-down arrow" },
      { sym: "⇒", title: "Double right arrow" },
      { sym: "⇐", title: "Double left arrow" },
      { sym: "⟹", title: "Long right arrow" },
      { sym: "⟺", title: "Long left-right arrow" },
      { sym: "↦", title: "Maps to" },
      { sym: "∴", title: "Therefore" },
      { sym: "∵", title: "Because" },
      { sym: "…", title: "Ellipsis" },
      { sym: "·", title: "Middle dot" },
    ],
  },
];

// ── Auto-substitution shortcuts (LaTeX-style, longest match first) ────────
// User types e.g. \pi and it instantly becomes π while they type.
const CHAR_SHORTCUTS: [string, string][] = [
  // Math — named ops (longer names first to avoid partial matches)
  ["\\partial",    "∂"],
  ["\\therefore",  "∴"],
  ["\\because",    "∵"],
  ["\\epsilon",    "ε"],
  ["\\forall",     "∀"],
  ["\\exists",     "∃"],
  ["\\approx",     "≈"],
  ["\\lambda",     "λ"],
  ["\\Lambda",     "Λ"],
  ["\\degree",     "°"],
  ["\\subset",     "⊂"],
  ["\\notin",      "∉"],
  ["\\infty",      "∞"],
  ["\\times",      "×"],
  ["\\sigma",      "σ"],
  ["\\Sigma",      "Σ"],
  ["\\omega",      "ω"],
  ["\\Omega",      "Ω"],
  ["\\theta",      "θ"],
  ["\\Theta",      "Θ"],
  ["\\gamma",      "γ"],
  ["\\Gamma",      "Γ"],
  ["\\delta",      "δ"],
  ["\\Delta",      "Δ"],
  ["\\alpha",      "α"],
  ["\\equiv",      "≡"],
  ["\\union",      "∪"],
  ["\\prod",       "∏"],
  ["\\sqrt",       "√"],
  ["\\cbrt",       "∛"],
  ["\\neq",        "≠"],
  ["\\leq",        "≤"],
  ["\\geq",        "≥"],
  ["\\sum",        "∑"],
  ["\\int",        "∫"],
  ["\\cap",        "∩"],
  ["\\cup",        "∪"],
  ["\\phi",        "φ"],
  ["\\Phi",        "Φ"],
  ["\\psi",        "ψ"],
  ["\\Psi",        "Ψ"],
  ["\\chi",        "χ"],
  ["\\tau",        "τ"],
  ["\\rho",        "ρ"],
  ["\\eta",        "η"],
  ["\\zeta",       "ζ"],
  ["\\beta",       "β"],
  ["\\xi",         "ξ"],
  ["\\Xi",         "Ξ"],
  ["\\nu",         "ν"],
  ["\\mu",         "μ"],
  ["\\pm",         "±"],
  ["\\Pi",         "Π"],
  ["\\pi",         "π"],
  ["\\in",         "∈"],
  // Powers / superscripts
  ["\\^0",         "⁰"],
  ["\\^1",         "¹"],
  ["\\^2",         "²"],
  ["\\^3",         "³"],
  ["\\^4",         "⁴"],
  ["\\^5",         "⁵"],
  ["\\^6",         "⁶"],
  ["\\^7",         "⁷"],
  ["\\^8",         "⁸"],
  ["\\^9",         "⁹"],
  ["\\^n",         "ⁿ"],
  ["\\^x",         "ˣ"],
  // Subscripts
  ["\\_0",         "₀"],
  ["\\_1",         "₁"],
  ["\\_2",         "₂"],
  ["\\_3",         "₃"],
  ["\\_4",         "₄"],
  ["\\_5",         "₅"],
  ["\\_6",         "₆"],
  ["\\_7",         "₇"],
  ["\\_8",         "₈"],
  ["\\_9",         "₉"],
  ["\\_n",         "ₙ"],
  ["\\_x",         "ₓ"],
  // Arrows
  ["\\to",         "→"],
  ["\\gets",       "←"],
  ["\\uparrow",    "↑"],
  ["\\downarrow",  "↓"],
  ["\\iff",        "⟺"],
  ["\\implies",    "⟹"],
  ["\\mapsto",     "↦"],
  // Misc
  ["\\div",        "÷"],
  ["\\neg",        "¬"],
  ["\\land",       "∧"],
  ["\\lor",        "∨"],
  ["\\supset",     "⊃"],
  ["\\ellipsis",   "…"],
  ["\\cdot",       "·"],
];

export default function Home() {
  const [code, setCode] = useState("");
  const [filename, setFilename] = useState("");
  const [languageOverride, setLanguageOverride] = useState("");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const [stdin, setStdin] = useState("");
  const [stdinModalOpen, setStdinModalOpen] = useState(false);
  const [stdinPrompts, setStdinPrompts] = useState<string[]>([]);
  const [charsOpen, setCharsOpen] = useState(false);
  const [activeCharTab, setActiveCharTab] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copiedShare, setCopiedShare] = useState(false);
  const stdinInputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const charsRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  // Line counter
  useEffect(() => {
    setLineCount(code ? code.split("\n").length : 1);
  }, [code]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (charsRef.current && !charsRef.current.contains(e.target as Node)) {
        setCharsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Share helpers: encode/decode code + meta as a URL-safe base64 blob ──
  const encodeShare = (c: string, lang: string, file: string) => {
    try {
      const json = JSON.stringify({ code: c, lang, file });
      return btoa(unescape(encodeURIComponent(json)));
    } catch { return ""; }
  };

  const decodeShare = (s: string) => {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(s)))) as
        { code: string; lang: string; file: string };
    } catch { return null; }
  };

  // Load project from profile page OR shared URL
  useEffect(() => {
    // 1) Check URL share param first
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get("s");
    if (shareParam) {
      const shared = decodeShare(shareParam);
      if (shared) {
        setCode(shared.code || "");
        setFilename(shared.file || "");
        setLanguageOverride(shared.lang || "");
        // Clean URL without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
        toast({ title: "🔗 Shared Code Loaded", description: "Someone shared this code snippet with you." });
        return;
      }
    }
    // 2) Then check sessionStorage (load from My Projects)
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
        toast({ title: "Detection Failed", description: error.data?.error || "An error occurred", variant: "destructive" });
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
        toast({ title: "Compilation Error", description: error.data?.error || "Failed to compile", variant: "destructive" });
      },
    },
  });

  // Insert special char at textarea cursor position (used by palette clicks)
  const insertChar = useCallback((sym: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newCode = code.slice(0, start) + sym + code.slice(end);
    setCode(newCode);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + sym.length, start + sym.length);
    });
  }, [code]);

  // Auto-substitution: fires on every keystroke in the editor
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursorPos = e.target.selectionStart ?? newVal.length;
    const before = newVal.slice(0, cursorPos);

    // Try each shortcut (already sorted longest-first)
    for (const [shortcut, symbol] of CHAR_SHORTCUTS) {
      if (before.endsWith(shortcut)) {
        // Don't substitute if the shortcut itself is preceded by another backslash
        const idx = before.length - shortcut.length - 1;
        if (idx >= 0 && before[idx] === "\\") break;

        const newBefore = before.slice(0, -shortcut.length) + symbol;
        const newCode = newBefore + newVal.slice(cursorPos);
        setCode(newCode);
        const newCursor = newBefore.length;
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (el) el.setSelectionRange(newCursor, newCursor);
        });
        return;
      }
    }

    setCode(newVal);
  }, []);

  const handleDetect = () => {
    if (!code.trim()) { toast({ title: "No code", description: "Enter some code first.", variant: "destructive" }); return; }
    detect({ data: { code, filename: filename || undefined } });
  };

  // ── stdin auto-detection ──────────────────────────────────────────────────
  const detectsStdin = useCallback((src: string, lang: string): string[] => {
    const prompts: string[] = [];
    const lines = src.split("\n");

    // Language-specific patterns
    const patterns: Record<string, RegExp[]> = {
      Python:     [/\binput\s*\(([^)]*)\)/g],
      JavaScript: [/readline\s*\(\)/g, /process\.stdin/g, /require\s*\(["']readline["']\)/g],
      TypeScript: [/readline\s*\(\)/g, /process\.stdin/g],
      Go:         [/fmt\.(Scan|Scanf|Scanln|Sscan|Fscan)\s*\(/g, /bufio\.NewScanner/g, /os\.Stdin/g],
      C:          [/\bscanf\s*\(/g, /\bgets\s*\(/g, /\bfgets\s*\(/g, /\bgetchar\s*\(/g],
      "C++":      [/\bcin\s*>>/g, /\bscanf\s*\(/g, /\bgetline\s*\(/g],
      Java:       [/Scanner\s+\w+\s*=\s*new\s+Scanner\s*\(\s*System\.in/g, /System\.in/g, /\.nextLine\s*\(/g, /\.nextInt\s*\(/g],
      Kotlin:     [/readLine\s*\(\)/g, /System\.in/g],
      Ruby:       [/\bgets\s*(\.chomp)?/g, /\$stdin/g, /STDIN/g, /\bread\b/g],
      Swift:      [/readLine\s*\(\)/g],
      Haskell:    [/\bgetLine\b/g, /\bgetContents\b/g, /\binteract\b/g],
      Rust:       [/std::io::stdin/g, /io::stdin\(\)/g, /\.read_line\s*\(/g],
    };

    const activeLang = lang || "Python"; // fallback
    const langPatterns = patterns[activeLang] ?? [];

    // Collect natural-language prompts from input() calls (Python)
    if (activeLang === "Python") {
      for (const line of lines) {
        const m = line.match(/\binput\s*\((["'`]?)([^"'`)]*)["'`]?\)/);
        if (m && m[2].trim()) prompts.push(m[2].trim());
        else if (line.match(/\binput\s*\(/)) prompts.push("");
      }
    } else {
      // For other languages, just count how many read calls there are
      let count = 0;
      for (const pattern of langPatterns) {
        const matches = [...src.matchAll(new RegExp(pattern.source, "g"))];
        count += matches.length;
      }
      for (let i = 0; i < Math.min(count, 10); i++) prompts.push("");
    }

    // Confirm at least one pattern matched
    const hasMatch = langPatterns.some((p) => new RegExp(p.source).test(src));
    return hasMatch ? prompts : [];
  }, []);

  const handleCompile = useCallback(() => {
    if (!code.trim()) { toast({ title: "No code", description: "Enter some code first.", variant: "destructive" }); return; }
    const lang = languageOverride || "";
    const detectedPrompts = detectsStdin(code, lang);
    if (detectedPrompts.length > 0) {
      setStdinPrompts(detectedPrompts);
      setStdin("");
      setStdinModalOpen(true);
    } else {
      compile({ data: { code, filename: filename || undefined, language: languageOverride || undefined, stdin: undefined } });
    }
  }, [code, filename, languageOverride, detectsStdin, compile, toast]);

  const confirmRunWithStdin = useCallback(() => {
    setStdinModalOpen(false);
    compile({ data: { code, filename: filename || undefined, language: languageOverride || undefined, stdin: stdin || undefined } });
  }, [code, filename, languageOverride, stdin, compile]);

  const handleShare = useCallback(() => {
    if (!code.trim()) {
      toast({ title: "Nothing to share", description: "Write some code first.", variant: "destructive" });
      return;
    }
    const encoded = encodeShare(code, languageOverride, filename);
    const base = `${window.location.origin}${window.location.pathname}`;
    const url = `${base}?s=${encoded}`;
    setShareUrl(url);
    setShareModalOpen(true);
    setCopiedShare(false);
  }, [code, languageOverride, filename]);

  const copyShareUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      toast({ title: "Copy failed", description: "Please copy the URL manually.", variant: "destructive" });
    }
  }, [shareUrl, toast]);

  const handleSaveClick = () => {
    if (!user) { setAuthModalOpen(true); return; }
    setSaveDialogOpen(true);
  };

  const handleClear = () => {
    setCode("");
    setFilename("");
    setLanguageOverride("");
    setStdin("");
    setStdinModalOpen(false);
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
              <FileCode className="absolute left-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="filename.ext"
                className="w-full bg-background border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              />
            </div>

            {/* Line count */}
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              {lineCount} {lineCount === 1 ? "line" : "lines"}
            </span>

            {/* Special Characters button */}
            <div ref={charsRef} className="relative">
              <button
                onClick={() => setCharsOpen((v) => !v)}
                title="Insert special / math character"
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono border transition-all",
                  charsOpen
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/30 hover:text-primary"
                )}
              >
                <Sigma className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Symbols</span>
              </button>

              <AnimatePresence>
                {charsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full mt-1.5 right-0 z-40 w-80 rounded-xl bg-background border border-border shadow-xl overflow-hidden"
                  >
                    {/* Category tabs */}
                    <div className="flex border-b border-border bg-secondary/50">
                      {SPECIAL_CHARS.map((cat, i) => (
                        <button
                          key={cat.label}
                          onClick={() => setActiveCharTab(i)}
                          className={cn(
                            "flex-1 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors",
                            activeCharTab === i
                              ? "text-primary border-b-2 border-primary bg-background"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Character grid */}
                    <div className="p-2.5 grid grid-cols-8 gap-1 max-h-52 overflow-y-auto">
                      {SPECIAL_CHARS[activeCharTab].chars.map(({ sym, title }) => (
                        <button
                          key={sym}
                          title={title}
                          onClick={() => insertChar(sym)}
                          className="h-8 rounded-lg text-sm font-mono text-foreground bg-secondary border border-border hover:bg-primary/8 hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>

                    <div className="px-3 py-2 border-t border-border bg-secondary/50">
                      <p className="text-[10px] text-gray-400 font-mono">
                        Click any symbol to insert at cursor · hover for name
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Clear button */}
            {code && (
              <button
                onClick={handleClear}
                title="Clear editor"
                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Textarea — light background */}
          <div className="relative flex-1 bg-background">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={handleCodeChange}
              placeholder={"// Paste or type your code here...\n// Type \\pi → π  \\sqrt → √  \\leq → ≤  \\alpha → α  (\\^2 → ² , \\_2 → ₂)\n// Press Ctrl+Enter to run, Ctrl+Shift+D to detect language"}
              className="absolute inset-0 w-full h-full p-5 bg-transparent border-none outline-none font-mono text-[13.5px] leading-relaxed text-foreground placeholder:text-muted-foreground resize-none"
              spellCheck={false}
            />
          </div>


          {/* Editor Footer Actions */}
          <div className="px-4 py-3 bg-secondary/60 border-t border-border flex flex-wrap items-center justify-between gap-3">
            {/* Language override dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setLangDropdownOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border border-border text-xs font-mono text-foreground hover:border-primary/40 hover:text-primary transition-all"
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
                    className="absolute bottom-full mb-1.5 left-0 z-50 w-48 bg-background rounded-xl border border-border shadow-lg overflow-hidden"
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
                          "w-full text-left px-3 py-2 text-xs font-mono transition-colors hover:bg-primary/8 hover:text-primary",
                          (languageOverride === lang || (lang === "Auto-detect" && !languageOverride))
                            ? "text-primary bg-primary/8 font-semibold"
                            : "text-slate-600"
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
                onClick={handleShare}
                disabled={!code.trim()}
                title="Share this code"
                className="btn-secondary text-xs py-2 px-3"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
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

      {/* ── Share Modal ── */}
      <AnimatePresence>
        {shareModalOpen && (
          <>
            <motion.div
              key="share-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setShareModalOpen(false)}
            />
            <motion.div
              key="share-modal"
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-lg mx-4 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
                style={{ background: "hsl(220 20% 10%)" }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-white/4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                      <Share2 className="w-4 h-4 text-primary" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">Share Code Snippet</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {languageOverride || "Auto-detected"}{filename ? ` · ${filename}` : ""}
                        {" · "}{code.split("\n").length} line{code.split("\n").length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShareModalOpen(false)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* URL box */}
                <div className="px-5 pt-5 pb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                    Share Link
                  </p>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-white/10 group">
                    <Link className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                    <span className="flex-1 font-mono text-[11.5px] text-zinc-400 truncate select-all">
                      {shareUrl}
                    </span>
                    <button
                      onClick={copyShareUrl}
                      className={cn(
                        "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                        copiedShare
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25"
                      )}
                    >
                      {copiedShare
                        ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                        : <><Copy className="w-3.5 h-3.5" /> Copy</>
                      }
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-700 mt-2 font-mono">
                    Anyone with this link can open the code in their browser — no account needed.
                  </p>
                </div>

                {/* Quick-share row */}
                <div className="px-5 pb-5 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mr-1">
                    Share via
                  </span>
                  <button
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent("Check out this code snippet: " + shareUrl)}`, "_blank")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </button>
                  <button
                    onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent("Check out this code snippet on Polyglot:")}&url=${encodeURIComponent(shareUrl)}`, "_blank")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1DA1F2]/10 border border-[#1DA1F2]/25 text-[#1DA1F2] text-xs font-semibold hover:bg-[#1DA1F2]/20 transition-all"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.261 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X (Twitter)
                  </button>
                  <button
                    onClick={() => window.open(shareUrl, "_blank")}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 border border-white/10 text-zinc-400 text-xs font-semibold hover:text-white hover:bg-white/10 transition-all"
                  >
                    Open in new tab ↗
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Auto Stdin Modal ── */}
      <AnimatePresence>
        {stdinModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="stdin-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setStdinModalOpen(false)}
            />

            {/* Modal */}
            <motion.div
              key="stdin-modal"
              initial={{ opacity: 0, scale: 0.94, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 24 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div
                className="pointer-events-auto w-full max-w-md mx-4 rounded-2xl shadow-2xl border border-white/10 overflow-hidden"
                style={{ background: "hsl(220 20% 10%)" }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    confirmRunWithStdin();
                  }
                  if (e.key === "Escape") setStdinModalOpen(false);
                }}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-white/4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
                      <Terminal className="w-4 h-4 text-primary" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-white">Program Needs Input</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        Your code reads from stdin — enter values below
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStdinModalOpen(false)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/8 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Detected prompts as hints */}
                {stdinPrompts.some((p) => p.trim()) && (
                  <div className="px-5 pt-4 pb-1 flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-0.5">
                      Detected Inputs
                    </p>
                    {stdinPrompts.filter((p) => p.trim()).map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4 rounded bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                          {i + 1}
                        </span>
                        <span className="font-mono text-zinc-300">{p}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Stdin textarea */}
                <div className="px-5 pt-4 pb-3">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                    Input Values{stdinPrompts.length > 1 ? ` (${stdinPrompts.length} expected — one per line)` : ""}
                  </label>
                  <textarea
                    ref={stdinInputRef}
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    autoFocus
                    rows={Math.max(3, Math.min(stdinPrompts.length + 1, 8))}
                    placeholder={
                      stdinPrompts.length > 1
                        ? stdinPrompts.map((p, i) => p.trim() ? `${p.trim()}` : `value ${i + 1}`).join("\n")
                        : "Enter your input here..."
                    }
                    className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 font-mono text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-700 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                    spellCheck={false}
                  />
                  <p className="text-[10px] text-zinc-700 mt-1.5 font-mono">
                    Tip: one value per line · <kbd className="bg-white/8 px-1 rounded">Ctrl+Enter</kbd> to run
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/8 bg-white/3">
                  <button
                    onClick={() => setStdinModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/8 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRunWithStdin}
                    className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run with Input
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
