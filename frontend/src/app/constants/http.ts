import { HttpContextToken } from '@angular/common/http';

export const REQUEST_TIMEOUT_MS = 30_000;

// Each upload carries a whole image, which can take a while on a slow connection
export const UPLOAD_TIMEOUT_MS = 120_000;

export const REQUEST_TIMEOUT = new HttpContextToken(() => REQUEST_TIMEOUT_MS);

export const REQUEST_TIMEOUT_MESSAGE = 'The request took too long. Please try again.';
