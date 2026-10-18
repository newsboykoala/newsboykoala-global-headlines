import test from "node:test";
import assert from "node:assert/strict";
import { parseXmlFeed } from "../scripts/lib/feeds.mjs";
import { dedupeAndSort } from "../scripts/lib/util.mjs";

const source = { id: "sample", name: "Sample", nameKo: "샘플", region: "world" };

test("RSS 2.0, Atom, 뉴스 사이트맵의 제목·링크·시각을 읽는다", () => {
  const rss = parseXmlFeed("<rss><channel><item><guid>g1</guid><title>First headline</title><link>https://example.com/a?utm_source=x</link><pubDate>Fri, 17 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>", source, "world");
  const atom = parseXmlFeed("<feed><entry><id>g2</id><title>Second headline</title><link href='https://example.com/b'/><updated>2026-10-17T11:00:00Z</updated></entry></feed>", source, "asia");
  const site = parseXmlFeed("<urlset><url><loc>https://example.com/c</loc><news:news><news:title>Third headline</news:title><news:publication_date>2026-10-17T12:00:00Z</news:publication_date></news:news></url></urlset>", source, "middleeast", "sitemap");
  assert.equal(rss[0].url, "https://example.com/a");
  assert.equal(atom[0].guid, "g2");
  assert.equal(site[0].titleOriginal, "Third headline");
  assert.equal(site[0].publishedAt, "2026-10-17T12:00:00.000Z");
});

test("같은 guid 또는 정규화 URL만 제거하고 시각 없는 항목은 하단으로 보낸다", () => {
  const result = dedupeAndSort([
    { source: "A", guid: "same", url: "https://a.test/one", publishedAt: "2026-10-17T10:00:00Z" },
    { source: "B", guid: "same", url: "https://b.test/two", publishedAt: "2026-10-17T11:00:00Z" },
    { source: "C", guid: "", url: "https://c.test/three?utm_source=rss", publishedAt: "2026-10-17T09:00:00Z" },
    { source: "D", guid: "", url: "https://c.test/three", publishedAt: "2026-10-17T12:00:00Z" },
    { source: "E", guid: "unique", url: "https://e.test/four", publishedAt: null }
  ]);
  assert.equal(result.length, 3);
  assert.equal(result[0].source, "A");
  assert.equal(result.at(-1).source, "E");
});
