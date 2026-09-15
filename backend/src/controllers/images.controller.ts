import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response } from 'express';
import { ClientSession, ObjectId } from 'mongodb';
import { startSession } from 'mongoose';
import sharp from 'sharp';

import { ApiPaginatedResponse, ApiResponse } from '../models/api-response.model';
import { ArticleModel } from '../models/article.model';
import { Id } from '../models/core.model';
import {
  CombinedImage,
  Image,
  ImageModel,
  imagesSortingConfig,
} from '../models/image.model';
import { findEditor } from '../services/member-accounts.service';
import { imagesBucket, r2Client } from '../services/storage.service';
import { isDefined } from '../util/is-defined.util';
import { Editor, creditEditor } from '../util/modification-info.util';
import { buildPaginationQuery, parsePaginationParams } from '../util/pagination.util';

const URL_EXPIRY_SECONDS = 12 * 3600;

// Browsers cache responses containing presigned URLs for half the URL lifetime.
// This guarantees any cached response still has at least URL_EXPIRY_SECONDS / 2
// of validity remaining when served from cache.
const IMAGE_CACHE_MAX_AGE_SECONDS = URL_EXPIRY_SECONDS / 2;

async function withTransactionTimeout<T>(
  operation: (session: ClientSession) => Promise<T>,
  onTimeout?: () => void,
  timeoutMs: number = 120000, // 2 minutes
): Promise<T> {
  const session: ClientSession = await startSession();
  session.startTransaction({
    maxCommitTimeMS: timeoutMs,
  });

  let timedOut = false;
  let cleanedUp = false;

  const cleanup = async () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;

    try {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
    } catch (err) {
      console.error('Error aborting transaction:', err);
    } finally {
      session.endSession();
    }
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(async () => {
      timedOut = true;
      await cleanup();
      if (onTimeout) {
        onTimeout();
      }
      reject(new Error('LCC_TRANSACTION_TIMEOUT'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([operation(session), timeoutPromise]);

    if (timedOut) {
      throw new Error('LCC_TRANSACTION_TIMEOUT');
    }

    await session.commitTransaction();
    session.endSession();

    return result;
  } catch (error) {
    if (!cleanedUp) {
      await cleanup();
    }

    throw error;
  }
}

export async function getAllImagesMetadata(
  _req: Request,
  res: Response<ApiResponse<Image[]>>,
): Promise<void> {
  try {
    const mongoDBImages = await ImageModel.find().lean();

    const data: Image[] = mongoDBImages.map(mongoDBImage => {
      const { _id, ...image } = mongoDBImage;
      return { ...image, id: _id.toString() };
    });

    res.status(200).json({ data });
  } catch (error) {
    res.status(500).json({
      message: `[IM-1.1] Unable to retrieve image metadata: ${error}`,
    });
  }
}

export async function getThumbnailImages(
  req: Request,
  res: Response<ApiPaginatedResponse<CombinedImage>>,
): Promise<void> {
  try {
    const query = buildPaginationQuery<Image>(
      parsePaginationParams(req),
      imagesSortingConfig,
    );

    const [findResults, filteredCount] = await Promise.all([
      query.limit !== undefined
        ? ImageModel.find(query.filter)
            .sort(query.sort)
            .skip(query.skip)
            .limit(query.limit)
            .lean()
        : ImageModel.find(query.filter).sort(query.sort).skip(query.skip).lean(),
      ImageModel.countDocuments(query.filter),
    ]);

    const totalCount = await ImageModel.countDocuments({});

    const resultIds = findResults.map(r => r._id.toString());
    const articleCounts = await ArticleModel.aggregate<{ _id: string; count: number }>([
      { $match: { bannerImageId: { $in: resultIds } } },
      { $group: { _id: '$bannerImageId', count: { $sum: 1 } } },
    ]);
    const articleCountMap = new Map(articleCounts.map(a => [a._id, a.count]));

    // Process images in parallel to get combined data
    const imagePromises = findResults.map(async result => {
      const id = result._id.toString();
      try {
        const { _id, ...doc } = result;
        return await _getCombinedImage(id, 'thumbnail', {
          doc,
          articleAppearances: articleCountMap.get(id) ?? 0,
        });
      } catch (err) {
        console.warn(`[IM-2.1] Unable to retrieve metadata for image ${id}: ${err}`);
        return null;
      }
    });

    const combinedImages: CombinedImage[] = (await Promise.all(imagePromises)).filter(
      isDefined,
    );

    const failedCount = findResults.length - combinedImages.length;
    res.setHeader('Cache-Control', `private, max-age=${IMAGE_CACHE_MAX_AGE_SECONDS}`);
    res.status(200).json({
      data: {
        items: combinedImages,
        filteredCount,
        totalCount,
      },
      ...(failedCount > 0 && {
        message: `[IM-2.2] ${failedCount} image(s) failed to load`,
      }),
    });
  } catch (error) {
    if (error instanceof S3ServiceException) {
      res.status(error.$metadata?.httpStatusCode ?? 500).json({
        message: `[IM-2.3] Unable to retrieve thumbnail images object data from storage bucket: ${error?.message}`,
      });
    } else {
      res.status(500).json({
        message: `[IM-2.4] Unable to retrieve thumbnail images due to an unknown error: ${error}`,
      });
    }
  }
}

export async function getBatchThumbnailImages(
  req: Request,
  res: Response<ApiResponse<CombinedImage[]>>,
): Promise<void> {
  try {
    const { ids } = req.query;

    // Parse the comma-separated list of IDs from the query string
    const imageIds = ids ? String(ids).split(',') : [];

    if (!imageIds.length) {
      res.status(400).json({
        message:
          '[IM-3.1] Invalid request: ids parameter must be a non-empty comma-separated list',
      });
      return;
    }

    const MAX_BATCH_SIZE = 100;
    if (imageIds.length > MAX_BATCH_SIZE) {
      res.status(400).json({
        message: `[IM-3.2] Batch size ${imageIds.length} exceeds maximum of ${MAX_BATCH_SIZE}`,
      });
      return;
    }

    const invalidIds = imageIds.filter(id => !ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      res.status(400).json({
        message: `[IM-3.3] Invalid image ID(s): ${invalidIds.join(', ')}`,
      });
      return;
    }

    const [mongoResults, articleCounts] = await Promise.all([
      ImageModel.find({ _id: { $in: imageIds.map(id => new ObjectId(id)) } }).lean(),
      ArticleModel.aggregate<{ _id: string; count: number }>([
        { $match: { bannerImageId: { $in: imageIds } } },
        { $group: { _id: '$bannerImageId', count: { $sum: 1 } } },
      ]),
    ]);
    const docMap = new Map(mongoResults.map(r => [r._id.toString(), r]));
    const articleCountMap = new Map(articleCounts.map(a => [a._id, a.count]));

    // Process images in parallel for better performance
    const imagePromises = imageIds.map(async id => {
      try {
        const mongoResult = docMap.get(id);
        if (!mongoResult) {
          console.warn(`[IM-3.4] Image ${id} not found in database`);
          return null;
        }
        const { _id, ...doc } = mongoResult;
        return await _getCombinedImage(id, 'thumbnail', {
          doc,
          articleAppearances: articleCountMap.get(id) ?? 0,
        });
      } catch (err) {
        console.warn(`[IM-3.5] Failed to get image with ID ${id}: ${err}`);
        return null;
      }
    });

    const combinedImages = (await Promise.all(imagePromises)).filter(isDefined);

    if (combinedImages.length === 0) {
      res.status(404).json({
        message: '[IM-3.6] None of the requested images could be found',
      });
      return;
    }

    res.setHeader('Cache-Control', `private, max-age=${IMAGE_CACHE_MAX_AGE_SECONDS}`);
    res.status(200).json({ data: combinedImages });
  } catch (error) {
    if (error instanceof S3ServiceException) {
      res.status(error.$metadata?.httpStatusCode ?? 500).json({
        message: `[IM-3.7] Unable to retrieve batch image data from storage bucket: ${error?.message}`,
      });
    } else {
      res.status(500).json({
        message: `[IM-3.8] Unable to retrieve batch images due to an error: ${error}`,
      });
    }
  }
}

export async function getMainImage(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<CombinedImage>>,
): Promise<void> {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: `[IM-4.0] Invalid image ID: ${id}` });
      return;
    }

    const combinedImage = await _getCombinedImage(id, 'main');

    if (!combinedImage) {
      res.status(404).json({
        message: `[IM-4.1] Image with ID ${id} not found`,
      });
      return;
    }

    res.setHeader('Cache-Control', `private, max-age=${IMAGE_CACHE_MAX_AGE_SECONDS}`);
    res.status(200).json({ data: combinedImage });
  } catch (error) {
    if (error instanceof S3ServiceException) {
      res.status(error.$metadata?.httpStatusCode ?? 500).json({
        message: `[IM-4.2] Unable to retrieve image object data from storage bucket: ${error?.message}`,
      });
    } else {
      res.status(500).json({
        message: '[IM-4.3] Unable to retrieve image due to an unknown error',
      });
    }
  }
}

