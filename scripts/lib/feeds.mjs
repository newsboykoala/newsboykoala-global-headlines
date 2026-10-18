import { XMLParser } from "fast-xml-parser";
import { isRobotsAllowed } from "./robots.mjs";
import { asArray, mapLimit, normalizeUrl, parsePublishedAt, stripMarkup, textOf } from "./util.mjs";

const USER_AGENT = "NewsBriefKR/1.0 (+https://github.com/your-account/your-repo)";
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", cdataPropName: "#cdata", trimValues: true, parseTagValue: false });

function firstText(item, names) {
  for (const name of names) {
    const value = asArray(item?.[name])[0];
    const text = stripMarkup(value);
    if (text) return text;
  }
  return "";
}

function readLink(item) {
  for (const value of asArray(item?.link)) {
    const href = typeof value === "object" ? textOf(value?.["@_href"]) : "";
    const candidate = href || stripMarkup(value);
    if (/^https?:\/\//i.test(candidate)) return candidate;
  }
  return firstText(item, ["guid", "id"]);
}

function itemFromFeed(raw, source, region) {
  const title = firstText(raw, ["title"]);
  const url = normalizeUrl(readLink(raw));
  if (!title || !url) return null;
  return {
    sourceId: source.id,
    source: source.name,
    sourceKo: source.nameKo,
    regions: [region || source.region],
    guid: firstText(raw, ["guid", "id"]),
    titleOriginal: title,
    url,
    publishedAt: parsePublishedAt(firstText(raw, ["pubDate", "published", "updated", "dc:date", "date"])),
    collectedAt: new Date().toISOString()
  };
}

export function parseXmlFeed(xml, source, region, kind = "rss") {
  let document;
  try { document = parser.parse(xml); } catch { return []; }
  if (kind === "sitemap") {
    const urls = asArray(document?.urlset?.url || document?.["urlset"]?.url);
    return urls.map(raw => {
      const news = raw?.["news:news"] || raw?.news || {};
      const title = firstText(news, ["news:title", "title"]);
      const url = normalizeUrl(firstText(raw, ["loc"]));
      if (!title || !url) return null;
      return { sourceId: source.id, source: source.name, sourceKo: source.nameKo, regions: [region || source.region], guid: url, titleOriginal: title, url, publishedAt: parsePublishedAt(firstText(news, ["news:publication_date", "publication_date"]) || firstText(raw, ["lastmod"])), collectedAt: new Date().toISOString() };
    }).filter(Boolean);
  }
  const rssItems = document?.rss?.channel?.item || document?.["rdf:RDF"]?.item || document?.RDF?.item;
  const atomEntries = document?.feed?.entry;
  return asArray(rssItems || atomEntries).map(raw => itemFromFeed(raw, source, region)).filter(Boolean);
}

async function fetchFeed(url, { fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*" } });
    if (!response.ok) return { ok: false, reason: `http_${response.status}` };
    const body = await response.text();
    if (!body || !body.trimStart().startsWith("<")) return { ok: false, reason: "not_xml" };
    return { ok: true, body };
  } catch (error) {
    return { ok: false, reason: error?.name === "AbortError" ? "timeout" : "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

export async function collectSources(sources, options = {}) {
  const now = options.now || Date.now();
  const maxPerFeed = Number(options.maxItemsPerFeed || 20);
  const maxAgeMs = 96 * 60 * 60 * 1000;
  const futureGraceMs = 6 * 60 * 60 * 1000;
  const robotsCache = new Map();
  const tasks = sources.flatMap(source => source.feeds.map(([url, region]) => ({ source, url, region })));
  const fetched = await mapLimit(tasks, 4, async task => {
    const robots = await isRobotsAllowed(task.url, { cache: robotsCache, fetchImpl: options.fetchImpl, knownAllowedWhenUnavailable: task.source.robotsKnownAllowed });
    if (!robots.allowed) return { ...task, ok: false, reason: `robots_${robots.status}` };
    const response = await fetchFeed(task.url, options);
    if (!response.ok) return { ...task, ok: false, reason: response.reason };
    const parsed = parseXmlFeed(response.body, task.source, task.region, task.source.kind || "rss");
    const recent = parsed.filter(article => !article.publishedAt || (Date.parse(article.publishedAt) >= now - maxAgeMs && Date.parse(article.publishedAt) <= now + futureGraceMs)).slice(0, maxPerFeed);
    return { ...task, ok: true, articles: recent };
  });
  const status = sources.map(source => {
    const entries = fetched.filter(item => item.source.id === source.id);
    const count = entries.reduce((sum, item) => sum + (item.articles?.length || 0), 0);
    const failures = entries.filter(item => !item.ok).map(item => item.reason);
    return { id: source.id, name: source.name, feeds: entries.length, count, status: count ? "ok" : failures.length ? "error" : "empty", failures };
  });
  return { articles: fetched.flatMap(item => item.articles || []), status };
}
