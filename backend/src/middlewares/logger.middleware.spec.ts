import express from 'express';
import request from 'supertest';

import { logger } from './logger.middleware';

describe('logger', () => {
  it('should log the method and URL of each request', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const app = express()
      .use(express.json())
      .use(logger)
      .post('/v1/events', (_req, res) => {
        res.sendStatus(204);
      });

    const response = await request(app)
      .post('/v1/events?page=2')
      .send({ title: 'Blitz' });

    expect(response.status).toBe(204);
    expect(info).toHaveBeenCalledWith('[LCC] POST request to /v1/events?page=2');
  });
});
