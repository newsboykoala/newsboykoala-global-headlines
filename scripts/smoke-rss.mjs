import assert from "node:assert/strict";
import { collectSources } from "./lib/feeds.mjs";
import { SOURCES } from "./lib/sources.mjs";

const ids = new Set(["bbc", "guardian", "nhk"]);
const selected = SOURCES.filter(source => ids.has(source.id));
const result = await collectSources(selected, { maxItemsPerFeed: 3 });
for (const id of ids) {
  const status = result.status.find(item => item.id === id);
  assert.equal(status?.status, "ok", `${id} has no current RSS items`);
}
assert.ok(result.articles.length >= 3, "at least three official RSS items should be collected");
console.log(JSON.stringify({ event: "rss_smoke_passed", articles: result.articles.length, sources: result.status.map(item => ({ id: item.id, count: item.count })) }));
