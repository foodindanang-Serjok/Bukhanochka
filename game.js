// ===== БУХАНОЧКА — GAME.JS =====

const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');
const W = 360, H = 480;

// --- Уровни ---
const LEVELS = [
  {
    num: 1,
    name: 'Уровень 1 — Дорога',
    bg: '#2d2d44',
    road: '#3a3a58',
    line: '#ffffff',
    obstacles: ['🚗','🚕','🚙','🚌','🏎️'],
    scoreToNext: 300,
    baseSpeed: 3,
    spawnRate: 80,
  },
  {
    num: 2,
    name: 'Уровень 2 — Хаос!',
    bg: '#2d2d44',
    road: '#3a3a58',
    line: '#ffffff',
    obstacles: ['🚗','🚕','🚙','💩','💩','💩'],
    scoreToNext: 700,
    baseSpeed: 5,
    spawnRate: 60,
  },
  {
    num: 3,
    name: 'Уровень 3 — Пустыня',
    bg: '#c8a46e',
    road: '#d4b483',
    line: '#e8cc99',
    obstacles: ['🌵','🌵','🐍','🌵','🐍'],
    scoreToNext: 1200,
    baseSpeed: 7,
    spawnRate: 50,
  },
  {
    num: 4,
    name: 'Уровень 4 — Снег',
    bg: '#c8dff0',
    road: '#ddeeff',
    line: '#ffffff',
    obstacles: ['🧊','❄️','🐻‍❄️','🧊','❄️'],
    scoreToNext: 99999,
    baseSpeed: 9,
    spawnRate: 40,
  },
];

const LANES = [50, 130, 210, 290];

let state, score, lives, frame, levelIdx;
let playerLane, playerX, targetX;
let obstacles, spawnTimer, invincible;
let markings;

// --- HUD ---
function updateHUD() {
  document.getElementById('score-val').textContent = score;
  document.getElementById('level-badge').textContent = LEVELS[levelIdx].name;
  const h = ['','❤️','❤️❤️','❤️❤️❤️'];
  document.getElementById('lives-val').textContent = h[Math.max(0, Math.min(3, lives))];
}

// --- Инициализация ---
function initGame() {
  score = 0; lives = 3; frame = 0;
  levelIdx = 0; playerLane = 1;
  playerX = LANES[1]; targetX = LANES[1];
  obstacles = []; markings = [];
  spawnTimer = 0; invincible = 0;
  for (let i = 0; i < 8; i++) markings.push({ y: i * 64 });
  state = 'playing';
  updateHUD();
  requestAnimationFrame(loop);
}

// --- Уровень ---
function currentLevel() { return LEVELS[levelIdx]; }

function checkLevelUp() {
  const lv = currentLevel();
  if (score >= lv.scoreToNext && levelIdx < LEVELS.length - 1) {
    levelIdx++;
    obstacles = [];
    spawnTimer = 0;
    showLevelUp();
    updateHUD();
  }
}

function showLevelUp() {
  // Вспышка — просто рисуем текст поверх в loop
  invincible = 120;
}

// --- Спавн препятствий ---
function spawnObs() {
  const lv = currentLevel();
  const lane = Math.floor(Math.random() * 4);
  const type = lv.obstacles[Math.floor(Math.random() * lv.obstacles.length)];
  obstacles.push({ x: LANES[lane], y: -60, type });
}

// --- Коллизия ---
function checkCollision(px, o) {
  return Math.abs(px - o.x) < 26 && Math.abs((H - 90) - o.y) < 36;
}

// --- Рисовка ---
function drawBackground() {
  const lv = currentLevel();
  ctx.fillStyle = lv.bg;
  ctx.fillRect(0, 0, W, H);

  // дорога / песок
  ctx.fillStyle = lv.road;
  ctx.fillRect(20, 0, W - 40, H);

  // разметка (линии или песчаные полосы)
  ctx.strokeStyle = lv.line;
  ctx.lineWidth = 2;
  ctx.setLineDash([28, 18]);
  ctx.globalAlpha = 0.5;
  for (let lx of [90, 170, 250]) {
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, H);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawMarkings() {
  // движущиеся жёлтые пунктиры
}

function drawPlayer() {
  const alpha = invincible > 0 ? (Math.floor(frame / 6) % 2 === 0 ? 0.3 : 1) : 1;
  ctx.globalAlpha = alpha;
  ctx.font = '44px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚐', playerX, H - 90);
  ctx.globalAlpha = 1;
}

