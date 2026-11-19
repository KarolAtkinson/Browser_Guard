import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { classifyUrl } = require('../src/url-checker.js');
const defaults = { strictMode: false, allowDomains: [], denyDomains: [], greyDomains: [] };

for (const filename of ['reliable-webpages.json', 'untrustworthy-webpages.json']) {
  const dataset = JSON.parse(await readFile(resolve(import.meta.dirname, 'datasets', filename), 'utf8'));
  test(`${dataset.name} matches expected classifications`, () => {
    for (const entry of dataset.cases) {
      const result = classifyUrl(entry.url, { ...defaults, ...dataset.settings, ...entry.settings });
      for (const [key, expected] of Object.entries(entry.expected)) assert.equal(result[key], expected, `${entry.id} expected ${key}=${expected}`);
    }
  });
}

test('blacklist takes precedence over a matching whitelist', () => {
  const result = classifyUrl('https://portal.example.test/', {
    ...defaults,
    allowDomains: ['example.test'],
    denyDomains: ['portal.example.test']
  });

  assert.equal(result.blocked, true);
  assert.equal(result.source, 'blocklist');
});

test('greylist gives a caution without blocking on its own', () => {
  const result = classifyUrl('https://review.example.test/', { ...defaults, greyDomains: ['example.test'] });

  assert.equal(result.level, 'caution');
  assert.equal(result.blocked, false);
});