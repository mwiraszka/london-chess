import { Page, expect, test } from './fixtures';
import { holdRequests } from './requests';
import { ARTICLES, CHAMPIONSHIP, PROFILE_MEMBER } from './seed';

const API = /\/v1\//;
// Third-party content outside the page's own layout: the web fonts swap in once loaded,
// and the embedded maps fill their fixed frames however Google draws them
const THIRD_PARTY = /(fonts|maps)\.(googleapis|gstatic)\.com/;

interface Shift {
  value: number;
  sources: string[];
}

// Records every layout shift from the first paint on, with where each element moved from
// and to, so a failure says what moved
async function recordShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const shifts: { value: number; sources: string[] }[] = [];
    Object.assign(window, { lccShifts: shifts });
    const describe = (node: Node | null): string => {
      if (!(node instanceof Element)) {
        return String(node?.nodeName ?? 'unknown');
      }
      const classes = [...node.classList].slice(0, 2).join('.');
      return `${node.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
    };
    const rect = ({ x, y, width, height }: DOMRectReadOnly) =>
      [x, y, width, height].map(Math.round).join(',');
    new PerformanceObserver(list => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
        sources: {
          node: Node | null;
          previousRect: DOMRectReadOnly;
          currentRect: DOMRectReadOnly;
        }[];
      })[]) {
        if (!entry.hadRecentInput) {
          shifts.push({
            value: entry.value,
            sources: entry.sources.map(
              source =>
                `${describe(source.node)} ${rect(source.previousRect)} -> ${rect(source.currentRect)}`,
            ),
          });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

const shiftsOf = (page: Page): Promise<Shift[]> =>
  page.evaluate(() => (window as unknown as { lccShifts: Shift[] }).lccShifts);

const nextFrames = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

const PAGES: [name: string, path: () => Promise<string> | string][] = [
  ['home', () => '/'],
  ['articles', () => '/articles'],
  ['an article', () => `/article/view/${ARTICLES[0].id}`],
  ['the schedule', () => '/schedule'],
  ['the members', () => '/members'],
  ['a member profile', () => `/members/${PROFILE_MEMBER.number}`],
  ['the photo gallery', () => '/photo-gallery'],
  ['the city championship', () => '/city-championship'],
  ['the game archives', () => '/game-archives'],
  ['the tournaments', () => '/tournaments'],
  ['a tournament', () => `/tournaments/${CHAMPIONSHIP.number}`],
  ['the documents', () => '/documents'],
  ['the faq', () => '/faq'],
  ['the regional clubs', () => '/regional-clubs'],
  ['the lifetime achievement awards', () => '/lifetime-achievement-awards'],
  ['the website changelog', () => '/website-changelog'],
];

for (const [viewport, size] of [
  ['desktop', { width: 1280, height: 800 }],
  ['phone', { width: 390, height: 844 }],
] as const) {
  test.describe(`layout stability on a ${viewport}`, () => {
    test.use({ viewport: size });

    for (const [name, path] of PAGES) {
      test(`fills in ${name} without moving anything already on screen`, async ({
        page,
      }) => {
        await page.route(THIRD_PARTY, route => route.abort());
        await recordShifts(page);
        const api = await holdRequests(page, API);

        await page.goto(await path());
        await nextFrames(page);
        // Answers arrive one at a time, so every state the page passes through is seen
        while (api.count() > 0) {
          await api.releaseNext();
          await nextFrames(page);
        }
        await api.release();
        await page.waitForLoadState('networkidle');
        await nextFrames(page);

        const shifts = await shiftsOf(page);
        expect(shifts, JSON.stringify(shifts, null, 2)).toEqual([]);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollHeight - window.innerHeight,
          ),
        ).toBeLessThanOrEqual(0);
      });
    }

    test(`fills in a game without moving anything already on screen`, async ({
      page,
      request,
    }) => {
      const response = await request.get('/v1/games?page=1&pageSize=1');
      const gameId = (await response.json()).data.items[0].id;
      await page.route(THIRD_PARTY, route => route.abort());
      await recordShifts(page);
      const api = await holdRequests(page, API);

      await page.goto(`/game-archives/${gameId}`);
      await nextFrames(page);
      while (api.count() > 0) {
        await api.releaseNext();
        await nextFrames(page);
      }
      await api.release();
      await page.waitForLoadState('networkidle');
      await nextFrames(page);

      const shifts = await shiftsOf(page);
      expect(shifts, JSON.stringify(shifts, null, 2)).toEqual([]);
    });
  });
}
