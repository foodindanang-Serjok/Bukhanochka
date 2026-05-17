// ===== БУХАНОЧКА — GAME.JS =====

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
const W = 360, H = 480;
const FPS = 60;

const LEVEL_DURATION   = 30 * FPS; // 30 секунд на уровень
const COUNTDOWN_START  = 3 * FPS;  // обратный отсчёт за 3 сек до конца
const LEVELUP_FRAMES   = 2 * FPS;  // баннер нового уровня 2 сек

const LEVELS = [
  {
    num: 1,
    name: 'Уровень 1 — Дорога',
    emoji: '🛣️',
    bg: '#2d2d44', road: '#3a3a58', line: '#ffffff',
    obstacles: ['🚗','🚕','🚙','🚌','🏎️'],
    baseSpeed: 3, spawnRate: 80,
  },
  {
    num: 2,
    name: 'Уровень 2 — Хаос!',
    emoji: '💩',
    bg: '#2d2d44', road: '#3a3a58', line: '#ffffff',
    obstacles: ['🚗','🚕','🚙','💩','💩','💩'],
    baseSpeed: 5, spawnRate: 60,
  },
  {
    num: 3,
    name: 'Уровень 3 — Пустыня',
    emoji: '🌵',
    bg: '#c8a46e', road: '#d4b483', line: '#e8cc99',
    obstacles: ['🌵','🌵','🐍','🌵','🐍'],
    baseSpeed: 7, spawnRate: 50,
  },
  {
    num: 4,
    name: 'Уровень 4 — Снег',
    emoji: '❄️',
    bg: '#c8dff0', road: '#ddeeff', line: '#aaccee',
    obstacles: ['🧊','❄️','🐻‍❄️','🧊','❄️'],
    baseSpeed: 9, spawnRate: 40,
  },
];

const LANES = [50, 130, 210, 290];

let state, score, lives, frame, levelIdx;
let levelFrame;      // кадры внутри текущего уровня
let playerLane, playerX, targetX;
let obstacles, spawnTimer, invincible;
let levelUpTimer;
let bgFrom, bgTo, bgProgress;

// --- HUD ---
function updateHUD() {
  document.getElementById('score-val').textContent = score;
  document.getElementById('level-badge').textContent = LEVELS[levelIdx].name;
  const h = ['','❤️','❤️❤️','❤️❤️❤️'];
  document.getElementById('lives-val').textContent = h[Math.max(0, Math.min(3, lives))];
}

// --- Инициализация ---
function initGame() {
  score = 0; lives = 3; frame = 0; levelIdx = 0; levelFrame = 0;
  playerLane = 1; playerX = LANES[1]; targetX = LANES[1];
  obstacles = []; spawnTimer = 0; invincible = 0;
  levelUpTimer = 0; bgFrom = null; bgTo = null; bgProgress = 1;
  state = 'playing';
  updateHUD();
  requestAnimationFrame(loop);
}

function currentLevel() { return LEVELS[levelIdx]; }

