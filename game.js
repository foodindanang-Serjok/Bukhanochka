// ===== БУХАНОЧКА — GAME.JS =====

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');
const W = 360, H = 480;
const FPS = 60;

const LEVEL_DURATION  = 30 * FPS;
const COUNTDOWN_START = 3 * FPS;
const LEVELUP_FRAMES  = 2 * FPS;

const LEVELS = [
  {
    num: 1, name: 'Уровень 1 — Дорога', emoji: '🛣️', track: 'disco.mp3',
    bg: '#2d2d44', road: '#3a3a58', line: '#ffffff',
    obstacles: ['🚗','🚕','🚙','🚌','🏎️'],
    baseSpeed: 3, spawnRate: 80,
  },
  {
    num: 2, name: 'Уровень 2 — Хаос!', emoji: '💩', track: 'mirage_velocity.mp3',
    bg: '#2d2d44', road: '#3a3a58', line: '#ffffff',
    obstacles: ['🚗','🚕','🚙','💩','💩','💩'],
    baseSpeed: 5, spawnRate: 60,
  },
  {
    num: 3, name: 'Уровень 3 — Пустыня', emoji: '🌵', track: 'final_lap_sprint.mp3',
    bg: '#c8a46e', road: '#d4b483', line: '#e8cc99',
    obstacles: ['🌵','🌵','🐍','🌵','🐍'],
    baseSpeed: 7, spawnRate: 50,
  },
  {
    num: 4, name: 'Уровень 4 — Снег', emoji: '❄️', track: 'Iceland.mp3',
    bg: '#c8dff0', road: '#ddeeff', line: '#aaccee',
    obstacles: ['🧊','❄️','🐻‍❄️','🧊','❄️'],
    baseSpeed: 9, spawnRate: 40,
  },
  {
    num: 5, name: 'Уровень 5 — Лес', emoji: '🌲', track: 'Forest.mp3',
    bg: '#6b4c2a', road: '#8a6540', line: '#c8a870',
    obstacles: ['🌲','🌲','🌳','🌲','🌳','🌲','🐗','🌲'],
    baseSpeed: 9, spawnRate: 28,
  },
  {
    num: 6, name: 'Уровень 6 — Горы', emoji: '⛰️', track: 'disco.mp3',
    bg: '#3a3530', road: '#5a5048', line: '#ccbbaa',
    obstacles: ['🪨','🪨','⛰️','🪨','🪨','💥','🪨','⛰️'],
    baseSpeed: 9, spawnRate: 25,
  },
];

const LANES = [50, 130, 210, 290];

let state; // 'idle' | 'playing' | 'paused' | 'over'
let score, lives, frame, levelIdx, levelFrame;
let playerLane, playerX, targetX;
let obstacles, spawnTimer, invincible;
let levelUpTimer, bgFrom, bgTo, bgProgress;
let lineOffset = 0; // смещение движущихся полос дороги
let bonuses = [];        // алмазики и сердечки
let bonusSpawnTimer = 0;
let bonusSpeed = 8;      // быстрее препятствий

// --- Аудио ---
const tracks = {};
['disco.mp3','apex_drift.mp3','mirage_velocity.mp3','final_lap_sprint.mp3','Iceland.mp3','Forest.mp3'].forEach(src => {
  const a = new Audio(src);
  a.loop = true;
  a.volume = 0.6;
  tracks[src] = a;
});
let currentTrack = null;

function playTrack(src) {
  if (currentTrack && currentTrack === tracks[src]) return; // уже играет
  stopMusic();
  currentTrack = tracks[src];
  currentTrack.currentTime = 0;
  currentTrack.play().catch(() => {}); // игнорируем автоплей-блокировку
}

function stopMusic() {
  if (currentTrack) {
    currentTrack.pause();
    currentTrack.currentTime = 0;
    currentTrack = null;
  }
}

function pauseMusic() {
  if (currentTrack) currentTrack.pause();
}

function resumeMusic() {
  if (currentTrack) currentTrack.play().catch(() => {});
}

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
  bonuses = []; bonusSpawnTimer = 0;
  levelUpTimer = 0; bgFrom = null; bgTo = null; bgProgress = 1; lineOffset = 0;
  document.getElementById('pause-screen').style.display = 'none';
  document.getElementById('btn-pause').textContent = '⏸';
  state = 'playing';
  playTrack(LEVELS[0].track);
  updateHUD();
  requestAnimationFrame(loop);
}

function currentLevel() { return LEVELS[levelIdx]; }

// --- Цвета ---
function lerpColor(a, b, t) {
  const p = c => { const h = parseInt(c.replace('#',''),16); return [(h>>16)&0xff,(h>>8)&0xff,h&0xff]; };
  const [ar,ag,ab] = p(a), [br,bg,bb] = p(b);
  return `rgb(${Math.round(ar+(br-ar)*t)},${Math.round(ag+(bg-ag)*t)},${Math.round(ab+(bb-ab)*t)})`;
}

