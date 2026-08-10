import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test with static linking flags
const code = '#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello from C++!" << endl;\n  cout << "Line 2" << endl;\n  return 0;\n}';

const workDir = join(tmpdir(), 'polyglot_static_' + Date.now());
mkdirSync(workDir, { recursive: true });
const srcFile = join(workDir, 'main.cpp');

const GPP = 'C:\\msys64\\ucrt64\\bin\\g++.exe';

const testCases = [
  { label: 'Default (no flags)', args: [srcFile, '-o', join(workDir, 'main_default.exe')] },
  { label: 'Static libgcc+stdc++', args: [srcFile, '-o', join(workDir, 'main_static.exe'), '-static-libgcc', '-static-libstdc++'] },
  { label: 'Full static', args: [srcFile, '-o', join(workDir, 'main_fullstatic.exe'), '-static'] },
];

for (const tc of testCases) {
  writeFileSync(srcFile, code, 'utf-8');
  const outFile = tc.args[2];

  const compileRes = spawnSync(GPP, tc.args, {
    encoding: 'utf-8', windowsHide: true, maxBuffer: 10 * 1024 * 1024,
  });
  
  console.log(`\n=== ${tc.label} ===`);
  console.log('Compile exit:', compileRes.status, '| stderr:', compileRes.stderr?.trim() || '(none)');
  
  if (compileRes.status === 0 && existsSync(outFile)) {
    const runRes = spawnSync(outFile, [], {
      encoding: 'utf-8', windowsHide: true, maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log('Run exit:', runRes.status);
    console.log('Run stdout:', JSON.stringify(runRes.stdout));
    console.log('Run stderr:', JSON.stringify(runRes.stderr));
    console.log('Run error:', runRes.error);
  } else {
    console.log('(skipped run - compile failed or exe missing)');
  }
}

// Also test with Anaconda's gcc just to compare
console.log('\n=== Test: Anaconda MinGW g++ (if available) ===');
const anacondaGpp = 'C:\\Users\\rohit\\anaconda3\\Library\\mingw-w64\\bin\\g++.exe';
if (existsSync(anacondaGpp)) {
  writeFileSync(srcFile, code, 'utf-8');
  const outFile = join(workDir, 'main_anaconda.exe');
  const cr = spawnSync(anacondaGpp, [srcFile, '-o', outFile], { encoding: 'utf-8', windowsHide: true });
  console.log('Compile exit:', cr.status, '| stderr:', cr.stderr?.trim() || '(none)');
  if (cr.status === 0 && existsSync(outFile)) {
    const rr = spawnSync(outFile, [], { encoding: 'utf-8', windowsHide: true, stdio: ['pipe','pipe','pipe'] });
    console.log('Run stdout:', JSON.stringify(rr.stdout));
  }
} else {
  console.log('Anaconda g++ not found at expected path');
}

rmSync(workDir, { recursive: true, force: true });
