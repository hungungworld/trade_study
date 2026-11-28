// 사용법 안내: 화면을 어둡게 하고 설명할 부분만 비추며 한 단계씩 보여 준다.
// 처음 방문한 사람에게 홈에서 한 번 자동으로 열리고, 상단 '?' 버튼으로 다시 볼 수 있다.
(() => {
  "use strict";

  const DONE_KEY = "tradeQuiz.tourDone";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // target: 비출 요소. 없으면(예: 기사가 아직 없음) 그 단계는 건너뛴다.
  const STEPS = [
    {
      target: null,
      title: "산업 뉴스 퀴즈에 오신 걸 환영해요",
      text: "매일 산업별 무역 뉴스를 읽고 퀴즈 3문제로 확인하는 곳이에요. 1분이면 사용법을 다 볼 수 있어요.",
    },
    {
      target: () => document.getElementById("today"),
      title: "오늘의 5개",
      text: "최근 기사 중 산업별로 하나씩 골랐어요. 하루에 이것만 풀어도 충분해요. 다 풀면 '오늘 목표 달성!'이 떠요.",
    },
    {
      target: () => document.querySelector("#today .row"),
      title: "기사 읽고 퀴즈 풀기",
      text: "기사를 누르면 AI가 정리한 내용이 나와요. 다 읽고 '다 읽었어요'를 누르면 퀴즈 3문제가 시작돼요. 문제마다 바로 해설을 보여 줘요.",
    },
    {
      target: () => document.querySelector(".tiles"),
      title: "바로가기",
      text: "오늘의 진행도, 최근 7일 동안 안 푼 퀴즈, 틀린 문제를 모은 오답 노트로 바로 갈 수 있어요. 노란 점은 남은 일, 초록 점은 완료예요.",
    },
    {
      target: () => document.querySelector(".stat-row"),
      title: "내 학습 현황",
      text: "푼 기사 수, 정답률, 연속 학습일이에요. 아래 막대로 목표 정답률 80%까지 얼마나 남았는지 볼 수 있어요.",
    },
    {
      target: () => document.querySelector(".filters"),
      title: "기사 찾기",
      text: "기본은 최근 7일 기사만 보여요. 지난 기사, 산업별, 풀기 전·완료로 골라 볼 수 있어요.",
    },
    {
      target: () => document.querySelector('[data-nav="editorials"]'),
      title: "사설",
      text: "신문 사설을 주장, 근거, 생각해 볼 점으로 정리했어요. 시사 감각을 키울 때 좋아요.",
    },
    {
      target: () => document.querySelector('[data-nav="me"]'),
      title: "내 기록",
      text: "산업별 정답률과 오답 노트를 볼 수 있어요. 기록은 지금 쓰는 기기의 브라우저에만 저장돼요.",
    },
    {
      target: () => document.getElementById("tour-btn"),
      title: "다시 보고 싶다면",
      text: "이 버튼을 누르면 언제든 사용법을 다시 볼 수 있어요. 기사는 매일 오전 7시, 오후 6시쯤 새로 올라와요.",
    },
  ];

  let layer = null;
  let spot = null;
  let tip = null;
  let index = 0;
  let current = null;
  let frame = 0;

  const store = {
    done() {
      try { return localStorage.getItem(DONE_KEY) === "1"; } catch (e) { return false; }
    },
    markDone() {
      try { localStorage.setItem(DONE_KEY, "1"); } catch (e) { /* 비공개 창 등 */ }
    },
  };

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function build() {
    layer = el("div", "tour-layer");
    layer.addEventListener("click", (e) => e.stopPropagation());
    spot = el("div", "tour-spot");
    tip = el("div", "tour-tip");
    tip.setAttribute("role", "dialog");
    tip.setAttribute("aria-modal", "true");
    tip.tabIndex = -1;
    document.body.append(layer, spot, tip);
    document.body.classList.add("touring");
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    document.addEventListener("keydown", onKey);
  }

  function close() {
    store.markDone();
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("scroll", schedule, true);
    document.removeEventListener("keydown", onKey);
    [layer, spot, tip].forEach((n) => n?.remove());
    layer = spot = tip = current = null;
    document.body.classList.remove("touring");
    document.getElementById("tour-btn")?.focus();
  }

  function onKey(e) {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowRight" || e.key === "Enter") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
  }

  // 비출 요소가 있는 단계만 센다.
  function available() {
    return STEPS.filter((s) => !s.target || s.target());
  }

  function go(next) {
    const steps = available();
    if (next >= steps.length) return close();
    if (next < 0) return;
    index = next;
    const step = steps[index];
    current = step.target ? step.target() : null;

    tip.replaceChildren(
      el("p", "tour-count", `${index + 1} / ${steps.length}`),
      el("h2", "tour-title", step.title),
      el("p", "tour-text", step.text),
      buttons(steps.length),
    );
    tip.setAttribute("aria-label", step.title);

    if (current) {
      current.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
    }
    place();
    // 부드러운 스크롤이 끝난 뒤 위치를 다시 맞춘다.
    setTimeout(place, 420);
    tip.focus({ preventScroll: true });
  }

  function buttons(total) {
    const row = el("div", "tour-actions");
    const skip = el("button", "tour-skip", index === total - 1 ? "" : "건너뛰기");
    skip.type = "button";
    skip.addEventListener("click", close);
    if (index === total - 1) skip.hidden = true;

    const nav = el("div", "tour-nav");
    if (index > 0) {
      const prev = el("button", "tour-prev", "이전");
      prev.type = "button";
      prev.addEventListener("click", () => go(index - 1));
      nav.append(prev);
    }
    const next = el("button", "tour-next", index === total - 1 ? "시작하기" : index === 0 ? "둘러보기" : "다음");
    next.type = "button";
    next.addEventListener("click", () => go(index + 1));
    nav.append(next);
    row.append(skip, nav);
    return row;
  }

  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(place);
  }

  // 비추는 구멍과 설명 상자 위치를 맞춘다.
  function place() {
    if (!tip) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    if (!current) {
      // 환영 단계: 화면 가운데에 작은 빛만 두고 설명 상자를 가운데 띄운다.
      Object.assign(spot.style, { left: `${vw / 2}px`, top: `${vh / 2}px`, width: "0px", height: "0px" });
      tip.classList.add("center");
      tip.style.left = "";
      tip.style.top = "";
      return;
    }
    tip.classList.remove("center");

    const r = current.getBoundingClientRect();
    const box = {
      left: Math.max(4, r.left - pad),
      top: Math.max(4, r.top - pad),
      right: Math.min(vw - 4, r.right + pad),
      bottom: Math.min(vh - 4, r.bottom + pad),
    };
    Object.assign(spot.style, {
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${Math.max(0, box.right - box.left)}px`,
      height: `${Math.max(0, box.bottom - box.top)}px`,
    });

    // 설명 상자는 비춘 곳 아래에, 자리가 없으면 위에, 그래도 없으면 화면 아래쪽에 둔다.
    const tw = Math.min(340, vw - 24);
    tip.style.width = `${tw}px`;
    const th = tip.offsetHeight;
    const gap = 12;
    let top;
    if (box.bottom + gap + th <= vh - 8) top = box.bottom + gap;
    else if (box.top - gap - th >= 8) top = box.top - gap - th;
    else top = vh - th - 12;
    const center = (box.left + box.right) / 2;
    const left = Math.min(Math.max(12, center - tw / 2), vw - tw - 12);
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function start() {
    if (layer) return;
    index = 0;
    build();
    go(0);
  }

  // 홈 화면이 그려진 뒤 app.js 가 부른다. 처음 방문한 사람에게만 한 번 연다.
  function maybeAutoStart() {
    if (store.done() || layer) return;
    // 화면이 자리를 잡은 뒤 시작한다.
    setTimeout(() => {
      if (!store.done() && !layer && document.getElementById("today")) start();
    }, 600);
  }

  document.getElementById("tour-btn")?.addEventListener("click", () => {
    if (location.hash && location.hash !== "#/") {
      // 홈으로 이동한 뒤, 홈이 그려지면 시작한다.
      location.hash = "#/";
      setTimeout(start, 300);
    } else {
      start();
    }
  });

  window.TradeTour = { start, maybeAutoStart };
})();
