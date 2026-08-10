import { spawnSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const code = [
  '#include <iostream>',
  'using namespace std;',
  'int main() {',
  '  int x;',
  '  cout << "Hello World!" << endl;',
  '  return 0;',
  '}',
].join('\n');

const workDir = join(tmpdir(), 'polyglot_test2_' + Date.now());
mkdirSync(workDir, { recursive: true });
const srcFile = join(workDir, 'main.cpp');
const outFile = join(workDir, 'main.exe');
writeFileSync(srcFile, code, 'utf-8');

console.log('srcFile:', srcFile);

// Use spawnSync for better control
const compileResult = spawnSync('g++', [srcFile, '-o', outFile], {
  encoding: 'utf-8',
  maxBuffer: 10 * 1024 * 1024,
  windowsHide: true,
});

console.log('exit code:', compileResult.status);
console.log('stdout   :', JSON.stringify(compileResult.stdout));
console.log('stderr   :', JSON.stringify(compileResult.stderr));
console.log('error    :', compileResult.error);

if (compileResult.status === 0) {
  // Run the binary
  const runResult = spawnSync(outFile, [], {
    encoding: 'utf-8',
    windowsHide: true,
  });
  console.log('run exit:', runResult.status);
  console.log('run out :', JSON.stringify(runResult.stdout));
  console.log('run err :', JSON.stringify(runResult.stderr));
}

rmSync(workDir, { recursive: true, force: true });
