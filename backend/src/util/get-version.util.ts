import pkg from '../../package.json';

// Imported (and inlined by the bundler) rather than read from disk at runtime so
// it resolves correctly inside a bundled serverless function.
export function getVersion(): string {
  return pkg.version;
}