// --- Смешать цвета ---
function lerpColor(a, b, t) {
  const p = c => { const h = parseInt(c.replace('#',''), 16); return [(h>>16)&0xff,(h>>8)&0xff,h&0xff]; };
  const [ar,ag,ab] = p(a), [br,bg,bb] = p(b);
  return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`;
}

// --- Переход уровня ---
function triggerLevelUp() {
  const lv   = currentLevel();
  bgFrom     = { bg: lv.bg, road: lv.road, line: lv.line };
  levelIdx   = Math.min(levelIdx + 1, LEVELS.length - 1);
  bgTo       = { bg: currentLevel().bg, road: currentLevel().road, line: currentLevel().line };
  bgProgress = 0;
  obstacles  = []; spawnTimer = 0;
  levelFrame = 0;
  levelUpTimer = LEVELUP_FRAMES;
  invincible   = LEVELUP_FRAMES;
  updateHUD();
}

// --- Спавн ---
function spawnObs() {
  if (levelUpTimer > 0) return;
  const lv   = currentLevel();
  const lane = Math.floor(Math.random() * 4);
  const type = lv.obstacles[Math.floor(Math.random() * lv.obstacles.length)];
  obstacles.push({ x: LANES[lane], y: -60, type });
}

// --- Коллизия ---
function checkCollision(px, o) {
  return Math.abs(px - o.x) < 26 && Math.abs((H - 90) - o.y) < 36;
}

// --- Фон ---
function drawBackground() {
  let bg, road, line;
  if (bgProgress < 1 && bgFrom && bgTo) {
    bgProgress = Math.min(1, bgProgress + 0.018);
    bg   = lerpColor(bgFrom.bg,   bgTo.bg,   bgProgress);
    road = lerpColor(bgFrom.road, bgTo.road, bgProgress);
    line = bgTo.line;
  } else {
    const lv = currentLevel();
    bg = lv.bg; road = lv.road; line = lv.line;
  }
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = road; ctx.fillRect(20, 0, W - 40, H);
  ctx.strokeStyle = line; ctx.lineWidth = 2;
  ctx.setLineDash([28, 18]); ctx.globalAlpha = 0.5;
  for (const lx of [90, 170, 250]) {
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;
}

// --- Таймер уровня ---
function drawLevelTimer() {
  if (levelUpTimer > 0) return;
  const secsLeft = Math.ceil((LEVEL_DURATION - levelFrame) / FPS);
  const isLast   = levelIdx >= LEVELS.length - 1;
  if (isLast) return;

  // цвет — красный в последние 3 сек
  const danger = secsLeft <= 3;
  ctx.save();
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'top';
  ctx.font         = `bold 15px sans-serif`;
  ctx.fillStyle    = danger ? '#ff4444' : 'rgba(255,255,255,0.55)';
  ctx.fillText(`⏱ ${secsLeft}с`, W - 10, 8);
  ctx.restore();
}

// --- Обратный отсчёт 3..2..1 ---
function drawCountdown() {
  if (levelUpTimer > 0) return;
  const isLast  = levelIdx >= LEVELS.length - 1;
  if (isLast) return;
  const remaining = LEVEL_DURATION - levelFrame;
  if (remaining > COUNTDOWN_START || remaining <= 0) return;

  const sec   = Math.ceil(remaining / FPS);
  const phase = (remaining % FPS) / FPS;
  const size  = 100 + (1 - phase) * 70;
  const alpha = 0.10 + (1 - phase) * 0.28;

  ctx.save();
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = `bold ${Math.round(size)}px sans-serif`;
  ctx.fillStyle    = `rgba(255,80,80,${alpha.toFixed(2)})`;
  ctx.fillText(sec, W / 2, H / 2);
  ctx.restore();
}

// --- Баннер нового уровня ---
function drawLevelUpBanner() {
  if (levelUpTimer <= 0) return;
  const t     = levelUpTimer / LEVELUP_FRAMES;
  const alpha = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
  const lv    = currentLevel();

  ctx.save();
  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle   = '#000018';
  ctx.fillRect(0, H / 2 - 72, W, 144);
  ctx.globalAlpha = alpha;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '56px serif';
  ctx.fillText(lv.emoji, W / 2, H / 2 - 24);
  ctx.font      = 'bold 22px sans-serif';
  ctx.fillStyle = '#ffdd44';
  ctx.fillText(lv.name, W / 2, H / 2 + 26);
  ctx.restore();
}

// --- Игрок ---
function drawPlayer() {
  const blink = (invincible > 0 && levelUpTimer === 0)
    ? (Math.floor(frame / 6) % 2 === 0 ? 0.3 : 1) : 1;
  ctx.globalAlpha = blink;
  ctx.font = '44px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🚐', playerX, H - 90);
  ctx.globalAlpha = 1;
}

// --- Препятствия ---
function drawObstacles() {
  ctx.font = '38px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  obstacles.forEach(o => ctx.fillText(o.type, o.x, o.y));
}

// --- Главный цикл ---
function loop() {
  if (state !== 'playing') return;

  frame++;
  score = Math.floor(frame * 0.7);

  // таймер уровня
  if (levelUpTimer > 0) {
    levelUpTimer--;
  } else {
    levelFrame++;
    // конец уровня — переходим
    if (levelFrame >= LEVEL_DURATION && levelIdx < LEVELS.length - 1) {
      triggerLevelUp();
    }
  }

  if (invincible > 0) invincible--;

  const lv    = currentLevel();
  const speed = lv.baseSpeed + Math.floor(levelFrame / (FPS * 8)) * 0.5;

  playerX += (targetX - playerX) * 0.16;

  spawnTimer++;
  if (spawnTimer >= lv.spawnRate) { spawnObs(); spawnTimer = 0; }

  obstacles.forEach(o => o.y += speed);
  obstacles = obstacles.filter(o => o.y < H + 60);

  if (invincible === 0) {
    for (const o of obstacles) {
      if (checkCollision(playerX, o)) {
        lives--;
        invincible = 90;
        obstacles  = obstacles.filter(ob => ob !== o);
        updateHUD();
        if (lives <= 0) { state = 'over'; drawGameOver(); return; }
        break;
      }
    }
  }

  drawBackground();
  drawObstacles();
  drawPlayer();
  drawLevelTimer();
  drawCountdown();
  drawLevelUpBanner();
  updateHUD();

  requestAnimationFrame(loop);
}

// --- Конец игры ---
function drawGameOver() {
  ctx.fillStyle = 'rgba(5,0,20,0.82)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 30px sans-serif';
  ctx.fillText('Конец поездки 😅', W / 2, H / 2 - 50);
  ctx.font = '20px sans-serif'; ctx.fillStyle = '#cc99ff';
  ctx.fillText('Счёт: ' + score, W / 2, H / 2);
  ctx.font = '15px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Нажми кнопку чтобы снова', W / 2, H / 2 + 50);
  const ov = document.getElementById('overlay');
  ov.querySelector('h1').textContent     = '😅 Конец поездки';
  ov.querySelector('p').textContent      = 'Счёт: ' + score;
  ov.querySelector('button').textContent = 'Ещё раз!';
  ov.style.display = 'flex';
}

// --- Клавиатура ---
document.addEventListener('keydown', e => {
  if (state !== 'playing') return;
  if ((e.key === 'ArrowLeft'  || e.key === 'a') && playerLane > 0) { playerLane--; targetX = LANES[playerLane]; }
  if ((e.key === 'ArrowRight' || e.key === 'd') && playerLane < 3) { playerLane++; targetX = LANES[playerLane]; }
});

// --- Кнопки ---
document.getElementById('btn-left').addEventListener('pointerdown', () => {
  if (state !== 'playing' || playerLane === 0) return;
  playerLane--; targetX = LANES[playerLane];
});
document.getElementById('btn-right').addEventListener('pointerdown', () => {
  if (state !== 'playing' || playerLane === 3) return;
  playerLane++; targetX = LANES[playerLane];
});

// --- Свайп ---
let touchStartX = 0;
canvas.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', e => {
  if (state !== 'playing') return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 20) {
    if (dx < 0 && playerLane > 0) { playerLane--; targetX = LANES[playerLane]; }
    if (dx > 0 && playerLane < 3) { playerLane++; targetX = LANES[playerLane]; }
  }
  e.preventDefault();
}, { passive: false });

// --- Старт ---
document.getElementById('btn-start').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
  initGame();
});
