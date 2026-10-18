# 테스트 보고서

기준 시각은 2026-10-17 UTC입니다. 이 보고서는 실행한 명령과 그 결과만 성공으로 기록합니다. GitHub 저장소 생성·원격 배포는 사용자 지시에 따라 실행하지 않았습니다.

## 실제로 성공한 검증

`npm ci --ignore-scripts`가 성공했습니다. `package-lock.json`을 사용한 GitHub Actions 의존성 설치 경로가 로컬에서 재현되었습니다.

`npm run check`가 성공했습니다. 정적 검사와 Node 내장 테스트 9개가 모두 통과했습니다. 이 프로젝트는 순수 정적 HTML·CSS·JavaScript이므로 컴파일 단계나 `npm run build` 스크립트가 없습니다. 대신 정적 필수 파일, API 키처럼 보이는 리터럴, iframe 차단 지시를 검사했습니다.

RSS·데이터 테스트에서 RSS 2.0, Atom, 뉴스 사이트맵 예제 3종의 제목·링크·시각을 파싱했습니다. 같은 guid 또는 추적 파라미터를 제거한 동일 URL만 제거하고, 시각 없는 항목을 최신순 목록 하단에 두는 단위 테스트도 통과했습니다.

실제 공식 RSS 수집을 Gemini 키 없이 실행했습니다. 14개 활성 소스에서 300개 공개 기사를 만들었고, 수집 성공 소스 수는 14개였습니다. 키가 없는 상태에서는 Gemini 요청 0회로 원문 제목 300개를 `fallback` 상태로 표시했습니다. 이 결과는 `site/data/news.json`에 반영되어 있습니다.

실제 네트워크 스모크 테스트는 Guardian 15개, BBC 3개, NHK 12개 항목을 수집해 총 30개를 확인했습니다. 모든 매체를 무차별 우회하지 않고 `robots.txt` 판정도 재검사했으며, Politico는 현재 robots 정보를 확인할 수 없어 기본 목록에서 제외했습니다. 세부 내용은 [FEED_STATUS.md](FEED_STATUS.md)에 있습니다.

GitHub Pages 서브경로 테스트는 로컬 정적 서버를 `/repo/`에 마운트해 `/repo/`, `/repo/embed/`, `/repo/assets/feed.js`가 모두 HTTP 200을 반환하는지 확인했습니다. 일반 로컬 미리보기에서도 `/`, `/embed/`, `/data/news.json`, `/manus-routes.json`이 모두 HTTP 200을 반환했습니다.

Gemini 네트워크를 사용하지 않는 모의 테스트에서 키 없음, 기본 모델 404 후 승인 후보 모델 사용, 429, 500, 401, 403을 검증했습니다. 429·500은 유한 지수 백오프 후 `retry_later`, 401·403은 후속 모델을 시도하지 않는 `authentication_error`를 반환했습니다.

## 구현했지만 외부 환경상 미검증인 항목

실제 Gemini API 키를 요청하거나 사용하지 않았습니다. 따라서 실제 모델 목록 조회, 특정 운영자 모델의 `generateContent` 호출, 실제 한국어 번역 품질, 무료 할당량·과금 상태는 검증하지 않았습니다. GitHub Actions 변수 `GEMINI_MODEL`과 Secret `GEMINI_API_KEY`를 설정한 뒤 수동 workflow를 실행해야 합니다.

GitHub 저장소, Actions 예약 실행, Actions의 `contents: write` 커밋, Pages artifact 업로드·배포, 실제 Pages URL, Start.me의 실제 iframe 렌더링은 실행하지 않았습니다. workflow 파일과 권한 구성은 제공하지만 GitHub의 계정·조직 정책, Pages 설정, cron 지연, Secrets 권한은 이 환경에서 확인할 수 없습니다.

YAML은 별도의 GitHub Actions 파서로 실행하지 않았습니다. 이 환경에는 PyYAML과 Ruby가 없었습니다. workflow의 런타임 검증은 첫 GitHub 수동 실행에서 확인해야 합니다.

## 확인 방법

배포 전에는 `npm ci`, `npm run check`, `npm run refresh`를 실행합니다. 배포 후에는 GitHub Actions에서 **Refresh news and deploy Pages**를 수동 실행하고, Pages URL의 `/embed/`와 Start.me 위젯에서 목록·필터·새 탭 링크·번역 상태를 확인합니다. 성공 여부는 Actions의 deploy 단계와 실제 Pages URL을 모두 확인한 뒤에만 판정하세요.