export async function addImages(
  req: Request,
  res: Response<ApiResponse<CombinedImage[]>>,
): Promise<void> {
  try {
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] })['files'];
    const imageMetadata = req.body.imageMetadata as string | string[];

    const parsedImageMetadataArray = (
      Array.isArray(imageMetadata) ? imageMetadata : [imageMetadata]
    ).map(metadata => JSON.parse(metadata)) as Image[];

    if (!files?.length) {
      res.status(400).json({ message: '[IM-5.1] No files provided' });
      return;
    }

    if (parsedImageMetadataArray.length !== files.length) {
      res.status(400).json({ message: '[IM-5.2] Image metadata mismatch' });
      return;
    }

    const editor = await findEditor(req.user.id);
    const combinedImages = await withTransactionTimeout(async session => {
      return await _processNewImages(files, parsedImageMetadataArray, editor, session);
    });

    res.status(201).json({ data: combinedImages });
  } catch (error) {
    if (error instanceof Error && error.message === 'LCC_TRANSACTION_TIMEOUT') {
      res.status(504).json({
        message: '[IM-5.4] Operation timed out. Please try again with fewer images.',
      });
      return;
    }

    if (error instanceof Error && error.message.includes('ExceededTimeLimit')) {
      res.status(504).json({
        message:
          '[IM-5.5] Database operation timed out. Please try again with fewer images.',
      });
      return;
    }

    res.status(500).json({ message: `[IM-5.3] Unknown error: ${error}` });
  }
}

