import { expect, test } from './fixtures';
import { CHAMPIONSHIP_IMAGES, UNAVAILABLE_IMAGE } from './seed';

const API = 'http://localhost:3300/v1';

test.describe('API', () => {
  test('reports an image storage cannot provide as a failure, not as missing', async ({
    request,
  }) => {
    const response = await request.get(`${API}/images/${UNAVAILABLE_IMAGE.id}`);

    expect(response.status()).toBe(500);
    expect((await response.json()).message).not.toMatch(/not found/i);
  });

  test('still reports an image with no record as missing', async ({ request }) => {
    const response = await request.get(`${API}/images/000000000000000000000000`);

    expect(response.status()).toBe(404);
  });

  test('serves the other images in a batch when one cannot be signed', async ({
    request,
  }) => {
    const ids = [CHAMPIONSHIP_IMAGES[0].id, UNAVAILABLE_IMAGE.id].join(',');

    const response = await request.get(`${API}/images/batch-thumbnails?ids=${ids}`);

    expect(response.status()).toBe(200);
    const { data } = await response.json();
    expect(data.map(({ id }: { id: string }) => id)).toContain(CHAMPIONSHIP_IMAGES[0].id);
  });

  // Sorts on which several seeded records tie, read a few at a time so ties cross pages
  for (const path of [
    '/public/members?sortBy=rating&sortOrder=desc&filter_showInactiveMembers=false',
    '/public/members?sortBy=city&sortOrder=asc&filter_showInactiveMembers=false',
    '/games?sortBy=tournament&sortOrder=asc',
    '/games?sortBy=result&sortOrder=asc',
    '/games?sortBy=white&sortOrder=asc',
    '/events?sortBy=type&sortOrder=asc',
    '/articles?sortBy=bookmarkDate&sortOrder=desc',
  ]) {
    test(`lists each record once when paging through ${path}`, async ({ request }) => {
      const ids: string[] = [];
      let filteredCount = Infinity;
      for (let page = 1; ids.length < filteredCount; page++) {
        const response = await request.get(`${API}${path}&page=${page}&pageSize=3`);
        const { data } = await response.json();
        if (!data.items.length) {
          break;
        }
        ids.push(...data.items.map(({ id }: { id: string }) => id));
        filteredCount = data.filteredCount;
      }

      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toHaveLength(filteredCount);
    });
  }

  for (const [method, path] of [
    ['put', '/events/000000000000000000000000'],
    ['put', '/articles/000000000000000000000000'],
    ['post', '/images'],
    ['post', '/users/me/avatar'],
    ['post', '/tournaments'],
    ['put', '/tournaments/105'],
    ['delete', '/tournaments/105'],
    ['post', '/tournaments/player-matches'],
    ['post', '/tournaments/105/registration'],
    ['delete', '/tournaments/105/registration'],
  ] as const) {
    test(`refuses ${method.toUpperCase()} ${path} without a session`, async ({
      request,
    }) => {
      const response = await request[method](`${API}${path}`);

      expect(response.status()).toBe(401);
      expect((await response.json()).message).toBe('Unauthorized.');
    });
  }
});
