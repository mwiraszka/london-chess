import { version } from '../../../../package.json';

// The root package.json carries the version of every release, even one that only
// changes the backend
export const RELEASE_VERSION = version;
