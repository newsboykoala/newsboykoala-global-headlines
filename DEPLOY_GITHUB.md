# GitHub Pages 배포 설정

이 문서는 저장소 생성과 실제 배포를 대신 실행하지 않습니다. 아래 절차는 저장소 소유자가 직접 수행합니다.

1. 새 GitHub 저장소를 만들고 이 폴더의 전체 파일을 `main` 브랜치에 올립니다. `.env`나 어떤 API 키 파일도 올리지 않습니다.
2. 저장소 **Settings → Pages**에서 Source를 **GitHub Actions**로 선택합니다. 첫 `main` push 후 `Deploy static Pages` workflow가 `site/` 폴더를 배포합니다.
3. 번역이 필요하면 **Settings → Secrets and variables → Actions**의 **Secrets**에 `GEMINI_API_KEY`를 추가합니다. 이 값은 workflow 실행 환경에서만 읽고, 정적 산출물에 포함하지 않습니다.
4. 같은 화면의 **Variables**에 `GEMINI_MODEL`을 추가합니다. 반드시 해당 Google AI API 키에서 실제로 `generateContent`를 지원하고, 사용 비용·무료 할당량을 운영자가 확인한 저비용 모델 ID만 넣습니다. 소스 코드에는 기본 모델명이 없으므로 이 변수가 비어 있으면 영문 원제를 유지합니다.
5. 지원 종료 대비 후보가 필요하면 `GEMINI_FALLBACK_MODELS` 변수에 운영자가 사전 승인한 후보를 쉼표로 구분해 넣습니다. 예시는 `model-a,model-b` 형식입니다. 불확실한 최신 또는 유료 모델을 자동으로 넣지 마세요.
6. Actions 탭에서 **Refresh news and deploy Pages**를 열고 **Run workflow**를 한 번 실행합니다. 첫 데이터 수집·번역 후 같은 workflow가 Pages를 배포합니다. Pages URL은 보통 `https://<owner>.github.io/<repo>/` 형식입니다.

## 갱신 흐름과 권한

`refresh-and-deploy.yml`은 `*/15 * * * *` cron으로 실행을 요청합니다. cron은 정확한 15분 간격을 보장하지 않으므로, 실시간 알림 서비스로 사용하지 말고 Actions 실행 이력을 확인하세요. workflow는 `concurrency`로 중복 실행을 대기시키며, RSS 수집 실패로 0건이 되면 기존 JSON을 보존합니다.

갱신 workflow는 `contents: write`로 `site/data/news.json`과 `data/translation-cache.json`만 커밋합니다. 이 권한은 갱신 데이터를 저장하기 위해 필요합니다. Pages artifact 배포에는 `pages: write`와 `id-token: write`가 필요합니다. 일반 코드 push용 `deploy-pages.yml`은 `contents: read`만 사용합니다. 조직 정책으로 기본 `GITHUB_TOKEN` 쓰기가 금지되어 있다면 해당 저장소에서 Actions의 workflow permissions를 읽기/쓰기로 허용해야 합니다.

수집 workflow 안에서 Pages를 직접 배포하는 이유는 `GITHUB_TOKEN`으로 만든 커밋이 일반적으로 다른 push workflow를 다시 실행하지 않기 때문입니다. 따라서 예약 갱신 후에도 최신 정적 JSON이 Pages에 배포됩니다.

## 서브경로와 Start.me

모든 자산과 데이터는 상대경로입니다. 따라서 프로젝트 Pages URL이 `/<repo>/` 하위여도 일반 화면의 `data/news.json`, 임베드 화면의 `../data/news.json`, CSS와 JavaScript가 올바르게 해석됩니다. Start.me에는 다음처럼 `/embed/`까지 포함한 URL을 넣습니다.

```text
https://<owner>.github.io/<repo>/embed/
```

예방 차원에서 Pages 설정에 별도의 iframe 차단 헤더를 추가하지 마세요. 이 프로젝트 자체는 차단 헤더를 생성하지 않습니다.

## 운영 점검과 복구

Actions 로그에는 피드·번역 건수와 상태 코드만 남기고 API 키나 제목 전문을 출력하지 않습니다. `GEMINI_MODEL` 변경 직후에도 과거 기사 전체를 재번역하지 않습니다. 404/지원 종료는 승인 후보만 차례로 시도하고, 429·5xx는 유한 재시도 뒤 다음 스케줄까지 대기합니다. 401/403은 즉시 중단합니다.

잘못된 갱신이 커밋되면 GitHub에서 직전 정상 커밋의 `site/data/news.json`과 `data/translation-cache.json`을 복원해 커밋한 뒤 `Deploy static Pages`를 수동 실행하면 됩니다. 수집 결과가 비었을 때는 스크립트가 기존 파일을 자동 보존합니다.
