import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const funcDir = ".netlify/functions-internal/server";

if (!existsSync(join(funcDir, "main.mjs"))) {
  console.error("[post-build] main.mjs not found — skipping server.mjs generation");
  process.exit(0);
}

const content = `export { default } from "./main.mjs";
export const config = {
  name: "server handler",
  path: "/*",
  nodeBundler: "none",
  includedFiles: ["**"],
  preferStatic: true,
};
`;

writeFileSync(join(funcDir, "server.mjs"), content);
console.log("[post-build] .netlify/functions-internal/server/server.mjs written");
