// script.js – Pink theme + chữ nét hồng + nền sáng hơn
// Nhịp tim CHẬM & NHẸ (đã giảm BPM, biên độ & scale)

(() => {
  const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rain = document.getElementById("rain");
  const prt  = document.getElementById("particles");
  const rctx = rain.getContext("2d");
  const pctx = prt.getContext("2d");
  let W = window.innerWidth, H = window.innerHeight;

  const cfg = {
    // ===== Hiệu ứng & chu kỳ =====
    countMax: 60000,
    dotSize: 2.6,
    formTime: 1.9,   // chậm gom vào hình hơn
    stableTime: 4.0, // giữ cảnh lâu hơn
    cycleIndex: 0,

    // ===== Lớp chữ nền (mượt, rõ) =====
    textAssistAlpha: 0.96,
    textStrokeScale: 0.06,   // 6% size font
    textAppearDur: 0.9,      // 0.6–1.2s
    textAppearStyle: "wipe", // "wipe" | "fade" | "scale"
    textAppearFrom: "left",
    textAppearMaxBlur: 2.0,

    // ===== Nhịp tim (CHẬM & NHẸ) =====
    heartBpm: 56,
    textBpm: 56,
    heartPulseAmp: 1.4,
    textPulseAmp: 0.7,
    heartScale: 0.010,
    textScale: 0.004,

    // ===== Màu sắc (Pink theme) =====
    colors: {
      textFill:   "#ffd6ec",  // hồng nhạt fill
      textStroke: "#ff5aa5",  // viền hồng tươi
      particle:       "#ff5aa5",                // hạt hồng
      particleGlow:   3,                        // 0 tắt glow, 2–4 đẹp
      rainHueMin: 322,  // hồng
      rainHueMax: 344   // hồng ngả tím
    }
  };

  // ================= LOVE Rain (nền) =================
  const glyphs = ["L","O","V","E"];
  const colStep = 22;
  class RainCol {
    constructor(x){ this.x=x; this.reset(); }
    reset(){
      this.y = -Math.random()*H;
      this.speed = 130 + Math.random()*160;
      const span = cfg.colors.rainHueMax - cfg.colors.rainHueMin;
      this.hue = cfg.colors.rainHueMin + Math.random()*span;
      this.alpha = 0.55 + Math.random()*0.35; // sáng hơn bản cũ
      this.len = 6 + (Math.random()*10|0);
    }
    step(dt){ this.y += this.speed*dt; if (this.y - this.len*colStep > H+80) this.reset(); }
    draw(ctx, t){
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.font = `bold 18px 'Courier New', monospace`;
      for (let i=0;i<this.len;i++){
        const ch = glyphs[(i + (t*16|0)) % glyphs.length];
        const y = -i*colStep;
        const a = Math.max(0, this.alpha - i*0.06);
        const L = Math.max(60, 86 - i*3);
        ctx.fillStyle = `hsla(${this.hue},96%,${L}%,${a})`;
        ctx.fillText(ch, 0, y);
      }
      ctx.restore();
    }
  }
  let rainCols = [];
  function rebuildRain(){
    rainCols = [];
    const n = Math.ceil(W/colStep);
    for (let i=0;i<n;i++) rainCols.push(new RainCol(i*colStep+8));
  }

  // ================= Particles & state =================
  const state = { mode: "form", timer: 0, textAssist: null };
  let particles = [];
  let targets = [];
  let nextTargets = [];

  function makeParticle(){
    return { x:Math.random()*W, y:Math.random()*H, startX:0, startY:0, targetX:0, targetY:0 };
  }
  function scatter(reset=false){
    const need = targets.length - particles.length;
    for (let i=0;i<need;i++) particles.push(makeParticle());
    if (particles.length > targets.length) particles.length = targets.length;
    particles.forEach((p,i)=>{
      if (reset){ p.x=Math.random()*W; p.y=H+Math.random()*100; }
      p.startX=p.x; p.startY=p.y;
      const t = targets[i]; if (t){ p.targetX=t.x; p.targetY=t.y; }
    });
    state.mode="form"; state.timer=0;
  }

  // ================= Shapes =================
  function buildHeart(){
    state.textAssist = null; // tim không vẽ chữ nền
    const out = [];
    const s = Math.min(W,H)/35;
    for (let t=0;t<Math.PI*2;t+=0.006){
      const x = 16*Math.pow(Math.sin(t),3);
      const y = 13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t);
      out.push({x: W/2 + x*s, y: H/2 - y*s});
    }
    for (let k=0.12;k<=0.92;k+=0.08){
      for (let t=0;t<Math.PI*2;t+=0.02){
        const x = (16*Math.pow(Math.sin(t),3))*k;
        const y = (13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*k;
        out.push({x: W/2 + x*s, y: H/2 - y*s});
      }
    }
    const tries = 1200;
    for (let i=0;i<tries;i++){
      const rx = (Math.random()-0.5)*18*s;
      const ry = (Math.random()-0.5)*16*s;
      const nx = rx/s, ny = ry/s;
      const eq = Math.pow(nx*nx+ny*ny-1,3) - nx*nx*Math.pow(ny,3);
      if (eq <= 0.12) out.push({x: W/2 + rx, y: H/2 - ry});
    }
    shuffle(out);
    return out.slice(0, Math.min(out.length, cfg.countMax));
  }

  // ---- helpers (text) ----
  function splitTextIntoLines(text, maxWidth, ctx){
    const words = text.trim().split(/\s+/);
    const lines = [];
    let cur = words[0] || "";
    for (let i=1;i<words.length;i++){
      const w = words[i];
      if (ctx.measureText(cur+" "+w).width <= maxWidth) cur += " "+w;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function buildText(txt){
    // Render chữ nét lên offscreen canvas (hồng)
    const oc = document.createElement("canvas");
    const octx = oc.getContext("2d");
    const outerPad = 80;
    const sf = Math.max(2, Math.round(DPR*2)); // scale cao -> mép mượt
    const maxW = (W - outerPad*2) * sf;

    let fs = (txt.length>50?80:txt.length>30?90:txt.length>20?100:110) * sf;
    const family = "'Times New Roman','Georgia',serif";
    let lines, ascent, descent, lineGap, lineH, textH, metrics;
    while (true){
      octx.font = `900 ${fs}px ${family}`;
      lines = splitTextIntoLines(txt, maxW, octx);
      metrics = lines.map(l => octx.measureText(l));
      ascent  = Math.max(...metrics.map(m => m.actualBoundingBoxAscent || fs*0.8));
      descent = Math.max(...metrics.map(m => m.actualBoundingBoxDescent || fs*0.25));
      lineGap = Math.round(fs*0.18);
      lineH   = ascent + descent + lineGap;
      textH   = lineH*lines.length - lineGap;
      const widest = Math.max(...metrics.map(m => m.width),1);
      if (widest <= maxW && textH <= (H - outerPad*2)*sf && fs >= 48*sf) break;
      fs -= 2*sf;
      if (fs <= 48*sf) break;
    }

    const marginX = Math.ceil(fs*0.40);
    const marginY = Math.ceil(fs*0.70);

    oc.width  = Math.ceil(maxW) + marginX*2;
    oc.height = Math.ceil(textH) + marginY*2;

    octx.setTransform(1,0,0,1,0,0);
    octx.clearRect(0,0,oc.width,oc.height);
    octx.imageSmoothingEnabled = true;
    octx.textAlign = "center";
    octx.textBaseline = "alphabetic";
    octx.font = `900 ${fs}px ${family}`;

    // Hồng: fill + stroke
    octx.fillStyle = cfg.colors.textFill;
    octx.strokeStyle = cfg.colors.textStroke;
    octx.lineJoin = "round";
    octx.lineCap  = "round";
    octx.lineWidth = Math.max(2, Math.round(fs*cfg.textStrokeScale));

    const cx = oc.width/2;
    let baselineY = marginY + ascent;
    for (const line of lines){
      octx.fillText(line,   cx, baselineY);
      octx.strokeText(line, cx, baselineY);
      baselineY += lineH;
    }

    // Dynamic sampling để không vượt countMax
    const img = octx.getImageData(0,0,oc.width,oc.height).data;
    const predict = (step) => {
      let hits = 0;
      for (let y=0;y<oc.height;y+=step){
        for (let x=0;x<oc.width;x+=step){
          const a = img[(y*oc.width + x)*4 + 3];
          if (a>32) hits++;
        }
      }
      return hits*2;
    };

    let step = Math.max(1, Math.round(sf*0.6));
    let estimate = predict(step);
    let guard = 0;
    while (estimate > cfg.countMax && guard < 24){
      step += 1;
      estimate = predict(step);
      guard++;
    }

    // vị trí giữa màn hình
    const usableW = (oc.width - marginX*2)/sf;
    const usableH = (oc.height - marginY*2)/sf;
    const screenLeft = outerPad + (W - outerPad*2 - usableW)/2;
    const screenTop  = (H - usableH)/2;

    state.textAssist = {
      canvas: oc,
      sx: marginX, sy: marginY,
      sw: oc.width - marginX*2,
      sh: oc.height - marginY*2,
      dx: screenLeft,
      dy: screenTop,
      dw: usableW,
      dh: usableH,
      appearAt: performance.now() / 1000
    };

    // sinh mục tiêu hạt
    const pts = [];
    function addPoint(px, py){
      const x = Math.min(W-2, Math.max(1, px));
      const y = Math.min(H-2, Math.max(1, py));
      pts.push({x, y});
    }
    for (let y=0; y<oc.height; y+=step){
      for (let x=0; x<oc.width; x+=step){
        const a = img[(y*oc.width + x)*4 + 3];
        if (a>32){
          const gx = screenLeft + (x - marginX)/sf;
          const gy = screenTop  + (y - marginY)/sf;
          addPoint(gx, gy);
          addPoint(gx+0.6, gy);
        }
      }
    }
    if (pts.length > cfg.countMax){
      const ratio = cfg.countMax / pts.length;
      const compact = [];
      let acc = 0;
      for (let i=0;i<pts.length;i++){
        acc += ratio;
        if (acc >= 1){ compact.push(pts[i]); acc -= 1; }
      }
      shuffle(compact);
      return compact;
    }
    shuffle(pts);
    return pts;
  }

  function shuffle(arr){
    for (let i=arr.length-1;i>0;i--){
      const j = (Math.random()*(i+1))|0;
      [arr[i],arr[j]]=[arr[j],arr[i]];
    }
  }

  // ================= Scenes =================
  function currentTargetBuilder(){
    if (cfg.cycleIndex === 0) return buildHeart();
    if (cfg.cycleIndex === 1) return buildText("LÀM NGƯỜI YÊU ANH NHÉ");
    if (cfg.cycleIndex === 2) return buildText("KHÁNH HÒA");
    if (cfg.cycleIndex === 3) return buildText("ANH THÍCH EM RẤT NHIỀU");
    if (cfg.cycleIndex === 4) return buildText("ANH MUỐN ĐƯỢC YÊU EM");
    if (cfg.cycleIndex === 5) return buildText("MUỐN ĐƯỢC Ở BÊN QUAN TÂM CHĂM SÓC CHO HÒA CẢ ĐỜI");
    if (cfg.cycleIndex === 6) return buildText("ANH YÊU EM");
    return buildHeart();
  }
  function nextPhase(){
    cfg.cycleIndex = (cfg.cycleIndex + 1) % 8;
    nextTargets = currentTargetBuilder();
    state.mode = "transition_out";
    state.timer = 0;
    particles.forEach(p=>{ p.startX=p.x; p.startY=p.y; });
  }

  // ================= Heartbeat =================
  function heartbeat(t, bpm){
    const phase = (t * bpm / 60) % 1;
    const g = (x, mu, w) => Math.exp(-0.5 * Math.pow((x-mu)/w, 2));
    const a = 1.00 * g(phase, 0.10, 0.035) + 0.85 * g(phase, 0.32, 0.050);
    return Math.min(1, a * 1.2);
  }
  function pulseShift(t, amp, m){
    const base = m * amp;
    return { x: base * Math.sin(t * 14.0), y: base * 0.6 * Math.cos(t * 11.3) };
  }
  const easeOut = (x)=>1-Math.pow(1-x,2);

  // ================= Loop =================
  let last = performance.now();
  function tick(now){
    const dt = Math.min(0.033, (now-last)/1000);
    last = now;

    rctx.clearRect(0,0,W,H);
    rainCols.forEach(c=>{ c.step(dt); c.draw(rctx, now/1000); });

    pctx.clearRect(0,0,W,H);
    stepParticles(dt);
    drawParticles(now/1000);

    requestAnimationFrame(tick);
  }

  function stepParticles(dt){
    if (state.mode === "form"){
      state.timer += dt;
      const t = Math.min(1, state.timer / cfg.formTime);
      const e = 1 - Math.pow(1-t,3);
      particles.forEach((p,i)=>{
        const tgt = targets[i]; if (!tgt) return;
        p.x = p.startX + (tgt.x - p.startX)*e;
        p.y = p.startY + (tgt.y - p.startY)*e;
      });
      if (t>=1){ state.mode="stable"; state.timer=0; }
      return;
    }
    if (state.mode === "stable"){
      state.timer += dt;
      if (state.timer > cfg.stableTime) nextPhase();
      return;
    }
    if (state.mode === "transition_out"){
      state.timer += dt;
      const k = Math.min(1, state.timer/1.2); // chậm ra cảnh
      const cx=W/2, cy=H/2;
      particles.forEach(p=>{ p.x += (cx - p.x)*(0.25+0.75*k); p.y += (cy - p.y)*(0.25+0.75*k); });
      if (k>=1){
        particles.forEach((p,i)=>{
          p.startX = p.x = Math.random()*W;
          p.startY = p.y = H + Math.random()*100;
          const tgt = nextTargets[i];
          if (tgt){ p.targetX=tgt.x; p.targetY=tgt.y; }
        });
        targets = nextTargets;
        state.mode = "transition_in"; state.timer=0;
      }
      return;
    }
    if (state.mode === "transition_in"){
      state.timer += dt;
      const t = Math.min(1, state.timer/1.3); // vào cảnh chậm hơn
      const e = 1 - Math.pow(1-t,3);
      particles.forEach(p=>{
        p.x = p.startX + (p.targetX - p.startX)*e;
        p.y = p.startY + (p.targetY - p.startY)*e;
      });
      if (t>=1){ state.mode="stable"; state.timer=0; }
    }
  }

  function drawParticles(t){
    const cx = W/2, cy = H/2;
    const isText = !!state.textAssist;

    const mHeart = heartbeat(t, cfg.heartBpm);
    const mText  = heartbeat(t, cfg.textBpm);

    const shift = isText
      ? pulseShift(t, cfg.textPulseAmp,  mText)
      : pulseShift(t, cfg.heartPulseAmp, mHeart);

    const scale = isText
      ? (1 + cfg.textScale  * mText)
      : (1 + cfg.heartScale * mHeart);

    pctx.save();
    pctx.setTransform(DPR,0,0,DPR,0,0);
    pctx.translate(cx + shift.x, cy + shift.y);
    pctx.scale(scale, scale);
    pctx.translate(-cx, -cy);

    // ===== Lớp chữ nét (màu hồng + xuất hiện) =====
    if (state.textAssist){
      const ta = state.textAssist;
      const elapsed = Math.max(0, t - ta.appearAt);
      const raw = Math.min(1, elapsed / cfg.textAppearDur);
      const alpha = cfg.textAssistAlpha * (0.3 + 0.7 * easeOut(raw));
      const blur = (1 - easeOut(raw)) * cfg.textAppearMaxBlur;

      pctx.save();
      pctx.globalAlpha = alpha;
      pctx.filter = `blur(${blur}px)`;

      if (cfg.textAppearStyle === "fade"){
        pctx.drawImage(ta.canvas, ta.sx, ta.sy, ta.sw, ta.sh, ta.dx, ta.dy, ta.dw, ta.dh);
      } else if (cfg.textAppearStyle === "scale"){
        const pivotX = ta.dx + ta.dw/2;
        const pivotY = ta.dy + ta.dh/2;
        const s = 0.94 + 0.06*easeOut(raw);
        pctx.translate(pivotX, pivotY);
        pctx.scale(s, s);
        pctx.translate(-pivotX, -pivotY);
        pctx.drawImage(ta.canvas, ta.sx, ta.sy, ta.sw, ta.sh, ta.dx, ta.dy, ta.dw, ta.dh);
      } else { // wipe
        let left = ta.dx, right = ta.dx + ta.dw;
        if (cfg.textAppearFrom === "left"){
          right = ta.dx + ta.dw * easeOut(raw);
        } else if (cfg.textAppearFrom === "right"){
          left  = ta.dx + ta.dw * (1 - easeOut(raw));
        } else { // center
          const half = ta.dw * easeOut(raw) / 2;
          left  = ta.dx + ta.dw/2 - half;
          right = ta.dx + ta.dw/2 + half;
        }
        pctx.save();
        pctx.beginPath();
        pctx.rect(left, ta.dy, Math.max(0, right-left), ta.dh);
        pctx.clip();
        pctx.drawImage(ta.canvas, ta.sx, ta.sy, ta.sw, ta.sh, ta.dx, ta.dy, ta.dw, ta.dh);
        pctx.restore();
      }
      pctx.filter = "none";
      pctx.restore();
    }

    // ===== Hạt (hồng + glow nhẹ) =====
    pctx.fillStyle = cfg.colors.particle;
    if (cfg.colors.particleGlow > 0) {
      pctx.shadowColor = cfg.colors.particle;
      pctx.shadowBlur = cfg.colors.particleGlow;
    }
    const r = cfg.dotSize / 2;
    for (let i=0;i<particles.length;i++){
      const x = particles[i].x, y = particles[i].y;
      pctx.beginPath();
      pctx.arc(x, y, r, 0, Math.PI*2);
      pctx.fill();
    }
    pctx.shadowBlur = 0; // tắt shadow

    pctx.restore();
  }

  // ================= Init / Resize =================
  function resize(){
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);

    rain.width  = Math.floor(W * DPR);
    rain.height = Math.floor(H * DPR);
    prt.width   = Math.floor(W * DPR);
    prt.height  = Math.floor(H * DPR);

    rain.style.width = prt.style.width = W + "px";
    rain.style.height = prt.style.height = H + "px";

    rctx.setTransform(DPR,0,0,DPR,0,0);
    pctx.setTransform(DPR,0,0,DPR,0,0);

    rebuildRain();
    targets = currentTargetBuilder();
    scatter(false);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();
