import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const directory = await mkdtemp(path.join(os.tmpdir(), 'arbigo-worker-smoke-'));
const heartbeat = path.join(directory, 'heartbeat');
const child = spawn(
  process.execPath,
  [path.join(process.cwd(), 'node_modules/tsx/dist/cli.mjs'), 'scripts/worker.ts'],
  {
    env: {
      ...process.env,
      ARBIGO_WORKER_HEARTBEAT: heartbeat,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: '',
      VAPID_PRIVATE_KEY: '',
    },
    stdio: 'ignore',
  },
);

try {
  const deadline = Date.now() + 10000;
  let started = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Worker exited before its first heartbeat.');
    try {
      if (Number(await readFile(heartbeat, 'utf8')) > 0) {
        started = true;
        break;
      }
    } catch {
      // The worker has not written its first heartbeat yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!started) throw new Error('Worker did not write a heartbeat within ten seconds.');
  child.kill('SIGTERM');
  await once(child, 'exit');
  console.log('Worker module loads and reports healthy startup.');
} finally {
  if (child.exitCode === null) {
    child.kill('SIGKILL');
    await once(child, 'exit');
  }
  await rm(directory, { recursive: true, force: true });
}
