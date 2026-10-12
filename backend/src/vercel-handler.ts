// Vercel's function entry, bundled into api/index.js before each deploy. An Express app is
// itself a (req, res) request handler, and the vercel.json rewrite routes every path here
export { app as default } from './app';
