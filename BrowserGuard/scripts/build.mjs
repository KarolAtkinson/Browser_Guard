import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const supported = ['chromium', 'firefox'];
const requested = process.argv[2];
const targets = requested ? [requested] : supported;

if (targets.some((target) => !supported.includes(target))) {
  throw new Error(`Unsupported browser target. Choose: ${supported.join(', ')}`);
}

for (const target of targets) {
  const output = resolve(root, 'dist', target);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(resolve(root, 'src'), output, { recursive: true });
  await cp(resolve(root, 'Database'), resolve(output, 'Database'), { recursive: true });
  const manifest = await readFile(resolve(root, 'manifests', `${target}.json`));
  await writeFile(resolve(output, 'manifest.json'), manifest);
  console.log(`Built ${target} extension at dist/${target}`);
}