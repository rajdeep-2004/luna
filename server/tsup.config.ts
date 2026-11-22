import { defineConfig } from 'tsup';

// Bundle the shared workspace into the server build so `node dist/index.js` needs no TS at runtime.
export default defineConfig({ noExternal: ['@luna/shared'] });
