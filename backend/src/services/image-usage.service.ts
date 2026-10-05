import { ArticleModel } from '../models/article.model';
import { Id } from '../models/core.model';

const BODY_IMAGE = /{{{([^}]+)}}}/g;

// How many articles show each image, as their banner or within their body; an image
// no article shows is left out
export async function articleAppearances(imageIds: Id[]): Promise<Map<Id, number>> {
  const counts = new Map<Id, number>();
  if (!imageIds.length) {
    return counts;
  }

  const wanted = new Set(imageIds);
  const articles = await ArticleModel.find(
    {
      $or: [
        { bannerImageId: { $in: imageIds } },
        { body: { $regex: imageIds.map(id => `\\{\\{\\{${id}\\}\\}\\}`).join('|') } },
      ],
    },
    { bannerImageId: 1, body: 1 },
  ).lean();

  for (const { bannerImageId, body } of articles) {
    const shown = new Set([
      bannerImageId,
      ...Array.from(body.matchAll(BODY_IMAGE), ([, id]) => id),
    ]);
    for (const id of shown) {
      if (wanted.has(id)) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return counts;
}
