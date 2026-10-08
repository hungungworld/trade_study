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
  const ui = { industry: "all", status: "all" };

  // ---------- 저장소 (브라우저 localStorage) ----------
  function loadStore() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data && typeof data.results === "object") return data;
    } catch (e) { /* 비공개 창 등에서는 기록 없이 동작 */ }
    return { results: {} };
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

  // 상단 숫자 카드와 목표 막대 (홈·내 기록 공통)
  function summaryCards() {
    const s = stats();
    const stat = (value, unit, caption) => h("div", { class: "stat" },
      h("b", {}, value, h("small", {}, unit)), h("span", {}, caption));
    const rate = s.rate ?? 0;
    return [
      h("div", { class: "panel stat-row" },
        stat(s.solved, "개", "푼 기사"),
        stat(s.rate == null ? "-" : s.rate, s.rate == null ? "" : "%", "정답률"),
        stat(s.streak, "일", "연속 학습"),
      ),
      h("div", { class: "goal-row" },
        h("div", { class: "panel goal-bar" },
          h("div", { class: "track", role: "img", "aria-label": `정답률 ${rate}%, 목표 ${GOAL_RATE}%` },
            h("i", { style: `width:${Math.max(rate, 0)}%` }),
            h("span", { class: "track-label" }, s.rate == null ? "아직 기록 없음" : `${rate}%`),
            h("span", { class: "track-goal", style: `left:${GOAL_RATE}%` }),
          ),
        ),
        h("div", { class: "panel goal-target" }, h("span", {}, "목표 정답률"), h("b", {}, `${GOAL_RATE}%`)),
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
      [["all", "모든 상태"], ["todo", "안 푼 기사"], ["done", "푼 기사"]].map(([key, label]) =>
        chip(label, null, ui.status === key, () => { ui.status = key; viewHome(); })),
    );

    const list = articles.filter((a) =>
      (ui.industry === "all" || a.industry === ui.industry) &&
      (ui.status === "all" || (ui.status === "done") === Boolean(store.results[a.id])));

    const rows = list.length
      ? h("ul", { class: "panel row-list" }, list.map((a) => h("li", {}, row(a))))
      : h("p", { class: "panel empty" }, ui.status === "todo" ? "이 분류의 기사는 모두 풀었어요." : "기사가 없습니다.");

    render(
      h("h1", { class: "page-title" }, "오늘의 무역 뉴스"),
      ...summaryCards(),
      h("div", { class: "filters" }, industryChips, statusChips),
      rows,
    );
  }

  function chip(label, count, pressed, onclick) {
    return h("button", { class: "chip", "aria-pressed": String(pressed), onclick },
      label, count != null ? h("small", {}, count) : null);
  }

  function row(a) {
    const r = store.results[a.id];
    return h("a", { class: "row", href: `#/a/${encodeURIComponent(a.id)}` },
      h("div", { class: "row-main" },
        h("p", { class: "row-title" }, a.title),
        h("p", { class: "row-sub" }, `${a.source} · ${a.date}`),
      ),
      h("span", { class: `pill pill-${a.industry in INDUSTRIES ? a.industry : "general"}` }, industryLabel(a.industry)),
      r ? h("span", { class: "row-score done" }, h("span", { class: "dot", "aria-hidden": "true" }), `${r.correct}/${a.quiz.length}`)
        : h("span", { class: "row-score" }, `${a.quiz.length}문제`),
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
        h("span", { class: `pill pill-${a.industry in INDUSTRIES ? a.industry : "general"}` }, industryLabel(a.industry)),
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
          h("span", { class: `pill pill-${a.industry in INDUSTRIES ? a.industry : "general"}` }, industryLabel(a.industry)),
          h("a", { href: `#/a/${encodeURIComponent(a.id)}` }, a.title)),
        reviewItem(q, mine),
      )) : h("p", { class: "meta" }, "틀린 문제가 없어요."),
    );

    const reset = h("button", { class: "link-btn", onclick: () => {
      if (!confirm("모든 풀이 기록을 지울까요?")) return;
      store = { results: {} };
      saveStore(store);
      viewMe();
    } }, "기록 초기화");

    render(h("h1", { class: "page-title" }, "내 기록"), ...summaryCards(), industryPanel, wrongPanel, h("p", { class: "meta" }, "기록은 이 브라우저에만 저장됩니다. ", reset));
  }

  // ---------- 라우팅 ----------
  function route() {
    const hash = location.hash || "#/";
    const m = hash.match(/^#\/a\/(.+)$/);
    if (m) viewArticle(decodeURIComponent(m[1]));
    else if (hash === "#/me") viewMe();
    else viewHome();
  }

  fetch("data/articles.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      articles = data.slice().sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
      window.addEventListener("hashchange", route);
      route();
    })
    .catch(() => {
      render(h("p", { class: "empty" },
        "기사 데이터를 불러오지 못했습니다. 로컬에서 볼 때는 `python3 -m http.server`로 서버를 띄운 뒤 접속하세요."));
    });
})();
