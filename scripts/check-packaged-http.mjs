import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(import.meta.dirname, '..');
const frontend = path.join(root, 'artifacts', 'bsch', 'dist', 'public');
const entry = path.join(root, 'artifacts', 'api-server', 'dist', 'index.mjs');
const data = path.join(root, '.tmp-http-test');
fs.rmSync(data, { recursive: true, force: true });
fs.mkdirSync(data, { recursive: true });
const child = spawn(process.execPath, [entry], {
  cwd: root,
  env: { ...process.env, PORT: '18080', HOST: '127.0.0.1', NODE_ENV: 'production', FRONTEND_DIR: frontend, BSCH_DATA_DIR: data, BSCH_DATABASE_PATH: path.join(data, 'bsch.sqlite') },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', d => { logs += d; });
child.stderr.on('data', d => { logs += d; });
const get = pathName => new Promise((resolve, reject) => {
  const req = http.get(`http://127.0.0.1:18080${pathName}`, res => {
    let body = ''; res.setEncoding('utf8'); res.on('data', d => body += d); res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
  }); req.on('error', reject);
});
try {
  for (let i = 0; i < 40; i++) {
    try { const health = await get('/api/health'); if (health.status < 500) break; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  const paths = ['/', '/assets/index-CReyven6.js', '/assets/index-GoyhWHqm.css', '/api/health'];
  for (const p of paths) { const r = await get(p); console.log(JSON.stringify({ path: p, status: r.status, type: r.type, bytes: r.body.length, head: r.body.slice(0, 80) })); }
} finally { child.kill(); fs.rmSync(data, { recursive: true, force: true }); }
if (logs) console.error(logs);
