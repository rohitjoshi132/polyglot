export interface LanguageCandidate {
  language: string;
  confidence: number;
  signals: string[];
}

export interface DetectionResult {
  detected: string;
  confidence: number;
  confidenceLevel: "high" | "medium" | "low";
  candidates: LanguageCandidate[];
  signals: string[];
  detectionMs: number;
}

interface LanguageRule {
  language: string;
  extensions: string[];
  shebangs: string[];
  keywords: string[];
  patterns: RegExp[];
  weight: number;
}

const LANGUAGE_RULES: LanguageRule[] = [
  {
    language: "Python",
    extensions: [".py", ".pyw", ".pyx", ".pxd"],
    shebangs: ["python", "python3", "python2"],
    keywords: ["def ", "import ", "from ", "class ", "elif ", "lambda ", "yield ", "print("],
    patterns: [
      /^\s*def\s+\w+\s*\(/m,
      /^\s*class\s+\w+/m,
      /^\s*import\s+\w+/m,
      /^\s*from\s+\w+\s+import/m,
      /:\s*$/m,
      /^\s*#.*$/m,
    ],
    weight: 1.0,
  },
  {
    language: "JavaScript",
    extensions: [".js", ".mjs", ".cjs"],
    shebangs: ["node"],
    keywords: ["const ", "let ", "var ", "function ", "console.log", "require(", "module.exports", "=>"],
    patterns: [
      /\bconst\s+\w+\s*=/,
      /\blet\s+\w+\s*=/,
      /\bfunction\s+\w+\s*\(/,
      /\bconsole\.\w+\(/,
      /\brequire\s*\(/,
      /=>\s*\{/,
      /\bmodule\.exports/,
    ],
    weight: 0.9,
  },
  {
    language: "TypeScript",
    extensions: [".ts", ".tsx", ".mts", ".cts"],
    shebangs: ["ts-node", "deno"],
    keywords: ["interface ", "type ", ": string", ": number", ": boolean", "as ", "implements ", "readonly "],
    patterns: [
      /\binterface\s+\w+/,
      /\btype\s+\w+\s*=/,
      /:\s*(string|number|boolean|any|void|never|unknown)/,
      /\benum\s+\w+/,
      /\bimport\s+type\b/,
      /\bimplements\s+\w+/,
    ],
    weight: 1.0,
  },
  {
    language: "Go",
    extensions: [".go"],
    shebangs: [],
    keywords: ["package ", "func ", "import ", "var ", "const ", "type ", ":= ", "fmt."],
    patterns: [
      /^package\s+\w+/m,
      /\bfunc\s+\w+\s*\(/,
      /\bfmt\.\w+\(/,
      /\b:=\s*/,
      /^import\s+\(/m,
      /\bmake\s*\(/,
    ],
    weight: 1.0,
  },
  {
    language: "Rust",
    extensions: [".rs"],
    shebangs: [],
    keywords: ["fn ", "let mut", "use ", "pub ", "impl ", "struct ", "enum ", "match ", "println!", "Vec<"],
    patterns: [
      /\bfn\s+\w+\s*\(/,
      /\blet\s+mut\b/,
      /\bimpl\s+\w+/,
      /\bstruct\s+\w+/,
      /\benum\s+\w+/,
      /\bmatch\s+\w+/,
      /\bprintln!\s*\(/,
      /\buse\s+\w+::/,
    ],
    weight: 1.0,
  },
  {
    language: "C",
    extensions: [".c", ".h"],
    shebangs: [],
    keywords: ["#include ", "int main", "printf(", "scanf(", "malloc(", "free(", "typedef ", "struct "],
    patterns: [
      /^#include\s*[<"]/m,
      /\bint\s+main\s*\(/,
      /\bprintf\s*\(/,
      /\bscanf\s*\(/,
      /\bmalloc\s*\(/,
      /\btypedef\s+\w+/,
    ],
    weight: 0.85,
  },
  {
    language: "C++",
    extensions: [".cpp", ".cxx", ".cc", ".hpp", ".hxx"],
    shebangs: [],
    keywords: ["#include ", "cout", "cin", "std::", "class ", "namespace ", "template<", "vector<"],
    patterns: [
      /^#include\s*<(iostream|vector|string|map|algorithm)/m,
      /\bstd::/,
      /\bcout\s*<</,
      /\bcin\s*>>/,
      /\bnamespace\s+\w+/,
      /\btemplate\s*</,
      /\bvector\s*</,
    ],
    weight: 0.95,
  },
  {
    language: "Java",
    extensions: [".java"],
    shebangs: [],
    keywords: ["public class", "private ", "protected ", "System.out", "import java", "extends ", "implements ", "void "],
    patterns: [
      /\bpublic\s+class\s+\w+/,
      /\bSystem\.out\.\w+\(/,
      /^import\s+java\./m,
      /\bpublic\s+static\s+void\s+main/,
      /\bextends\s+\w+/,
      /\bimplements\s+\w+/,
    ],
    weight: 1.0,
  },
  {
    language: "Kotlin",
    extensions: [".kt", ".kts"],
    shebangs: [],
    keywords: ["fun ", "val ", "var ", "println(", "data class", "object ", "companion object", "?."],
    patterns: [
      /\bfun\s+\w+\s*\(/,
      /\bval\s+\w+\s*:/,
      /\bvar\s+\w+\s*:/,
      /\bdata\s+class\b/,
      /\bobject\s+\w+/,
      /\bcompanion\s+object/,
      /\?\./,
    ],
    weight: 1.0,
  },
  {
    language: "Ruby",
    extensions: [".rb", ".rake", ".gemspec"],
    shebangs: ["ruby"],
    keywords: ["def ", "end", "puts ", "require ", "attr_accessor", "class ", "module ", "do |"],
    patterns: [
      /\bdef\s+\w+/,
      /^\bend\b/m,
      /\bputs\s+/,
      /\brequire\s+['"]/,
      /\battr_accessor\b/,
      /\bdo\s*\|/,
      /\|.*\|\s*$/m,
    ],
    weight: 0.9,
  },
  {
    language: "Swift",
    extensions: [".swift"],
    shebangs: [],
    keywords: ["import ", "var ", "let ", "func ", "class ", "struct ", "enum ", "guard ", "print("],
    patterns: [
      /\bimport\s+Foundation\b/,
      /\bimport\s+UIKit\b/,
      /\bguard\s+let\b/,
      /\bif\s+let\b/,
      /\bvar\s+\w+\s*:/,
      /\blet\s+\w+\s*=/,
      /\bfunc\s+\w+\s*\(/,
    ],
    weight: 1.0,
  },
  {
    language: "Haskell",
    extensions: [".hs", ".lhs"],
    shebangs: ["runhaskell", "runghc"],
    keywords: ["module ", "import ", "data ", "type ", "class ", "instance ", "where", "let ", "in "],
    patterns: [
      /^module\s+\w+/m,
      /\bdata\s+\w+\s*=/,
      /\bwhere\b/,
      /\binstance\s+\w+/,
      /^[a-z]\w*\s*::\s*/m,
      /\blambda\b/,
      /->/,
    ],
    weight: 1.0,
  },
];

function getConfidenceLevel(confidence: number): "high" | "medium" | "low" {
  if (confidence >= 0.92) return "high";
  if (confidence >= 0.70) return "medium";
  return "low";
}

function extractShebang(code: string): string | null {
  const firstLine = code.split("\n")[0] || "";
  const match = firstLine.match(/^#!\s*(?:\/usr\/bin\/env\s+)?(\S+)/);
  return match ? match[1] : null;
}

function getFileExtension(filename?: string): string | null {
  if (!filename) return null;
  const match = filename.match(/(\.[^.]+)$/);
  return match ? match[1].toLowerCase() : null;
}

function scoreLanguage(code: string, rule: LanguageRule, shebang: string | null, extension: string | null): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];
  const sample = code.slice(0, 4096);

  if (extension && rule.extensions.includes(extension)) {
    score += 0.6;
    signals.push(`file extension: ${extension}`);
  }

  if (shebang) {
    const shebangBase = shebang.split("/").pop() || shebang;
    if (rule.shebangs.some(s => shebangBase.includes(s))) {
      score += 0.5;
      signals.push(`shebang: #!${shebang}`);
    }
  }

  let keywordHits = 0;
  for (const keyword of rule.keywords) {
    if (sample.includes(keyword)) {
      keywordHits++;
      signals.push(`keyword: ${keyword.trim()}`);
    }
  }
  if (keywordHits > 0) {
    score += Math.min(keywordHits / rule.keywords.length, 1) * 0.3;
  }

  let patternHits = 0;
  for (const pattern of rule.patterns) {
    if (pattern.test(sample)) {
      patternHits++;
    }
  }
  if (patternHits > 0) {
    score += Math.min(patternHits / rule.patterns.length, 1) * 0.25;
    signals.push(`syntax patterns matched: ${patternHits}/${rule.patterns.length}`);
  }

  return { score: Math.min(score * rule.weight, 1.0), signals: signals.slice(0, 5) };
}

export function detectLanguage(code: string, filename?: string): DetectionResult {
  const start = Date.now();
  const shebang = extractShebang(code);
  const extension = getFileExtension(filename);

  const scored: LanguageCandidate[] = LANGUAGE_RULES.map(rule => {
    const { score, signals } = scoreLanguage(code, rule, shebang, extension);
    return { language: rule.language, confidence: score, signals };
  });

  scored.sort((a, b) => b.confidence - a.confidence);

  const top = scored[0];
  const allSignals = top?.signals || [];

  const detected = top?.language || "Unknown";
  const confidence = top?.confidence || 0;

  const detectionMs = Date.now() - start;

  return {
    detected,
    confidence,
    confidenceLevel: getConfidenceLevel(confidence),
    candidates: scored.filter(c => c.confidence > 0.05),
    signals: allSignals,
    detectionMs,
  };
}
