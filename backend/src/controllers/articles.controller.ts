import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';

import { ApiPaginatedResponse, ApiResponse } from '../models/api-response.model';
import {
  Article,
  ArticleModel,
  articleSortingConfig,
  articleTypes,
} from '../models/article.model';
import { Id } from '../models/core.model';
import { modificationInfoTypes } from '../models/modification-info.model';
import { isCollectionId } from '../util/is-collection-id.util';
import { buildPaginationQuery, parsePaginationParams } from '../util/pagination.util';
import { validateObjectByTypes } from '../util/validate-object-by-types.util';

export async function getArticles(
  req: Request,
  res: Response<ApiPaginatedResponse<Article>>,
): Promise<void> {
  try {
    const query = buildPaginationQuery<Article>(
      parsePaginationParams(req),
      articleSortingConfig,
    );

    const [queryResults, countResults] = await Promise.all([
      query.limit !== undefined
        ? ArticleModel.find(query.filter)
            .sort(query.sort)
            .skip(query.skip)
            .limit(query.limit)
            .lean()
        : ArticleModel.find(query.filter).sort(query.sort).skip(query.skip).lean(),
      ArticleModel.countDocuments(query.filter),
    ]);

    const findResults = queryResults;
    const filteredCount = countResults;

    const totalCount = await ArticleModel.countDocuments({});

    const articles: Article[] = findResults.map(result => {
      const { _id, ...baseArticle } = result;
      return {
        ...baseArticle,
        id: result._id.toString(),
      };
    });

    res.status(200).json({
      data: {
        items: articles,
        filteredCount,
        totalCount,
      },
    });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function getArticle(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<Article>>,
): Promise<void> {
  try {
    const { id } = req.params;
    const findResult = isCollectionId(id) ? await ArticleModel.findById(id).lean() : null;

    if (!findResult) {
      res.status(404).json({ message: `Unable to find article [${id}]` });
      return;
    }

    const { _id, ...baseArticle } = findResult;
    const article: Article = { ...baseArticle, id };

    res.status(200).json({ data: article });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function addArticle(
  req: Request,
  res: Response<ApiResponse<Id>>,
): Promise<void> {
  try {
    const articleValidationResult = validateObjectByTypes(req.body, articleTypes);
    if (articleValidationResult !== 'valid') {
      res
        .status(400)
        .json({ message: `Invalid article: ${articleValidationResult.message}` });
      return;
    }

    const modInfoValidationResult = validateObjectByTypes(
      (req.body as Article).modificationInfo,
      modificationInfoTypes,
    );
    if (modInfoValidationResult !== 'valid') {
      res.status(400).json({
        message: `Invalid article modification info: ${modInfoValidationResult.message}`,
      });
      return;
    }

    const preparedArticle = prepareArticleForDB(req.body);
    const result = await ArticleModel.create(preparedArticle);

    res.status(201).json({ data: result._id.toString() });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function updateArticle(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<Id>>,
): Promise<void> {
  try {
    const { id } = req.params;

    const articleValidationResult = validateObjectByTypes(req.body, articleTypes);
    if (articleValidationResult !== 'valid') {
      res
        .status(400)
        .json({ message: `Invalid article: ${articleValidationResult.message}` });
      return;
    }

    const modInfoValidationResult = validateObjectByTypes(
      (req.body as Article).modificationInfo,
      modificationInfoTypes,
    );
    if (modInfoValidationResult !== 'valid') {
      res.status(400).json({
        message: `Invalid article modification info: ${modInfoValidationResult.message}`,
      });
      return;
    }

    const preparedArticle = prepareArticleForDB(req.body);
    const result = await ArticleModel.updateOne(
      { _id: new ObjectId(id) },
      { $set: preparedArticle },
    );

    if (result.matchedCount === 0 || result.modifiedCount === 0) {
      res.status(404).json({
        message: `Unable to update article [${id}] - article not found`,
      });
      return;
    }

    res.status(200).json({ data: id });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

export async function deleteArticle(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<Id>>,
): Promise<void> {
  try {
    const { id } = req.params;

    const result = await ArticleModel.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      res.status(404).json({
        message: `Unable to delete article [${id}] - article not found`,
      });
      return;
    }

    res.status(200).json({ data: id });
  } catch (error) {
    res.status(500).json({ message: `Unknown error: ${error}` });
  }
}

// Remove id property and order remaining properties alphabetically
function prepareArticleForDB(article: Article): Omit<Article, 'id'> {
  return {
    bannerImageId: article.bannerImageId,
    body: article.body,
    bookmarkDate: article.bookmarkDate,
    modificationInfo: {
      createdBy: article.modificationInfo.createdBy,
      dateCreated: article.modificationInfo.dateCreated,
      dateLastEdited: article.modificationInfo.dateLastEdited,
      lastEditedBy: article.modificationInfo.lastEditedBy,
    },
    title: article.title,
  };
}
