const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreVal = document.getElementById('score-val');
const highVal = document.getElementById('high-val');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const gameOverText = document.getElementById('game-over-text');
const summaryText = document.getElementById('summary-text');

// Joystick DOM Targets
const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');

let gameActive = false;
let score = 0;
let highScore = localStorage.getItem('onlyDownHighScore') || 0;
highVal.innerText = highScore;

const player = {
    x: 200,
    y: 100,
    radius: 12,
    speed: 5,
    vx: 0,
    vy: 0,
    color: '#00fff5'
};

const GRAVITY = 0.4;
const TERMINAL_VELOCITY = 12;

let platforms = [];
const platformHeight = 15;
let scrollSpeed = 1.5;
let minGap = 80;
let maxGap = 130;

// Input system tracking values
const keyboardInput = { left: false, right: false };
let joystickInputX = 0; // Ranges between -1 (full left) and 1 (full right)

// --- PC Keyboard Event Listeners ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyboardInput.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyboardInput.right = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyboardInput.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyboardInput.right = false;
});

// --- Mobile Virtual Joystick Logic ---
let joystickActive = false;
let joystickStartX = 0;
const maxJoystickDistance = 35; // Maximum pixel drag distance for the stick knob

joystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystickActive = true;
    const touch = e.touches[0];
    const rect = joystickBase.getBoundingClientRect();
    // Center point anchor of base element
    joystickStartX = rect.left + rect.width / 2;
    handleJoystickMove(touch.clientX);
});

window.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    const touch = e.touches[0];
    handleJoystickMove(touch.clientX);
}, { passive: false });

window.addEventListener('touchend', () => {
    if (!joystickActive) return;
    joystickActive = false;
    joystickInputX = 0;
    // Snap visual element back to resting center
    joystickStick.style.left = '50%';
    joystickStick.style.transform = 'translate(-50%, -50%)';
});

function handleJoystickMove(clientX) {
    let deltaX = clientX - joystickStartX;
    
    // Clamp structural vector boundaries
    if (deltaX > maxJoystickDistance) deltaX = maxJoystickDistance;
    if (deltaX < -maxJoystickDistance) deltaX = -maxJoystickDistance;

    // Shift graphic display knob
    const baseWidth = joystickBase.clientWidth;
    const centerOffsetPercentage = 50 + (deltaX / baseWidth) * 100;
    joystickStick.style.left = `${centerOffsetPercentage}%`;
    joystickStick.style.transform = `translate(-50%, -50%)`;

    // Map velocity calculation range scale between -1.0 and 1.0
    joystickInputX = deltaX / maxJoystickDistance;
}

// Start Game triggers
startBtn.addEventListener('click', initGame);
startBtn.addEventListener('touchstart', (e) => { e.preventDefault(); initGame(); });

function createPlatform(yPosition) {
    const minWidth = 60;
    const maxWidth = 140;
    const width = Math.random() * (maxWidth - minWidth) + minWidth;
    const x = Math.random() * (canvas.width - width);
    
    let type = 'normal'; 
    let rand = Math.random();
    if (rand > 0.85) type = 'bouncy';
    else if (rand > 0.70) type = 'moving';

    return {
        x: x,
        y: yPosition,
        width: width,
        height: platformHeight,
        type: type,
        direction: Math.random() > 0.5 ? 1 : -1,
        speed: Math.random() * 1.5 + 1
    };
}

function initGame() {
    platforms = [];
    score = 0;
    scrollSpeed = 1.5;
    scoreVal.innerText = score;
    
    platforms.push({
        x: 50,
        y: 250,
        width: 300,
        height: platformHeight,
        type: 'normal'
    });

    let currentY = 350;
    while (currentY < canvas.height + 200) {
        platforms.push(createPlatform(currentY));
        currentY += Math.random() * (maxGap - minGap) + minGap;
    }

    player.x = 200;
    player.y = 150;
    player.vx = 0;
    player.vy = 0;

    overlay.style.display = 'none';
    gameActive = true;
    
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameActive = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('onlyDownHighScore', highScore);
        highVal.innerText = highScore;
    }
    
    gameOverText.style.display = 'block';
    summaryText.innerHTML = `You reached a depth of <strong>${score}</strong> meters!`;
    startBtn.innerText = 'PLAY AGAIN';
    overlay.style.display = 'flex';
}

function gameLoop() {
    if (!gameActive) return;
    updatePhysics();
    renderGraphics();
    requestAnimationFrame(gameLoop);
}

function updatePhysics() {
    // Merge PC & Mobile Joystick input weights dynamically
    if (joystickActive) {
        player.vx = joystickInputX * player.speed;
    } else {
        if (keyboardInput.left) player.vx = -player.speed;
        else if (keyboardInput.right) player.vx = player.speed;
        else player.vx = 0;
    }

    player.vy += GRAVITY;
    if (player.vy > TERMINAL_VELOCITY) player.vy = TERMINAL_VELOCITY;

    player.x += player.vx;
    player.y += player.vy;

    if (player.x - player.radius < 0) player.x = player.radius;
    if (player.x + player.radius > canvas.width) player.x = canvas.width - player.radius;

    scrollSpeed = 1.5 + (score / 150); 
    player.y -= scrollSpeed;
    score += Math.floor(scrollSpeed * 0.1); 
    scoreVal.innerText = score;

    platforms.forEach(plat => {
        plat.y -= scrollSpeed;

        if (plat.type === 'moving') {
            plat.x += plat.speed * plat.direction;
            if (plat.x <= 0 || plat.x + plat.width >= canvas.width) {
                plat.direction *= -1;
            }
        }

        if (player.vy >= 0 &&
            player.x + player.radius - 4 > plat.x &&
            player.x - player.radius + 4 < plat.x + plat.width &&
            player.y + player.radius >= plat.y &&
            player.y - player.radius < plat.y + plat.height) {
            
            player.y = plat.y - player.radius;
            if (plat.type === 'bouncy') {
                player.vy = -10;
            } else {
                player.vy = 0;
            }
        }
    });

    platforms = platforms.filter(plat => plat.y + plat.height > 0);

    while (platforms.length < 10) {
        let lowestY = platforms.reduce((max, p) => p.y > max ? p.y : max, canvas.height);
        let nextY = lowestY + Math.random() * (maxGap - minGap) + minGap;
        platforms.push(createPlatform(nextY));
    }

    if (player.y - player.radius > canvas.height) endGame();
    if (player.y + player.radius < 0) endGame();
}

function renderGraphics() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    platforms.forEach(plat => {
        if (plat.type === 'bouncy') ctx.fillStyle = '#ff9f43';
        else if (plat.type === 'moving') ctx.fillStyle = '#9b5de5';
        else ctx.fillStyle = '#10ac84';
        
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(plat.x, plat.y, plat.width, 3);
    });

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = player.color;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}
