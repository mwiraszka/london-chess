import mongoose from 'mongoose';

const { MONGODB_URI, MONGODB_DATABASE } = process.env;
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
    console.log(`Connected to MongoDB (database: ${MONGODB_DATABASE}).`);
  });

  mongoose.connection.on('error', error => {
    console.error(`MongoDB connection error: ${error}`);
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
      // Inside Vercel's 30 s function limit, so a stalled database answers with an error
      // before the platform cuts the request off
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
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
