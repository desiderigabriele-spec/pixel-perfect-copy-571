import { writeFileSync, copyFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const srcDir = ".netlify/functions-internal/server";
const destDir = "netlify/functions/server";

if (!existsSync(join(srcDir, "main.mjs"))) {
  console.error("[post-build] main.mjs not found — aborting");
  process.exit(1);
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(srcDir, destDir);

// Simple v2 function entry — routing is handled by netlify.toml redirect
writeFileSync(
  join(destDir, "server.mjs"),
  `export { default } from "./main.mjs";\n`,
);

console.log("[post-build] netlify/functions/server/ ready");
