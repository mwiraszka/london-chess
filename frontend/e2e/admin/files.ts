// A 1x1 PNG, enough for the upload endpoints to accept as an image
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export interface UploadFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

export function png(name: string, padding = 0): UploadFile {
  return {
    name,
    mimeType: 'image/png',
    buffer: padding ? Buffer.concat([PIXEL_PNG, Buffer.alloc(padding)]) : PIXEL_PNG,
  };
}
