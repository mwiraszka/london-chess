import mongoose from 'mongoose';

// Settings are read when the service loads, and the connection and its listeners outlive
// it, so each test starts from a fresh copy with neither
async function loadService() {
  Reflect.deleteProperty(globalThis, '_mongooseCache');
  mongoose.connection.removeAllListeners();
  vi.resetModules();
  return import('./mongo-db.service.js');
}

describe('connectToDatabase', () => {
  afterAll(() => {
    Reflect.deleteProperty(globalThis, '_mongooseCache');
  });

  it('should refuse to load without MongoDB settings', async () => {
    vi.stubEnv('MONGODB_DATABASE', '');

    await expect(loadService()).rejects.toThrow(
      'Unable to parse MongoDB environment variables.',
    );
  });

  it('should connect once and reuse the connection', async () => {
    const connect = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
    const { connectToDatabase } = await loadService();

    const first = await connectToDatabase();
    const second = await connectToDatabase();

    expect(first).toBe(mongoose);
    expect(second).toBe(mongoose);
    expect(connect).toHaveBeenCalledOnce();
    expect(connect).toHaveBeenCalledWith(
      process.env['MONGODB_URI'],
      expect.objectContaining({ serverSelectionTimeoutMS: 10000, maxPoolSize: 10 }),
    );
  });

  it('should try again after a failed connection', async () => {
    const connect = vi
      .spyOn(mongoose, 'connect')
      .mockRejectedValueOnce(new Error('refused'))
      .mockResolvedValueOnce(mongoose);
    const { connectToDatabase } = await loadService();

    await expect(connectToDatabase()).rejects.toThrow('refused');
    const retried = await connectToDatabase();

    expect(retried).toBe(mongoose);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('should use shorter timeouts and hint at a local server in offline development', async () => {
    vi.stubEnv('NODE_ENVIRONMENT', 'dev-offline');
    const connect = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { connectToDatabase } = await loadService();

    await connectToDatabase();
    mongoose.connection.emit('connected');
    mongoose.connection.emit('error', new Error('refused'));
    mongoose.connection.emit('disconnected');

    expect(connect).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ serverSelectionTimeoutMS: 5000, socketTimeoutMS: 30000 }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringMatching(/^Connected to local MongoDB/),
    );
    expect(log).toHaveBeenCalledWith('Disconnected from MongoDB.');
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/^Hint: Make sure MongoDB/));
  });

  it('should log connection events without the offline hint otherwise', async () => {
    vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { connectToDatabase } = await loadService();

    await connectToDatabase();
    mongoose.connection.emit('connected');
    mongoose.connection.emit('error', new Error('refused'));

    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^Connected to MongoDB/));
    expect(error).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith('MongoDB connection error: Error: refused');
  });
});
