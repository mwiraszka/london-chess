import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response } from 'express';
import type { ClientSession } from 'mongoose';
import { Types, startSession } from 'mongoose';
import sharp from 'sharp';

import { ApiPaginatedResponse, ApiResponse } from '../models/api-response.model';
import { Id } from '../models/core.model';
import {
  CombinedImage,
  Image,
  ImageModel,
  imagesSortingConfig,
} from '../models/image.model';
import { ModificationInfo } from '../models/modification-info.model';
import { articleAppearances } from '../services/image-usage.service';
import { findEditor } from '../services/member-accounts.service';
import { imagesBucket, r2Client } from '../services/storage.service';
import { isCollectionId } from '../util/is-collection-id.util';
import { isDefined } from '../util/is-defined.util';
import { creditEditor } from '../util/modification-info.util';
import {
  buildPaginationQuery,
  findPage,
  parsePaginationParams,
} from '../util/pagination.util';

const URL_EXPIRY_SECONDS = 12 * 3600;

// Browsers cache responses containing presigned URLs for half the URL lifetime.
// This guarantees any cached response still has at least URL_EXPIRY_SECONDS / 2
// of validity remaining when served from cache.
const IMAGE_CACHE_MAX_AGE_SECONDS = URL_EXPIRY_SECONDS / 2;

// Committed whole or not at all
async function inTransaction<T>(
  operation: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await startSession();
  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
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

    const {
      records: findResults,
      filteredCount,
      totalCount,
    } = await findPage(ImageModel, query);

    const articleCountMap = await articleAppearances(
      findResults.map(r => r._id.toString()),
    );

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
    res.status(500).json({
      message: `[IM-2.4] Unable to retrieve thumbnail images due to an unknown error: ${error}`,
    });
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

    const invalidIds = imageIds.filter(id => !isCollectionId(id));
    if (invalidIds.length > 0) {
      res.status(400).json({
        message: `[IM-3.3] Invalid image ID(s): ${invalidIds.join(', ')}`,
      });
      return;
    }

    const [mongoResults, articleCountMap] = await Promise.all([
      ImageModel.find({ _id: { $in: imageIds } }).lean(),
      articleAppearances(imageIds),
    ]);
    const docMap = new Map(mongoResults.map(r => [r._id.toString(), r]));

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
    res.status(500).json({
      message: `[IM-3.8] Unable to retrieve batch images due to an error: ${error}`,
    });
  }
}

export async function getMainImage(
  req: Request<{ id: string }>,
  res: Response<ApiResponse<CombinedImage>>,
): Promise<void> {
  try {
    const { id } = req.params;

    const combinedImage = isCollectionId(id) ? await _getCombinedImage(id, 'main') : null;

    if (!combinedImage) {
      res.status(404).json({
        message: `[IM-4.1] Image with ID ${id} not found`,
      });
      return;
    }

    res.setHeader('Cache-Control', `private, max-age=${IMAGE_CACHE_MAX_AGE_SECONDS}`);
    res.status(200).json({ data: combinedImage });
  } catch {
    res.status(500).json({
      message: '[IM-4.3] Unable to retrieve image due to an unknown error',
    });
  }
}

