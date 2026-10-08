# 무역 뉴스 퀴즈

산업별 무역 뉴스를 읽고, 기사 내용으로 만든 퀴즈 3문제를 풀며 공부하는 정적 웹사이트입니다.

- **기사 목록**: 반도체, 자동차, 배터리, 철강, 석유화학, 조선·해운, 농식품, 소비재, 무역 일반 등 산업별로 필터링
- **기사 읽기**: AI가 원문을 바탕으로 다시 쓴 학습용 정리, 핵심 정리 3줄, 관련 무역 개념 카드, 원문 링크
- **퀴즈 3문제**: 사실 확인 → 무역 개념 → 영향 추론 순서의 4지선다. 문제마다 해설 제공
- **내 기록**: 푼 기사 수, 정답률, 연속 학습일, 산업별 정답률, 오답 노트 (브라우저에 저장)

## 구조

```
index.html              사이트 진입점
assets/app.js           화면, 퀴즈, 기록 로직 (프레임워크 없음)
assets/style.css        스타일 (다크 모드 지원)
data/articles.json      기사 + 퀴즈 데이터
data/seen.json          이미 처리한 기사 링크
scripts/update_news.py  RSS 수집 → 본문 추출 → Claude로 정리·퀴즈 생성
scripts/feeds.json      수집할 RSS 목록
.github/workflows/update-news.yml  매일 07:00, 18:00(KST) 자동 실행
```

처음에는 사용법을 보여주는 **예시 기사 3개**(가상의 사례)가 들어 있고, 첫 자동 수집이 성공하면 실제 기사로 바뀝니다.

## 로컬에서 보기

```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

`index.html`을 파일로 바로 열면 데이터 파일을 불러오지 못하므로 위처럼 서버를 띄워 주세요.

## 자동 수집 설정

1. 저장소 **Settings → Secrets and variables → Actions → Secrets**에 `ANTHROPIC_API_KEY` 추가
2. (선택) 같은 화면의 **Variables**에 설정
   - `CLAUDE_MODEL`: 사용할 모델 (기본 `claude-opus-5-5`)
   - `MAX_NEW_ARTICLES`: 한 번에 추가할 최대 기사 수 (기본 6)
3. 이 브랜치를 기본 브랜치(main)에 병합. GitHub Actions의 예약 실행은 기본 브랜치에서만 동작합니다.
4. **Actions → 무역 뉴스 업데이트 → Run workflow**로 한 번 수동 실행해 확인

로컬에서 직접 실행하려면:

```bash
pip install -r scripts/requirements.txt
ANTHROPIC_API_KEY=... python scripts/update_news.py
```

### 비용

기사 1개당 Claude API 호출 1회(본문 수천 자 입력, 정리·퀴즈 출력)입니다. 기본 모델 기준 하루 12개 내외면 월 수십 달러 이하 수준이며, 무관한 기사로 판정돼도 호출은 발생하므로 한 번 실행에 호출 수를 `MAX_NEW_ARTICLES × 3`회로 제한합니다. 비용을 더 줄이려면 `CLAUDE_MODEL`을 `claude-haiku-5-5` 같은 더 저렴한 모델로 바꾸세요.

### 수집 대상 바꾸기

`scripts/feeds.json`에 RSS 주소를 추가·삭제하면 됩니다. 제목이나 RSS 요약에 `수출`, `관세`, `FTA`, `공급망` 같은 무역 키워드(`update_news.py`의 `TRADE_KEYWORDS`)가 있는 기사만 Claude로 보내고, Claude가 무역과 관련 없다고 판단한 기사는 제외합니다.

## 저작권

원문 전문은 저장하거나 게시하지 않습니다. 사이트에는 AI가 자신의 문장으로 다시 쓴 학습용 정리와 원문 링크만 올라갑니다.

## 웹에 공개하기 (GitHub Pages)

**Settings → Pages**에서 Source를 `Deploy from a branch`, 브랜치를 `main` / `(root)`로 지정하면 `https://<계정>.github.io/trade_study/`에서 볼 수 있습니다. 자동 수집이 `data/`를 커밋할 때마다 사이트도 갱신됩니다.
