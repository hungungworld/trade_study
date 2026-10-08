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

AI는 [Google Gemini API](https://ai.google.dev/)의 무료 등급을 씁니다. 신용카드 없이 Google 계정만 있으면 됩니다.

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 **Create API key**로 키 발급
2. 저장소 **Settings → Secrets and variables → Actions → Secrets → New repository secret**
   - Name: `GEMINI_API_KEY`, Secret: 발급한 키
3. **Actions → 무역 뉴스 업데이트 → Run workflow**로 한 번 실행해 로그 확인
4. (선택) 같은 화면의 **Variables**에서 설정
   - `AI_MODEL`: 사용할 Gemini 모델 (기본 `gemini-3.5-flash-lite`). 설정한 모델이 없으면 로그에 쓸 수 있는 모델 이름이 나옵니다.
   - `MAX_NEW_ARTICLES`: 한 번에 추가할 최대 기사 수 (기본 6)

무료 등급은 분당·하루 호출 수에 제한이 있습니다(정확한 수치는 AI Studio에서 확인). 수집기는 호출 사이에 7초씩 쉬고, 한도에 걸리거나 API 오류가 3번 연속 나면 멈춘 뒤 남은 기사를 다음 실행에서 다시 시도합니다. 무료 등급에서는 보낸 내용이 Google 서비스 개선에 쓰일 수 있습니다(공개 뉴스 기사만 보냅니다).

로컬에서 직접 실행하려면:

```bash
cd scripts && npm install
GEMINI_API_KEY=... node update-news.mjs
```

### 수집 대상 바꾸기

`scripts/feeds.json`에 RSS 주소를 추가·삭제하면 됩니다. 제목이나 RSS 요약에 `수출`, `관세`, `FTA`, `공급망` 같은 무역 키워드(`update-news.mjs`의 `TRADE_KEYWORDS`)가 있는 기사만 AI로 보내고, AI가 무역과 관련 없다고 판단한 기사는 제외합니다.

## 저작권

원문 전문은 저장하거나 게시하지 않습니다. 사이트에는 AI가 자신의 문장으로 다시 쓴 학습용 정리와 원문 링크만 올라갑니다.
