// Matches the 24 hex characters of a MongoDB ObjectId string
export function isCollectionId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}
