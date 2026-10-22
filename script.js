const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const coinsEl = document.getElementById("coins");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const message = document.getElementById("message");
const instructions = document.getElementById("instructions");

const W = canvas.width;
const H = canvas.height;

let running = false;
let gameOver = false;
let score = 0;
let coins = 0;
let speed = 5;
let spawnTimer = 0;
let lastTime = 0;
let animationId = 0;
let objects = [];

const player = {
  lane: 0,
  x: 0,
  jump: 0,
  slide: 0
};

function laneX(lane, y = 500) {
  return W / 2 + lane * (65 + y * 0.31);
}

function resetGame() {
  score = 0;
  coins = 0;
  speed = 5;
  spawnTimer = 0;
  objects = [];

  player.lane = 0;
  player.x = laneX(0);
  player.jump = 0;
  player.slide = 0;

  scoreEl.textContent = score;
  coinsEl.textContent = coins;
}

function startGame() {
  cancelAnimationFrame(animationId);
  resetGame();

  running = true;
  gameOver = false;
  overlay.style.display = "none";

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);
}

function endGame() {
  running = false;
  gameOver = true;

  message.textContent = "🏆 Game Over!";
  instructions.textContent =
    `Score: ${score} | Coins: ${coins}. Try again!`;
  startBtn.textContent = "Play Again";
  overlay.style.display = "block";
}

function move(direction) {
  if (!running) return;

  if (direction === "left") {
    player.lane = Math.max(-1, player.lane - 1);
  }

  if (direction === "right") {
    player.lane = Math.min(1, player.lane + 1);
  }

  if (direction === "jump" && player.jump <= 0) {
    player.jump = 650;
    player.slide = 0;
  }

  if (direction === "slide" && player.jump <= 0) {
    player.slide = 500;
  }
}

document.addEventListener("keydown", (event) => {
  const keys = [
    "ArrowLeft", "ArrowRight", "ArrowUp",
    "ArrowDown", " ", "a", "d", "w", "s"
  ];

  if (keys.includes(event.key)) event.preventDefault();

  if (event.repeat) return;

  switch (event.key) {
    case "ArrowLeft":
    case "a":
      move("left");
      break;

    case "ArrowRight":
    case "d":
      move("right");
      break;

    case "ArrowUp":
    case "w":
    case " ":
      move("jump");
      break;

    case "ArrowDown":
    case "s":
      move("slide");
      break;
  }
});

document.querySelectorAll("[data-move]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    move(button.dataset.move);
  });
});

startBtn.addEventListener("click", startGame);

// Create obstacles and coins in the three lanes.
function spawnObject() {
  const lane = Math.floor(Math.random() * 3) - 1;
  const roll = Math.random();

  let type;

  if (roll < 0.35) {
    type = "coin";
  } else if (roll < 0.58) {
    type = "barrier"; // Jump over it
  } else if (roll < 0.80) {
    type = "gate";    // Slide under it
  } else {
    type = "rock";    // Change lanes
  }

  objects.push({
    lane,
    y: -30,
    type,
    checked: false
  });

  // Occasionally add a small trail of coins.
  if (type === "coin") {
    for (let i = 1; i <= 2; i++) {
      objects.push({
        lane,
        y: -30 - i * 40,
        type: "coin",
        checked: false
      });
    }
  }
}

function update(dt) {
  const step = dt / 16.67;

  speed = Math.min(12, speed + 0.001 * step);
  score += Math.floor(speed * step / 5);

  scoreEl.textContent = score;
  coinsEl.textContent = coins;

  // Smoothly move between lanes.
  const targetX = laneX(player.lane);
  player.x += (targetX - player.x) * Math.min(1, 0.22 * step);

  player.jump = Math.max(0, player.jump - dt);
  player.slide = Math.max(0, player.slide - dt);

  spawnTimer += dt;

  if (spawnTimer > Math.max(420, 1000 - speed * 40)) {
    spawnObject();
    spawnTimer = 0;
  }

  for (const obj of objects) {
    obj.y += speed * step;

    if (obj.checked || obj.y < 455 || obj.y > 525) {
      continue;
    }

    if (obj.lane !== player.lane) continue;

    obj.checked = true;

    if (obj.type === "coin") {
      coins++;
      score += 25;
    } else if (
      obj.type === "barrier" && player.jump > 0
    ) {
      // Successfully jumped over the barrier.
    } else if (
      obj.type === "gate" && player.slide > 0
    ) {
      // Successfully slid beneath the gate.
    } else {
      endGame();
      return;
    }
  }

  objects = objects.filter((obj) => obj.y < H + 50);
}

