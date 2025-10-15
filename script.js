// script.js - VERSION CORRIGÉE (UTF-8)
(() => {
  // ======================= CƠ BẢN =======================
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rain = document.getElementById("rain");
  const prt  = document.getElementById("particles");
  const rctx = rain.getContext("2d");
  const pctx = prt.getContext("2d");

  let W = window.innerWidth, H = window.innerHeight;

  const cfg = {
    countMax: 60000,   // TĂNG từ 30000 → 60000 để đủ hạt
    formTime: 2.0,
    cycleIndex: 0
  };

  // ======================= MƯA LOVE (khai báo trước) =======================
  const glyphs = ["L", "O", "V", "E"];
  const colWidth = 20;
  let columns = 0;

  class RainCol {
    constructor(x) { this.x = x; this.reset(); }
    reset() {
      this.y = -Math.random() * H;
      this.speed = 120 + Math.random() * 150;
      this.hue = 280 + Math.random() * 60;
      this.alpha = 0.4 + Math.random() * 0.6;
      this.len = 6 + Math.floor(Math.random() * 10);
    }
    step(dt) {
      this.y += this.speed * dt;
      if (this.y - this.len * colWidth > H + 60) this.reset();
    }
    draw(ctx, t) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.font = `bold 18px 'Courier New', monospace`;
      for (let i = 0; i < this.len; i++) {
        const ch = glyphs[(i + Math.floor(t * 16)) % glyphs.length];
        const y = -i * colWidth;
        const a = Math.max(0, this.alpha - i * 0.06);
        ctx.fillStyle = `hsla(${this.hue}, 95%, ${75 - i * 4}%, ${a})`;
        ctx.fillText(ch, 0, y);
      }
      ctx.restore();
    }
  }
  let rainCols = [];
  function rebuildRain() {
    columns = Math.ceil(window.innerWidth / colWidth);
    rainCols = new Array(columns).fill(0).map((_, i) => new RainCol(i * colWidth + 6));
  }

  // ======================= HẠT & TRẠNG THÁI =======================
  const state = { mode: "form", timer: 0, transitionProgress: 0 };
  let particles = [];
  let targets = [];
  let nextTargets = [];

  // ======================= HÌNH TIM =======================
  function buildHeart() {
    const points = [];
    const scale = Math.min(window.innerWidth, window.innerHeight) / 35;

    for (let t = 0; t < Math.PI * 2; t += 0.006) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
      points.push({ x: window.innerWidth / 2 + x * scale, y: window.innerHeight / 2 - y * scale });
    }

    const fill = [];
    for (let layer = 0.12; layer <= 0.92; layer += 0.08) {
      for (let t = 0; t < Math.PI * 2; t += 0.02) {
        const x = (16 * Math.pow(Math.sin(t), 3)) * layer;
        const y = (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t)) * layer;
        fill.push({ x: window.innerWidth/2 + x*scale, y: window.innerHeight/2 - y*scale });
      }
    }

    const attempts = 1200;
    for (let i = 0; i < attempts; i++) {
      const rx = (Math.random() - 0.5) * 18 * scale;
      const ry = (Math.random() - 0.5) * 16 * scale;
      const nx = rx / scale, ny = ry / scale;
      const eq = Math.pow(nx*nx + ny*ny - 1, 3) - nx*nx*Math.pow(ny, 3);
      if (eq <= 0.12) fill.push({ x: window.innerWidth/2 + rx, y: window.innerHeight/2 - ry });
    }

    const all = points.concat(fill);
    for (let i = all.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [all[i], all[j]] = [all[j], all[i]]; }
    return all.slice(0, Math.min(all.length, cfg.countMax));
  }

  // ======================= HÀM CHIA DÒNG =======================
  function splitTextIntoLines(text, maxWidth, ctx) {
    const words = text.trim().split(/\s+/);
    const lines = [];
    let cur = words[0] || "";
    for (let i = 1; i < words.length; i++) {
      const w = words[i];
      const width = ctx.measureText(cur + " " + w).width;
      if (width < maxWidth) cur += " " + w; else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ======================= CHỮ NÉT – KHÔNG CỤT NỬA =======================
  function buildText(txt) {
    const oc = document.createElement("canvas");
    const octx = oc.getContext("2d");

    const outerPad = 80;
    const sf = Math.max(2, Math.round(DPR * 2));
    const maxW = (window.innerWidth - outerPad * 2) * sf;

    let base = txt.length > 50 ? 80 : txt.length > 30 ? 90 : txt.length > 20 ? 100 : 110;
    let fs = base * sf;
    const family = "'Times New Roman','Georgia',serif";

    let lines, ascent, descent, lineGap, lineHeight, textHeight;
    while (true) {
      octx.font = `900 ${fs}px ${family}`;
      lines = splitTextIntoLines(txt, maxW, octx);

      const ms = lines.map(l => octx.measureText(l));
      ascent  = Math.max(...ms.map(m => m.actualBoundingBoxAscent || fs * 0.8));
      descent = Math.max(...ms.map(m => m.actualBoundingBoxDescent || fs * 0.25));
      lineGap = Math.round(fs * 0.20);
      lineHeight = ascent + descent + lineGap;
      textHeight = lineHeight * lines.length - lineGap;

      const widest = Math.max(...ms.map(m => m.width), 1);
      if (widest <= maxW && textHeight <= (window.innerHeight - outerPad * 2) * sf && fs >= 48 * sf) break;
      fs -= 2 * sf;
      if (fs <= 48 * sf) break;
    }

    const marginX = Math.ceil(fs * 0.30);
    const marginY = Math.ceil(fs * 0.55);

    oc.width  = Math.ceil(maxW) + marginX * 2;
    oc.height = Math.ceil(textHeight) + marginY * 2;

    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, oc.width, oc.height);
    octx.imageSmoothingEnabled = false;

    octx.textAlign = "center";
    octx.textBaseline = "alphabetic";
    octx.font = `900 ${fs}px ${family}`;
    octx.lineJoin = "round";
    octx.lineCap  = "round";
    octx.lineWidth = Math.max(2, Math.round(fs * 0.06));
    octx.strokeStyle = "#ffffff";
    octx.fillStyle   = "#ffffff";

    const cx = oc.width / 2;
    let baselineY = marginY + ascent;
    for (const line of lines) {
      octx.strokeText(line, cx, baselineY);
      octx.fillText(line,   cx, baselineY);
      baselineY += lineHeight;
    }

    // Lấy mẫu theo alpha - GIẢM STEP để dày hơn
    const img = octx.getImageData(0, 0, oc.width, oc.height).data;
    const pts = [];

    // THAY ĐỔI QUAN TRỌNG: giảm step từ 1.0 → 0.5 để lấy nhiều điểm hơn
    const step = Math.max(1, Math.round(sf * 0.5));

    const usableW = (oc.width  - marginX * 2) / sf;
    const usableH = (oc.height - marginY * 2) / sf;
    const screenLeft = outerPad + (window.innerWidth - outerPad * 2 - usableW) / 2;
    const screenTop  = (window.innerHeight - usableH) / 2;

    for (let y = 0; y < oc.height; y += step) {
      for (let x = 0; x < oc.width; x += step) {
        const a = img[(y * oc.width + x) * 4 + 3];
        if (a > 32) {
          const gx = screenLeft + (x - marginX) / sf;
          const gy = screenTop  + (y - marginY) / sf;
          pts.push({ x: Math.round(gx), y: Math.round(gy) });
          if (pts.length >= cfg.countMax) break;
        }
      }
      if (pts.length >= cfg.countMax) break;
    }

    for (let i = pts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    return pts;
  }

  // ======================= PHẦN TỬ HẠT =======================
  function makeParticle() {
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      startX: 0, startY: 0,
      targetX: 0, targetY: 0
    };
  }

  function scatter(reset = false) {
    const need = targets.length - particles.length;
    for (let i = 0; i < need; i++) particles.push(makeParticle());
    if (particles.length > targets.length) particles.length = targets.length;

    particles.forEach((p, i) => {
      if (reset) {
        p.x = Math.random() * window.innerWidth;
        p.y = window.innerHeight + Math.random() * 80;
      }
      p.startX = p.x; p.startY = p.y;
      const tgt = targets[i];
      if (tgt) { p.targetX = tgt.x; p.targetY = tgt.y; }
    });

    state.mode = "form";
    state.timer = 0;
    state.transitionProgress = 0;
  }

  // ======================= CHU TRÌNH =======================
  function currentTargetBuilder() {
    if (cfg.cycleIndex === 0) return buildHeart();
    if (cfg.cycleIndex === 1) return buildText("LÀM NGƯỜI YÊU ANH NHÉ");
    if (cfg.cycleIndex === 2) return buildText("KHÁNH HÒA");
    if (cfg.cycleIndex === 3) return buildText("ANH THÍCH EM RẤT NHIỀU");
    if (cfg.cycleIndex === 4) return buildText("ANH MUỐN ĐƯỢC YÊU EM");
    if (cfg.cycleIndex === 5) return buildText("MUỐN ĐƯỢC Ở BÊN QUAN TÂM CHĂM SÓC CHO HÒA CẢ ĐỜI");
    if (cfg.cycleIndex === 6) return buildText("ANH YÊU EM");
    return buildHeart();
  }

  function nextPhase() {
    cfg.cycleIndex = (cfg.cycleIndex + 1) % 8;
    nextTargets = currentTargetBuilder();

    state.mode = "transition_out";
    state.timer = 0;
    state.transitionProgress = 0;

    particles.forEach(p => { p.startX = p.x; p.startY = p.y; });
  }

  // ======================= LOOP =======================
  let last = performance.now();
  function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    rctx.clearRect(0, 0, W, H);
    rainCols.forEach((c) => { c.step(dt); c.draw(rctx, now / 1000); });

    pctx.clearRect(0, 0, W, H);
    stepParticles(dt);
    drawParticles();

    requestAnimationFrame(tick);
  }

  function stepParticles(dt) {
    if (state.mode === "form") {
      state.timer += dt;
      const t = Math.min(1, state.timer / cfg.formTime);
      const ease = 1 - Math.pow(1 - t, 3);
      particles.forEach((p, i) => {
        const tgt = targets[i];
        if (!tgt) return;
        p.x = p.startX + (tgt.x - p.startX) * ease;
        p.y = p.startY + (tgt.y - p.startY) * ease;
      });
      if (t >= 1) { state.mode = "stable"; state.timer = 0; }
      return;
    }

    if (state.mode === "stable") {
      state.timer += dt;
      if (state.timer > 3.2) nextPhase();
      return;
    }

    if (state.mode === "transition_out") {
      state.timer += dt;
      state.transitionProgress = Math.min(1, state.timer / 1.1);
      const k = state.transitionProgress;
      particles.forEach((p) => {
        const cx = window.innerWidth/2, cy = window.innerHeight/2;
        const dx = p.x - cx, dy = p.y - cy;
        const dist = Math.hypot(dx, dy);
        const ang  = Math.atan2(dy, dx);
        const nd = dist + k * 60;
        p.x = cx + Math.cos(ang) * nd;
        p.y = cy + Math.sin(ang) * nd;
      });

      if (k >= 1) {
        targets = nextTargets;
        state.mode = "transition_in";
        state.timer = 0;
        state.transitionProgress = 0;
        particles.forEach((p, i) => {
          p.startX = p.x; p.startY = p.y;
          const tgt = targets[i];
          if (tgt) { p.targetX = tgt.x; p.targetY = tgt.y; }
        });
      }
      return;
    }

    if (state.mode === "transition_in") {
      state.timer += dt;
      state.transitionProgress = Math.min(1, state.timer / 1.2);
      const e = 1 - Math.pow(1 - state.transitionProgress, 3);
      particles.forEach((p) => {
        p.x = p.startX + (p.targetX - p.startX) * e;
        p.y = p.startY + (p.targetY - p.startY) * e;
      });
      if (state.transitionProgress >= 1) { state.mode = "stable"; state.timer = 0; }
    }
  }

  // THAY ĐỔI: tăng kích thước hạt từ 1x1 → 2x2
  function drawParticles() {
    pctx.save();
    pctx.globalAlpha = 1;
    pctx.shadowColor = "transparent";
    pctx.shadowBlur = 0;
    pctx.imageSmoothingEnabled = false;
    pctx.fillStyle = "#ffffff";
    for (let i = 0; i < particles.length; i++) {
      const x = Math.round(particles[i].x);
      const y = Math.round(particles[i].y);
      pctx.fillRect(x, y, 2, 2); // TĂNG từ 1,1 → 2,2
    }
    pctx.restore();
  }

  // ======================= Resize & Khởi tạo =======================
  function resize() {
    W = rain.width = prt.width = Math.floor(window.innerWidth * DPR);
    H = rain.height = prt.height = Math.floor(window.innerHeight * DPR);

    rain.style.width = prt.style.width = window.innerWidth + "px";
    rain.style.height = prt.style.height = window.innerHeight + "px";

    rctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    pctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    rebuildRain();

    targets = currentTargetBuilder();
    scatter(false);
  }

  window.addEventListener("resize", resize);

  resize();
  requestAnimationFrame(tick);
})();