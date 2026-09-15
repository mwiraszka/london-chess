import { IsoDate } from './core.model';
import { LccError } from './error.model';

export interface CallState {
  status: 'idle' | 'loading' | 'background-loading' | 'error';
  loadStart: IsoDate | null;
  error: LccError | null;
}