export async function updateImages(
  req: Request,
  res: Response<ApiResponse<{ newImages: CombinedImage[]; updatedImages: Image[] }>>,
): Promise<void> {
  try {
    const files =
      (req.files as { [fieldname: string]: Express.Multer.File[] })?.['files'] || [];

    let existingImages: Image[] = [];
    if (req.body.existingImages) {
      try {
        const parsed = JSON.parse(req.body.existingImages);
        existingImages = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        res.status(400).json({ message: '[IM-6.0] Invalid existingImages format' });
        return;
      }
    }

    const imageMetadata = req.body.imageMetadata as string | string[] | undefined;
    const editor = await findEditor(req.user.id);

    const { newImages, updatedImages } = await withTransactionTimeout(async session => {
      const updatedImages: Image[] = [];
      for (const image of existingImages) {
        const result = await ImageModel.updateOne(
          { _id: new ObjectId(image.id) },
          { $set: prepareImageForDB(image, editor, false) },
          { session },
        );

        if (result.matchedCount > 0) {
          updatedImages.push(image);
        }
      }

      let newImages: CombinedImage[] = [];
      if (files.length > 0 && imageMetadata) {
        const parsedImageMetadata = (
          Array.isArray(imageMetadata) ? imageMetadata : [imageMetadata]
        ).map(metadata => JSON.parse(metadata)) as Image[];

        if (parsedImageMetadata.length !== files.length) {
          throw new Error('[IM-6.1] Image metadata mismatch');
        }

        newImages = await _processNewImages(files, parsedImageMetadata, editor, session);
      }

      return { newImages, updatedImages };
    });

    res.status(200).json({ data: { newImages, updatedImages } });
  } catch (error) {
    if (error instanceof Error && error.message === 'LCC_TRANSACTION_TIMEOUT') {
      res.status(504).json({
        message: '[IM-6.3] Operation timed out. Please try again with fewer images.',
      });
      return;
    }

    if (error instanceof Error && error.message.includes('ExceededTimeLimit')) {
      res.status(504).json({
        message:
          '[IM-6.4] Database operation timed out. Please try again with fewer images.',
      });
      return;
    }

    if (error instanceof Error && error.message === '[IM-6.1] Image metadata mismatch') {
      res.status(400).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: `[IM-6.2] Unknown error: ${error}` });
  }
}

