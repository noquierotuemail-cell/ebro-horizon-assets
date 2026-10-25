import test from 'node:test';
import assert from 'node:assert/strict';
import { runShell } from '../adb/core.mjs';

const stream = text => new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(text)); controller.close(); } });
const adbFor = process => ({ subprocess: { shellProtocol: { spawn: async () => process } } });

test('diagnostic mode retains both output streams and the real failing exit status', async () => {
  const process = { stdout: stream('Package commit failed\n'), stderr: stream('Dalvik warning\n'), exited: Promise.resolve(1), kill() {} };
  const result = await runShell(adbFor(process), 'command', { check: false });
  assert.deepEqual(result, { stdout: 'Package commit failed\n', stderr: 'Dalvik warning\n', exitCode: 1 });
});

test('default shell behavior still throws, exposing complete diagnostic fields', async () => {
  const process = { stdout: stream('failure detail'), stderr: stream('warning'), exited: Promise.resolve(17), kill() {} };
  await assert.rejects(runShell(adbFor(process), 'command'), error => error.exitCode === 17 && error.stdout === 'failure detail' && error.stderr === 'warning');
});

test('legacy shell never invents a successful exit status', async () => {
  const adb = { subprocess: { noneProtocol: { spawn: async () => ({ output: stream('Killed\n'), exited: Promise.resolve(), kill() {} }) } } };
  assert.deepEqual(await runShell(adb, 'command', { check: false }), { stdout: 'Killed\n', stderr: '', exitCode: null });
});

test('timeout closes a stalled process even when its output never completes', async () => {
  let killed = false;
  const process = { stdout: new ReadableStream(), stderr: new ReadableStream(), exited: new Promise(() => {}), async kill() { killed = true; } };
  let guard;
  const result = await Promise.race([
    runShell(adbFor(process), 'command', { timeout: 10 }).then(() => 'resolved', error => error.message),
    new Promise(resolve => { guard = setTimeout(() => resolve('test deadline'), 250); }),
  ]);
  clearTimeout(guard);
  assert.notEqual(result, 'test deadline');
  assert.match(result, /tiempo/);
  assert.equal(killed, true);
});
