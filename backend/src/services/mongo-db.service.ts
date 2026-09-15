import mongoose from 'mongoose';

const { MONGODB_URI, MONGODB_DATABASE, NODE_ENVIRONMENT } = process.env;
if (!MONGODB_URI || !MONGODB_DATABASE) {
  throw new Error('Unable to parse MongoDB environment variables.');
}

// In a serverless environment each request may run in a fresh module scope but a
// warm instance reuses the same global, so cache the connection there to avoid
// opening a new pool on every invocation (which would exhaust Atlas connections).
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

const cache: MongooseCache = (globalForMongoose._mongooseCache ??= {
  conn: null,
  promise: null,
});

let listenersBound = false;

const bindConnectionListeners = (): void => {
  if (listenersBound) {
    return;
  }
  listenersBound = true;

  mongoose.connection.on('connected', () => {
    const envLabel = NODE_ENVIRONMENT === 'dev-offline' ? 'local MongoDB' : 'MongoDB';
    console.log(`Connected to ${envLabel} (database: ${MONGODB_DATABASE}).`);
  });

  mongoose.connection.on('error', error => {
    console.error(`MongoDB connection error: ${error}`);
    if (NODE_ENVIRONMENT === 'dev-offline') {
      console.error(
        'Hint: Make sure MongoDB is running locally. Install with: brew install mongodb-community && brew services start mongodb-community',
      );
    }
  });

  mongoose.connection.on('disconnected', () => {
    console.log('Disconnected from MongoDB.');
  });
};

export const connectToDatabase = async (): Promise<typeof mongoose> => {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    bindConnectionListeners();

    cache.promise = mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DATABASE,
      serverSelectionTimeoutMS: NODE_ENVIRONMENT === 'dev-offline' ? 5000 : 10000,
      socketTimeoutMS: NODE_ENVIRONMENT === 'dev-offline' ? 30000 : 45000,
      maxPoolSize: 10,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Reset so the next request retries instead of reusing a rejected promise.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
};