export async function deleteImage(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<Id>>,
): Promise<void> {
  try {
    const { id } = req.params;
    const mainCommand = new DeleteObjectCommand({
      Bucket: imagesBucket(),
      Key: id,
    });
    const mainResponse = await r2Client().send(mainCommand);

    const thumbnailCommand = new DeleteObjectCommand({
      Bucket: imagesBucket(),
      Key: `${id}-thumb`,
    });
    const thumbnailResponse = await r2Client().send(thumbnailCommand);

    // Status 204 (no content) response means that the resource was either successfully
    // deleted or that it could not be found; assume that it succeeded
    if (
      mainResponse.$metadata.httpStatusCode === 204 &&
      thumbnailResponse.$metadata.httpStatusCode === 204
    ) {
      const result = await ImageModel.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        res.status(404).json({
          message: `[IM-7.1] Image object deleted, but unable to delete additional image data from database because image [${id}] could not be found.`,
        });
        return;
      }

      res.status(200).json({ data: id });
      return;
    }

    res
      .status(500)
      .json({ message: '[IM-7.2] Unable to delete image from storage bucket' });
  } catch (error) {
    res.status(500).json({ message: `[IM-7.3] Unknown error: ${error}` });
  }
}

export async function deleteAlbum(
  req: Request<{ album: string }>,
  res: Response<ApiResponse<Id[]>>,
): Promise<void> {
  try {
    const { album } = req.params;
    const images = await ImageModel.find({ album }).lean();

    if (!images.length) {
      res.status(404).json({
        message: `[IM-8.1] No images found in ${album}`,
      });
      return;
    }

    for (const image of images) {
      const articleAppearances = await ArticleModel.countDocuments({
        bannerImageId: image._id.toString(),
      });

      if (articleAppearances > 0) {
        res.status(400).json({
          message: `[IM-8.2] Cannot delete ${album} because it contains images that are used in articles`,
        });
        return;
      }
    }

    const deletedImageIds: string[] = [];
    const errors: string[] = [];

    await Promise.all(
      images.map(async image => {
        const id = image._id.toString();
        try {
          await Promise.all([
            r2Client().send(new DeleteObjectCommand({ Bucket: imagesBucket(), Key: id })),
            r2Client().send(
              new DeleteObjectCommand({ Bucket: imagesBucket(), Key: `${id}-thumb` }),
            ),
          ]);

          const result = await ImageModel.deleteOne({ _id: new ObjectId(id) });

          if (result.deletedCount > 0) {
            deletedImageIds.push(id);
          } else {
            errors.push(`[IM-8.3] Failed to delete image ${id} from database`);
          }
        } catch (error) {
          errors.push(`[IM-8.4] Failed to delete image ${id}: ${error}`);
        }
      }),
    );

    if (errors.length > 0) {
      console.error(`[IM-8.5] Errors while deleting album '${album}':`, errors);
    }

    if (deletedImageIds.length === 0) {
      res.status(500).json({
        message: `[IM-8.6] Failed to delete any images from ${album}`,
      });
      return;
    }

    res.status(200).json({
      data: deletedImageIds,
      message:
        errors.length > 0
          ? `[IM-8.7] Deleted ${deletedImageIds.length} out of ${images.length} images from ${album} with some errors`
          : `Successfully deleted all ${deletedImageIds.length} images from ${album}`,
    });
  } catch (error) {
    res.status(500).json({
      message: `[IM-8.8] Error deleting album: ${error}`,
    });
  }
}

async function _getCombinedImage(
  id: Id,
  imageSize: 'main' | 'thumbnail',
  preloaded?: { doc: Omit<Image, 'id'>; articleAppearances: number },
): Promise<CombinedImage | null> {
  try {
    const s3Key = imageSize === 'thumbnail' ? `${id}-thumb` : id;

    const getCommand = new GetObjectCommand({
      Bucket: imagesBucket(),
      Key: s3Key,
    });
    const signedUrl = await getSignedUrl(r2Client(), getCommand, {
      expiresIn: URL_EXPIRY_SECONDS,
    });

    let imageMetadata: Omit<Image, 'id'>;
    let articleAppearances: number;

    if (preloaded) {
      imageMetadata = preloaded.doc;
      articleAppearances = preloaded.articleAppearances;
    } else {
      const mongoResponse = await ImageModel.findById(id).lean();

      if (!mongoResponse) {
        console.error(`[IM-9.2] Image database record [${id}] not found`);
        return null;
      }

      const { _id, ...rest } = mongoResponse;
      imageMetadata = rest;
      articleAppearances = await ArticleModel.countDocuments({ bannerImageId: id });
    }

    const combinedImage: CombinedImage = {
      ...imageMetadata,
      id,
      urlExpirationDate: new Date(
        new Date().getTime() + URL_EXPIRY_SECONDS * 1000,
      ).toISOString(),
      mainUrl: imageSize === 'main' ? signedUrl : undefined,
      thumbnailUrl: imageSize === 'thumbnail' ? signedUrl : undefined,
      articleAppearances,
    };

    return combinedImage;
  } catch (error) {
    console.error(`[IM-9.3] Error getting image for ${id}: ${error}`);
    return null;
  }
}

