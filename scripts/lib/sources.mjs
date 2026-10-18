export const REGIONS = [
  ["all", "전체 지역"],
  ["world", "국제"],
  ["us", "미국"],
  ["europe", "유럽"],
  ["middleeast", "중동"],
  ["asia", "아시아"],
  ["economy", "국제경제"],
  ["aitech", "AI·테크"]
];

// 2026-10-17 실접근·robots.txt 재확인 결과를 반영했습니다.
// Al Jazeera는 연결 실패, Politico는 robots.txt를 확인할 수 없어, economy 피드는 장기 미갱신이라 제외했습니다.
export const SOURCES = [
  { id: "euronews", name: "Euronews", nameKo: "유로뉴스", region: "world", feeds: [
    ["https://www.euronews.com/rss?level=theme&name=news", "world"],
    ["https://www.euronews.com/rss?level=theme&name=business", "economy"]
  ]},
  { id: "dw", name: "DW", nameKo: "도이체벨레", region: "europe", feeds: [
    ["https://rss.dw.com/rdf/rss-en-world", "world"], ["https://rss.dw.com/rdf/rss-en-bus", "economy"], ["https://rss.dw.com/rdf/rss-en-ger", "europe"]
  ]},
  { id: "guardian", name: "The Guardian", nameKo: "가디언", region: "world", feeds: [
    ["https://www.theguardian.com/world/rss", "world"], ["https://www.theguardian.com/world/middleeast/rss", "middleeast"],
    ["https://www.theguardian.com/us-news/rss", "us"], ["https://www.theguardian.com/uk/business/rss", "economy"],
    ["https://www.theguardian.com/uk/technology/rss", "aitech"]
  ]},
  { id: "france24", name: "France 24", nameKo: "프랑스24", region: "world", feeds: [["https://www.france24.com/en/rss", "world"]]},
  { id: "timesofisrael", name: "The Times of Israel", nameKo: "타임스오브이스라엘", region: "middleeast", kind: "sitemap", feeds: [["https://www.timesofisrael.com/news-sitemap.xml", "middleeast"]]},
  { id: "jpost", name: "The Jerusalem Post", nameKo: "예루살렘포스트", region: "middleeast", feeds: [["https://www.jpost.com/rss/rssfeedsfrontpage.aspx", "middleeast"]]},
  { id: "ynet", name: "Ynetnews", nameKo: "Ynet", region: "middleeast", feeds: [["https://www.ynetnews.com/Integration/StoryRss2.xml", "middleeast"]]},
  { id: "haaretz", name: "Haaretz", nameKo: "하아레츠", region: "middleeast", feeds: [["https://www.haaretz.com/srv/haaretz-latest-headlines", "middleeast"]]},
  { id: "bbc", name: "BBC News", nameKo: "BBC", region: "world", feeds: [["https://feeds.bbci.co.uk/news/world/rss.xml", "world"]]},
  { id: "abcnews", name: "ABC News", nameKo: "ABC뉴스", region: "us", feeds: [["https://abcnews.go.com/abcnews/internationalheadlines", "world"], ["https://abcnews.go.com/abcnews/topstories", "us"]]},
  { id: "cbsnews", name: "CBS News", nameKo: "CBS뉴스", region: "us", feeds: [["https://www.cbsnews.com/latest/rss/world", "world"], ["https://www.cbsnews.com/latest/rss/main", "us"]]},
  { id: "nhk", name: "NHK", nameKo: "NHK", region: "asia", feeds: [
    ["https://news.web.nhk/n-data/conf/na/rss/cat6.xml", "world"], ["https://news.web.nhk/n-data/conf/na/rss/cat1.xml", "world"],
    ["https://news.web.nhk/n-data/conf/na/rss/cat4.xml", "world"], ["https://news.web.nhk/n-data/conf/na/rss/cat5.xml", "economy"]
  ]},
  { id: "japantimes", name: "The Japan Times", nameKo: "재팬타임스", region: "asia", robotsKnownAllowed: true, feeds: [["https://www.japantimes.co.jp/feed/", "asia"]]},
  { id: "nikkei", name: "Nikkei Asia", nameKo: "닛케이아시아", region: "asia", feeds: [["https://asia.nikkei.com/rss/feed/nar", "asia"]]}
];
