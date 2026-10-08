// 배경: 흰 선 수백 개가 모래시계 모양으로 흐르고, 선을 따라 빛 점이 오가는 효과.
// 넓은 화면은 좌우로, 세로로 긴 화면은 위아래로 퍼진다.
(() => {
  "use strict";

  const canvas = document.getElementById("flow");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const LEVELS = 5;
  const levelAlpha = (i) => 0.035 + (i / (LEVELS - 1)) * 0.08;

  // 빛 점 이미지를 미리 한 번 그려 두고 매 프레임 복사만 한다.
  const spark = document.createElement("canvas");
  spark.width = spark.height = 20;
  {
    const g = spark.getContext("2d");
    const glow = g.createRadialGradient(10, 10, 0, 10, 10, 10);
    glow.addColorStop(0, "rgba(255,255,255,0.95)");
    glow.addColorStop(0.35, "rgba(255,255,255,0.35)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, 20, 20);
  }

  let width = 0;
  let height = 0;
  let lines = [];
  let sparks = [];

  // 0~1 난수를 고정값으로 만들어 새로 고침해도 모양이 같게 한다.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  function setup() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    seed = 7;
    const count = width < 600 ? 280 : 560;
    // 난수 세 개의 평균: 가운데에 몰리고 바깥으로 갈수록 성기다.
    const centered = () => (rand() + rand() + rand()) / 3;
    lines = Array.from({ length: count }, () => ({
      a: centered(), // 시작 쪽 위치 (0~1)
      b: centered(), // 끝 쪽 위치 (0~1)
      waist: (centered() - 0.5) * 0.14, // 허리 부분에서 살짝 흩어짐
      speed: 0.00004 + rand() * 0.00008,
      phase: rand() * Math.PI * 2,
      // 밝기를 몇 단계로 나눠 같은 단계끼리 한 번에 그린다(성능).
      level: Math.floor(rand() * LEVELS),
    }));
    sparks = Array.from({ length: width < 600 ? 22 : 40 }, () => ({
      line: Math.floor(rand() * count),
      t: rand(),
      speed: 0.0008 + rand() * 0.0016,
      dir: rand() < 0.5 ? 1 : -1,
    }));
  }

  // 선 하나의 세 점(시작, 허리, 끝)을 시간에 따라 계산한다.
  function curve(line, time) {
    const horizontal = width >= height;
    const long = horizontal ? width : height; // 흐르는 방향 길이
    const short = horizontal ? height : width; // 퍼지는 방향 길이
    const sway = Math.sin(time * line.speed + line.phase);
    const spread = short * 2.6;
    const start = (line.a - 0.5) * spread + sway * short * 0.04;
    const end = (line.b - 0.5) * spread - sway * short * 0.04;
    const mid = short * (line.waist + Math.sin(time * 0.00012) * 0.02);
    const c = short / 2;
    // [흐르는 방향 좌표, 퍼지는 방향 좌표]
    const pts = [
      [-long * 0.05, c + start],
      [long * 0.5, c + mid],
      [long * 1.05, c + end],
    ];
    return horizontal ? pts : pts.map(([x, y]) => [y, x]);
  }

  // 시작 → 허리 → 끝을 지나는 2차 베지어의 제어점
  const control = (p0, p1, p2) => [2 * p1[0] - (p0[0] + p2[0]) / 2, 2 * p1[1] - (p0[1] + p2[1]) / 2];

  function pointAt(p0, cp, p2, t) {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * cp[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * cp[1] + t * t * p2[1]];
  }

  function draw(time) {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);
    // 겹치는 선이 더해져 가운데가 하얗게 뭉치도록 한다.
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 0.8;
    const geo = new Array(lines.length);
    const paths = Array.from({ length: LEVELS }, () => new Path2D());
    lines.forEach((line, i) => {
      const [p0, p1, p2] = curve(line, time);
      const cp = control(p0, p1, p2);
      const path = paths[line.level];
      path.moveTo(p0[0], p0[1]);
      path.quadraticCurveTo(cp[0], cp[1], p2[0], p2[1]);
      geo[i] = [p0, cp, p2];
    });
    paths.forEach((path, i) => {
      ctx.strokeStyle = `rgba(255,255,255,${levelAlpha(i)})`;
      ctx.stroke(path);
    });

    // 정보가 오가는 느낌의 빛 점
    for (const s of sparks) {
      const [p0, cp, p2] = geo[s.line];
      const [x, y] = pointAt(p0, cp, p2, s.t);
      ctx.drawImage(spark, x - 10, y - 10);
    }
  }

  let last = 0;
  // 처음 90프레임의 평균 프레임 시간을 재서, 느린 기기면 선을 절반으로 줄인다.
  let sampled = 0;
  let sampleSum = 0;
  function frame(time) {
    const raw = last ? time - last : 16;
    const dt = Math.min(raw, 50);
    last = time;
    if (sampled < 90) {
      sampleSum += raw;
      sampled += 1;
      if (sampled === 90 && sampleSum / 90 > 34 && lines.length > 120) {
        lines = lines.filter((_, i) => i % 2 === 0);
        for (const s of sparks) s.line %= lines.length;
      }
    }
    for (const s of sparks) {
      s.t += s.speed * s.dir * (dt / 16);
      if (s.t > 1 || s.t < 0) {
        // 끝에 닿으면 다른 선에서 다시 출발
        s.dir = Math.random() < 0.5 ? 1 : -1;
        s.t = s.dir > 0 ? 0 : 1;
        s.line = Math.floor(Math.random() * lines.length);
      }
    }
    draw(time);
    if (!reduceMotion.matches) requestAnimationFrame(frame);
  }

  function start() {
    setup();
    sampled = 0;
    sampleSum = 0;
    if (reduceMotion.matches) draw(0); // 동작 줄이기 설정이면 멈춘 그림만
    else requestAnimationFrame(frame);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setup();
      if (reduceMotion.matches) draw(0);
    }, 150);
  });
  reduceMotion.addEventListener?.("change", start);
  start();
})();