// --- Переход уровня ---
function triggerLevelUp() {
  const lv = currentLevel();
  bgFrom = { bg: lv.bg, road: lv.road, line: lv.line };
  levelIdx = Math.min(levelIdx + 1, LEVELS.length - 1);
  bgTo = { bg: currentLevel().bg, road: currentLevel().road, line: currentLevel().line };
  bgProgress = 0;
  obstacles = []; spawnTimer = 0; levelFrame = 0;
  bonuses = []; bonusSpawnTimer = 0;
  levelUpTimer = LEVELUP_FRAMES;
  invincible   = LEVELUP_FRAMES;
  playTrack(currentLevel().track);
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

// --- Спавн бонусов ---
function spawnBonus() {
  if (levelUpTimer > 0) return;
  const lane = Math.floor(Math.random() * 4);
  const type = Math.random() < 0.6 ? 'diamond' : 'heart'; // 60% алмаз, 40% сердце
  bonuses.push({ x: LANES[lane], y: -60, type });
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

  // движущиеся пунктиры
  const DASH = 28, GAP = 18, STEP = DASH + GAP;
  ctx.strokeStyle = line; ctx.lineWidth = 3; ctx.globalAlpha = 0.55;
  for (const lx of [90, 170, 250]) {
    ctx.beginPath();
    let y = (lineOffset % STEP) - STEP;
    while (y < H + STEP) {
      ctx.moveTo(lx, y);
      ctx.lineTo(lx, y + DASH);
      y += STEP;
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// --- Таймер ---
function drawLevelTimer() {
  if (levelUpTimer > 0 || levelIdx >= LEVELS.length - 1) return;
  const secsLeft = Math.ceil((LEVEL_DURATION - levelFrame) / FPS);
  const danger   = secsLeft <= 3;
  ctx.save();
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = danger ? '#ff4444' : 'rgba(255,255,255,0.55)';
  ctx.fillText(`⏱ ${secsLeft}с`, W - 10, 8);
  ctx.restore();
}

// --- Отсчёт 3..2..1 ---
function drawCountdown() {
  if (levelUpTimer > 0 || levelIdx >= LEVELS.length - 1) return;
  const remaining = LEVEL_DURATION - levelFrame;
  if (remaining > COUNTDOWN_START || remaining <= 0) return;
  const sec   = Math.ceil(remaining / FPS);
  const phase = (remaining % FPS) / FPS;
  const size  = 100 + (1 - phase) * 70;
  const alpha = 0.10 + (1 - phase) * 0.28;
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(size)}px sans-serif`;
  ctx.fillStyle = `rgba(255,80,80,${alpha.toFixed(2)})`;
  ctx.fillText(sec, W / 2, H / 2);
  ctx.restore();
}

// --- Баннер уровня ---
function drawLevelUpBanner() {
  if (levelUpTimer <= 0) return;
  const t     = levelUpTimer / LEVELUP_FRAMES;
  const alpha = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
  const lv    = currentLevel();
  ctx.save();
  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle = '#000018';
  ctx.fillRect(0, H / 2 - 72, W, 144);
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '56px serif';
  ctx.fillText(lv.emoji, W / 2, H / 2 - 24);
  ctx.font = 'bold 22px sans-serif'; ctx.fillStyle = '#ffdd44';
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

// --- Бонусы ---
function drawBonuses() {
  bonuses.forEach(b => {
    ctx.save();
    ctx.font = '32px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // лёгкое свечение
    ctx.shadowBlur = 12;
    ctx.shadowColor = b.type === 'diamond' ? '#00eeff' : '#ff4488';
    ctx.fillText(b.type === 'diamond' ? '💎' : '❤️', b.x, b.y);
    ctx.restore();
  });
}

// --- Флэш сбора бонуса ---
let bonusFlash = 0;
let bonusFlashText = '';
let bonusFlashColor = '#fff';

function drawBonusFlash() {
  if (bonusFlash <= 0) return;
  const alpha = bonusFlash / 40;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = bonusFlashColor;
  ctx.fillText(bonusFlashText, W / 2, H / 2 - 60);
  ctx.restore();
  bonusFlash--;
}

// --- Главный цикл ---
function loop() {
  if (state !== 'playing') return;

  frame++;
  score = Math.floor(frame * 0.7);

  if (levelUpTimer > 0) {
    levelUpTimer--;
  } else {
    levelFrame++;
    if (levelFrame >= LEVEL_DURATION && levelIdx < LEVELS.length - 1) triggerLevelUp();
  }

  if (invincible > 0) invincible--;

  const lv    = currentLevel();
  const speed = lv.baseSpeed + Math.floor(levelFrame / (FPS * 8)) * 0.5;

  // двигаем полосы дороги с той же скоростью что препятствия
  lineOffset += speed;

  playerX += (targetX - playerX) * 0.16;

  spawnTimer++;
  if (spawnTimer >= lv.spawnRate) { spawnObs(); spawnTimer = 0; }

  // спавн бонуса каждые 4-6 секунд случайно
  bonusSpawnTimer++;
  if (bonusSpawnTimer >= FPS * (4 + Math.random() * 2 | 0)) {
    spawnBonus();
    bonusSpawnTimer = 0;
  }

  obstacles.forEach(o => o.y += speed);
  obstacles = obstacles.filter(o => o.y < H + 60);

  // бонусы летят быстро
  bonuses.forEach(b => b.y += bonusSpeed);
  bonuses = bonuses.filter(b => b.y < H + 60);

  // коллизии с препятствиями
  if (invincible === 0) {
    for (const o of obstacles) {
      if (checkCollision(playerX, o)) {
        lives--;
        invincible = 90;
        obstacles  = obstacles.filter(ob => ob !== o);
        updateHUD();
        if (lives <= 0) { state = 'over'; stopMusic(); showGameOver(); return; }
        break;
      }
    }
  }

  // коллизии с бонусами
  for (const b of bonuses) {
    if (checkCollision(playerX, b)) {
      if (b.type === 'diamond') {
        score += 50;
        frame += 71; // ~50 очков через frame
        bonusFlashText = '+50 💎';
        bonusFlashColor = '#00eeff';
      } else {
        if (lives < 3) lives++;
        bonusFlashText = '+1 ❤️';
        bonusFlashColor = '#ff4488';
        updateHUD();
      }
      bonusFlash = 40;
      bonuses = bonuses.filter(bon => bon !== b);
      break;
    }
  }

  drawBackground();
  drawObstacles();
  drawBonuses();
  drawPlayer();
  drawBonusFlash();
  drawLevelTimer();
  drawCountdown();
  drawLevelUpBanner();
  updateHUD();

  requestAnimationFrame(loop);
}

// --- Пауза ---
function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    pauseMusic();
    document.getElementById('pause-screen').style.display = 'flex';
    document.getElementById('btn-pause').textContent = '▶';
  } else if (state === 'paused') {
    state = 'playing';
    resumeMusic();
    document.getElementById('pause-screen').style.display = 'none';
    document.getElementById('btn-pause').textContent = '⏸';
    requestAnimationFrame(loop);
  }
}

// --- Рестарт ---
function restartGame() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('overlay-score').style.display = 'none';
  document.getElementById('overlay-title').textContent = '🚐 Буханочка';
  document.getElementById('btn-start').textContent = '▶ ПОЕХАЛИ!';
  initGame();
}

// --- Конец игры ---
function showGameOver() {
  // рисуем затемнение на канвасе
  ctx.fillStyle = 'rgba(5,0,20,0.5)';
  ctx.fillRect(0, 0, W, H);

  // показываем оверлей с обложкой
  const ov = document.getElementById('overlay');
  document.getElementById('overlay-title').textContent = '😅 Конец поездки';
  const sc = document.getElementById('overlay-score');
  sc.textContent = 'Счёт: ' + score;
  sc.style.display = 'block';
  document.getElementById('btn-start').textContent = '↺ Ещё раз!';
  ov.style.display = 'flex';
}

// --- Кнопки управления ---
document.getElementById('btn-left').addEventListener('pointerdown', () => {
  if (state !== 'playing' || playerLane === 0) return;
  playerLane--; targetX = LANES[playerLane];
});
document.getElementById('btn-right').addEventListener('pointerdown', () => {
  if (state !== 'playing' || playerLane === 3) return;
  playerLane++; targetX = LANES[playerLane];
});

document.getElementById('btn-pause').addEventListener('pointerdown', () => {
  if (state !== 'playing' && state !== 'paused') return;
  togglePause();
});

document.getElementById('btn-restart').addEventListener('pointerdown', () => {
  if (state === 'idle') return;
  restartGame();
});

document.getElementById('btn-resume').addEventListener('pointerdown', togglePause);
document.getElementById('btn-restart-pause').addEventListener('pointerdown', () => {
  document.getElementById('pause-screen').style.display = 'none';
  restartGame();
});

document.getElementById('btn-start').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
  initGame();
});

// --- Клавиатура ---
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.key === 'p') { if (state === 'playing' || state === 'paused') togglePause(); }
  if (state !== 'playing') return;
  if ((e.key === 'ArrowLeft'  || e.key === 'a') && playerLane > 0) { playerLane--; targetX = LANES[playerLane]; }
  if ((e.key === 'ArrowRight' || e.key === 'd') && playerLane < 3) { playerLane++; targetX = LANES[playerLane]; }
});

// --- Свайп ---
let touchStartX = 0;
canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX; e.preventDefault();
}, { passive: false });
canvas.addEventListener('touchend', e => {
  if (state !== 'playing') return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 20) {
    if (dx < 0 && playerLane > 0) { playerLane--; targetX = LANES[playerLane]; }
    if (dx > 0 && playerLane < 3) { playerLane++; targetX = LANES[playerLane]; }
  }
  e.preventDefault();
}, { passive: false });

state = 'idle';
