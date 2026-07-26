// ============================================================
// PHH Inventory — Serverless function build (esbuild)
// Bundles src/serverless.ts (the handler) + src/app.ts + the
// @phh/shared workspace package (which ships raw TypeScript) into a
// single self-contained api/index.js. Real npm dependencies
// (express, better-auth, pg, drizzle, zod, …) are left external and
// resolved from node_modules at runtime.
//
// The output is COMMITTED to git and deployed as-is, so Vercel never
// has to build the monorepo (which is what was failing). Re-run this
// (`pnpm run vercel-build`) and commit api/index.js after changing
// any server source.
//
// A small plugin rewrites TypeScript's ".js" import specifiers to
// the ".ts" source on disk so esbuild can follow them.
// ============================================================

import { build } from "esbuild";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = resolve(__dirname, "src/serverless.ts");

/** @type {import('esbuild').Plugin} */
const firstPartyResolver = {
  name: "first-party-resolver",
  setup(b) {
    b.onResolve({ filter: /.*/ }, (args) => {
      const p = args.path;

      // Entry point (no importer) → default resolution.
      if (!args.importer) return;

      // Relative / absolute imports: rewrite a ".js" specifier to the
      // ".ts" file when only the TS source exists on disk.
      if (p.startsWith(".") || p.startsWith("/")) {
        const abs = resolve(dirname(args.importer), p);
        if (p.endsWith(".js")) {
          const ts = abs.replace(/\.js$/, ".ts");
          if (existsSync(ts)) return { path: ts };
        }
        return; // let esbuild resolve (index files, real .js, etc.)
      }

      // Node built-ins stay external.
      if (p.startsWith("node:")) return { path: p, external: true };

      // The workspace package must be bundled (it has no compiled output).
      if (p.startsWith("@phh/")) return; // default resolution → its src/*.ts

      // Everything else is a real npm dependency → keep external.
      return { path: p, external: true };
    });
  },
};

await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: resolve(__dirname, "api/index.js"),
  sourcemap: false,
  logLevel: "info",
  plugins: [firstPartyResolver],
  // ESM output that leaves `require`/`__dirname` working if any dep needs them.
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'module';",
      "const require = __createRequire(import.meta.url);",
    ].join("\n"),
  },
});

console.log("✅ Serverless function written to api/index.js (commit this file)");
