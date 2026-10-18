# NewsBrief KR Feed

Start.me에 넣을 수 있는 고밀도 한국어 외신 헤드라인 피더입니다. 정적 HTML·CSS·브라우저 JavaScript와 GitHub Actions의 짧은 Node 수집 작업만 사용합니다. 별도 서버, 데이터베이스, Manus 기능, 카드형 UI, 기사 본문 저장은 없습니다.

`site/`는 GitHub Pages에 그대로 배포됩니다. `/`는 일반 보기이고 `/embed/`는 위젯용 여백을 줄인 보기입니다. 두 화면 모두 이미지·카드·요약 없이 한국어 제목, 매체, 발행 시각을 한 행에 표시합니다. URL이 있는 공식 피드 항목만 새 탭으로 열며, 320px 폭에서도 필터와 목록이 동작합니다.

## 구성

`scripts/collect.mjs`는 공식 RSS·Atom·뉴스 사이트맵을 병렬로 가져옵니다. `robots.txt`의 `User-agent: *` 규칙에 따라 금지된 경로는 건너뜁니다. 수집된 항목은 guid와 추적 파라미터를 뺀 정규화 URL로만 정확 중복을 제거합니다. 유사 사건이나 다른 매체의 별도 보도는 합치지 않습니다. 발행 시각이 있으면 최신순으로 정렬하고, 시각이 없는 항목은 목록 하단으로 보냅니다.

데이터는 `site/data/news.json`으로 공개됩니다. 공개 필드는 번역·원문 제목, 원문 링크, 매체, 지역, 발행·수집 시각, 번역 상태뿐입니다. API 키와 Gemini 오류 원문은 포함하지 않습니다. 번역 캐시 `data/translation-cache.json`은 저장소의 비공개 실행 파일이 아니라 추적 가능한 텍스트 캐시이며, 제목·번역·사용 모델·시각만 저장합니다. API 키는 절대 기록하지 않습니다.

## 로컬 실행

Node.js 20 이상에서 다음을 실행합니다.

```bash
npm ci
npm run check
npm run refresh
npm run dev
```

`npm run refresh`는 `GEMINI_API_KEY`가 없으면 의도적으로 영어 또는 일본어 원문 제목을 남기고 상태를 표시합니다. 이는 테스트 및 무료 운영의 안전한 폴백입니다. 로컬 키가 필요할 때만 `.env.example`을 참고해 환경변수로 주입하세요. `.env`는 Git에 포함되지 않습니다.

## Gemini 제목 번역 정책

제목만 Gemini에 전달합니다. 프롬프트는 원문의 주체·수치·부정·의문·시제·인용 강도를 보존하고, 원문에 없는 사실을 넣지 않도록 제한합니다. 이미 성공한 번역은 기사별 캐시를 재사용하므로 같은 기사를 매 실행마다 호출하지 않습니다. 캐시 항목은 번역에 사용한 모델을 기록하며, `GEMINI_MODEL` 변경만으로 이전 기사를 전부 재번역하지 않습니다.

코드에는 기본 모델 ID가 없습니다. 운영자는 GitHub Actions 변수 `GEMINI_MODEL`에 실제 지원되고 비용 조건을 확인한 모델만 넣어야 합니다. `GEMINI_FALLBACK_MODELS`에는 사전 승인한 후보만 쉼표로 넣습니다. 실행은 공식 모델 목록에서 `generateContent` 지원 여부를 확인한 뒤 번역합니다. 주 모델이 404 또는 지원 종료 오류를 내면 후보를 순서대로 시도합니다. 429와 5xx는 짧은 지수 백오프 후 해당 실행을 멈추고 다음 실행에 재시도합니다. 401/403은 다른 모델을 무작위로 시도하지 않고 안전하게 중단합니다. 어떤 실패도 유료 모델 자동 선택이나 다른 번역 API 호출로 이어지지 않습니다.

## Start.me 임베드

GitHub Pages URL이 `https://<owner>.github.io/<repo>/`라면 Start.me의 웹페이지 위젯 URL에 다음을 넣습니다.

```text
https://<owner>.github.io/<repo>/embed/
```

권장 iframe 크기는 폭 320px 이상, 높이 500px 이상입니다. 이 정적 사이트는 `X-Frame-Options`나 iframe을 차단하는 CSP를 설정하지 않습니다. 브라우저 또는 Start.me 자체 정책은 이 저장소 밖의 요소입니다.

## 갱신과 데이터 보존

`.github/workflows/refresh-and-deploy.yml`은 15분마다 실행을 요청하고 수동 실행도 받습니다. GitHub Actions 예약 작업은 혼잡이나 계정 상태에 따라 지연될 수 있으므로 UI에도 이를 알립니다. 한 실행에서 최대 20개/피드, 300개/공개 목록, 40개/신규 번역을 기본값으로 제한합니다. 동시 실행은 하나만 허용합니다.

수집 결과가 0건이면 직전 `site/data/news.json`을 덮어쓰지 않습니다. 일부 피드 실패는 나머지 정상 결과로 갱신합니다. 새 데이터와 캐시를 커밋한 같은 workflow가 Pages artifact를 업로드·배포하므로, `GITHUB_TOKEN`으로 만든 커밋이 별도 push workflow를 다시 발생시키지 않는 GitHub 동작에도 최신 데이터가 실제 사이트로 반영됩니다.

GitHub 설정 절차는 [DEPLOY_GITHUB.md](DEPLOY_GITHUB.md)를 참조하세요. 현재 검증한 피드 상태는 [FEED_STATUS.md](FEED_STATUS.md), 실행 결과는 [TEST_REPORT.md](TEST_REPORT.md)에 기록합니다.
