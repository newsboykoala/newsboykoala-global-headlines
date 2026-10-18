import { readFile, stat } from "node:fs/promises";

const required = ["site/index.html", "site/embed/index.html", "site/assets/app.css", "site/assets/feed.js", "site/data/news.json", "scripts/collect.mjs", ".github/workflows/refresh-and-deploy.yml"];
for (const file of required) await stat(file);
const tracked = await Promise.all(["site/assets/feed.js", "scripts/collect.mjs", ".github/workflows/refresh-and-deploy.yml"].map(file => readFile(file, "utf8")));
if (tracked.join("\n").match(/AIza[0-9A-Za-z_-]{20,}/)) throw new Error("API key-like literal found");
for (const html of await Promise.all([readFile("site/index.html", "utf8"), readFile("site/embed/index.html", "utf8")])) {
  if (/x-frame-options|frame-ancestors/i.test(html)) throw new Error("Embedding-blocking header directive found");
}
console.log("Static checks passed.");
