import { cpSync, mkdirSync, existsSync } from 'node:fs';
const from = 'node_modules/@mediapipe/tasks-vision/wasm';
if (existsSync(from)) {
  mkdirSync('public', { recursive: true });
  cpSync(from, 'public/wasm', { recursive: true });
}
