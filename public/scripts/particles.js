// ===== 花瓣飘落特效 =====
(function () {
  var canvas, ctx;
  var petals = [];
  var W, H;
  var frame = 0;

  // 花瓣颜色
  var COLORS = [
    'rgba(255, 182, 193, {{opacity}})',  // 浅粉
    'rgba(255, 192, 203, {{opacity}})',  // 粉红
    'rgba(255, 218, 185, {{opacity}})',  // 桃色
    'rgba(255, 228, 225, {{opacity}})',  // 浅玫瑰
    'rgba(252, 197, 192, {{opacity}})',  // 珊瑚粉
    'rgba(255, 200, 180, {{opacity}})',  // 暖粉
    'rgba(245, 215, 210, {{opacity}})',  // 米粉
  ];

  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'particle-canvas';
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'pointer-events:none;z-index:0;';
    document.body.prepend(canvas);

    ctx = canvas.getContext('2d');
    resize();

    window.addEventListener('resize', resize);
    window.addEventListener('load', function () {
      // 初始生成花瓣
      for (var i = 0; i < 25; i++) {
        petals.push(createPetal(true));
      }
    });

    // 如果页面已加载，立即生成
    if (document.readyState === 'complete') {
      for (var i = 0; i < 25; i++) {
        petals.push(createPetal(true));
      }
    }

    animate();
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createPetal(initial) {
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H : -20 - Math.random() * 50,
      size: 6 + Math.random() * 12,       // 花瓣大小
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      swayAmp: 15 + Math.random() * 30,    // 左右摆幅
      swaySpeed: 0.008 + Math.random() * 0.015,
      swayPhase: Math.random() * Math.PI * 2,
      speedY: 0.4 + Math.random() * 0.8,   // 下落速度
      opacity: 0.4 + Math.random() * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      waveX: Math.random() * W,            // 波浪起始位置
    };
  }

  // 绘制一片花瓣（用椭圆 + 旋转）
  function drawPetal(ctx, x, y, size, rotation, opacity, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    var w = size;
    var h = size * 0.55;

    // 花瓣主体（椭圆）
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = color.replace('{{opacity}}', opacity);

    // 柔光晕
    ctx.shadowColor = color.replace('{{opacity}}', opacity * 0.3);
    ctx.shadowBlur = 6;
    ctx.fill();

    // 花瓣脉络（一条细线）
    ctx.shadowBlur = 0;
    ctx.strokeStyle = color.replace('{{opacity}}', opacity * 0.3);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 2);
    ctx.quadraticCurveTo(w / 4, 0, 0, h / 2 - 2);
    ctx.stroke();

    ctx.restore();
  }

  function animate() {
    frame++;
    ctx.clearRect(0, 0, W, H);

    // 补充花瓣
    if (petals.length < 35 && Math.random() < 0.08) {
      petals.push(createPetal(false));
    }

    for (var i = petals.length - 1; i >= 0; i--) {
      var p = petals[i];

      // 下落 + 左右摇摆
      p.y += p.speedY;
      p.x += Math.sin(frame * p.swaySpeed + p.swayPhase) * 0.4;
      p.rotation += p.rotSpeed;

      // 超出底部则重置
      if (p.y > H + 30) {
        petals[i] = createPetal(false);
        petals[i].x = Math.random() * W;
        continue;
      }

      // 超出左右边界回弹
      if (p.x < -30) p.x = W + 20;
      if (p.x > W + 30) p.x = -20;

      // 绘制
      drawPetal(ctx, p.x, p.y, p.size, p.rotation, p.opacity, p.color);
    }

    requestAnimationFrame(animate);
  }

  // 启动
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
