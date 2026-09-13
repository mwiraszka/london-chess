// Regenerates src/app/pages/site-updates/site-updates.generated.ts from the root
// CHANGELOG.md, keeping releases from v6.0.0 up. Runs automatically before
// every serve and build so the Site Updates page always matches the changelog.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHANGELOG_PATH = join(FRONTEND_ROOT, '..', 'CHANGELOG.md');
const OUTPUT_PATH = join(
  FRONTEND_ROOT,
  'src/app/pages/site-updates/site-updates.generated.ts',
);
const MIN_MAJOR_VERSION = 6;

// The definitive set of release tags. A release carries a tag when any of its
// changelog entries matches, so the card keeps itself in sync as entries are
// added and removed during development.
const TAG_REGISTRY = [
  {
    label: 'New features',
    color: '#4a6fa5',
    matches: release => release.added.length > 0,
  },
  {
    label: 'Styling',
    color: '#7d6b9e',
    pattern:
      /\b(styl\w*|colou?r\w*|icons?|themes?|dark mode|layout|spacing|redesign\w*|placeholders?|fonts?|badges?|dividers?)\b/i,
  },
  { label: 'Bug fixes', color: '#b1683a', matches: release => release.fixed.length > 0 },
  {
    label: 'Performance',
    color: '#3d8079',
    pattern:
      /\b(performance|faster|speeds?|cach\w*|optimi[sz]\w*|duplicate|cancelled)\b/i,
  },
  {
    label: 'Security',
    color: '#a94b4b',
    pattern: /\b(update packages|encrypt\w*|security)\b/i,
  },
  {
    label: 'Accessibility',
    color: '#a58a3d',
    pattern: /\b(accessib\w*|aria|screen readers?|keyboard|contrast)\b/i,
  },
  {
    label: 'Mobile',
    color: '#a85480',
    pattern: /\b(mobile|touch|small screens?|phones?|responsive)\b/i,
  },
  { label: 'Admin tools', color: '#64748b', pattern: /\badmin\w*\b/i },
  {
    label: 'Infrastructure',
    color: '#8a5a3b',
    pattern:
      /\b(repositor\w*|storage|serverless|hosting|infrastructur\w*|migrat\w*|cloudflare|aws|cognito|databases?|api|back(?:s|ed)? up|backups?)\b/i,
  },
  { label: 'Content', color: '#4d8a5f', pattern: /\b(wording|rewrit\w*|copy)\b/i },
];

function tagsFor(release) {
  const allEntries = [...release.added, ...release.changed, ...release.fixed].join('\n');
  return TAG_REGISTRY.filter(tag =>
    tag.matches ? tag.matches(release) : tag.pattern.test(allEntries),
  ).map(({ label, color }) => ({ label, color }));
}

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

  const release = { version, date, ...sections };
  releases.push({ ...release, tags: tagsFor(release) });
}

const banner = `// Generated from CHANGELOG.md by scripts/generate-site-updates-data.mjs.
// Do not edit by hand; edit the changelog instead.`;

const output = `${banner}
import { SiteUpdatesRelease } from '@app/models';

export const SITE_UPDATES_RELEASES: SiteUpdatesRelease[] = ${JSON.stringify(releases, null, 2)};
`;

writeFileSync(OUTPUT_PATH, output);
console.log(`site-updates.generated.ts written (${releases.length} releases)`);
