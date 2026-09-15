import { app } from './app';

// Local entry point. On Vercel the app is served by api/index.ts instead.
const { PORT } = process.env;
if (!PORT) {
  throw new Error('Unable to parse server port from environment variables.');
}

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
