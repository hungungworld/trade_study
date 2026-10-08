// 배경: 밤하늘에 노란 반딧불이가 아주 천천히 떠다니며 은은하게 깜빡이는 효과.
(() => {
  "use strict";

  const canvas = document.getElementById("flow");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // 반딧불이 빛 이미지를 미리 한 번 그려 두고 매 프레임 복사만 한다.
  const SPRITE = 64;
  const sprite = document.createElement("canvas");
  sprite.width = sprite.height = SPRITE;
  {
    const g = sprite.getContext("2d");
    const c = SPRITE / 2;
    const glow = g.createRadialGradient(c, c, 0, c, c, c);
    glow.addColorStop(0, "rgba(255, 246, 196, 1)");
    glow.addColorStop(0.08, "rgba(255, 228, 120, 0.95)");
    glow.addColorStop(0.3, "rgba(245, 200, 70, 0.28)");
    glow.addColorStop(1, "rgba(245, 190, 60, 0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, SPRITE, SPRITE);
  }

  let width = 0;
  let height = 0;
  let flies = [];

  function setup() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = width < 600 ? 16 : 30;
    flies = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      heading: Math.random() * Math.PI * 2,
      speed: 3 + Math.random() * 5, // 초당 픽셀: 아주 느리게
      turn: Math.random() * Math.PI * 2, // 방향을 트는 리듬
      size: 22 + Math.random() * 22, // 빛 번짐 크기
      blink: (Math.PI * 2) / (4000 + Math.random() * 4000), // 4~8초에 한 번 깜빡임
      phase: Math.random() * Math.PI * 2,
    }));
  }

  function brightness(fly, time) {
    // 대부분은 은은하게, 주기마다 한 번 또렷하게 밝아진다.
    const wave = (Math.sin(time * fly.blink + fly.phase) + 1) / 2;
    return 0.15 + 0.85 * wave * wave;
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "lighter";
    for (const fly of flies) {
      ctx.globalAlpha = brightness(fly, time);
      ctx.drawImage(sprite, fly.x - fly.size / 2, fly.y - fly.size / 2, fly.size, fly.size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  let last = 0;
  function frame(time) {
    const dt = last ? Math.min(time - last, 100) / 1000 : 0;
    last = time;
    const margin = 40;
    for (const fly of flies) {
      // 방향을 조금씩 틀며 떠돈다.
      fly.heading += Math.sin(time * 0.0004 + fly.turn) * 0.6 * dt;
      fly.x += Math.cos(fly.heading) * fly.speed * dt;
      fly.y += Math.sin(fly.heading) * fly.speed * dt;
      // 화면 밖으로 나가면 반대편에서 다시 들어온다.
      if (fly.x < -margin) fly.x = width + margin;
      if (fly.x > width + margin) fly.x = -margin;
      if (fly.y < -margin) fly.y = height + margin;
      if (fly.y > height + margin) fly.y = -margin;
    }
    draw(time);
    if (!reduceMotion.matches) requestAnimationFrame(frame);
  }

  function start() {
    setup();
    last = 0;
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
