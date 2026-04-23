// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// Cloudflare is disabled -- using Netlify adapter instead.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import netlify from "@netlify/vite-plugin-tanstack-start";

const isNetlify = process.env.NETLIFY === "true";

export default defineConfig({
  cloudflare: false,
  // Keep Netlify adapter active in Netlify environment, but skip it locally
  // so local dev does not resolve root netlify.toml with a duplicated base path.
  plugins: isNetlify ? [netlify()] : [],
});
