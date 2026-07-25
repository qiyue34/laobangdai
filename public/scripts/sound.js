// ===== 光影集 — 轻快音效 =====
(function () {
  'use strict';

  var ctx = null;
  var enabled = true;

  function ac() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      var buf = ctx.createBuffer(1, 1, ctx.sampleRate);
      var src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination); src.start();
      return ctx;
    } catch (e) { return null; }
  }

  function tone(freq, dur, vol, type, delay) {
    var c = ac(); if (!c || !enabled) return;
    delay = delay || 0; vol = vol || 0.08;
    try {
      var t = c.currentTime + delay;
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(1e-6, t + dur);
      osc.connect(g); g.connect(c.destination);
      osc.start(t); osc.stop(t + dur + 0.01);
    } catch (e) {}
  }

  // 先创建 AudioContext
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}

  // ---- 轻快音效 ----

  // 点击 — 清脆 "滴"
  function click() {
    tone(880, 0.05, 0.16, 'sine');
    tone(1100, 0.04, 0.12, 'sine', 0.025);
  }

  // 导航 — 柔和 "啵"
  function nav() {
    tone(660, 0.04, 0.14, 'sine');
    tone(770, 0.05, 0.1, 'triangle', 0.02);
  }

  // 上传成功 — 轻快上行 "叮叮叮"
  function success() {
    tone(660, 0.08, 0.2, 'sine');
    setTimeout(function () { tone(880, 0.08, 0.2, 'sine'); }, 60);
    setTimeout(function () { tone(1100, 0.14, 0.18, 'sine'); }, 120);
  }

  // 拖拽放下 — 软 "噗"
  function drop() {
    tone(520, 0.05, 0.18, 'sine');
    tone(680, 0.04, 0.12, 'triangle', 0.03);
  }

  function toggle() {
    enabled = !enabled;
    if (enabled) setTimeout(function () { tone(1000, 0.05, 0.15); }, 10);
    return enabled;
  }

  function isEnabled() { return enabled; }

  var evts = ['click', 'touchstart', 'keydown', 'mousedown'];
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); }
    else { try { ctx = new AudioContext(); } catch(e) {} }
    evts.forEach(function (e) { document.removeEventListener(e, unlock); });
  }
  evts.forEach(function (e) { document.addEventListener(e, unlock, { once: true, passive: true }); });

  window.Sound = { click: click, nav: nav, success: success, drop: drop, toggle: toggle, isEnabled: isEnabled };
})();