// Draw the jungle and perspective road.
function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#8ccf83");
  sky.addColorStop(1, "#275e35");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Jungle trees.
  for (let i = 0; i < 12; i++) {
    const x = i * 85 - 20;

    ctx.fillStyle = i % 2 ? "#174d2c" : "#236b38";
    ctx.beginPath();
    ctx.arc(x, 150, 95, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#60452b";
    ctx.fillRect(x - 9, 150, 18, 260);
  }

  // Road.
  ctx.fillStyle = "#a58b67";
  ctx.beginPath();
  ctx.moveTo(330, 0);
  ctx.lineTo(570, 0);
  ctx.lineTo(820, H);
  ctx.lineTo(80, H);
  ctx.closePath();
  ctx.fill();

  // Road edges.
  ctx.strokeStyle = "#f5d69a";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(330, 0);
  ctx.lineTo(80, H);
  ctx.moveTo(570, 0);
  ctx.lineTo(820, H);
  ctx.stroke();

  // Three lanes.
  ctx.strokeStyle = "#e5d3a5";
  ctx.lineWidth = 4;
  ctx.setLineDash([25, 22]);

  for (const lane of [-0.5, 0.5]) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + lane * 120, 0);
    ctx.lineTo(W / 2 + lane * 370, H);
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

// Draw objects with a simple depth effect.
function drawObjects() {
  for (const obj of objects) {
    const y = obj.y;
    const x = laneX(obj.lane, y);
    const scale = 0.35 + Math.max(0, y) / 600;

    if (obj.type === "coin") {
      ctx.fillStyle = "#ffdc38";
      ctx.beginPath();
      ctx.ellipse(x, y, 12 * scale, 16 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#fff4a5";
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
    }

    if (obj.type === "barrier") {
      ctx.fillStyle = "#d95c36";
      ctx.fillRect(x - 27 * scale, y - 20 * scale,
        54 * scale, 32 * scale);

      ctx.fillStyle = "#f9d5a1";
      ctx.fillRect(x - 24 * scale, y - 10 * scale,
        48 * scale, 6 * scale);
    }

    if (obj.type === "gate") {
      ctx.fillStyle = "#70452b";
      ctx.fillRect(x - 27 * scale, y - 55 * scale,
        10 * scale, 65 * scale);
      ctx.fillRect(x + 17 * scale, y - 55 * scale,
        10 * scale, 65 * scale);
      ctx.fillRect(x - 30 * scale, y - 55 * scale,
        60 * scale, 13 * scale);
    }

    if (obj.type === "rock") {
      ctx.fillStyle = "#646d68";
      ctx.beginPath();
      ctx.ellipse(x, y, 24 * scale, 21 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Draw the running character.
function drawPlayer() {
  const x = player.x;
  const groundY = 505;
  const jumpHeight = player.jump > 0
    ? Math.sin((player.jump / 650) * Math.PI) * 100
    : 0;

  const y = groundY - jumpHeight;

  // Shadow.
  ctx.fillStyle = "#172b1b88";
  ctx.beginPath();
  ctx.ellipse(x, groundY + 15, 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  if (player.slide > 0) {
    // Sliding body.
    ctx.fillStyle = "#1c68d4";
    ctx.fillRect(x - 28, groundY - 25, 52, 22);

    ctx.fillStyle = "#f1c49b";
    ctx.beginPath();
    ctx.arc(x + 29, groundY - 25, 13, 0, Math.PI * 2);
    ctx.fill();

    return;
  }

  // Legs.
  ctx.strokeStyle = "#23364e";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(x - 8, y + 30);
  ctx.lineTo(x - 15, y + 48);
  ctx.moveTo(x + 8, y + 30);
  ctx.lineTo(x + 15, y + 48);
  ctx.stroke();

  // Arms.
  ctx.strokeStyle = "#f1c49b";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x - 14, y - 3);
  ctx.lineTo(x - 28, y + 17);
  ctx.moveTo(x + 14, y - 3);
  ctx.lineTo(x + 28, y + 17);
  ctx.stroke();

  // Shirt.
  ctx.fillStyle = "#1768c4";
  ctx.fillRect(x - 17, y - 10, 34, 42);

  // Face.
  ctx.fillStyle = "#f1c49b";
  ctx.beginPath();
  ctx.arc(x, y - 25, 17, 0, Math.PI * 2);
  ctx.fill();

  // Hair.
  ctx.fillStyle = "#422b20";
  ctx.beginPath();
  ctx.arc(x, y - 31, 17, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes.
  ctx.fillStyle = "#17251a";
  ctx.fillRect(x - 7, y - 27, 3, 4);
  ctx.fillRect(x + 5, y - 27, 3, 4);
}

function draw() {
  drawBackground();
  drawObjects();
  drawPlayer();
}

function gameLoop(timestamp) {
  if (!running) return;

  const dt = Math.min(timestamp - lastTime, 40);
  lastTime = timestamp;

  update(dt);
  draw();

  if (running) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

// Draw the starting screen's background.
resetGame();
draw();