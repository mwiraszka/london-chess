import { expect, test } from '../fixtures';
import { ARTICLES, EVENTS } from '../seed';
import { png } from './files';
import { API, logIn, requireAdminCredentials } from './session';

test.describe('admin API', () => {
  test.beforeEach(requireAdminCredentials);

  test('saves an event sent back without changes', async ({ page, request }) => {
    const authorization = await logIn(page);
    const { data: event } = await (
      await request.get(`${API}/events/${EVENTS[4].id}`)
    ).json();

    for (const attempt of ['first', 'unchanged repeat']) {
      const response = await request.put(`${API}/events/${event.id}`, {
        headers: { authorization },
        data: event,
      });

      expect(response.status(), attempt).toBe(200);
    }
  });

  test('saves an article sent back without changes', async ({ page, request }) => {
    const authorization = await logIn(page);
    const { data: article } = await (
      await request.get(`${API}/articles/${ARTICLES[2].id}`)
    ).json();

    for (const attempt of ['first', 'unchanged repeat']) {
      const response = await request.put(`${API}/articles/${article.id}`, {
        headers: { authorization },
        data: article,
      });

      expect(response.status(), attempt).toBe(200);
    }
  });

  test('explains a missing event in the message of its 404', async ({
    page,
    request,
  }) => {
    const authorization = await logIn(page);
    const { data: event } = await (
      await request.get(`${API}/events/${EVENTS[4].id}`)
    ).json();
    const missingId = '000000000000000000000000';

    const response = await request.put(`${API}/events/${missingId}`, {
      headers: { authorization },
      data: { ...event, id: missingId },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.message).toBe(
      `Unable to update event [${missingId}] because it could not be found.`,
    );
    expect(body).not.toHaveProperty('data');
  });

  test('rejects an image upload without its metadata', async ({ page, request }) => {
    const authorization = await logIn(page);

    const response = await request.post(`${API}/images`, {
      headers: { authorization },
      multipart: {
        files: png('pixel.png'),
      },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).message).toBe('[IM-5.1] No files provided');
  });

  test('rejects an avatar over 5 MB with a clear message', async ({ page, request }) => {
    const authorization = await logIn(page);

    const response = await request.post(`${API}/users/me/avatar`, {
      headers: { authorization },
      multipart: {
        file: png('huge.png', 5 * 1024 * 1024),
        cropped: png('cropped.png'),
      },
    });

    expect(response.status()).toBe(400);
    expect((await response.json()).message).toBe('File must be under 5 MB.');
  });
});
