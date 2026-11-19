import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const required = [
  'worker.js', 'database.js', 'url-checker.js', 'content.js', 'popup.html', 'options.html', 'warning.html', 'dashboard.html', 'dashboard.js', 'dashboard.css',
  'rules/privacy.json'
];

for (const target of ['chromium', 'firefox']) {
  const manifest = JSON.parse(await readFile(resolve(root, 'manifests', `${target}.json`), 'utf8'));
  if (manifest.manifest_version !== 3 || !manifest.permissions.includes('declarativeNetRequest')) {
    throw new Error(`${target} manifest is missing required MV3 permissions`);
  }
  if (manifest.action.default_popup || manifest.action.default_title !== 'Open BrowserGuard Dashboard') {
    throw new Error(`${target} toolbar action must launch the full dashboard`);
  }
  if (target === 'firefox' && !manifest.background.scripts?.includes('worker.js')) {
    throw new Error('Firefox manifest must register its background script');
  }
  if (target === 'chromium' && manifest.background.service_worker !== 'worker.js') {
    throw new Error('Chromium manifest must register its service worker');
  }
}

for (const relativePath of required) {
  await readFile(resolve(root, 'src', relativePath));
}

const rules = JSON.parse(await readFile(resolve(root, 'src/rules/privacy.json'), 'utf8'));
const ids = rules.map((rule) => rule.id);
if (new Set(ids).size !== ids.length) throw new Error('DNR rule IDs must be unique');

for (const datasetFile of ['reliable-webpages.json', 'untrustworthy-webpages.json']) {
  const dataset = JSON.parse(await readFile(resolve(root, 'tests/datasets', datasetFile), 'utf8'));
  if (!Array.isArray(dataset.cases) || dataset.cases.length === 0) throw new Error(`${datasetFile} has no simulation cases`);
  for (const entry of dataset.cases) {
    if (!entry.url || !entry.expected || typeof entry.expected.blocked !== 'boolean') throw new Error(`${datasetFile} contains a malformed case`);
    const hostname = new URL(entry.url).hostname;
    if (!hostname.endsWith('.test') && hostname !== 'example.com' && !hostname.startsWith('192.0.2.') && !hostname.endsWith('iana.org') && !hostname.endsWith('wikipedia.org')) {
      throw new Error(`${datasetFile} includes an unapproved live hostname: ${entry.url}`);
    }
  }
}

for (const [category, relativePath] of Object.entries({
  whitelist: 'Database/Whitelist/sites.json',
  blacklist: 'Database/Blacklist/sites.json',
  greylist: 'Database/Greylist/sites.json',
  datasets: 'Database/Datasets/records.json'
})) {
  const data = JSON.parse(await readFile(resolve(root, relativePath), 'utf8'));
  const entries = category === 'datasets' ? data.records : data.sites;
  if (data.schemaVersion !== 1 || !Array.isArray(entries)) throw new Error(`${relativePath} has an invalid database template`);
}

const sourceFiles = await readdir(resolve(root, 'src'));
const javascriptFiles = ['src/worker.js', 'src/database.js', 'src/url-checker.js', 'src/content.js', 'src/popup.js', 'src/options.js', 'src/warning.js', 'src/dashboard.js', 'scripts/simulate.mjs', 'tests/url-checker.test.mjs'];
for (const file of javascriptFiles) {
  const checked = spawnSync(process.execPath, ['--check', resolve(root, file)], { encoding: 'utf8' });
  if (checked.status !== 0) throw new Error(`${file} has a syntax error:\n${checked.stderr}`);
}

console.log(`Checks passed: ${sourceFiles.length} top-level source entries, both manifests, ${rules.length} privacy rules, four database templates, two offline URL datasets, and JavaScript syntax.`);