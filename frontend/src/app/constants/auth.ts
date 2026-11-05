import { AuthMode } from '@app/models';

export const AUTH_DRAWER_BOTTOM_SHEET_MAX_WIDTH = 640;

export const VERIFICATION_CODE_LENGTH = 6;

// Opens the log-in drawer on one of its forms over the page an address names, as the drawer
// has no page of its own: ?auth=login or ?auth=create-account
export const AUTH_QUERY_PARAM = 'auth';

export const LINKABLE_AUTH_MODES: AuthMode[] = ['login', 'create-account'];
