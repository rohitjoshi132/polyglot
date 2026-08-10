import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const code = [
  '#include <iostream>',
  'using namespace std;',
  'int main() {',
  '  int x;',
  '  cout << "Type a number: ";',
  '  cin >> x;',
  '  cout << "Your number is: " << x;',
  '  return 0;',
  '}',
].join('\n');

const workDir = join(tmpdir(), 'polyglot_test_' + Date.now());
mkdirSync(workDir, { recursive: true });
const srcFile = join(workDir, 'main.cpp');
const outFile = join(workDir, 'main.exe');
writeFileSync(srcFile, code, 'utf-8');

console.log('--- C++ Compilation Test ---');
console.log('workDir :', workDir);
console.log('srcFile :', srcFile);
console.log('outFile :', outFile);
console.log('cmd     :', `g++ "${srcFile}" -o "${outFile}"`);
console.log('');

try {
  const result = execSync(`g++ "${srcFile}" -o "${outFile}"`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  console.log('✅ Compile OK. stdout:', result || '(none)');

  // Try running the binary
  try {
    const runResult = execSync(`"${outFile}"`, {
      encoding: 'utf-8',
      input: '42\n',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log('✅ Run OK. output:', runResult);
  } catch (re) {
    console.log('❌ Run FAIL stdout:', re.stdout);
    console.log('❌ Run FAIL stderr:', re.stderr);
  }
} catch (e) {
  console.log('❌ Compile FAIL');
  console.log('   stdout :', e.stdout);
  console.log('   stderr :', e.stderr);
  console.log('   status :', e.status);
}

rmSync(workDir, { recursive: true, force: true });
console.log('\n--- Python Test ---');
try {
  const py = execSync('python --version', { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
  console.log('✅ Python:', py.trim());
} catch(e) {
  console.log('❌ Python not found');
}

console.log('\n--- Node.js Test ---');
try {
  const nd = execSync('node --version', { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
  console.log('✅ Node:', nd.trim());
} catch(e) {
  console.log('❌ Node not found');
}