function drawObstacles() {
  ctx.font = '38px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  obstacles.forEach(o => ctx.fillText(o.type, o.x, o.y));
}

function drawLevelUp() {
  if (invincible > 60) {
    ctx.fillStyle = 'rgba(255,220,80,0.18)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffdd44';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉 ' + LEVELS[levelIdx].name, W / 2, H / 2);
  }
}

// --- Главный цикл ---
function loop() {
  if (state !== 'playing') return;

  frame++;
  score = Math.floor(frame * 0.7);
  checkLevelUp();

  const lv = currentLevel();
  const speed = lv.baseSpeed + Math.floor((score - (LEVELS[levelIdx - 1]?.scoreToNext || 0)) / 60) * 0.4;

  // движение игрока
  playerX += (targetX - playerX) * 0.16;

  // препятствия
  spawnTimer++;
  if (spawnTimer >= lv.spawnRate) {
    spawnObs();
    spawnTimer = 0;
  }
  obstacles.forEach(o => o.y += speed);
  obstacles = obstacles.filter(o => o.y < H + 60);

  // коллизии
  if (invincible > 0) {
    invincible--;
  } else {
    for (let o of obstacles) {
      if (checkCollision(playerX, o)) {
        lives--;
        invincible = 100;
        obstacles = obstacles.filter(ob => ob !== o);
        updateHUD();
        if (lives <= 0) {
          state = 'over';
          drawGameOver();
          return;
        }
        break;
      }
    }
  }

  // рисуем
  drawBackground();
  drawObstacles();
  drawPlayer();
  drawLevelUp();

  updateHUD();
  requestAnimationFrame(loop);
}

// --- Конец игры ---
function drawGameOver() {
  ctx.fillStyle = 'rgba(5,0,20,0.8)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Конец поездки 😅', W / 2, H / 2 - 50);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#cc99ff';
  ctx.fillText('Счёт: ' + score, W / 2, H / 2);
  ctx.font = '15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Нажми кнопку чтобы снова', W / 2, H / 2 + 50);

  const overlay = document.getElementById('overlay');
  overlay.querySelector('h1').textContent = '😅 Конец поездки';
  overlay.querySelector('p').textContent = 'Счёт: ' + score;
  overlay.querySelector('button').textContent = 'Ещё раз!';
  overlay.style.display = 'flex';
}

// --- Управление клавиатура ---
document.addEventListener('keydown', e => {
  if (state !== 'playing') return;
  if ((e.key === 'ArrowLeft' || e.key === 'a') && playerLane > 0) {
    playerLane--; targetX = LANES[playerLane];
  }
  if ((e.key === 'ArrowRight' || e.key === 'd') && playerLane < 3) {
    playerLane++; targetX = LANES[playerLane];
  }
});

// --- Управление кнопки ---
document.getElementById('btn-left').addEventListener('pointerdown', () => {
  if (state !== 'playing') return;
  if (playerLane > 0) { playerLane--; targetX = LANES[playerLane]; }
});
document.getElementById('btn-right').addEventListener('pointerdown', () => {
  if (state !== 'playing') return;
  if (playerLane < 3) { playerLane++; targetX = LANES[playerLane]; }
});

// --- Управление свайп ---
let touchStartX = 0;
canvas.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  e.preventDefault();
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

// --- Старт ---
document.getElementById('btn-start').addEventListener('click', () => {
  document.getElementById('overlay').style.display = 'none';
  initGame();
});

// --- Начальный экран ---
(function drawIdle() {
  drawBackground();
})();
