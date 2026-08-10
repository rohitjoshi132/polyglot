import { spawnSync } from "child_process";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
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

// ── Windows MSYS2 support ──────────────────────────────────────────────────
// MSYS2 tools (g++, gcc, rustc from MSYS2, etc.) require their own bin dir
// in PATH so Windows can find their runtime DLLs (libstdc++, libgcc, etc.)
// Without this, spawnSync will silently fail with exit 1 and no stderr.

const MSYS2_UCRT_BIN = "C:\\msys64\\ucrt64\\bin";
const MSYS2_MINGW64_BIN = "C:\\msys64\\mingw64\\bin";

function buildSpawnEnv(): NodeJS.ProcessEnv {
  if (process.platform !== "win32") return process.env;

  const extraPaths: string[] = [];
  if (existsSync(MSYS2_UCRT_BIN)) extraPaths.push(MSYS2_UCRT_BIN);
  if (existsSync(MSYS2_MINGW64_BIN)) extraPaths.push(MSYS2_MINGW64_BIN);

  if (extraPaths.length === 0) return process.env;

  return {
    ...process.env,
    PATH: extraPaths.join(";") + ";" + (process.env.PATH ?? ""),
  };
}

// Resolve best binary path: prefer MSYS2 ucrt64 for C/C++ tools on Windows
const WIN_PREFERRED_PATHS: Record<string, string[]> = {
  "gcc":    [MSYS2_UCRT_BIN + "\\gcc.exe",    MSYS2_MINGW64_BIN + "\\gcc.exe"],
  "g++":    [MSYS2_UCRT_BIN + "\\g++.exe",    MSYS2_MINGW64_BIN + "\\g++.exe"],
  "rustc":  [
    (process.env.USERPROFILE ?? "C:\\Users\\rohit") + "\\.cargo\\bin\\rustc.exe",
    MSYS2_UCRT_BIN + "\\rustc.exe",
  ],
};

function resolveBinary(cmd: string): string {
  if (process.platform !== "win32") return cmd;

  // Check preferred paths first (avoids Anaconda MinGW shadowing MSYS2)
  const preferred = WIN_PREFERRED_PATHS[cmd];
  if (preferred) {
    for (const p of preferred) {
      if (existsSync(p)) return p;
    }
  }
  return cmd; // fallback to PATH lookup
}

/** Run a command via spawnSync with MSYS2-compatible env on Windows */
function runCmd(
  program: string,
  args: string[],
  opts: { cwd: string; timeout: number; input?: string }
): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync(program, args, {
    encoding: "utf-8",
    timeout: opts.timeout,
    cwd: opts.cwd,
    input: opts.input ?? "",
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
    env: buildSpawnEnv(),    // ← key fix: MSYS2 DLLs in PATH for every spawn
  });

  if (result.error) {
    return { stdout: "", stderr: result.error.message, exitCode: 1 };
  }

  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}

function getMainClass(code: string): string {
  const match = code.match(/public\s+class\s+(\w+)/);
  return match ? (match[1] ?? "Main") : "Main";
}

// Check if a command is available (works cross-platform)
function isCommandAvailable(cmd: string): boolean {
  // On Windows: first check preferred resolved paths
  if (process.platform === "win32") {
    const resolved = resolveBinary(cmd);
    if (resolved !== cmd && existsSync(resolved)) return true;
  }

  const result = spawnSync(
    process.platform === "win32" ? "where.exe" : "which",
    [cmd],
    { encoding: "utf-8", windowsHide: true, env: buildSpawnEnv() }
  );
  return result.status === 0;
}

