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

  for (const [method, path] of [
    ['put', '/events/000000000000000000000000'],
    ['put', '/articles/000000000000000000000000'],
    ['post', '/images'],
    ['post', '/users/me/avatar'],
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
