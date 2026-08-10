import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const code = '#include <iostream>\nusing namespace std;\nint main() {\n  cout << "Hello from C++!" << endl;\n  return 0;\n}';

const workDir = join(tmpdir(), 'polyglot_diag_' + Date.now());
mkdirSync(workDir, { recursive: true });
const srcFile = join(workDir, 'main.cpp');
const outFile = join(workDir, 'main.exe');
writeFileSync(srcFile, code, 'utf-8');

// Try different g++ candidates in priority order
const candidates = [
  'C:\\msys64\\ucrt64\\bin\\g++.exe',
  'C:\\msys64\\mingw64\\bin\\g++.exe',
  'C:\\msys64\\mingw32\\bin\\g++.exe',
  'C:\\Users\\rohit\\anaconda3\\Library\\mingw-w64\\bin\\g++.exe',
  'g++',
];

for (const gpp of candidates) {
  if (gpp !== 'g++' && !existsSync(gpp)) {
    console.log(`SKIP (not found): ${gpp}`);
    continue;
  }
  const r = spawnSync(gpp, [srcFile, '-o', outFile], {
    encoding: 'utf-8', windowsHide: true, maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, PATH: 'C:\\msys64\\ucrt64\\bin;' + process.env.PATH },
  });
  console.log(`\n[${gpp}]`);
  console.log('  exit :', r.status);
  console.log('  stdout:', JSON.stringify(r.stdout));
  console.log('  stderr:', JSON.stringify(r.stderr));
  console.log('  error :', r.error);
  if (r.status === 0) {
    const run = spawnSync(outFile, [], { encoding: 'utf-8', windowsHide: true });
    console.log('  RUN stdout:', JSON.stringify(run.stdout));
  }
}

rmSync(workDir, { recursive: true, force: true });
