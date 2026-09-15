// Vercel serverless entry point. An Express app is itself a (req, res) request
// handler, so it can be exported directly as the function handler. The vercel.json
// rewrite routes every path to this function and Express does the routing.
export { app as default } from '../src/app';
