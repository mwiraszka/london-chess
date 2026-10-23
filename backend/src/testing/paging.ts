import { Types } from 'mongoose';
import request from 'supertest';

import { app } from '../app';

// Ids in ascending order, for records that tie on every field a list sorts by
export const TIED_IDS = [1, 2, 3].map(
  index => new Types.ObjectId(index.toString(16).padStart(24, '0')),
);

// Matches neither order of the ids, so the order records were saved in cannot pass for
// the tiebreak
export const INSERTION_ORDER = [TIED_IDS[1], TIED_IDS[2], TIED_IDS[0]];

// The ids a paged list gives, read two to a page until it has given every match
export async function idsPageByPage(path: string): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const response = await request(app).get(`${path}&page=${page}&pageSize=2`);
    const { items, filteredCount } = response.body.data;
    ids.push(...items.map(({ id }: { id: string }) => id));
    if (!items.length || ids.length >= filteredCount) {
      return ids;
    }
  }
}
