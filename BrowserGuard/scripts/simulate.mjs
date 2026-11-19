import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { classifyUrl } = require('../src/url-checker.js');
const defaults = { strictMode: false, allowDomains: [], denyDomains: [], greyDomains: [] };
let total = 0;
const summaries = [];

for (const filename of ['reliable-webpages.json', 'untrustworthy-webpages.json']) {
  const dataset = JSON.parse(await readFile(resolve(root, 'tests/datasets', filename), 'utf8'));
  let passed = 0;
  console.log(`\n${dataset.name}`);
  for (const entry of dataset.cases) {
    const settings = { ...defaults, ...dataset.settings, ...entry.settings };
    const result = classifyUrl(entry.url, settings);
    const actual = { blocked: result.blocked, level: result.level, source: result.source };
    for (const [key, expected] of Object.entries(entry.expected)) assert.equal(actual[key], expected, `${entry.id}: expected ${key}=${expected}, got ${actual[key]}`);
    passed += 1;
    total += 1;
    console.log(`PASS ${entry.id}: ${result.level}, score ${result.score}/100, blocked=${result.blocked} (${result.source})`);
  }
  summaries.push(`${passed}/${dataset.cases.length} ${filename}`);
}

console.log(`\nSimulation passed: ${total} cases (${summaries.join('; ')}). No webpages were opened.`);