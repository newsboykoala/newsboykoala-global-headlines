import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { collectSources } from "./lib/feeds.mjs";
import { translateHeadlines } from "./lib/gemini.mjs";
import { SOURCES } from "./lib/sources.mjs";
import { articleCacheKey, dedupeAndSort } from "./lib/util.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const PUBLIC_FILE = join(ROOT, "site/data/news.json");
const CACHE_FILE = join(ROOT, "data/translation-cache.json");
const number = (name, fallback) => Math.max(1, Number(process.env[name] || fallback));

async function readJson(path, fallback) { try { return JSON.parse(await readFile(path, "utf8")); } catch { return fallback; } }
async function atomicJson(path, value) { const temp = `${path}.tmp`; await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`); await rename(temp, path); }

const cache = await readJson(CACHE_FILE, { schemaVersion: 1, entries: {} });
const startedAt = new Date().toISOString();
const collection = await collectSources(SOURCES, { maxItemsPerFeed: number("MAX_ITEMS_PER_FEED", 20) });
const ordered = dedupeAndSort(collection.articles).slice(0, number("MAX_PUBLISHED_ARTICLES", 300));

if (!ordered.length) {
  console.log(JSON.stringify({ event: "preserved_previous_json", reason: "zero_articles", sources: collection.status.map(item => ({ id: item.id, status: item.status })) }));
  process.exitCode = 0;
} else {
  const uncached = [];
  for (const article of ordered) {
    const entry = cache.entries[articleCacheKey(article)];
    if (entry?.titleKo) article.cachedTranslation = entry;
    else uncached.push(article);
  }
  const maxTranslations = number("MAX_TRANSLATIONS_PER_RUN", 40);
  const translationTargets = uncached.slice(0, maxTranslations).map(article => ({ id: articleCacheKey(article), titleOriginal: article.titleOriginal }));
  const translation = await translateHeadlines(translationTargets, {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL,
    fallbackModels: String(process.env.GEMINI_FALLBACK_MODELS || "").split(",").map(value => value.trim()).filter(Boolean),
    verifyModels: String(process.env.GEMINI_VERIFY_MODELS || "true").toLowerCase() !== "false",
    batchSize: number("GEMINI_BATCH_SIZE", 8)
  });
  const generatedAt = new Date().toISOString();
  let translated = 0;
  let fallback = 0;
  let pending = 0;
  const articles = ordered.map(article => {
    const key = articleCacheKey(article);
    const cached = article.cachedTranslation || translation.translations.get(key);
    if (cached?.titleKo) {
      translated += 1;
      cache.entries[key] = { titleKo: cached.titleKo, model: cached.model || "unknown", translatedAt: generatedAt, updatedAt: generatedAt };
      return { id: key.slice(0, 16), sourceId: article.sourceId, source: article.source, sourceKo: article.sourceKo, regions: article.regions, titleOriginal: article.titleOriginal, titleKo: cached.titleKo, url: article.url, publishedAt: article.publishedAt, collectedAt: article.collectedAt, translationStatus: "translated" };
    }
    const isPending = translation.state === "translated" && uncached.indexOf(article) >= maxTranslations;
    if (isPending) pending += 1; else fallback += 1;
    return { id: key.slice(0, 16), sourceId: article.sourceId, source: article.source, sourceKo: article.sourceKo, regions: article.regions, titleOriginal: article.titleOriginal, titleKo: article.titleOriginal, url: article.url, publishedAt: article.publishedAt, collectedAt: article.collectedAt, translationStatus: isPending ? "pending" : "fallback" };
  });
  const entries = Object.entries(cache.entries).sort((a, b) => String(b[1].updatedAt || "").localeCompare(String(a[1].updatedAt || ""))).slice(0, 5000);
  cache.entries = Object.fromEntries(entries);
  await atomicJson(CACHE_FILE, cache);
  await atomicJson(PUBLIC_FILE, {
    schemaVersion: 1,
    generatedAt,
    articleCount: articles.length,
    collection: { state: "ok", availableSources: collection.status.filter(item => item.status === "ok").length, totalSources: SOURCES.length },
    translation: { state: translation.state, model: translation.model, translated, fallback, pending, message: translation.message || "번역이 완료되었습니다." },
    articles
  });
  console.log(JSON.stringify({ event: "news_refresh_complete", startedAt, articles: articles.length, sourcesOk: collection.status.filter(item => item.status === "ok").length, translations: translated, fallback, pending, translationState: translation.state, geminiCalls: translation.calls }));
}
