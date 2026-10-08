(() => {
  "use strict";

  const INDUSTRIES = {
    semiconductor: "반도체·전자",
    auto: "자동차",
    battery: "배터리·친환경",
    steel: "철강·금속",
    petrochem: "석유화학·에너지",
    shipbuilding: "조선·해운",
    food: "농식품",
    consumer: "화장품·소비재",
    general: "무역 일반·정책",
  };
  const STORE_KEY = "tradeQuiz.v1";
  const app = document.getElementById("app");

  let articles = [];
  let editorials = [];
  const ui = { industry: "all", status: "all", paper: "all" };

  // ---------- 저장소 (브라우저 localStorage) ----------
  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data && typeof data.results === "object") return { read: {}, ...data };
    } catch (e) { /* 비공개 창 등에서는 기록 없이 동작 */ }
    return { results: {}, read: {} };
  }
  function saveStore(store) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* 무시 */ }
  }
  let store = loadStore();

  function recordResult(article, answers) {
    const correct = answers.filter((a, i) => a === article.quiz[i].answer_index).length;
    store.results[article.id] = { answers, correct, at: new Date().toISOString() };
    saveStore(store);
  }

  // ---------- DOM 도우미: 모든 텍스트는 textContent 로 넣는다 ----------
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === false || v == null) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  function safeUrl(url) {
    return /^https?:\/\//i.test(url || "") ? url : null;
  }
  function render(...nodes) {
    app.replaceChildren(...nodes);
    window.scrollTo(0, 0);
  }
  function setNav(name) {
    document.querySelectorAll("[data-nav]").forEach((a) => {
      a.classList.toggle("active", a.dataset.nav === name);
    });
  }
  const industryLabel = (key) => INDUSTRIES[key] || INDUSTRIES.general;

  // ---------- 통계 ----------
  function localDay(iso) {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function stats() {
    const results = Object.values(store.results);
    const solved = results.length;
    const correct = results.reduce((s, r) => s + r.correct, 0);
    const total = results.reduce((s, r) => s + r.answers.length, 0);
    const days = new Set(results.map((r) => localDay(r.at)));
    let streak = 0;
    const d = new Date();
    if (!days.has(localDay(d.toISOString()))) d.setDate(d.getDate() - 1); // 오늘 아직 안 풀었으면 어제부터 센다
    while (days.has(localDay(d.toISOString()))) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    }
    return { solved, rate: total ? Math.round((correct / total) * 100) : null, streak };
  }

  // ---------- 홈 ----------
  const GOAL_RATE = 80;

  function wrongCount() {
    let n = 0;
    for (const a of articles) {
      const r = store.results[a.id];
      if (r) n += a.quiz.filter((q, k) => r.answers[k] !== q.answer_index).length;
    }
    return n;
  }

  // 상단 바로가기 카드 3개. 점 색: 초록=할 일 있음/완료, 노랑=남은 퀴즈, 검정=복습
  function tiles() {
    const latest = articles[0]?.date;
    const latestCount = articles.filter((a) => a.date === latest).length;
    const todo = articles.filter((a) => !store.results[a.id]).length;
    const wrong = wrongCount();
    const tile = (label, value, dot, onclick) => h("button", { class: "tile", onclick },
      h("span", { class: `tile-dot ${dot}`, "aria-hidden": "true" }),
      h("span", { class: "tile-label" }, label),
      h("b", { class: "tile-value" }, value),
    );
    return h("div", { class: "tiles" },
      tile("최신 기사", `${latestCount}개`, "green", () => { ui.industry = "all"; ui.status = "all"; viewHome(); }),
      tile("안 푼 퀴즈", `${todo}개`, todo ? "yellow" : "green", () => { ui.industry = "all"; ui.status = "todo"; viewHome(); }),
      tile("오답 노트", `${wrong}문제`, "black", () => { location.hash = "#/me"; }),
    );
  }

  // 숫자 카드와 목표 막대 (홈·내 기록 공통)
  function summaryCards() {
    const s = stats();
    const stat = (value, unit, caption) => h("div", { class: "stat" },
      h("b", {}, value, h("small", {}, unit)), h("span", {}, caption));
    const rate = s.rate ?? 0;
    const reached = s.rate != null && s.rate >= GOAL_RATE;
    return [
      h("div", { class: "panel stat-row" },
        stat(s.solved, "개", "푼 기사"),
        stat(s.rate == null ? "-" : s.rate, s.rate == null ? "" : "%", "정답률"),
        stat(s.streak, "일", "연속 학습"),
      ),
      h("div", { class: "goal-row" },
        h("div", { class: "panel goal-bar" },
          h("div", { class: `track${reached ? " reached" : ""}`, role: "img", "aria-label": `정답률 ${rate}%, 목표 ${GOAL_RATE}%` },
            h("i", { style: `width:${rate}%` }),
            h("span", { class: "track-label" },
              s.rate == null ? "첫 퀴즈를 풀어 보세요" : h("span", {}, rate, h("small", {}, "%"))),
            h("span", { class: "track-knob", style: `left:${rate}%`, "aria-hidden": "true" }, "✳"),
          ),
        ),
        h("div", { class: "panel goal-target" },
          h("span", {}, "목표 정답률"),
          h("b", {}, `${GOAL_RATE}%`)),
      ),
    ];
  }

  // ---------- 홈 ----------
  function viewHome() {
    setNav("home");

    const counts = {};
    articles.forEach((a) => { counts[a.industry] = (counts[a.industry] || 0) + 1; });
    const industryChips = h("div", { class: "chips", role: "group", "aria-label": "산업" },
      chip("전체", articles.length, ui.industry === "all", () => { ui.industry = "all"; viewHome(); }),
      Object.entries(INDUSTRIES)
        .filter(([key]) => counts[key])
        .map(([key, label]) => chip(label, counts[key], ui.industry === key, () => { ui.industry = key; viewHome(); })),
    );
    const statusChips = h("div", { class: "chips", role: "group", "aria-label": "상태" },
      // 목록 배지(노랑 '풀기 전', 초록 '완료')와 같은 이름·색을 쓴다.
      [["all", "모두", null], ["todo", "풀기 전", "yellow"], ["done", "완료", "green"]].map(([key, label, dot]) =>
        chip(label, null, ui.status === key, () => { ui.status = key; viewHome(); }, dot)),
    );

    const list = articles.filter((a) =>
      (ui.industry === "all" || a.industry === ui.industry) &&
      (ui.status === "all" || (ui.status === "done") === Boolean(store.results[a.id])));

    const rows = list.length
      ? h("ul", { class: "panel row-list" }, list.map((a) => h("li", {}, row(a))))
      : h("p", { class: "panel empty" }, ui.status === "todo" ? "이 분야의 퀴즈는 다 풀었어요!" : "기사가 없습니다.");

    render(
      tiles(),
      ...summaryCards(),
      h("div", { class: "filters" }, industryChips, statusChips),
      rows,
    );
  }

  function chip(label, count, pressed, onclick, dot) {
    return h("button", { class: "chip", "aria-pressed": String(pressed), onclick },
      dot ? h("span", { class: `chip-dot ${dot}`, "aria-hidden": "true" }) : null,
      label, count != null ? h("small", {}, count) : null);
  }

  // 목록 한 줄: 제목·출처 / 상태 배지(노랑=풀기 전, 초록=완료) / 점수
  function row(a) {
    const r = store.results[a.id];
    const total = a.quiz.length;
    return h("a", { class: "row", href: `#/a/${encodeURIComponent(a.id)}` },
      h("div", { class: "row-main" },
        h("p", { class: "row-title" }, a.title),
        h("p", { class: "row-sub" }, `${industryLabel(a.industry)} · ${a.source} · ${a.date.slice(5).replace("-", ".")}`),
      ),
      r ? h("span", { class: "pill green" }, r.correct === total ? "만점" : "완료")
        : h("span", { class: "pill yellow" }, "풀기 전"),
      h("span", { class: "row-score" },
        r ? r.correct : "–", h("small", {}, `/${total}`)),
    );
  }

  // ---------- 기사 + 퀴즈 ----------
  function viewArticle(id) {
    setNav("home");
    const a = articles.find((x) => x.id === id);
    if (!a) {
      render(h("p", { class: "empty" }, "기사를 찾을 수 없습니다. ", h("a", { href: "#/" }, "목록으로")));
      return;
    }
    const prev = store.results[a.id];
    const url = safeUrl(a.url);

    const articleEl = h("article", { class: "article" },
      h("div", { class: "meta" },
        h("span", { class: "pill" }, industryLabel(a.industry)),
        h("span", {}, a.date),
        h("span", {}, a.source),
        a.countries && a.countries.length ? h("span", {}, a.countries.join(" · ")) : null,
      ),
      h("h1", {}, a.title),
      h("p", { class: "lead" }, a.lead),
      a.body.map((p) => h("p", {}, p)),
      h("section", {},
        h("h3", {}, "핵심 정리"),
        h("ul", { class: "key-points" }, a.key_points.map((k) => h("li", {}, k))),
      ),
      h("section", {},
        h("h3", {}, "알아둘 무역 개념"),
        h("div", { class: "concepts" }, a.concepts.map((c) =>
          h("div", { class: "concept" }, h("b", {}, c.term), h("p", {}, c.explanation)))),
      ),
      url ? h("section", { class: "source-link" },
        "원문: ", h("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, a.original_title || url)) : null,
    );

    const quizHost = h("div", {});
    const startLabel = prev ? `다시 풀기 (지난 결과 ${prev.correct}/${a.quiz.length})` : "다 읽었어요, 퀴즈 풀기";
    const startBtn = h("button", { class: "primary", onclick: () => startQuiz(a, articleEl, startBtn, quizHost) }, startLabel);

    render(h("a", { class: "back", href: "#/" }, "← 기사 목록"), articleEl, startBtn, quizHost);
  }

  function startQuiz(a, articleEl, startBtn, host) {
    // 퀴즈를 푸는 동안 기사는 접어 두고, 필요하면 다시 펼칠 수 있게 한다.
    articleEl.hidden = true;
    startBtn.hidden = true;
    const toggle = h("button", { class: "secondary", onclick: () => {
      articleEl.hidden = !articleEl.hidden;
      toggle.textContent = articleEl.hidden ? "기사 다시 보기" : "기사 접기";
    } }, "기사 다시 보기");
    const box = h("div", { class: "quiz" });
    host.replaceChildren(h("div", { class: "button-row" }, toggle), box);
    window.scrollTo(0, 0);

    const answers = [];
    const showQuestion = (i) => {
      const q = a.quiz[i];
      const progress = h("div", { class: "progress", "aria-hidden": "true" },
        a.quiz.map((qq, k) => h("span", {
          class: k < i ? (answers[k] === qq.answer_index ? "ok" : "no") : k === i ? "now" : "",
        })));
      const feedback = h("div", {});
      const next = h("div", {});
      const optionEls = q.options.map((text, k) => h("button", {
        class: "option",
        onclick: () => {
          answers[i] = k;
          const right = k === q.answer_index;
          optionEls.forEach((el, j) => {
            el.disabled = true;
            if (j === q.answer_index) el.classList.add("correct");
            else if (j === k) el.classList.add("wrong");
          });
          feedback.replaceWith(h("div", { class: `feedback ${right ? "correct" : "wrong"}` },
            h("b", {}, right ? "정답입니다" : `오답입니다. 정답은 ${q.answer_index + 1}번`),
            h("p", {}, q.explanation)));
          const last = i === a.quiz.length - 1;
          const nextBtn = h("button", { class: "primary", onclick: () => (last ? showResult() : showQuestion(i + 1)) },
            last ? "결과 보기" : "다음 문제");
          next.replaceWith(nextBtn);
          nextBtn.focus();
        },
      }, `${k + 1}. ${text}`));

      box.replaceChildren(
        progress,
        h("p", { class: "meta" }, `문제 ${i + 1} / ${a.quiz.length}`),
        h("p", { class: "question" }, q.question),
        h("div", { class: "options" }, optionEls),
        feedback,
        next,
      );
    };

    const showResult = () => {
      recordResult(a, answers);
      const correct = store.results[a.id].correct;
      const total = a.quiz.length;
      const msg = correct === total ? "완벽해요! 기사를 정확히 이해했어요."
        : correct >= total - 1 ? "좋아요. 틀린 문제의 해설을 확인해 보세요."
        : "기사를 한 번 더 읽고 다시 풀어 보세요.";
      const nextArticle = articles.find((x) => x.id !== a.id && !store.results[x.id] && x.industry === a.industry)
        || articles.find((x) => x.id !== a.id && !store.results[x.id]);

      articleEl.hidden = true;
      host.replaceChildren(h("div", { class: "quiz" },
        h("p", { class: "score" }, `${correct} / ${total}`),
        h("p", { class: "score-msg" }, msg),
        a.quiz.map((q, k) => reviewItem(q, answers[k])),
        h("div", { class: "button-row" },
          h("button", { class: "secondary", onclick: () => viewArticle(a.id) }, "기사 다시 읽기"),
          nextArticle
            ? h("button", { class: "primary", onclick: () => { location.hash = `#/a/${encodeURIComponent(nextArticle.id)}`; } }, "다음 기사")
            : h("button", { class: "primary", onclick: () => { location.hash = "#/"; } }, "목록으로"),
        ),
      ));
      window.scrollTo(0, 0);
    };

    showQuestion(0);
  }

  function reviewItem(q, mine) {
    const right = mine === q.answer_index;
    return h("div", { class: "review-item" },
      h("p", { class: "q" }, `${right ? "⭕" : "❌"} ${q.question}`),
      right ? null : h("p", { class: "a mine" }, `내 답: ${q.options[mine]}`),
      h("p", { class: "a right" }, `정답: ${q.options[q.answer_index]}`),
      h("p", { class: "why" }, q.explanation),
    );
  }

  // ---------- 내 기록 ----------
  function viewMe() {
    setNav("me");
    const byIndustry = {};
    const wrong = [];
    for (const a of articles) {
      const r = store.results[a.id];
      if (!r) continue;
      const row = byIndustry[a.industry] || (byIndustry[a.industry] = { correct: 0, total: 0 });
      row.correct += r.correct;
      row.total += r.answers.length;
      a.quiz.forEach((q, k) => { if (r.answers[k] !== q.answer_index) wrong.push({ a, q, mine: r.answers[k] }); });
    }

    const rows = Object.entries(INDUSTRIES).filter(([key]) => byIndustry[key]);
    const industryPanel = h("div", { class: "panel" },
      h("h2", {}, "산업별 정답률"),
      rows.length ? rows.map(([key, label]) => {
        const { correct, total } = byIndustry[key];
        const pct = Math.round((correct / total) * 100);
        return h("div", { class: "bar-row" },
          h("span", {}, label),
          h("div", { class: "bar", role: "img", "aria-label": `${label} 정답률 ${pct}%` }, h("i", { style: `width:${pct}%` })),
          h("span", {}, `${pct}% (${correct}/${total})`));
      }) : h("p", { class: "meta" }, "아직 푼 퀴즈가 없어요."),
    );

    const wrongPanel = h("div", { class: "panel" },
      h("h2", {}, `오답 노트 (${wrong.length})`),
      wrong.length ? wrong.map(({ a, q, mine }) => h("div", {},
        h("p", { class: "meta" },
          h("span", { class: "pill" }, industryLabel(a.industry)),
          h("a", { href: `#/a/${encodeURIComponent(a.id)}` }, a.title)),
        reviewItem(q, mine),
      )) : h("p", { class: "meta" }, "틀린 문제가 없어요."),
    );

    const reset = h("button", { class: "link-btn", onclick: () => {
      if (!confirm("모든 풀이 기록을 지울까요?")) return;
      store = { results: {}, read: {} };
      saveStore(store);
      viewMe();
    } }, "기록 초기화");

    render(h("h1", { class: "page-title" }, "내 기록"), ...summaryCards(), industryPanel, wrongPanel, h("p", { class: "meta" }, "기록은 이 브라우저에만 저장됩니다. ", reset));
  }

  // ---------- 사설 ----------
  const TOPICS = {
    trade: "무역·통상",
    economy: "경제·금융",
    industry: "산업·기업",
    politics: "정치",
    society: "사회",
    international: "국제",
    other: "기타",
  };
  const topicLabel = (key) => TOPICS[key] || TOPICS.other;

  function viewEditorials() {
    setNav("editorials");
    const papers = [...new Set(editorials.map((e) => e.source))];
    const unread = editorials.filter((e) => !store.read[e.id]).length;
    const list = editorials.filter((e) => ui.paper === "all" || e.source === ui.paper);

    const head = h("div", { class: "panel stat-row" },
      h("div", { class: "stat" }, h("b", {}, editorials.length, h("small", {}, "편")), h("span", {}, "모은 사설")),
      h("div", { class: "stat" }, h("b", {}, unread, h("small", {}, "편")), h("span", {}, "안 읽은 사설")),
      h("div", { class: "stat" }, h("b", {}, papers.length, h("small", {}, "곳")), h("span", {}, "신문사")),
    );
    const chips = h("div", { class: "filters" }, h("div", { class: "chips", role: "group", "aria-label": "신문사" },
      chip("전체", editorials.length, ui.paper === "all", () => { ui.paper = "all"; viewEditorials(); }),
      papers.map((p) => chip(p, editorials.filter((e) => e.source === p).length, ui.paper === p, () => { ui.paper = p; viewEditorials(); })),
    ));
    const rows = list.length
      ? h("ul", { class: "panel row-list" }, list.map((e) => h("li", {},
          h("a", { class: "row", href: `#/e/${encodeURIComponent(e.id)}` },
            h("div", { class: "row-main" },
              h("p", { class: "row-title" }, e.title),
              h("p", { class: "row-sub" }, `${e.source} · ${topicLabel(e.topic)} · ${e.date.slice(5).replace("-", ".")}`),
            ),
            store.read[e.id] ? h("span", { class: "pill green" }, "읽음") : h("span", { class: "pill yellow" }, "안 읽음"),
            h("span", { class: "row-score" }, e.topic === "trade" || e.topic === "economy" ? h("span", { class: "dot", title: "무역·경제 관련" }) : ""),
          ))))
      : h("p", { class: "panel empty" }, editorials.length ? "이 신문사의 사설이 없습니다." : "아직 모은 사설이 없어요. 다음 자동 수집 후에 표시돼요.");

    render(
      h("p", { class: "page-title" }, "신문 사설 — 주장과 근거를 정리해 읽어요"),
      head, chips, rows,
      h("p", { class: "meta note" }, "사설 원문은 신문사 사이트에서 볼 수 있어요. 여기에는 AI가 정리한 요약만 싣습니다."),
    );
  }

  function viewEditorial(id) {
    setNav("editorials");
    const e = editorials.find((x) => x.id === id);
    if (!e) {
      render(h("p", { class: "empty" }, "사설을 찾을 수 없습니다. ", h("a", { href: "#/editorials" }, "목록으로")));
      return;
    }
    const url = safeUrl(e.url);
    const isRead = Boolean(store.read[e.id]);
    const readBtn = h("button", {
      class: isRead ? "secondary done-btn" : "primary",
      onclick: () => {
        if (store.read[e.id]) delete store.read[e.id];
        else store.read[e.id] = new Date().toISOString();
        saveStore(store);
        viewEditorial(e.id);
      },
    }, isRead ? "✓ 읽음 (취소하려면 누르세요)" : "다 읽었어요");

    render(
      h("a", { class: "back", href: "#/editorials" }, "← 사설 목록"),
      h("article", { class: "article" },
        h("div", { class: "meta" },
          h("span", { class: "pill" }, e.source),
          h("span", {}, topicLabel(e.topic)),
          h("span", {}, e.date),
        ),
        h("h1", {}, e.title),
        h("p", { class: "lead" }, e.summary),
        h("section", {},
          h("h3", {}, "신문사의 주장"),
          h("p", {}, e.claim),
        ),
        h("section", {},
          h("h3", {}, "근거"),
          h("ul", { class: "key-points" }, e.reasons.map((r) => h("li", {}, r))),
        ),
        e.counterpoints.length ? h("section", {},
          h("h3", {}, "생각해 볼 점"),
          h("div", { class: "concepts" }, e.counterpoints.map((c) => h("div", { class: "concept" }, h("p", {}, c)))),
        ) : null,
        e.terms.length ? h("section", {},
          h("h3", {}, "알아둘 용어"),
          h("div", { class: "concepts" }, e.terms.map((t) =>
            h("div", { class: "concept plain" }, h("b", {}, t.term), h("p", {}, t.explanation)))),
        ) : null,
        e.trade_link ? h("section", {},
          h("h3", {}, "무역·경제 공부와 연결"),
          h("p", {}, e.trade_link),
        ) : null,
        url ? h("section", { class: "source-link" },
          "원문 읽기: ", h("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, `${e.source} — ${e.title}`)) : null,
      ),
      readBtn,
    );
  }

  // ---------- 라우팅 ----------
  function route() {
    const hash = location.hash || "#/";
    const m = hash.match(/^#\/a\/(.+)$/);
    const em = hash.match(/^#\/e\/(.+)$/);
    if (m) viewArticle(decodeURIComponent(m[1]));
    else if (em) viewEditorial(decodeURIComponent(em[1]));
    else if (hash === "#/editorials") viewEditorials();
    else if (hash === "#/me") viewMe();
    else viewHome();
  }

  const byDateDesc = (x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0);
  // 사설 파일은 없거나 비어 있어도 기사 화면은 동작해야 한다.
  const loadEditorials = fetch("data/editorials.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);

  Promise.all([
    fetch("data/articles.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    loadEditorials,
  ])
    .then(([data, eds]) => {
      articles = data.slice().sort(byDateDesc);
      editorials = Array.isArray(eds) ? eds.slice().sort(byDateDesc) : [];
      window.addEventListener("hashchange", route);
      route();
    })
    .catch(() => {
      render(h("p", { class: "empty" },
        "기사 데이터를 불러오지 못했습니다. 로컬에서 볼 때는 `python3 -m http.server`로 서버를 띄운 뒤 접속하세요."));
    });
})();
