/**
 * `roughjs` ships types for `bundled/rough.d.ts` but the runtime file next to
 * it is `rough.esm.js`, so TypeScript never pairs them up and the import lands
 * as `any`.
 *
 * The bundled entry is the one worth importing: `roughjs/bin/generator` uses
 * extensionless relative imports, which Vite resolves but Node does not, and
 * Astro hands node_modules ESM straight to Node during the build. So the value
 * comes from the bundled file and the types come from `bin/`, which is a
 * type-only import and therefore erased before anything has to resolve it.
 */
declare module 'roughjs/bundled/rough.esm.js' {
  import type { RoughGenerator } from 'roughjs/bin/generator';
  import type { Config } from 'roughjs/bin/core';

  const rough: {
    generator(config?: Config): RoughGenerator;
    newSeed(): number;
  };

  export default rough;
}