export async function addImages(
  req: Request,
  res: Response<ApiResponse<CombinedImage[]>>,
): Promise<void> {
  try {
    const files = (req.files as { [fieldname: string]: Express.Multer.File[] })['files'];
    const imageMetadata = req.body.imageMetadata as string | string[] | undefined;

    if (!files?.length || !imageMetadata) {
      res.status(400).json({ message: '[IM-5.1] No files provided' });
      return;
    }

    const parsedImageMetadataArray = parseImageMetadata(imageMetadata);

    if (parsedImageMetadataArray.length !== files.length) {
      res.status(400).json({ message: '[IM-5.2] Image metadata mismatch' });
      return;
    }

    const images = await prepareNewImages(
      files,
      parsedImageMetadataArray,
      creditEditor(await findEditor(req.user.id), null),
    );
    await storeNewImages(images);
    try {
      await inTransaction(session =>
        ImageModel.insertMany(
          images.map(({ document }) => document),
          { session },
        ),
      );
    } catch (error) {
      await deleteStoredImages(images.map(({ id }) => id));
      throw error;
    }

    res.status(201).json({ data: await toCombinedImages(images) });
  } catch (error) {
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

    const invalidIds = existingImages
      .map(({ id }) => id)
      .filter(id => !isCollectionId(id));
    if (invalidIds.length) {
      res
        .status(400)
        .json({ message: `[IM-6.5] Invalid image ID(s): ${invalidIds.join(', ')}` });
      return;
    }

    const imageMetadata = req.body.imageMetadata as string | string[] | undefined;
    const parsedImageMetadata =
      files.length && imageMetadata ? parseImageMetadata(imageMetadata) : [];
    if (parsedImageMetadata.length !== files.length) {
      res.status(400).json({ message: '[IM-6.1] Image metadata mismatch' });
      return;
    }

    const editor = await findEditor(req.user.id);
    const stored = new Map(
      (
        await ImageModel.find(
          { _id: { $in: existingImages.map(({ id }) => id) } },
          { modificationInfo: 1 },
        ).lean()
      ).map(({ _id, modificationInfo }) => [_id.toString(), modificationInfo]),
    );
    const newImages = await prepareNewImages(
      files,
      parsedImageMetadata,
      creditEditor(editor, null),
    );

    await storeNewImages(newImages);
    let updatedImages: Image[];
    try {
      updatedImages = await inTransaction(async session => {
        const updated: Image[] = [];
        for (const image of existingImages) {
          const original = stored.get(image.id);
          const result = original
            ? await ImageModel.updateOne(
                { _id: image.id },
                { $set: prepareImageForDB(image, creditEditor(editor, original)) },
                { session },
              )
            : null;
          if (result?.matchedCount) {
            updated.push(image);
          }
        }
        await ImageModel.insertMany(
          newImages.map(({ document }) => document),
          { session },
        );
        return updated;
      });
    } catch (error) {
      await deleteStoredImages(newImages.map(({ id }) => id));
      throw error;
    }

    res.status(200).json({
      data: { newImages: await toCombinedImages(newImages), updatedImages },
    });
  } catch (error) {
    res.status(500).json({ message: `[IM-6.2] Unknown error: ${error}` });
  }
}

