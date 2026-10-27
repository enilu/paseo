import { build } from "esbuild";
import { resolve } from "node:path";

const outfile = process.argv[2];
if (!outfile) throw new Error("Usage: npm run build:share-client -- <output-file>");

await build({
  entryPoints: [resolve("packages/website/src/collaborative-agent-share.ts")],
  outfile: resolve(outfile),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  minify: true,
  logLevel: "info",
});
