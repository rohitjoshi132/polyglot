import { execSync } from "child_process";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getToolchainForLanguage } from "./toolchains.js";

export interface CompileResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
  compilationMs: number;
  toolchainAvailable: boolean;
  installHint?: string;
}

const EXTENSION_MAP: Record<string, string> = {
  Python: ".py",
  JavaScript: ".js",
  TypeScript: ".ts",
  Go: ".go",
  Rust: ".rs",
  C: ".c",
  "C++": ".cpp",
  Java: ".java",
  Kotlin: ".kt",
  Ruby: ".rb",
  Swift: ".swift",
  Haskell: ".hs",
};

function getMainClass(code: string): string {
  const match = code.match(/public\s+class\s+(\w+)/);
  return match ? match[1] : "Main";
}

export async function compileAndRun(code: string, language: string, extraArgs: string[] = []): Promise<CompileResult> {
  const start = Date.now();
  const toolchain = getToolchainForLanguage(language);

  if (!toolchain) {
    return {
      stdout: "",
      stderr: `Unknown language: ${language}`,
      exitCode: 1,
      success: false,
      compilationMs: Date.now() - start,
      toolchainAvailable: false,
      installHint: "Language not supported",
    };
  }

  try {
    execSync(`which ${toolchain.command}`, { stdio: "ignore" });
  } catch {
    return {
      stdout: "",
      stderr: `Toolchain not available: ${toolchain.command} not found in PATH`,
      exitCode: 127,
      success: false,
      compilationMs: Date.now() - start,
      toolchainAvailable: false,
      installHint: toolchain.installHint,
    };
  }

  const ext = EXTENSION_MAP[language] || ".txt";
  const workDir = join(tmpdir(), `polyglot_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  mkdirSync(workDir, { recursive: true });

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    let cmd = "";

    if (language === "Python") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      cmd = `python3 ${file} ${extraArgs.join(" ")}`;
    } else if (language === "JavaScript") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      cmd = `node ${file} ${extraArgs.join(" ")}`;
    } else if (language === "TypeScript") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      cmd = `npx ts-node --skipProject ${file} ${extraArgs.join(" ")}`;
    } else if (language === "Go") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      cmd = `go run ${file} ${extraArgs.join(" ")}`;
    } else if (language === "Rust") {
      const srcFile = join(workDir, `main${ext}`);
      const outFile = join(workDir, "main");
      writeFileSync(srcFile, code, "utf-8");
      cmd = `rustc ${srcFile} -o ${outFile} && ${outFile} ${extraArgs.join(" ")}`;
    } else if (language === "C") {
      const srcFile = join(workDir, `main${ext}`);
      const outFile = join(workDir, "main");
      writeFileSync(srcFile, code, "utf-8");
      cmd = `gcc ${srcFile} -o ${outFile} && ${outFile} ${extraArgs.join(" ")}`;
    } else if (language === "C++") {
      const srcFile = join(workDir, `main${ext}`);
      const outFile = join(workDir, "main");
      writeFileSync(srcFile, code, "utf-8");
      cmd = `g++ ${srcFile} -o ${outFile} && ${outFile} ${extraArgs.join(" ")}`;
    } else if (language === "Java") {
      const className = getMainClass(code);
      const srcFile = join(workDir, `${className}.java`);
      writeFileSync(srcFile, code, "utf-8");
      cmd = `javac ${srcFile} && java -cp ${workDir} ${className} ${extraArgs.join(" ")}`;
    } else if (language === "Kotlin") {
      const srcFile = join(workDir, `main${ext}`);
      writeFileSync(srcFile, code, "utf-8");
      cmd = `kotlinc-jvm -script ${srcFile} ${extraArgs.join(" ")}`;
    } else if (language === "Ruby") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      cmd = `ruby ${file} ${extraArgs.join(" ")}`;
    } else if (language === "Swift") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      cmd = `swift ${file} ${extraArgs.join(" ")}`;
    } else if (language === "Haskell") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      cmd = `runghc ${file} ${extraArgs.join(" ")}`;
    } else {
      return {
        stdout: "",
        stderr: `Compilation for ${language} is not yet implemented`,
        exitCode: 1,
        success: false,
        compilationMs: Date.now() - start,
        toolchainAvailable: true,
      };
    }

    try {
      const result = execSync(cmd, {
        encoding: "utf-8",
        timeout: 30000,
        cwd: workDir,
      });
      stdout = result || "";
      exitCode = 0;
    } catch (err: unknown) {
      const execErr = err as { stdout?: string; stderr?: string; status?: number };
      stdout = execErr.stdout || "";
      stderr = execErr.stderr || "";
      exitCode = execErr.status ?? 1;
    }
  } finally {
    try {
      rmSync(workDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }

  const compilationMs = Date.now() - start;
  return {
    stdout,
    stderr,
    exitCode,
    success: exitCode === 0,
    compilationMs,
    toolchainAvailable: true,
  };
}