export async function deleteImage(
  req: Request<{ id: Id }>,
  res: Response<ApiResponse<Id>>,
): Promise<void> {
  try {
    const { id } = req.params;

    if (!isCollectionId(id) || !(await ImageModel.exists({ _id: id }))) {
      res.status(404).json({
        message: `[IM-7.1] Unable to delete image [${id}] because it could not be found.`,
      });
      return;
    }

    if ((await articleAppearances([id])).has(id)) {
      res.status(400).json({
        message: '[IM-7.2] Cannot delete this image because it is used in articles',
      });
      return;
    }

    // The record goes first, so a failure leaves at worst unseen objects, never a
    // listed image with nothing to show
    await ImageModel.deleteOne({ _id: id });
    await deleteStoredImages([id]);

    res.status(200).json({ data: id });
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

    if ((await articleAppearances(images.map(({ _id }) => _id.toString()))).size) {
      res.status(400).json({
        message: `[IM-8.2] Cannot delete ${album} because it contains images that are used in articles`,
      });
      return;
    }

    const deletedImageIds: string[] = [];
    const errors: string[] = [];

    await Promise.all(
      images.map(async image => {
        const id = image._id.toString();
        try {
          const result = await ImageModel.deleteOne({ _id: id });

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

    await deleteStoredImages(deletedImageIds);

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
  const s3Key = imageSize === 'thumbnail' ? `${id}-thumb` : id;

  const getCommand = new GetObjectCommand({
    Bucket: imagesBucket(),
    Key: s3Key,
  });
  const signedUrl = await getSignedUrl(r2Client(), getCommand, {
    expiresIn: URL_EXPIRY_SECONDS,
  });

  let imageMetadata: Omit<Image, 'id'>;
  let appearances: number;

  if (preloaded) {
    imageMetadata = preloaded.doc;
    appearances = preloaded.articleAppearances;
  } else {
    const mongoResponse = await ImageModel.findById(id).lean();

    if (!mongoResponse) {
      console.error(`[IM-9.2] Image database record [${id}] not found`);
      return null;
    }

    const { _id, ...rest } = mongoResponse;
    imageMetadata = rest;
    appearances = (await articleAppearances([id])).get(id) ?? 0;
  }

  const combinedImage: CombinedImage = {
    ...imageMetadata,
    id,
    urlExpirationDate: new Date(
      new Date().getTime() + URL_EXPIRY_SECONDS * 1000,
    ).toISOString(),
    mainUrl: imageSize === 'main' ? signedUrl : undefined,
    thumbnailUrl: imageSize === 'thumbnail' ? signedUrl : undefined,
    articleAppearances: appearances,
  };

  return combinedImage;
}

interface NewImage {
  id: Id;
  document: Omit<Image, 'id'> & { _id: Types.ObjectId };
  main: Buffer;
  thumbnail: Buffer;
  mimetype: string;
}

function parseImageMetadata(imageMetadata: string | string[]): Image[] {
  return (Array.isArray(imageMetadata) ? imageMetadata : [imageMetadata]).map(
    metadata => JSON.parse(metadata) as Image,
  );
}

async function prepareNewImages(
  files: Express.Multer.File[],
  metadataArray: Image[],
  modificationInfo: ModificationInfo,
): Promise<NewImage[]> {
  return Promise.all(
    files.map(async (file, i) => {
      const [main, thumbnail] = await Promise.all(
        [1800, 320].map(size =>
          sharp(file.buffer, { animated: file.mimetype === 'image/gif' })
            .resize({
              height: size,
              width: size,
              fit: 'inside',
              withoutEnlargement: true,
            })
            .toBuffer(),
        ),
      );
      const [mainMetadata, thumbnailMetadata] = await Promise.all([
        sharp(main).metadata(),
        sharp(thumbnail).metadata(),
      ]);
      const _id = new Types.ObjectId();

      return {
        id: _id.toString(),
        document: {
          _id,
          ...prepareImageForDB(
            metadataArray[i],
            modificationInfo,
            mainMetadata,
            thumbnailMetadata,
          ),
        },
        main,
        thumbnail,
        mimetype: file.mimetype,
      };
    }),
  );
}

// Stores every image's main and thumbnail objects, or removes the ones it stored and
// rethrows the first failure
async function storeNewImages(images: NewImage[]): Promise<void> {
  const results = await Promise.allSettled(
    images.flatMap(({ id, main, thumbnail, mimetype }) =>
      [
        { Key: id, Body: main },
        { Key: `${id}-thumb`, Body: thumbnail },
      ].map(object =>
        r2Client().send(
          new PutObjectCommand({
            Bucket: imagesBucket(),
            ContentType: mimetype,
            ...object,
          }),
        ),
      ),
    ),
  );
  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );
  if (failure) {
    await deleteStoredImages(images.map(({ id }) => id));
    throw failure.reason;
  }
}

// Objects left behind take up space but show nothing, so a failure to remove them is
// logged for cleanup rather than failing a request that has otherwise done its work
async function deleteStoredImages(ids: Id[]): Promise<void> {
  const keys = ids.flatMap(id => [id, `${id}-thumb`]);
  const results = await Promise.allSettled(
    keys.map(Key =>
      r2Client().send(new DeleteObjectCommand({ Bucket: imagesBucket(), Key })),
    ),
  );
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(
        `[IM-10.1] Unable to delete stored object ${keys[i]}: ${result.reason}`,
      );
    }
  });
}

async function toCombinedImages(images: NewImage[]): Promise<CombinedImage[]> {
  return Promise.all(
    images.map(async ({ id, document }) => {
      const { _id, ...stored } = document;
      const [mainUrl, thumbnailUrl] = await Promise.all(
        [id, `${id}-thumb`].map(Key =>
          getSignedUrl(
            r2Client(),
            new GetObjectCommand({ Bucket: imagesBucket(), Key }),
            {
              expiresIn: URL_EXPIRY_SECONDS,
            },
          ),
        ),
      );

      return {
        ...stored,
        id,
        urlExpirationDate: new Date(
          new Date().getTime() + URL_EXPIRY_SECONDS * 1000,
        ).toISOString(),
        mainUrl,
        thumbnailUrl,
        articleAppearances: 0,
      };
    }),
  );
}

// Remove all S3-specific properties and order remaining properties alphabetically
function prepareImageForDB(
  image: Image,
  modificationInfo: ModificationInfo,
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
    modificationInfo,
    thumbnailFileSize: thumbnailMetadata?.size,
    thumbnailHeight: thumbnailMetadata?.height,
    thumbnailWidth: thumbnailMetadata?.width,
  };
}
