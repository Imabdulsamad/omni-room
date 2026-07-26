import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Compatibility shim for @vitejs/plugin-react 4.x on Vite 8.
 *
 * Vite 8 bundles Rolldown, and plugin-react takes a Rolldown-specific branch
 * that sets `optimizeDeps.rollupOptions.jsx = { mode: "automatic" }`
 * (plugin-react 4.7.0, dist/index.js:133). That key was valid in the Rolldown
 * beta the plugin was built against, but current Rolldown moved JSX handling to
 * `oxc.jsx` and rejects `jsx` as an input option:
 *
 *   Warning: Invalid input options (1 issue found)
 *   - For the "jsx". Invalid key: Expected never but received "jsx".
 *
 * The warning is harmless — Vite's own oxc transform already compiles JSX with
 * the automatic runtime — but it fires on every dep-optimizer run. plugin-react
 * 4.7.0 declares peer support for vite ^4.2 || ^5 || ^6 || ^7, so Vite 8 is
 * genuinely outside its supported range.
 *
 * Delete this shim once @vitejs/plugin-react is upgraded to a release whose
 * peerDependencies include vite ^8.
 */
function stripLegacyJsxDepOption() {
  return {
    name: "local:strip-legacy-jsx-dep-option",
    enforce: "post",
    configResolved(config) {
      const depOptions = config.optimizeDeps?.rollupOptions;
      if (depOptions && "jsx" in depOptions) delete depOptions.jsx;
    },
  };
}

export default defineConfig({
  plugins: [react(), stripLegacyJsxDepOption()],
  server: { port: 5173, open: true },
});
