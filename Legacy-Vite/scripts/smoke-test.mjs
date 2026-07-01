#!/usr/bin/env node
/**
 * Legacy smoke test — start game, age up 40 years, save/load round-trip.
 * Run: npm run test:smoke
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PROJECT = path.join(ROOT, '..');
const AGE_UP_YEARS = 40;

function log(msg) {
  console.log(`[smoke] ${msg}`);
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Dev server did not become ready at ${url}`);
}

function startDevServer(port) {
  const viteBin = path.join(PROJECT, 'node_modules', 'vite', 'bin', 'vite.js');
  const child = spawn(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: PROJECT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  const logs = [];
  child.stdout?.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr?.on('data', (chunk) => logs.push(String(chunk)));
  child.__logs = logs;
  return child;
}

async function runSmokeFlow(page, baseUrl) {
  await page.goto(`${baseUrl}/?smoke=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__LEGACY_TEST__, null, { timeout: 15_000 });

  return page.evaluate(async ({ years }) => {
    const t = window.__LEGACY_TEST__;
    if (!t) throw new Error('__LEGACY_TEST__ missing — load with ?smoke=1');

    t.startGame();
    await t.completeBlockingUi();

    const startState = t.getState();
    if (!startState.player?.isAlive) throw new Error('Player not alive after startGame');
    if (startState.peopleCount < 5) {
      throw new Error(`Expected a populated family tree, got ${startState.peopleCount} people`);
    }

    for (let i = 0; i < years; i++) {
      t.ageUp();
      await t.completeBlockingUi();
    }

    const afterAge = t.getState();
    if (afterAge.player?.age !== years) {
      throw new Error(`Expected player age ${years}, got ${afterAge.player?.age}`);
    }
    if (afterAge.year !== startState.year + years) {
      throw new Error(
        `Expected year ${startState.year + years}, got ${afterAge.year}`,
      );
    }
    if (!afterAge.player?.isAlive) throw new Error('Player died during age-up loop');

    const snap = t.snapshotGame();
    if (snap.schema !== t.SAVE_SCHEMA) {
      throw new Error(`Snapshot schema ${snap.schema} !== ${t.SAVE_SCHEMA}`);
    }

    const saved = {
      peopleCount: afterAge.peopleCount,
      year: afterAge.year,
      playerAge: afterAge.player.age,
      playerAlive: afterAge.player.isAlive,
    };

    const writeResult = t.saveToSlot(1);
    if (!writeResult.ok) throw new Error(`saveToSlot failed: ${writeResult.error}`);

    const fromStorage = t.readSave(t.SAVE_KEY_SLOT(1));
    if (!fromStorage) throw new Error('readSave returned null after saveToSlot');
    if (fromStorage.schema !== t.SAVE_SCHEMA) {
      throw new Error(`Stored schema ${fromStorage.schema} !== ${t.SAVE_SCHEMA}`);
    }

    t.applySave({
      schema: 1,
      year: 1800,
      surname: '',
      people: [],
      pendingSiblings: [],
      eventLog: [],
      memories: [],
      nextId: 0,
    });

    const loadResult = t.loadFromSlot(1);
    if (!loadResult.ok) throw new Error(`loadFromSlot failed: ${loadResult.error}`);

    const loaded = t.getState();
    if (loaded.peopleCount !== saved.peopleCount) {
      throw new Error(
        `People count after load: ${loaded.peopleCount} !== ${saved.peopleCount}`,
      );
    }
    if (loaded.year !== saved.year) {
      throw new Error(`Year after load: ${loaded.year} !== ${saved.year}`);
    }
    if (loaded.player?.age !== saved.playerAge) {
      throw new Error(`Player age after load: ${loaded.player?.age} !== ${saved.playerAge}`);
    }
    if (!loaded.player?.isAlive) throw new Error('Player not alive after loadFromSlot');

    t.applySave(JSON.parse(JSON.stringify(snap)));
    const roundTrip = t.getState();
    if (roundTrip.peopleCount !== saved.peopleCount) {
      throw new Error('JSON round-trip people count mismatch');
    }
    if (roundTrip.year !== saved.year) throw new Error('JSON round-trip year mismatch');
    if (roundTrip.player?.age !== saved.playerAge) {
      throw new Error('JSON round-trip player age mismatch');
    }

    return { ...saved, schema: snap.schema };
  }, { years: AGE_UP_YEARS });
}

async function main() {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const server = startDevServer(port);
  let browser;

  const killServer = () => {
    if (server && !server.killed) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(server.pid), '/f', '/t'], { stdio: 'ignore' });
      } else {
        server.kill('SIGTERM');
      }
    }
  };

  process.on('SIGINT', () => {
    killServer();
    process.exit(130);
  });

  try {
    log(`Waiting for dev server at ${baseUrl}…`);
    await waitForServer(`${baseUrl}/`);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    log(`Running smoke flow (${AGE_UP_YEARS} year age-up + save/load)…`);
    const result = await runSmokeFlow(page, baseUrl);

    log('Smoke test passed.');
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = 0;
  } catch (err) {
    console.error('[smoke] FAILED:', err.message || err);
    if (server?.__logs?.length) {
      console.error('[smoke] Vite output:\n' + server.__logs.join('').trim());
    }
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    killServer();
    await new Promise((r) => setTimeout(r, 500));
  }
}

main();
