import { spawn, spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

const candidates = [
  process.env.PYTHON ? { command: process.env.PYTHON, args: [] } : null,
  { command: path.join(backendDir, 'ml_venv', 'Scripts', 'python.exe'), args: [] },
  { command: 'python', args: [] },
  { command: 'py', args: ['-3'] }
].filter(Boolean);

const dependencyCheck = [
  'import torch',
  'import flask',
  'import flask_cors',
  'import cv2',
  'from PIL import Image',
  'import numpy',
  'print("ok")'
].join('; ');

function hasRequiredDependencies(candidate) {
  const result = spawnSync(
    candidate.command,
    [...candidate.args, '-c', dependencyCheck],
    { cwd: backendDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return result.status === 0;
}

const selected = candidates.find(hasRequiredDependencies);

if (!selected) {
  console.error('[ML] No Python interpreter with required ML dependencies was found.');
  console.error('[ML] Install backend/requirements.txt or set PYTHON to a working interpreter.');
  process.exit(1);
}

console.log(`[ML] Starting src/ml_server.py with: ${selected.command} ${selected.args.join(' ')}`.trim());

const child = spawn(
  selected.command,
  [...selected.args, 'src/ml_server.py'],
  { cwd: backendDir, stdio: 'inherit' }
);

function shutdown(signal) {
  if (!child.killed) child.kill(signal);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
