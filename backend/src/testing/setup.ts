import { randomUUID } from 'node:crypto';
import { inject } from 'vitest';

// Read when the database service loads, so they are set before any spec imports it.
// Each spec file gets its own database, so files running in parallel never share data
process.env['MONGODB_URI'] = inject('mongoUri');
process.env['MONGODB_DATABASE'] = `lcc-test-${randomUUID()}`;
