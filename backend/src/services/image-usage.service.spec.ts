import { ArticleModel } from '../models/article.model';
import { useTestDatabase } from '../testing/database';
import { MODIFICATION_INFO } from '../testing/fixtures';
import { articleAppearances } from './image-usage.service';

const BANNER = '64b7f0c2a1d3e4f5a6b7c8d1';
const IN_BODY = '64b7f0c2a1d3e4f5a6b7c8d2';
const UNUSED = '64b7f0c2a1d3e4f5a6b7c8d3';

async function createArticle(bannerImageId: string, body: string): Promise<void> {
  await ArticleModel.create({
    title: 'Club news',
    body,
    bannerImageId,
    bookmarkDate: null,
    modificationInfo: MODIFICATION_INFO,
  });
}

describe('articleAppearances', () => {
  useTestDatabase();

  it('should count each article showing an image as its banner or in its body', async () => {
    await createArticle(BANNER, `Round one.\n\n{{{${IN_BODY}}}}(((500)))<<<The hall>>>`);
    await createArticle(IN_BODY, `{{{${BANNER}}}}\n\n{{{${BANNER}}}}`);

    const counts = await articleAppearances([BANNER, IN_BODY, UNUSED]);

    expect(Object.fromEntries(counts)).toEqual({ [BANNER]: 2, [IN_BODY]: 2 });
  });

  it('should look nothing up for no images', async () => {
    const find = vi.spyOn(ArticleModel, 'find');

    const counts = await articleAppearances([]);

    expect(counts.size).toBe(0);
    expect(find).not.toHaveBeenCalled();
  });
});
