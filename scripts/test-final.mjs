import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const MSYS2_UCRT_BIN = 'C:\\msys64\\ucrt64\\bin';
const MSYS2_MINGW64_BIN = 'C:\\msys64\\mingw64\\bin';

function buildSpawnEnv() {
  const extraPaths = [];
  if (existsSync(MSYS2_UCRT_BIN)) extraPaths.push(MSYS2_UCRT_BIN);
  if (existsSync(MSYS2_MINGW64_BIN)) extraPaths.push(MSYS2_MINGW64_BIN);
  return { ...process.env, PATH: extraPaths.join(';') + ';' + (process.env.PATH ?? '') };
}

function resolveBinary(cmd) {
  const WIN_PREFERRED = {
    'gcc': [MSYS2_UCRT_BIN + '\\gcc.exe', MSYS2_MINGW64_BIN + '\\gcc.exe'],
    'g++': [MSYS2_UCRT_BIN + '\\g++.exe', MSYS2_MINGW64_BIN + '\\g++.exe'],
  };
  const preferred = WIN_PREFERRED[cmd];
  if (preferred) {
    for (const p of preferred) {
      if (existsSync(p)) return p;
    }
  }
  return cmd;
}

function runCmd(program, args, opts) {
  const result = spawnSync(program, args, {
    encoding: 'utf-8', timeout: opts.timeout, cwd: opts.cwd,
    input: opts.input ?? '', windowsHide: true, maxBuffer: 10 * 1024 * 1024,
    env: buildSpawnEnv(),
  });
  if (result.error) return { stdout: '', stderr: result.error.message, exitCode: 1 };
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', exitCode: result.status ?? 1 };
}

// ── Test C++ ───────────────────────────────────────────────────────────────
console.log('=== C++ Test ===');
const cppCode = '#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello from C++!" << endl;\n  return 0;\n}';
const workDir1 = join(tmpdir(), 'test_cpp_' + Date.now());
mkdirSync(workDir1, {recursive: true});
const srcCpp = join(workDir1, 'main.cpp');
const outCpp = join(workDir1, 'main.exe');
writeFileSync(srcCpp, cppCode, 'utf-8');

const gpp = resolveBinary('g++');
console.log('Using g++:', gpp);

const compileRes = runCmd(gpp, [srcCpp, '-o', outCpp, '-static-libgcc', '-static-libstdc++'], { cwd: workDir1, timeout: 30000 });
console.log('Compile exit:', compileRes.exitCode);
console.log('Compile stderr:', compileRes.stderr || '(none)');

if (compileRes.exitCode === 0 && existsSync(outCpp)) {
  const runRes = runCmd(outCpp, [], { cwd: workDir1, timeout: 10000, input: '' });
  console.log('Run exit:', runRes.exitCode);
  console.log('Run stdout:', JSON.stringify(runRes.stdout));
  console.log('Run stderr:', runRes.stderr || '(none)');
} else {
  console.log('COMPILE FAILED');
}
rmSync(workDir1, {recursive: true, force: true});

// ── Test Python ────────────────────────────────────────────────────────────
console.log('\n=== Python Test ===');
const pyCode = 'print("Hello from Python!")';
const workDir2 = join(tmpdir(), 'test_py_' + Date.now());
mkdirSync(workDir2, {recursive: true});
const srcPy = join(workDir2, 'main.py');
writeFileSync(srcPy, pyCode, 'utf-8');
const pyRes = runCmd('python', [srcPy], { cwd: workDir2, timeout: 15000, input: '' });
console.log('Python exit:', pyRes.exitCode);
console.log('Python stdout:', JSON.stringify(pyRes.stdout));
console.log('Python stderr:', pyRes.stderr || '(none)');
rmSync(workDir2, {recursive: true, force: true});

// ── Test JavaScript ────────────────────────────────────────────────────────
console.log('\n=== JavaScript Test ===');
const jsCode = 'console.log("Hello from JavaScript!");';
const workDir3 = join(tmpdir(), 'test_js_' + Date.now());
mkdirSync(workDir3, {recursive: true});
const srcJs = join(workDir3, 'main.js');
writeFileSync(srcJs, jsCode, 'utf-8');
const jsRes = runCmd('node', [srcJs], { cwd: workDir3, timeout: 10000, input: '' });
console.log('Node exit:', jsRes.exitCode);
console.log('Node stdout:', JSON.stringify(jsRes.stdout));
rmSync(workDir3, {recursive: true, force: true});
