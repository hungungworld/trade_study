# 무역 뉴스 퀴즈

산업별 무역 뉴스를 읽고, 기사 내용으로 만든 퀴즈 3문제를 풀며 공부하는 정적 웹사이트입니다.

- **기사 목록**: 반도체, 자동차, 배터리, 철강, 석유화학, 조선·해운, 농식품, 소비재, 무역 일반 등 산업별로 필터링
- **기사 읽기**: AI가 원문을 바탕으로 다시 쓴 학습용 정리, 핵심 정리 3줄, 관련 무역 개념 카드, 원문 링크
- **퀴즈 3문제**: 사실 확인 → 무역 개념 → 영향 추론 순서의 4지선다. 문제마다 해설 제공
- **내 기록**: 푼 기사 수, 정답률, 연속 학습일, 산업별 정답률, 오답 노트 (브라우저에 저장)

## 구조

```
index.html               사이트 진입점
assets/app.js            화면, 퀴즈, 기록 로직 (프레임워크 없음)
assets/style.css         스타일 (다크 모드 지원)
data/articles.json       기사 + 퀴즈 데이터
data/seen.json           이미 처리한 기사 링크
scripts/update-news.mjs  RSS 수집 → 본문 추출 → AI로 정리·퀴즈 생성 (Node.js)
scripts/feeds.json       수집할 RSS 목록
.github/workflows/update-news.yml  매일 07:00, 18:00(KST) 자동 실행
```

처음에는 사용법을 보여주는 **예시 기사 3개**(가상의 사례)가 들어 있고, 첫 자동 수집이 성공하면 실제 기사로 바뀝니다.

## 로컬에서 보기

```bash
npx serve .
# 또는 python3 -m http.server 8000
```

`index.html`을 파일로 바로 열면 데이터 파일을 불러오지 못하므로 위처럼 서버를 띄워 주세요.

## 배포 (Vercel)

1. vercel.com → **Add New → Project** → 이 저장소 선택
2. Framework Preset은 **Other**, 빌드 설정은 비워 두고 **Deploy**
3. main 브랜치에 커밋이 올라올 때마다(자동 수집 포함) Vercel이 다시 배포합니다.

`scripts/`, `.github/`는 `.vercelignore`로 배포에서 빠집니다.

## 자동 수집 (무료)

AI는 [GitHub Models](https://docs.github.com/ko/github-models)를 씁니다. GitHub 계정에 포함된 무료 사용량 안에서 동작하고, GitHub Actions에서는 자동으로 주어지는 `GITHUB_TOKEN`으로 호출하므로 **API 키를 따로 만들 필요가 없습니다.**

1. 이 브랜치를 main에 병합. GitHub Actions의 예약 실행은 기본 브랜치에서만 동작합니다.
2. **Actions → 무역 뉴스 업데이트 → Run workflow**로 한 번 수동 실행해 로그를 확인
3. (선택) **Settings → Secrets and variables → Actions → Variables**에서 설정
   - `AI_MODEL`: 사용할 모델 (기본 `openai/gpt-4.1`)
   - `MAX_NEW_ARTICLES`: 한 번에 추가할 최대 기사 수 (기본 6)

무료 사용량은 분당·하루 호출 수와 요청당 길이에 제한이 있습니다. 그래서 수집기는 호출 사이에 몇 초씩 쉬고, 기사 본문은 6,000자까지만 보내며, 하루 사용량을 다 쓰면 남은 기사를 다음 실행으로 넘깁니다.

로컬에서 직접 실행하려면 GitHub에서 `models` 권한이 있는 개인 토큰(fine-grained PAT)을 만들어 사용합니다.

```bash
cd scripts && npm install
GITHUB_TOKEN=... node update-news.mjs
```

### 수집 대상 바꾸기

`scripts/feeds.json`에 RSS 주소를 추가·삭제하면 됩니다. 제목이나 RSS 요약에 `수출`, `관세`, `FTA`, `공급망` 같은 무역 키워드(`update-news.mjs`의 `TRADE_KEYWORDS`)가 있는 기사만 AI로 보내고, AI가 무역과 관련 없다고 판단한 기사는 제외합니다.

## 저작권

원문 전문은 저장하거나 게시하지 않습니다. 사이트에는 AI가 자신의 문장으로 다시 쓴 학습용 정리와 원문 링크만 올라갑니다.
