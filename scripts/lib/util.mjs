import { createHash } from "node:crypto";

export function asArray(value) {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}

export function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "object") {
    return textOf(value["#text"] ?? value["#cdata"] ?? value.__cdata ?? value.__text ?? "");
  }
  return "";
}

export function stripMarkup(value) {
  return textOf(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(raw) {
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|output$)/i.test(key)) url.searchParams.delete(key);
    }
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return "";
  }
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function parsePublishedAt(value) {
  const stamp = Date.parse(String(value || ""));
  return Number.isFinite(stamp) ? new Date(stamp).toISOString() : null;
}

export function articleCacheKey(article) {
  return sha256(`${article.sourceId}\u0000${article.guid || article.url}\u0000${article.titleOriginal}`);
}

export function dedupeAndSort(articles) {
  const seenGuids = new Set();
  const seenUrls = new Set();
  const exact = [];
  for (const article of articles) {
    const guid = String(article.guid || "").trim();
    const url = normalizeUrl(article.url);
    if (!url) continue;
    if ((guid && seenGuids.has(guid)) || seenUrls.has(url)) continue;
    if (guid) seenGuids.add(guid);
    seenUrls.add(url);
    exact.push({ ...article, url });
  }
  return exact.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : -Infinity;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : -Infinity;
    return tb - ta || a.source.localeCompare(b.source);
  });
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}
