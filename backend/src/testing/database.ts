import mongoose from 'mongoose';

import { connectToDatabase } from '../services/mongo-db.service';

export function useTestDatabase(): void {
  beforeAll(async () => {
    await connectToDatabase();
    await Promise.all(mongoose.modelNames().map(name => mongoose.model(name).init()));
  });

  afterEach(async () => {
    await Promise.all(
      Object.values(mongoose.connection.collections).map(collection =>
        collection.deleteMany({}),
      ),
    );
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
}
