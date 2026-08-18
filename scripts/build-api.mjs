import { build } from "esbuild";

// Pre-bundles the Vercel API entry to plain JS. Vercel's /api directory
// builder runs its own separate TypeScript diagnostic pass on .ts entry
// files, and that pass fails on this project's Request/Response types in
// a way our own `tsc --noEmit` does not (environment-specific type
// resolution, not a real bug) — silently skipping the function build.
// Shipping already-compiled JS sidesteps that pass entirely.
//
// Two single-segment dynamic files instead of one [...path] catch-all:
// confirmed empirically (curl against the live deployment) that this
// Vercel project's [...path] only matches ONE path segment, not the
// documented multi-segment rest behavior. Our real surface never needs
// more than one segment anyway — tRPC procedure paths (even batched
// calls) are comma-joined, never slash-separated, and OAuth is a single
// exact path.
const entries = [
  { entryPoint: "server/_core/vercel-entry.ts", outfile: "api/trpc/[proc].js" },
  { entryPoint: "server/_core/vercel-entry.ts", outfile: "api/oauth/callback.js" },
];

for (const { entryPoint, outfile } of entries) {
  await build({
    entryPoints: [entryPoint],
    outfile,
    platform: "node",
    packages: "external",
    bundle: true,
    format: "esm",
  });
}
