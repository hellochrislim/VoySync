import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Start the two tutorial applications together; stop both with Ctrl+C.
const root = fileURLToPath(new URL('../', import.meta.url));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = ['server', 'client'].map((workspace) =>
  spawn(npm, ['run', 'dev', '--workspace', workspace], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  }),
);

let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill('SIGTERM');
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
for (const child of children) {
  child.on('error', (error) => {
    console.error(`Unable to start application: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) stop(signal ? 1 : (code ?? 1));
  });
}
