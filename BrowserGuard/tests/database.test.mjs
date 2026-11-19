import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { create } = require('../src/database.js');

function makeDatabase() {
  const values = {};
  const storage = {
    async get(key) { return typeof key === 'string' ? { [key]: values[key] } : values; },
    async set(update) { Object.assign(values, update); }
  };
  return create(storage);
}

test('a safe and unsafe report for the same site moves it to greylist', async () => {
  const database = makeDatabase();
  await database.initialize();
  await database.assess({ domain: 'https://example.com/login', decision: 'safe', reporterId: 'user-a' });
  const snapshot = await database.assess({ domain: 'example.com', decision: 'unsafe', reporterId: 'user-b' });

  assert.equal(snapshot.lists.whitelist.length, 0);
  assert.equal(snapshot.lists.blacklist.length, 0);
  assert.deepEqual(snapshot.lists.greylist.map((site) => site.domain), ['example.com']);
  assert.equal(snapshot.datasets.filter((record) => record.type === 'assessment').length, 2);
});

test('an explicit review resolves a greylisted site and preserves its dataset history', async () => {
  const database = makeDatabase();
  await database.initialize();
  await database.assess({ domain: 'example.com', decision: 'safe' });
  await database.assess({ domain: 'example.com', decision: 'unsafe' });
  const snapshot = await database.resolve({ domain: 'example.com', decision: 'safe' });

  assert.deepEqual(snapshot.lists.whitelist.map((site) => site.domain), ['example.com']);
  assert.equal(snapshot.lists.greylist.length, 0);
  assert.equal(snapshot.datasets.filter((record) => record.type === 'assessment').length, 2);
  assert.equal(snapshot.datasets.at(-1).type, 'resolution');
});

test('unsure reports remain in greylist and page analysis stores domain-level evidence', async () => {
  const database = makeDatabase();
  await database.initialize();
  await database.assess({ domain: 'example.com', decision: 'unsure' });
  const snapshot = await database.recordPageAnalysis({ domain: 'example.com', riskScore: 48, reasons: ['Insecure form'] });

  assert.deepEqual(snapshot.lists.greylist.map((site) => site.domain), ['example.com']);
  assert.equal(snapshot.datasets.at(-1).riskScore, 48);
  assert.equal(snapshot.datasets.at(-1).domain, 'example.com');
  assert.equal(snapshot.datasets.at(-1).url, undefined);
});

test('legacy allow and deny conflicts migrate to greylist', async () => {
  const database = makeDatabase();
  const snapshot = await database.initialize(['example.com'], ['example.com']);

  assert.equal(snapshot.lists.whitelist.length, 0);
  assert.equal(snapshot.lists.blacklist.length, 0);
  assert.deepEqual(snapshot.lists.greylist.map((site) => site.domain), ['example.com']);
});

test('import merges independent reports and routes disagreement to greylist', async () => {
  const database = makeDatabase();
  await database.initialize();
  await database.assess({ domain: 'example.com', decision: 'safe', source: 'user-a' });
  const imported = {
    schemaVersion: 1,
    lists: { whitelist: [], blacklist: [{ domain: 'example.com' }], greylist: [] },
    datasets: [{ id: 'other-user-report', type: 'assessment', domain: 'example.com', decision: 'unsafe', source: 'user-b', timestamp: '2026-01-01T00:00:00.000Z' }]
  };
  const snapshot = await database.importSnapshot(imported);

  assert.equal(snapshot.lists.whitelist.length, 0);
  assert.equal(snapshot.lists.blacklist.length, 0);
  assert.deepEqual(snapshot.lists.greylist.map((site) => site.domain), ['example.com']);
  assert.equal(snapshot.datasets.filter((record) => record.type === 'assessment').length, 2);
});