async function _processNewImages(
  files: Express.Multer.File[],
  metadataArray: Image[],
  editor: Editor,
  session: ClientSession,
): Promise<CombinedImage[]> {
  const processedBuffers = await Promise.all(
    files.map(async (file, i) => {
      const [mainBuffer, thumbnailBuffer] = await Promise.all([
        sharp(file.buffer, { animated: file.mimetype === 'image/gif' })
          .resize({ height: 1800, width: 1800, fit: 'inside', withoutEnlargement: true })
          .toBuffer(),
        sharp(file.buffer, { animated: file.mimetype === 'image/gif' })
          .resize({ height: 320, width: 320, fit: 'inside', withoutEnlargement: true })
          .toBuffer(),
      ]);

      const [mainMetadata, thumbnailMetadata] = await Promise.all([
        sharp(mainBuffer).metadata(),
        sharp(thumbnailBuffer).metadata(),
      ]);

      const mongoDBImage = prepareImageForDB(
        metadataArray[i],
        editor,
        true,
        mainMetadata,
        thumbnailMetadata,
      );

      return {
        file,
        i,
        mainBuffer,
        thumbnailBuffer,
        mongoDBImage,
      };
    }),
  );

  const documentsToInsert = processedBuffers.map(p => p.mongoDBImage);
  const insertResult = await ImageModel.insertMany(documentsToInsert, { session });

  const savedImages = processedBuffers.map((processed, i) => ({
    id: insertResult[i]._id.toString(),
    mainBuffer: processed.mainBuffer,
    thumbnailBuffer: processed.thumbnailBuffer,
    mongoDBImage: processed.mongoDBImage,
    mimetype: processed.file.mimetype,
  }));

  await Promise.all(
    savedImages.map(async saved => {
      const [mainResponse, thumbnailResponse] = await Promise.all([
        r2Client().send(
          new PutObjectCommand({
            Bucket: imagesBucket(),
            Body: saved.mainBuffer,
            Key: saved.id,
            ContentType: saved.mimetype,
          }),
        ),
        r2Client().send(
          new PutObjectCommand({
            Bucket: imagesBucket(),
            Body: saved.thumbnailBuffer,
            Key: `${saved.id}-thumb`,
            ContentType: saved.mimetype,
          }),
        ),
      ]);

      if (
        mainResponse.$metadata.httpStatusCode !== 200 ||
        thumbnailResponse.$metadata.httpStatusCode !== 200
      ) {
        throw new Error(`[IM-10.1] Unable to upload image to storage bucket`);
      }
    }),
  );

  const combinedImages = await Promise.all(
    savedImages.map(async saved => {
      const [mainUrl, thumbnailUrl] = await Promise.all([
        getSignedUrl(
          r2Client(),
          new GetObjectCommand({ Bucket: imagesBucket(), Key: saved.id }),
          { expiresIn: URL_EXPIRY_SECONDS },
        ),
        getSignedUrl(
          r2Client(),
          new GetObjectCommand({ Bucket: imagesBucket(), Key: `${saved.id}-thumb` }),
          { expiresIn: URL_EXPIRY_SECONDS },
        ),
      ]);

      return {
        ...saved.mongoDBImage,
        id: saved.id,
        urlExpirationDate: new Date(
          new Date().getTime() + URL_EXPIRY_SECONDS * 1000,
        ).toISOString(),
        mainUrl,
        thumbnailUrl,
        articleAppearances: 0,
      } as CombinedImage;
    }),
  );

  return combinedImages;
}

// Remove all S3-specific properties and order remaining properties alphabetically
function prepareImageForDB(
  image: Image,
  editor: Editor,
  isNew: boolean,
  mainMetadata?: sharp.Metadata,
  thumbnailMetadata?: sharp.Metadata,
): Omit<Image, 'id'> {
  return {
    album: image.album,
    albumCover: image.albumCover,
    albumOrdinality: image.albumOrdinality,
    caption: image.caption,
    filename: image.filename,
    mainFileSize: mainMetadata?.size,
    mainHeight: mainMetadata?.height,
    mainWidth: mainMetadata?.width,
    modificationInfo: creditEditor(image.modificationInfo, editor, isNew),
    thumbnailFileSize: thumbnailMetadata?.size,
    thumbnailHeight: thumbnailMetadata?.height,
    thumbnailWidth: thumbnailMetadata?.width,
  };
}
