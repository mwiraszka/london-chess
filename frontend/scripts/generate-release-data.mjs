// Regenerates src/assets/release.json with the release being built, which a page left open
// fetches to tell whether a newer release has been deployed since it loaded
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// The root package.json carries the version of every release, as RELEASE_VERSION does
const PACKAGE_PATH = join(FRONTEND_ROOT, '..', 'package.json');
const OUTPUT_PATH = join(FRONTEND_ROOT, 'src/assets/release.json');

const { version } = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8'));

writeFileSync(OUTPUT_PATH, `${JSON.stringify({ version })}\n`);
console.log(`release.json written (${version})`);
