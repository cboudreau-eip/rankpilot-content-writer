import { build } from "esbuild";

// Pre-bundles the Vercel API entry to plain JS. Vercel's /api directory
// builder runs its own separate TypeScript diagnostic pass on .ts entry
// files, and that pass fails on this project's Request/Response types in
// a way our own `tsc --noEmit` does not (environment-specific type
// resolution, not a real bug) — silently skipping the function build.
// Shipping already-compiled JS sidesteps that pass entirely. Using the
// esbuild JS API (not the CLI) avoids shell-quoting issues with the
// bracket catch-all filename.
await build({
  entryPoints: ["server/_core/vercel-entry.ts"],
  outfile: "api/[...path].js",
  platform: "node",
  packages: "external",
  bundle: true,
  format: "esm",
});
