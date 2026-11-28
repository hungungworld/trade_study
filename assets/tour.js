// 사용법 안내: 화면을 어둡게 하고 설명할 부분만 비추며 한 단계씩 보여 준다.
// 처음 방문한 사람에게 홈에서 한 번 자동으로 열리고, 상단 '?' 버튼으로 다시 볼 수 있다.
(() => {
  "use strict";

  const DONE_KEY = "tradeQuiz.tourDone";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // 화면 높이의 이 비율보다 긴 요소는 윗부분만 비춘다.
  const TALL = 0.55;

  // target: 비출 요소. 없으면(예: 기사가 아직 없음) 그 단계는 건너뛴다.
  const STEPS = [
    {
      target: null,
      title: "산업 뉴스 퀴즈 시작하기",
      text: "산업별 무역 뉴스를 AI가 정리하고, 퀴즈 3문제로 이해도를 점검하는 학습 서비스입니다. 주요 기능을 1분 안에 안내해 드릴게요.",
    },
    {
      target: () => document.getElementById("today"),
      title: "오늘의 5개",
      text: "최근 기사 중 산업별로 1개씩, 하루 학습 분량 5개를 추천합니다. 5개를 모두 풀면 오늘의 목표가 완료됩니다.",
    },
    {
      target: () => document.querySelector("#today .row"),
      title: "기사 읽고 퀴즈 풀기",
      text: "기사를 선택하면 핵심 내용과 관련 무역 개념이 정리되어 나옵니다. 끝까지 읽고 '다 읽었어요'를 누르면 퀴즈 3문제가 시작되며, 문제마다 해설을 확인할 수 있습니다.",
    },
    {
      target: () => document.querySelector(".tiles"),
      title: "바로가기",
      text: "오늘의 진행도, 최근 7일 동안 풀지 않은 퀴즈, 오답 노트로 바로 이동합니다. 노란 점은 남은 학습, 초록 점은 완료를 뜻합니다.",
    },
    {
      target: () => document.querySelector(".stat-row"),
      title: "학습 현황",
      text: "푼 기사 수, 정답률, 연속 학습일을 보여 줍니다. 아래 막대에서 목표 정답률 80%까지의 진행 상황을 확인하세요.",
    },
    {
      target: () => document.querySelector(".filters"),
      title: "기사 찾기",
      text: "기본 목록은 최근 7일 기사입니다. 지난 기사, 산업, 풀이 상태별로 원하는 기사를 골라 볼 수 있습니다.",
    },
    {
      target: () => document.querySelector('[data-nav="editorials"]'),
      title: "사설",
      text: "주요 신문 사설을 주장, 근거, 쟁점으로 정리했습니다. 같은 이슈를 신문사마다 어떻게 보는지 비교해 보세요.",
    },
    {
      target: () => document.querySelector('[data-nav="me"]'),
      title: "내 기록",
      text: "산업별 정답률과 틀린 문제를 모아 봅니다. 기록은 지금 사용하는 기기의 브라우저에 저장됩니다.",
    },
    {
      target: () => document.getElementById("tour-btn"),
      title: "안내 다시 보기",
      text: "이 버튼으로 언제든 안내를 다시 볼 수 있습니다. 새 기사는 매일 오전 7시와 오후 6시쯤 업데이트됩니다.",
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
      // 화면보다 긴 요소는 윗부분이 보이도록 위쪽에 맞춘다(아래에 설명 상자 자리를 남김).
      const tall = current.getBoundingClientRect().height > window.innerHeight * TALL;
      current.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: tall ? "start" : "center" });
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
    const next = el("button", "tour-next", index === total - 1 ? "학습 시작" : index === 0 ? "안내 시작" : "다음");
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
    // 긴 요소는 윗부분만 비춰서, 설명 상자가 비춘 영역을 가리지 않고 그 아래에 놓이게 한다.
    if (r.height > vh * TALL) box.bottom = Math.min(box.bottom, box.top + vh * 0.5);
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
