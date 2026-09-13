// Regenerates src/app/pages/whats-new/whats-new.generated.ts from the root
// CHANGELOG.md, keeping releases from v6.0.0 up. Runs automatically before
// every serve and build so the What's New page always matches the changelog.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGELOG_PATH = join(FRONTEND_ROOT, '..', 'CHANGELOG.md');
const OUTPUT_PATH = join(FRONTEND_ROOT, 'src/app/pages/whats-new/whats-new.generated.ts');
const MIN_MAJOR_VERSION = 6;

const changelog = readFileSync(CHANGELOG_PATH, 'utf8');

const releases = [];
const releaseBlocks = changelog.split(/^## /m).slice(1);

for (const block of releaseBlocks) {
  const headingMatch = block.match(/^\[(v[\d.]+)\] - (.+)$/m);
  if (!headingMatch) {
    continue;
  }

  const [, version, rawDate] = headingMatch;
  const major = Number(version.slice(1).split('.')[0]);
  if (Number.isNaN(major) || major < MIN_MAJOR_VERSION) {
    continue;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate.trim()) ? rawDate.trim() : null;

  const sections = { added: [], changed: [], fixed: [] };
  let current = null;
  for (const line of block.split('\n')) {
    const sectionMatch = line.match(/^### (Added|Changed|Fixed)\s*$/);
    if (sectionMatch) {
      current = sectionMatch[1].toLowerCase();
      continue;
    }
    if (current && line.startsWith('- ')) {
      sections[current].push(line.slice(2).trim());
    }
  }

  releases.push({ version, date, ...sections });
}

const banner = `// Generated from CHANGELOG.md by scripts/generate-whats-new-data.mjs.
// Do not edit by hand; edit the changelog instead.`;

const output = `${banner}
import { WhatsNewRelease } from '@app/models';

export const WHATS_NEW_RELEASES: WhatsNewRelease[] = ${JSON.stringify(releases, null, 2)};
`;

writeFileSync(OUTPUT_PATH, output);
console.log(`whats-new.generated.ts written (${releases.length} releases)`);
