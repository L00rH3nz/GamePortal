/* Snake Rush — gioco ottimizzato per mobile (swipe + punteggio + crescita) */
(function () {
  'use strict';

  var COLS = 20;
  var ROWS = 20;
  var BASE_TICK = 150;
  var MIN_TICK = 70;
  var SPEED_STEP = 3; // ms in meno per ogni cibo mangiato
  var POINTS_PER_FOOD = 10;
  var SWIPE_THRESHOLD = 24; // px
  var BEST_KEY = 'snake-rush-best';

  function getBest() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function setBest(v) {
    try {
      localStorage.setItem(BEST_KEY, String(v));
    } catch (e) {}
  }

  function vibrate(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }

  window.initSnakeRush = function (mount) {
    if (!mount) return function () {};

    mount.innerHTML =
      '<div class="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800">' +
        '<div class="flex items-center justify-between gap-2">' +
          '<div><h2 class="text-xl font-bold">🐍 Snake Rush</h2>' +
          '<p class="text-xs text-slate-400">Swipe per sterzare · Mangia per crescere</p></div>' +
          '<div class="text-right shrink-0">' +
            '<div class="text-[11px] uppercase tracking-wide text-slate-400">Punteggio</div>' +
            '<div id="snake-score" class="text-2xl font-extrabold tabular-nums">0</div>' +
            '<div class="text-[11px] text-slate-400">Best: <span id="snake-best">0</span></div>' +
          '</div>' +
        '</div>' +
        '<div class="snake-board mt-3">' +
          '<canvas id="snake-canvas" width="400" height="400" aria-label="Campo di gioco Snake"></canvas>' +
          '<div id="snake-overlay" class="snake-overlay">' +
            '<div id="snake-overlay-title" class="text-lg font-bold">Pronto?</div>' +
            '<p id="snake-overlay-sub" class="text-sm text-slate-300">Fai swipe nella direzione in cui vuoi andare.</p>' +
            '<button id="snake-start" class="snake-btn px-6 py-3 rounded-xl bg-indigo-600 active:bg-indigo-500 font-semibold">▶ Avvia</button>' +
          '</div>' +
        '</div>' +
        '<div class="flex gap-2 mt-3">' +
          '<button id="snake-pause" class="snake-btn flex-1 py-3 rounded-xl bg-slate-800 active:bg-slate-700 font-semibold">⏸ Pausa</button>' +
          '<button id="snake-restart" class="snake-btn flex-1 py-3 rounded-xl bg-slate-800 active:bg-slate-700 font-semibold">↻ Ricomincia</button>' +
        '</div>' +
        '<div class="snake-dpad mt-4" aria-hidden="false">' +
          '<span></span><button data-dir="up" class="snake-btn bg-slate-800 active:bg-slate-700" aria-label="Su">▲</button><span></span>' +
          '<button data-dir="left" class="snake-btn bg-slate-800 active:bg-slate-700" aria-label="Sinistra">◀</button>' +
          '<button data-dir="down" class="snake-btn bg-slate-800 active:bg-slate-700" aria-label="Giù">▼</button>' +
          '<button data-dir="right" class="snake-btn bg-slate-800 active:bg-slate-700" aria-label="Destra">▶</button>' +
          '<span></span><span></span><span></span>' +
        '</div>' +
        '<p class="text-center text-[11px] text-slate-500 mt-3">Swipe sul campo · Frecce/WASD su desktop</p>' +
      '</div>';

    var canvas = mount.querySelector('#snake-canvas');
    var ctx = canvas.getContext('2d');
    var scoreEl = mount.querySelector('#snake-score');
    var bestEl = mount.querySelector('#snake-best');
    var overlay = mount.querySelector('#snake-overlay');
    var overlayTitle = mount.querySelector('#snake-overlay-title');
    var overlaySub = mount.querySelector('#snake-overlay-sub');
    var startBtn = mount.querySelector('#snake-start');
    var pauseBtn = mount.querySelector('#snake-pause');
    var restartBtn = mount.querySelector('#snake-restart');

    var snake = [];
    var dir = { x: 1, y: 0 };
    var queuedDir = { x: 1, y: 0 };
    var food = { x: 10, y: 10 };
    var score = 0;
    var best = getBest();
    var running = false;
    var paused = false;
    var dead = false;
    var rafId = 0;
    var lastTime = 0;
    var acc = 0;
    var destroyed = false;

    bestEl.textContent = String(best);

    function tickMs() {
      var eaten = score / POINTS_PER_FOOD;
      return Math.max(MIN_TICK, BASE_TICK - eaten * SPEED_STEP);
    }

    function cellSize() {
      return canvas.width / COLS;
    }

    function resize() {
      var size = Math.min(mount.clientWidth - 32, 420);
      if (size < 200) size = 280;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.aspectRatio = '1 / 1';
      draw();
    }

    function reset() {
      var cx = Math.floor(COLS / 2);
      var cy = Math.floor(ROWS / 2);
      snake = [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy }
      ];
      dir = { x: 1, y: 0 };
      queuedDir = { x: 1, y: 0 };
      score = 0;
      dead = false;
      paused = false;
      acc = 0;
      scoreEl.textContent = '0';
      pauseBtn.textContent = '⏸ Pausa';
      placeFood();
      draw();
    }

    function placeFood() {
      while (true) {
        var p = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS)
        };
        var onSnake = snake.some(function (s) { return s.x === p.x && s.y === p.y; });
        if (!onSnake) {
          food = p;
          return;
        }
      }
    }

    function setDir(x, y) {
      // Impedisce inversione a 180°
      if (x === -dir.x && y === -dir.y) return;
      if (x === queuedDir.x && y === queuedDir.y) return;
      // Evita inversione anche rispetto alla coda di input
      if (snake.length > 1) {
        var head = snake[0];
        var neck = snake[1];
        if (head.x + x === neck.x && head.y + y === neck.y) return;
      }
      queuedDir = { x: x, y: y };
      // Se il gioco è in pausa con overlay "pronto", un primo swipe lo avvia
      if (!running && !dead && !paused) start();
    }

    function start() {
      if (dead) reset();
      running = true;
      paused = false;
      overlay.style.display = 'none';
      pauseBtn.textContent = '⏸ Pausa';
      lastTime = performance.now();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    }

    function togglePause() {
      if (!running || dead) return;
      paused = !paused;
      pauseBtn.textContent = paused ? '▶ Riprendi' : '⏸ Pausa';
      if (!paused) {
        lastTime = performance.now();
        rafId = requestAnimationFrame(loop);
      } else {
        cancelAnimationFrame(rafId);
      }
      draw();
    }

    function gameOver() {
      running = false;
      dead = true;
      cancelAnimationFrame(rafId);
      vibrate([60, 40, 60]);
      if (score > best) {
        best = score;
        setBest(best);
        bestEl.textContent = String(best);
      }
      overlayTitle.textContent = '💀 Game Over';
      overlaySub.innerHTML = 'Punteggio: <strong>' + score + '</strong> · Lunghezza: <strong>' + snake.length + '</strong><br/>Tocca Ricomincia per riprovare.';
      startBtn.textContent = '↻ Rigioca';
      overlay.style.display = 'flex';
      draw();
    }

    function step() {
      dir = queuedDir;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // Collisione muri
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
        gameOver();
        return;
      }
      // Collisione con se stesso (la coda si sposta, quindi ignoriamo l'ultima cella se non mangia)
      var eats = head.x === food.x && head.y === food.y;
      var body = eats ? snake : snake.slice(0, -1);
      var hitSelf = body.some(function (s) { return s.x === head.x && s.y === head.y; });
      if (hitSelf) {
        gameOver();
        return;
      }

      snake.unshift(head);
      if (eats) {
        // Cresce: non rimuove la coda
        score += POINTS_PER_FOOD;
        scoreEl.textContent = String(score);
        vibrate(20);
        placeFood();
      } else {
        snake.pop();
      }
    }

    function loop(now) {
      if (destroyed || paused || dead || !running) return;
      var dt = now - lastTime;
      lastTime = now;
      if (dt > 500) dt = 500;
      acc += dt;
      var interval = tickMs();
      while (acc >= interval) {
        acc -= interval;
        step();
        if (dead) return;
      }
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function draw() {
      var s = cellSize();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Sfondo + griglia leggera
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(148,163,184,0.08)';
      ctx.lineWidth = 1;
      for (var i = 1; i < COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s, 0);
        ctx.lineTo(i * s, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * s);
        ctx.lineTo(canvas.width, i * s);
        ctx.stroke();
      }

      // Cibo
      var fx = food.x * s;
      var fy = food.y * s;
      var pad = s * 0.16;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(fx + s / 2, fy + s / 2, s / 2 - pad, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(fx + s * 0.36, fy + s * 0.36, s * 0.11, 0, Math.PI * 2);
      ctx.fill();

      // Serpente — cresce visivamente a ogni cibo mangiato
      for (var k = snake.length - 1; k >= 0; k--) {
        var part = snake[k];
        var px = part.x * s;
        var py = part.y * s;
        var inset = k === 0 ? s * 0.06 : s * 0.12;
        if (k === 0) {
          ctx.fillStyle = '#22c55e';
        } else {
          var t = k / Math.max(1, snake.length);
          ctx.fillStyle = t > 0.5 ? '#15803d' : '#16a34a';
        }
        roundRect(px + inset, py + inset, s - inset * 2, s - inset * 2, s * 0.28);
        ctx.fill();
      }

      // Occhi della testa
      if (snake.length) {
        var h = snake[0];
        var hx = h.x * s;
        var hy = h.y * s;
        ctx.fillStyle = '#020617';
        var ex1, ey1, ex2, ey2, r = s * 0.09;
        if (dir.x === 1) { ex1 = hx + s * 0.68; ey1 = hy + s * 0.32; ex2 = hx + s * 0.68; ey2 = hy + s * 0.68; }
        else if (dir.x === -1) { ex1 = hx + s * 0.32; ey1 = hy + s * 0.32; ex2 = hx + s * 0.32; ey2 = hy + s * 0.68; }
        else if (dir.y === 1) { ex1 = hx + s * 0.32; ey1 = hy + s * 0.68; ex2 = hx + s * 0.68; ey2 = hy + s * 0.68; }
        else { ex1 = hx + s * 0.32; ey1 = hy + s * 0.32; ex2 = hx + s * 0.68; ey2 = hy + s * 0.32; }
        ctx.beginPath(); ctx.arc(ex1, ey1, r, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ex2, ey2, r, 0, Math.PI * 2); ctx.fill();
      }

      if (paused && running && !dead) {
        ctx.fillStyle = 'rgba(2,6,23,0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold ' + Math.round(canvas.width * 0.07) + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSA', canvas.width / 2, canvas.height / 2);
      }
    }

    // --- Input: swipe (touch) ---
    var touchStartX = 0;
    var touchStartY = 0;
    var tracking = false;

    function onTouchStart(e) {
      if (e.touches.length !== 1) return;
      tracking = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    function onTouchMove(e) {
      if (!tracking) return;
      if (e.cancelable) e.preventDefault();
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        setDir(dx > 0 ? 1 : -1, 0);
      } else {
        setDir(0, dy > 0 ? 1 : -1);
      }
      // Reset per swipe continui senza staccare il dito
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }

    function onTouchEnd() {
      tracking = false;
    }

    var board = mount.querySelector('.snake-board');
    board.addEventListener('touchstart', onTouchStart, { passive: true });
    board.addEventListener('touchmove', onTouchMove, { passive: false });
    board.addEventListener('touchend', onTouchEnd, { passive: true });
    board.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // D-pad (fallback touch)
    mount.querySelectorAll('[data-dir]').forEach(function (btn) {
      btn.addEventListener('touchstart', function (e) {
        if (e.cancelable) e.preventDefault();
        pushDpad(btn.getAttribute('data-dir'));
      }, { passive: false });
      btn.addEventListener('click', function () {
        pushDpad(btn.getAttribute('data-dir'));
      });
    });

    function pushDpad(d) {
      if (d === 'up') setDir(0, -1);
      else if (d === 'down') setDir(0, 1);
      else if (d === 'left') setDir(-1, 0);
      else if (d === 'right') setDir(1, 0);
    }

    // Tastiera (desktop)
    function onKey(e) {
      var k = e.key;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { setDir(0, -1); e.preventDefault(); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { setDir(0, 1); e.preventDefault(); }
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { setDir(-1, 0); e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { setDir(1, 0); e.preventDefault(); }
      else if (k === ' ' || k === 'Enter') {
        if (!running || dead) start();
        else togglePause();
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKey);

    function onVisibility() {
      if (document.hidden && running && !paused && !dead) togglePause();
    }
    document.addEventListener('visibilitychange', onVisibility);

    startBtn.addEventListener('click', function () { start(); });
    pauseBtn.addEventListener('click', function () {
      if (!running || dead) { start(); return; }
      togglePause();
    });
    restartBtn.addEventListener('click', function () {
      reset();
      start();
    });
    window.addEventListener('resize', resize);

    reset();
    resize();
    overlay.style.display = 'flex';

    // Cleanup quando si cambia pagina nella SPA
    return function cleanup() {
      destroyed = true;
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
    };
  };
})();
