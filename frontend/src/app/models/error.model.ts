export interface LccError extends Error {
  name: 'LCCError';
  message: string;
  status?: number;
}
