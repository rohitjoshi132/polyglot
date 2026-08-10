import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const code = [
  '#include <iostream>',
  'using namespace std;',
  'int main() {',
  '  cout << "Hello World!" << endl;',
  '  return 0;',
  '}',
].join('\n');

const workDir = join(tmpdir(), 'polyglot_test3_' + Date.now());
mkdirSync(workDir, { recursive: true });
const srcFile = join(workDir, 'main.cpp');
const outFile = join(workDir, 'main.exe');
writeFileSync(srcFile, code, 'utf-8');

const GPP = 'C:\\msys64\\ucrt64\\bin\\g++.exe';
const GCC = 'C:\\msys64\\ucrt64\\bin\\gcc.exe';

console.log('--- Test with absolute path g++ ---');
const r1 = spawnSync(GPP, [srcFile, '-o', outFile], {
  encoding: 'utf-8',
  windowsHide: true,
  env: { ...process.env, PATH: 'C:\\msys64\\ucrt64\\bin;' + process.env.PATH },
});
console.log('exit:', r1.status, '| stdout:', JSON.stringify(r1.stdout), '| stderr:', JSON.stringify(r1.stderr));

if (r1.status === 0) {
  const run = spawnSync(outFile, [], { encoding: 'utf-8', windowsHide: true });
  console.log('✅ Run output:', run.stdout.trim());
} else {
  console.log('❌ Compile still fails with absolute path');
}

// Also test from MSYS2 shell
console.log('\n--- Test via MSYS2 bash ---');
const r2 = spawnSync('C:\\msys64\\usr\\bin\\bash.exe', ['-c', `g++ '${srcFile.replace(/\\/g, '/')}' -o '${outFile.replace(/\\/g, '/')}' 2>&1 && echo COMPILED_OK`], {
  encoding: 'utf-8',
  windowsHide: true,
});
console.log('exit:', r2.status, '| out:', r2.stdout.trim(), '| err:', r2.stderr?.trim());

rmSync(workDir, { recursive: true, force: true });
