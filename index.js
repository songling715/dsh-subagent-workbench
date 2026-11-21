/**
 * Compatibility entry for the DSH Loader.
 *
 * The published entry lives at `lib/index.js` (`package.json#main`). The
 * Loader's enable/disable restart caches the module import specifier captured
 * when the bundle row was first mounted, which can still be the package root;
 * this shim forwards the same Host exports so both resolutions work.
 */
export { apply, inject, name } from './lib/index.js'
