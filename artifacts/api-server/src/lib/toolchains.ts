import { execSync } from "child_process";

export interface ToolchainEntry {
  language: string;
  available: boolean;
  command: string;
  version: string | null;
  installHint: string;
}

interface ToolchainDef {
  language: string;
  command: string;
  versionFlag: string;
  runFlag: string;
  installHint: string;
}

export const TOOLCHAIN_DEFS: ToolchainDef[] = [
  {
    language: "Python",
    command: process.platform === "win32" ? "python" : "python3",
    versionFlag: "--version",
    runFlag: "",
    installHint: "Install Python from https://python.org or via your package manager (apt install python3, brew install python)",
  },
  {
    language: "JavaScript",
    command: "node",
    versionFlag: "--version",
    runFlag: "",
    installHint: "Install Node.js from https://nodejs.org or via nvm (nvm install --lts)",
  },
  {
    language: "TypeScript",
    command: "npx",
    versionFlag: "ts-node --version",
    runFlag: "ts-node",
    installHint: "Install TypeScript via npm: npm install -g typescript ts-node",
  },
  {
    language: "Go",
    command: "go",
    versionFlag: "version",
    runFlag: "run",
    installHint: "Install Go from https://go.dev/dl/",
  },
  {
    language: "Rust",
    command: "rustc",
    versionFlag: "--version",
    runFlag: "",
    installHint: "Install Rust via rustup: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
  },
  {
    language: "C",
    command: "gcc",
    versionFlag: "--version",
    runFlag: "",
    installHint: "Install GCC via package manager: apt install gcc, brew install gcc",
  },
  {
    language: "C++",
    command: "g++",
    versionFlag: "--version",
    runFlag: "",
    installHint: "Install G++ via package manager: apt install g++, brew install gcc",
  },
  {
    language: "Java",
    command: "java",
    versionFlag: "--version",
    runFlag: "-cp",
    installHint: "Install Java from https://adoptium.net or via package manager (apt install default-jdk)",
  },
  {
    language: "Kotlin",
    command: "kotlinc",
    versionFlag: "-version",
    runFlag: "-script",
    installHint: "Install Kotlin from https://kotlinlang.org or via SDKMAN (sdk install kotlin)",
  },
  {
    language: "Ruby",
    command: "ruby",
    versionFlag: "--version",
    runFlag: "",
    installHint: "Install Ruby from https://ruby-lang.org or via rbenv/rvm",
  },
  {
    language: "Swift",
    command: "swift",
    versionFlag: "--version",
    runFlag: "",
    installHint: "Install Swift from https://swift.org/download/ (macOS comes with Xcode)",
  },
  {
    language: "Haskell",
    command: "runghc",
    versionFlag: "--version",
    runFlag: "",
    installHint: "Install Haskell via GHCup: curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | sh",
  },
];

function checkCommand(cmd: string): boolean {
  try {
    const checkCmd = process.platform === "win32" ? "where" : "which";
    execSync(`${checkCmd} ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getVersion(cmd: string, flag: string): string | null {
  try {
    const output = execSync(`${cmd} ${flag} 2>&1`, { encoding: "utf-8", timeout: 5000 });
    const firstLine = output.split("\n")[0] || "";
    return firstLine.trim().slice(0, 80);
  } catch {
    return null;
  }
}

export function discoverToolchains(): ToolchainEntry[] {
  return TOOLCHAIN_DEFS.map(def => {
    const available = checkCommand(def.command);
    const version = available ? getVersion(def.command, def.versionFlag) : null;
    return {
      language: def.language,
      available,
      command: def.command,
      version,
      installHint: def.installHint,
    };
  });
}

export function getToolchainForLanguage(language: string): ToolchainDef | undefined {
  return TOOLCHAIN_DEFS.find(d => d.language.toLowerCase() === language.toLowerCase());
}
