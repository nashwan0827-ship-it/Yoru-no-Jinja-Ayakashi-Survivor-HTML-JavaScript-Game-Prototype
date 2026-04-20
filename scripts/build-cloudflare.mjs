import { cp, mkdir, rm } from "node:fs/promises";

const distDir = new URL("../dist/", import.meta.url);
const rootDir = new URL("../", import.meta.url);

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

for (const entry of ["index.html", "paths.js", "_headers", "src", "assets"]) {
  await cp(new URL(entry, rootDir), new URL(entry, distDir), {
    recursive: true,
    force: true,
  });
}