export async function compileAndRun(
  code: string,
  language: string,
  extraArgs: string[] = [],
  stdin: string = ""
): Promise<CompileResult> {
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

  if (!isCommandAvailable(toolchain.command)) {
    return {
      stdout: "",
      stderr: `Toolchain not available: ${toolchain.command} not found`,
      exitCode: 127,
      success: false,
      compilationMs: Date.now() - start,
      toolchainAvailable: false,
      installHint: toolchain.installHint,
    };
  }

  const ext = EXTENSION_MAP[language] || ".txt";
  const isWin = process.platform === "win32";
  const workDir = join(
    tmpdir(),
    `polyglot_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(workDir, { recursive: true });

  const exeExt = isWin ? ".exe" : "";

  let stdout = "";
  let stderr = "";
  let exitCode = 0;

  try {
    // ── Interpreted: Python ──────────────────────────────────────────────────
    if (language === "Python") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      const program = resolveBinary(isWin ? "python" : "python3");
      const res = runCmd(program, [file, ...extraArgs], { cwd: workDir, timeout: 30000, input: stdin });
      ({ stdout, stderr, exitCode } = res);

    // ── Interpreted: JavaScript ──────────────────────────────────────────────
    } else if (language === "JavaScript") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      const res = runCmd(resolveBinary("node"), [file, ...extraArgs], { cwd: workDir, timeout: 30000, input: stdin });
      ({ stdout, stderr, exitCode } = res);

    // ── Interpreted: TypeScript ──────────────────────────────────────────────
    } else if (language === "TypeScript") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      const res = runCmd(resolveBinary("npx"), ["ts-node", "--skipProject", file, ...extraArgs], { cwd: workDir, timeout: 30000, input: stdin });
      ({ stdout, stderr, exitCode } = res);

    // ── Interpreted: Ruby ────────────────────────────────────────────────────
    } else if (language === "Ruby") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      const res = runCmd(resolveBinary("ruby"), [file, ...extraArgs], { cwd: workDir, timeout: 30000, input: stdin });
      ({ stdout, stderr, exitCode } = res);

    // ── Interpreted: Haskell ─────────────────────────────────────────────────
    } else if (language === "Haskell") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      const res = runCmd(resolveBinary("runghc"), [file, ...extraArgs], { cwd: workDir, timeout: 30000, input: stdin });
      ({ stdout, stderr, exitCode } = res);

    // ── Interpreted: Swift ───────────────────────────────────────────────────
    } else if (language === "Swift") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      const res = runCmd(resolveBinary("swift"), [file, ...extraArgs], { cwd: workDir, timeout: 30000, input: stdin });
      ({ stdout, stderr, exitCode } = res);

    // ── Go: go run ───────────────────────────────────────────────────────────
    } else if (language === "Go") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      const res = runCmd(resolveBinary("go"), ["run", file, ...extraArgs], { cwd: workDir, timeout: 30000, input: stdin });
      ({ stdout, stderr, exitCode } = res);

    // ── Kotlin: kotlinc -script ──────────────────────────────────────────────
    } else if (language === "Kotlin") {
      const file = join(workDir, `main${ext}`);
      writeFileSync(file, code, "utf-8");
      const res = runCmd(resolveBinary("kotlinc"), ["-script", file, ...extraArgs], { cwd: workDir, timeout: 60000, input: stdin });
      ({ stdout, stderr, exitCode } = res);

    // ── Compiled: C, C++, Rust ───────────────────────────────────────────────
    } else if (["C", "C++", "Rust"].includes(language)) {
      const srcFile = join(workDir, `main${ext}`);
      const outFile = join(workDir, `main${exeExt}`);
      writeFileSync(srcFile, code, "utf-8");

      // Pick compiler + flags
      let compilerBin: string;
      let compileArgs: string[];

      if (language === "C") {
        compilerBin = resolveBinary("gcc");
        // -static-libgcc: statically link libgcc so the .exe runs without MSYS2 DLLs in PATH
        compileArgs = isWin
          ? [srcFile, "-o", outFile, "-static-libgcc"]
          : [srcFile, "-o", outFile];
      } else if (language === "C++") {
        compilerBin = resolveBinary("g++");
        // -static-libgcc -static-libstdc++: statically link runtimes
        compileArgs = isWin
          ? [srcFile, "-o", outFile, "-static-libgcc", "-static-libstdc++"]
          : [srcFile, "-o", outFile];
      } else {
        // Rust
        compilerBin = resolveBinary("rustc");
        compileArgs = [srcFile, "-o", outFile];
      }

      const compileRes = runCmd(compilerBin, compileArgs, { cwd: workDir, timeout: 60000 });

      if (compileRes.exitCode !== 0) {
        stdout = compileRes.stdout;
        stderr = compileRes.stderr || `Compilation failed (exit ${compileRes.exitCode}) — no diagnostics from compiler`;
        exitCode = compileRes.exitCode;
      } else {
        // Run the compiled binary (NOTE: statically linked so no MSYS2 DLLs needed)
        const runRes = runCmd(outFile, extraArgs, { cwd: workDir, timeout: 30000, input: stdin });
        ({ stdout, stderr, exitCode } = runRes);
      }

    // ── Java: javac + java ───────────────────────────────────────────────────
    } else if (language === "Java") {
      const className = getMainClass(code);
      const srcFile = join(workDir, `${className}.java`);
      writeFileSync(srcFile, code, "utf-8");

      const compileRes = runCmd(resolveBinary("javac"), [srcFile], { cwd: workDir, timeout: 30000 });
      if (compileRes.exitCode !== 0) {
        stdout = compileRes.stdout;
        stderr = compileRes.stderr || "Java compilation failed";
        exitCode = compileRes.exitCode;
      } else {
        const runRes = runCmd(resolveBinary("java"), ["-cp", workDir, className, ...extraArgs], {
          cwd: workDir, timeout: 30000, input: stdin,
        });
        ({ stdout, stderr, exitCode } = runRes);
      }

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
  } finally {
    try { rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  return {
    stdout,
    stderr,
    exitCode,
    success: exitCode === 0,
    compilationMs: Date.now() - start,
    toolchainAvailable: true,
  };
}
