// ============================================
// FLAPPY FURY - An Anduril Fury Plane Game
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game dimensions (portrait mode like original)
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;

// Scale for retina displays
let scale = 1;

function resizeCanvas() {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    
    // Maintain aspect ratio
    const aspectRatio = GAME_WIDTH / GAME_HEIGHT;
    let width, height;
    
    if (containerWidth / containerHeight > aspectRatio) {
        height = containerHeight;
        width = height * aspectRatio;
    } else {
        width = containerWidth;
        height = width / aspectRatio;
    }
    
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    
    scale = width / GAME_WIDTH;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================
// SOUND SYSTEM
// ============================================

class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.sounds = {};
    }
    
    init() {
        if (this.audioContext) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.createSounds();
    }
    
    createSounds() {
        // All sounds are synthesized for no external dependencies
    }
    
    playTone(frequency, duration, type = 'square', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }
    
    playFlap() {
        this.playTone(400, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(500, 0.08, 'square', 0.15), 50);
    }
    
    playScore() {
        this.playTone(523, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(659, 0.1, 'square', 0.2), 100);
        setTimeout(() => this.playTone(784, 0.15, 'square', 0.2), 200);
    }
    
    playHit() {
        this.playTone(200, 0.2, 'sawtooth', 0.3);
        this.playTone(150, 0.3, 'sawtooth', 0.2);
    }
    
    playDie() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.playTone(300 - i * 40, 0.1, 'square', 0.2);
            }, i * 80);
        }
    }
    
    playSwoosh() {
        this.playTone(200, 0.15, 'sine', 0.1);
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

const soundManager = new SoundManager();

// ============================================
// GAME STATE
// ============================================

const GameState = {
    MENU: 'menu',
    READY: 'ready',
    PLAYING: 'playing',
    GAME_OVER: 'game_over'
};

let gameState = GameState.MENU;
let score = 0;
let bestScore = parseInt(localStorage.getItem('flappyFuryBest')) || 0;
let gameTime = 0; // For day/night cycle
let dayProgress = 0; // 0-1, 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight

// ============================================
// COLORS & THEMES (Day/Night)
// ============================================

function getSkyColors() {
    // dayProgress: 0=dawn, 0.25=noon, 0.5=dusk, 0.75=midnight
    const times = {
        dawn: { top: '#FF6B6B', bottom: '#FFE66D', sun: true },
        day: { top: '#87CEEB', bottom: '#B0E0E6', sun: true },
        dusk: { top: '#FF8C42', bottom: '#FFD700', sun: true },
        night: { top: '#0D1B2A', bottom: '#1B263B', sun: false }
    };
    
    let phase, nextPhase, t;
    
    if (dayProgress < 0.15) {
        phase = 'dawn';
        nextPhase = 'day';
        t = dayProgress / 0.15;
    } else if (dayProgress < 0.4) {
        phase = 'day';
        nextPhase = 'day';
        t = 0;
    } else if (dayProgress < 0.55) {
        phase = 'day';
        nextPhase = 'dusk';
        t = (dayProgress - 0.4) / 0.15;
    } else if (dayProgress < 0.7) {
        phase = 'dusk';
        nextPhase = 'night';
        t = (dayProgress - 0.55) / 0.15;
    } else if (dayProgress < 0.9) {
        phase = 'night';
        nextPhase = 'night';
        t = 0;
    } else {
        phase = 'night';
        nextPhase = 'dawn';
        t = (dayProgress - 0.9) / 0.1;
    }
    
    return {
        top: lerpColor(times[phase].top, times[nextPhase].top, t),
        bottom: lerpColor(times[phase].bottom, times[nextPhase].bottom, t),
        isNight: dayProgress > 0.6 && dayProgress < 0.95
    };
}

function lerpColor(c1, c2, t) {
    const r1 = parseInt(c1.slice(1, 3), 16);
    const g1 = parseInt(c1.slice(3, 5), 16);
    const b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16);
    const g2 = parseInt(c2.slice(3, 5), 16);
    const b2 = parseInt(c2.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ============================================
// CELESTIAL BODIES
// ============================================

const stars = [];
const shootingStars = [];

function initStars() {
    stars.length = 0;
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * GAME_WIDTH,
            y: Math.random() * (GAME_HEIGHT * 0.6),
            size: Math.random() * 2 + 0.5,
            twinkle: Math.random() * Math.PI * 2,
            twinkleSpeed: Math.random() * 0.1 + 0.05
        });
    }
}

initStars();

function spawnShootingStar() {
    if (shootingStars.length < 3 && Math.random() < 0.002) {
        shootingStars.push({
            x: Math.random() * GAME_WIDTH * 0.5,
            y: Math.random() * GAME_HEIGHT * 0.3,
            vx: 8 + Math.random() * 4,
            vy: 4 + Math.random() * 2,
            length: 30 + Math.random() * 20,
            life: 1
        });
    }
}

function drawCelestialBodies() {
    const skyColors = getSkyColors();
    
    // Sun position based on day progress
    if (dayProgress < 0.6) {
        const sunProgress = dayProgress / 0.6;
        const sunX = GAME_WIDTH * 0.8;
        const sunY = GAME_HEIGHT * 0.5 - Math.sin(sunProgress * Math.PI) * GAME_HEIGHT * 0.4;
        
        // Sun glow
        const gradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
        gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
        ctx.fill();
        
        // Sun core
        ctx.fillStyle = '#FFE87C';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Moon and stars at night
    if (skyColors.isNight) {
        // Stars
        stars.forEach(star => {
            star.twinkle += star.twinkleSpeed;
            const alpha = 0.3 + Math.sin(star.twinkle) * 0.4 + 0.3;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Shooting stars
        spawnShootingStar();
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const ss = shootingStars[i];
            ss.x += ss.vx;
            ss.y += ss.vy;
            ss.life -= 0.02;
            
            if (ss.life <= 0 || ss.x > GAME_WIDTH || ss.y > GAME_HEIGHT) {
                shootingStars.splice(i, 1);
                continue;
            }
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${ss.life})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ss.x, ss.y);
            ctx.lineTo(ss.x - ss.vx * ss.length / 10, ss.y - ss.vy * ss.length / 10);
            ctx.stroke();
        }
        
        // Moon
        const moonProgress = (dayProgress - 0.6) / 0.35;
        const moonX = GAME_WIDTH * 0.2;
        const moonY = GAME_HEIGHT * 0.15 + Math.sin(moonProgress * Math.PI) * 50;
        
        // Moon glow
        const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 50);
        moonGlow.addColorStop(0, 'rgba(200, 200, 255, 0.3)');
        moonGlow.addColorStop(1, 'rgba(200, 200, 255, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Moon
        ctx.fillStyle = '#F5F5DC';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Moon craters (pixel style)
        ctx.fillStyle = 'rgba(180, 180, 160, 0.5)';
        ctx.beginPath();
        ctx.arc(moonX - 5, moonY - 5, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(moonX + 7, moonY + 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(moonX - 2, moonY + 8, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// BACKGROUND PLANES (Fury flyby)
// ============================================

const backgroundPlanes = [];

function spawnBackgroundPlane() {
    if (backgroundPlanes.length < 3 && Math.random() < 0.003) {
        const goingRight = Math.random() > 0.5;
        backgroundPlanes.push({
            x: goingRight ? -60 : GAME_WIDTH + 60,
            y: 50 + Math.random() * (GAME_HEIGHT * 0.4),
            speed: (2 + Math.random() * 2) * (goingRight ? 1 : -1),
            scale: 0.3 + Math.random() * 0.4,
            type: Math.random() > 0.7 ? 'plane' : 'fury'
        });
    }
}

function drawBackgroundPlanes() {
    for (let i = backgroundPlanes.length - 1; i >= 0; i--) {
        const plane = backgroundPlanes[i];
        plane.x += plane.speed;
        
        // Remove if off screen
        if ((plane.speed > 0 && plane.x > GAME_WIDTH + 80) ||
            (plane.speed < 0 && plane.x < -80)) {
            backgroundPlanes.splice(i, 1);
            continue;
        }
        
        ctx.save();
        ctx.translate(plane.x, plane.y);
        ctx.scale(plane.scale, plane.scale);
        if (plane.speed < 0) ctx.scale(-1, 1);
        
        ctx.globalAlpha = 0.4;
        
        if (plane.type === 'fury') {
            drawFuryPlane(0, 0, 0, true);
        } else {
            // Simple plane silhouette
            ctx.fillStyle = '#555';
            ctx.fillRect(-25, -3, 50, 6);
            ctx.fillRect(-10, -15, 5, 30);
            ctx.fillRect(15, -8, 10, 16);
        }
        
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ============================================
// PLAYER (Fury Plane)
// ============================================

const player = {
    x: 80,
    y: GAME_HEIGHT / 2,
    width: 48,
    height: 32,
    velocity: 0,
    gravity: 0.5,
    flapStrength: -8,
    rotation: 0,
    thrusterPhase: 0
};

function drawFuryPlane(x, y, rotation, isBackground = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    
    const px = 2; // Pixel size for pixel art effect
    
    // Main fuselage - sleek stealth design
    ctx.fillStyle = isBackground ? '#444' : '#3d3d3d';
    
    // Body (elongated diamond shape)
    ctx.beginPath();
    ctx.moveTo(24, 0);      // Nose
    ctx.lineTo(10, -8);     // Top front
    ctx.lineTo(-20, -6);    // Top rear
    ctx.lineTo(-24, 0);     // Tail
    ctx.lineTo(-20, 6);     // Bottom rear
    ctx.lineTo(10, 8);      // Bottom front
    ctx.closePath();
    ctx.fill();
    
    // Cockpit
    ctx.fillStyle = isBackground ? '#333' : '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(8, -4);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.lineTo(8, 4);
    ctx.closePath();
    ctx.fill();
    
    // Cockpit glass highlight
    if (!isBackground) {
        ctx.fillStyle = 'rgba(100, 150, 200, 0.4)';
        ctx.beginPath();
        ctx.moveTo(14, -1);
        ctx.lineTo(6, -3);
        ctx.lineTo(-2, -3);
        ctx.lineTo(-2, 0);
        ctx.lineTo(6, 0);
        ctx.closePath();
        ctx.fill();
    }
    
    // Wings
    ctx.fillStyle = isBackground ? '#555' : '#4a4a4a';
    // Top wing
    ctx.beginPath();
    ctx.moveTo(-5, -6);
    ctx.lineTo(-15, -14);
    ctx.lineTo(-20, -12);
    ctx.lineTo(-18, -6);
    ctx.closePath();
    ctx.fill();
    // Bottom wing
    ctx.beginPath();
    ctx.moveTo(-5, 6);
    ctx.lineTo(-15, 14);
    ctx.lineTo(-20, 12);
    ctx.lineTo(-18, 6);
    ctx.closePath();
    ctx.fill();
    
    // Tail fins
    ctx.fillStyle = isBackground ? '#444' : '#3d3d3d';
    ctx.beginPath();
    ctx.moveTo(-18, -4);
    ctx.lineTo(-24, -10);
    ctx.lineTo(-24, -4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-18, 4);
    ctx.lineTo(-24, 10);
    ctx.lineTo(-24, 4);
    ctx.closePath();
    ctx.fill();
    
    // Engine/thruster glow
    if (!isBackground) {
        player.thrusterPhase += 0.3;
        const thrusterAlpha = 0.6 + Math.sin(player.thrusterPhase) * 0.3;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(-24, 0, 0, -24, 0, 15);
        gradient.addColorStop(0, `rgba(255, 100, 0, ${thrusterAlpha})`);
        gradient.addColorStop(0.5, `rgba(255, 50, 0, ${thrusterAlpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(-26, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner flame
        ctx.fillStyle = `rgba(255, 200, 100, ${thrusterAlpha})`;
        ctx.beginPath();
        ctx.moveTo(-24, -3);
        ctx.lineTo(-32 - Math.sin(player.thrusterPhase * 2) * 4, 0);
        ctx.lineTo(-24, 3);
        ctx.closePath();
        ctx.fill();
    }
    
    // Anduril marking (small)
    if (!isBackground) {
        ctx.fillStyle = '#666';
        ctx.font = '4px Arial';
        ctx.fillText('A', -12, 2);
    }
    
    // Highlights
    if (!isBackground) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(20, -2);
        ctx.lineTo(0, -6);
        ctx.stroke();
    }
    
    ctx.restore();
}

function updatePlayer() {
    if (gameState === GameState.PLAYING) {
        player.velocity += player.gravity;
        player.y += player.velocity;
        
        // Rotation based on velocity
        player.rotation = Math.min(Math.max(player.velocity * 0.04, -0.5), Math.PI / 2);
        
        // Ground collision
        if (player.y + player.height / 2 > GAME_HEIGHT - groundHeight) {
            player.y = GAME_HEIGHT - groundHeight - player.height / 2;
            gameOver();
        }
        
        // Ceiling
        if (player.y - player.height / 2 < 0) {
            player.y = player.height / 2;
            player.velocity = 0;
        }
    } else if (gameState === GameState.READY) {
        // Hover animation
        player.y = GAME_HEIGHT / 2 + Math.sin(gameTime * 0.05) * 10;
        player.rotation = Math.sin(gameTime * 0.03) * 0.1;
    }
}

function flap() {
    if (gameState === GameState.READY) {
        gameState = GameState.PLAYING;
        document.getElementById('score-display').classList.add('visible');
    }
    
    if (gameState === GameState.PLAYING) {
        player.velocity = player.flapStrength;
        soundManager.playFlap();
    }
}

// ============================================
// OBSTACLES (Mario-style brick walls)
// ============================================

const obstacles = [];
const obstacleWidth = 60;
const gapHeight = 150;
const obstacleSpeed = 2.5;
let obstacleTimer = 0;
const obstacleInterval = 100;

function spawnObstacle() {
    const minY = 80;
    const maxY = GAME_HEIGHT - groundHeight - gapHeight - 80;
    const gapY = minY + Math.random() * (maxY - minY);
    
    obstacles.push({
        x: GAME_WIDTH + obstacleWidth,
        gapY: gapY,
        passed: false,
        type: Math.random() > 0.5 ? 'brick' : 'pipe'
    });
}

function drawBrickWall(x, y, width, height, isTop) {
    // Main pipe/wall color
    const brickColor = '#C84C0C';
    const brickDark = '#8B2500';
    const brickLight = '#E85D04';
    const mortarColor = '#8B4513';
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
    
    // Background mortar
    ctx.fillStyle = mortarColor;
    ctx.fillRect(x, y, width, height);
    
    const brickWidth = 20;
    const brickHeight = 12;
    const mortarWidth = 2;
    
    let row = 0;
    for (let by = y; by < y + height; by += brickHeight + mortarWidth) {
        const offset = (row % 2) * (brickWidth / 2);
        for (let bx = x - brickWidth + offset; bx < x + width; bx += brickWidth + mortarWidth) {
            // Main brick
            ctx.fillStyle = brickColor;
            ctx.fillRect(bx, by, brickWidth, brickHeight);
            
            // Brick highlight (top-left)
            ctx.fillStyle = brickLight;
            ctx.fillRect(bx, by, brickWidth, 2);
            ctx.fillRect(bx, by, 2, brickHeight);
            
            // Brick shadow (bottom-right)
            ctx.fillStyle = brickDark;
            ctx.fillRect(bx, by + brickHeight - 2, brickWidth, 2);
            ctx.fillRect(bx + brickWidth - 2, by, 2, brickHeight);
        }
        row++;
    }
    
    // Border
    ctx.strokeStyle = '#5D2E0C';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    
    // Cap (like Mario pipes)
    const capHeight = 20;
    const capExtend = 8;
    const capY = isTop ? y + height - capHeight : y;
    
    ctx.fillStyle = '#6B8E23';
    ctx.fillRect(x - capExtend, capY, width + capExtend * 2, capHeight);
    
    // Cap highlight
    ctx.fillStyle = '#7CFC00';
    ctx.fillRect(x - capExtend, capY, width + capExtend * 2, 4);
    ctx.fillRect(x - capExtend, capY, 4, capHeight);
    
    // Cap shadow
    ctx.fillStyle = '#3D5A1E';
    ctx.fillRect(x - capExtend, capY + capHeight - 4, width + capExtend * 2, 4);
    ctx.fillRect(x + width + capExtend - 4, capY, 4, capHeight);
    
    // Cap border
    ctx.strokeStyle = '#2D4A0E';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - capExtend, capY, width + capExtend * 2, capHeight);
    
    ctx.restore();
}

function drawPipe(x, y, width, height, isTop) {
    // Classic green pipe style
    const pipeGreen = '#5BA35B';
    const pipeLight = '#7DC67D';
    const pipeDark = '#3D7A3D';
    const pipeVeryDark = '#2D5A2D';
    
    // Main pipe body
    ctx.fillStyle = pipeGreen;
    ctx.fillRect(x, y, width, height);
    
    // Pipe highlight (left side)
    ctx.fillStyle = pipeLight;
    ctx.fillRect(x, y, 8, height);
    
    // Pipe gradient middle
    ctx.fillStyle = pipeGreen;
    ctx.fillRect(x + 8, y, width - 16, height);
    
    // Pipe shadow (right side)
    ctx.fillStyle = pipeDark;
    ctx.fillRect(x + width - 8, y, 8, height);
    
    // Cap
    const capHeight = 26;
    const capExtend = 8;
    const capY = isTop ? y + height - capHeight : y;
    
    ctx.fillStyle = pipeGreen;
    ctx.fillRect(x - capExtend, capY, width + capExtend * 2, capHeight);
    
    // Cap highlight
    ctx.fillStyle = pipeLight;
    ctx.fillRect(x - capExtend, capY, 10, capHeight);
    
    // Cap shadow
    ctx.fillStyle = pipeDark;
    ctx.fillRect(x + width + capExtend - 10, capY, 10, capHeight);
    
    // Cap top/bottom edge
    ctx.fillStyle = pipeVeryDark;
    if (isTop) {
        ctx.fillRect(x - capExtend, capY, width + capExtend * 2, 3);
    } else {
        ctx.fillRect(x - capExtend, capY + capHeight - 3, width + capExtend * 2, 3);
    }
    
    // Border
    ctx.strokeStyle = pipeVeryDark;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - capExtend, capY, width + capExtend * 2, capHeight);
    ctx.strokeRect(x, y, width, height);
}

function updateObstacles() {
    if (gameState !== GameState.PLAYING) return;
    
    obstacleTimer++;
    if (obstacleTimer >= obstacleInterval) {
        spawnObstacle();
        obstacleTimer = 0;
    }
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= obstacleSpeed;
        
        // Check if passed
        if (!obs.passed && obs.x + obstacleWidth < player.x) {
            obs.passed = true;
            score++;
            document.getElementById('score-display').textContent = score;
            soundManager.playScore();
        }
        
        // Remove if off screen
        if (obs.x + obstacleWidth < -20) {
            obstacles.splice(i, 1);
        }
    }
}

function drawObstacles() {
    obstacles.forEach(obs => {
        // Top obstacle
        const topHeight = obs.gapY;
        if (obs.type === 'brick') {
            drawBrickWall(obs.x, 0, obstacleWidth, topHeight, true);
        } else {
            drawPipe(obs.x, 0, obstacleWidth, topHeight, true);
        }
        
        // Bottom obstacle
        const bottomY = obs.gapY + gapHeight;
        const bottomHeight = GAME_HEIGHT - groundHeight - bottomY;
        if (obs.type === 'brick') {
            drawBrickWall(obs.x, bottomY, obstacleWidth, bottomHeight, false);
        } else {
            drawPipe(obs.x, bottomY, obstacleWidth, bottomHeight, false);
        }
    });
}

function checkCollisions() {
    if (gameState !== GameState.PLAYING) return;
    
    const playerBox = {
        x: player.x - player.width / 3,
        y: player.y - player.height / 3,
        width: player.width * 0.6,
        height: player.height * 0.6
    };
    
    for (const obs of obstacles) {
        // Top obstacle
        const topBox = {
            x: obs.x - 5,
            y: 0,
            width: obstacleWidth + 10,
            height: obs.gapY
        };
        
        // Bottom obstacle
        const bottomBox = {
            x: obs.x - 5,
            y: obs.gapY + gapHeight,
            width: obstacleWidth + 10,
            height: GAME_HEIGHT - groundHeight - obs.gapY - gapHeight
        };
        
        if (boxCollision(playerBox, topBox) || boxCollision(playerBox, bottomBox)) {
            gameOver();
            return;
        }
    }
}

function boxCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// ============================================
// GROUND
// ============================================

const groundHeight = 80;
let groundOffset = 0;

function drawGround() {
    // Ground scroll
    if (gameState === GameState.PLAYING || gameState === GameState.READY) {
        groundOffset = (groundOffset + obstacleSpeed) % 24;
    }
    
    // Sky-ground separator (grass top)
    const grassY = GAME_HEIGHT - groundHeight;
    
    // Grass layer
    ctx.fillStyle = '#5BA35B';
    ctx.fillRect(0, grassY, GAME_WIDTH, 20);
    
    // Grass highlights
    ctx.fillStyle = '#7DC67D';
    for (let x = -groundOffset; x < GAME_WIDTH; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, grassY);
        ctx.lineTo(x + 12, grassY + 12);
        ctx.lineTo(x + 24, grassY);
        ctx.fill();
    }
    
    // Dirt layer
    ctx.fillStyle = '#C4A35A';
    ctx.fillRect(0, grassY + 20, GAME_WIDTH, groundHeight - 20);
    
    // Dirt pattern
    ctx.fillStyle = '#A68B4B';
    for (let x = -groundOffset; x < GAME_WIDTH + 24; x += 24) {
        for (let y = grassY + 24; y < GAME_HEIGHT; y += 24) {
            ctx.fillRect(x, y, 20, 20);
            ctx.fillStyle = '#8B7355';
            ctx.fillRect(x + 2, y + 18, 16, 4);
            ctx.fillRect(x + 18, y + 2, 4, 16);
            ctx.fillStyle = '#D4B36A';
            ctx.fillRect(x + 2, y + 2, 4, 4);
            ctx.fillStyle = '#A68B4B';
        }
    }
    
    // Ground top border
    ctx.fillStyle = '#3D5A3D';
    ctx.fillRect(0, grassY, GAME_WIDTH, 3);
}

// ============================================
// BACKGROUND (City/Clouds)
// ============================================

const clouds = [];
const buildings = [];

function initBackground() {
    // Initialize clouds
    clouds.length = 0;
    for (let i = 0; i < 5; i++) {
        clouds.push({
            x: Math.random() * GAME_WIDTH,
            y: 80 + Math.random() * 150,
            width: 60 + Math.random() * 80,
            speed: 0.2 + Math.random() * 0.3
        });
    }
    
    // Initialize buildings
    buildings.length = 0;
    let x = 0;
    while (x < GAME_WIDTH + 100) {
        const width = 40 + Math.random() * 50;
        buildings.push({
            x: x,
            width: width,
            height: 80 + Math.random() * 150,
            windows: Math.floor(Math.random() * 3) + 2
        });
        x += width + 5;
    }
}

initBackground();

function drawBackground() {
    const skyColors = getSkyColors();
    
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, skyColors.top);
    gradient.addColorStop(1, skyColors.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw celestial bodies (sun/moon/stars)
    drawCelestialBodies();
    
    // Clouds
    ctx.fillStyle = skyColors.isNight ? 'rgba(100, 100, 120, 0.3)' : 'rgba(255, 255, 255, 0.9)';
    clouds.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x + cloud.width < 0) {
            cloud.x = GAME_WIDTH + 20;
            cloud.y = 80 + Math.random() * 150;
        }
        
        // Fluffy cloud shape
        const h = cloud.width * 0.4;
        ctx.beginPath();
        ctx.arc(cloud.x + cloud.width * 0.25, cloud.y, h * 0.6, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.5, cloud.y - h * 0.3, h * 0.8, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.75, cloud.y, h * 0.6, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width * 0.5, cloud.y + h * 0.2, h * 0.5, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Background planes
    spawnBackgroundPlane();
    drawBackgroundPlanes();
    
    // Buildings (cityscape)
    const buildingBaseY = GAME_HEIGHT - groundHeight;
    buildings.forEach(building => {
        const brightness = skyColors.isNight ? 0.3 : 0.6;
        ctx.fillStyle = `rgba(100, 130, 150, ${brightness})`;
        ctx.fillRect(building.x, buildingBaseY - building.height, building.width, building.height);
        
        // Building outline
        ctx.strokeStyle = `rgba(60, 80, 100, ${brightness})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(building.x, buildingBaseY - building.height, building.width, building.height);
        
        // Windows
        const windowWidth = 6;
        const windowHeight = 8;
        const windowGap = 8;
        const windowRows = Math.floor(building.height / (windowHeight + windowGap)) - 1;
        
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < building.windows; col++) {
                const wx = building.x + 8 + col * (windowWidth + windowGap);
                const wy = buildingBaseY - building.height + 15 + row * (windowHeight + windowGap);
                
                if (wx + windowWidth < building.x + building.width - 5) {
                    // Window lit up at night, darker during day
                    if (skyColors.isNight && Math.random() > 0.3) {
                        ctx.fillStyle = 'rgba(255, 240, 150, 0.8)';
                    } else {
                        ctx.fillStyle = skyColors.isNight ? 'rgba(40, 50, 60, 0.8)' : 'rgba(150, 200, 220, 0.6)';
                    }
                    ctx.fillRect(wx, wy, windowWidth, windowHeight);
                }
            }
        }
    });
    
    // Cloud layer (foreground, semi-transparent)
    ctx.fillStyle = skyColors.isNight ? 'rgba(80, 80, 100, 0.4)' : 'rgba(255, 255, 255, 0.7)';
    const cloudY = GAME_HEIGHT - groundHeight - 40;
    for (let x = -groundOffset * 0.5; x < GAME_WIDTH + 50; x += 70) {
        ctx.beginPath();
        ctx.arc(x, cloudY, 25, 0, Math.PI * 2);
        ctx.arc(x + 25, cloudY - 10, 30, 0, Math.PI * 2);
        ctx.arc(x + 50, cloudY, 25, 0, Math.PI * 2);
        ctx.arc(x + 25, cloudY + 5, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ============================================
// UI & GAME STATES
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

function gameOver() {
    if (gameState === GameState.GAME_OVER) return;
    
    gameState = GameState.GAME_OVER;
    soundManager.playHit();
    setTimeout(() => soundManager.playDie(), 200);
    
    // Update best score
    let isNewBest = false;
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('flappyFuryBest', bestScore);
        isNewBest = true;
    }
    
    // Show game over screen after delay
    setTimeout(() => {
        document.getElementById('score-display').classList.remove('visible');
        document.getElementById('final-score').textContent = score;
        document.getElementById('best-score').textContent = bestScore;
        
        // Medal
        const medal = document.getElementById('medal');
        medal.className = 'medal';
        if (score >= 40) medal.classList.add('platinum');
        else if (score >= 30) medal.classList.add('gold');
        else if (score >= 20) medal.classList.add('silver');
        else if (score >= 10) medal.classList.add('bronze');
        
        // New best indicator
        const newBadge = document.getElementById('new-best');
        if (isNewBest) {
            newBadge.classList.remove('hidden');
        } else {
            newBadge.classList.add('hidden');
        }
        
        showScreen('game-over-screen');
    }, 800);
}

function resetGame() {
    player.y = GAME_HEIGHT / 2;
    player.velocity = 0;
    player.rotation = 0;
    obstacles.length = 0;
    obstacleTimer = 0;
    score = 0;
    document.getElementById('score-display').textContent = '0';
}

function startGame() {
    soundManager.init();
    resetGame();
    gameState = GameState.READY;
    showScreen(null);
    soundManager.playSwoosh();
}

// ============================================
// INPUT HANDLING
// ============================================

function handleInput(e) {
    e.preventDefault();
    
    if (gameState === GameState.READY || gameState === GameState.PLAYING) {
        flap();
    }
}

// Keyboard
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        handleInput(e);
    }
});

// Touch
canvas.addEventListener('touchstart', handleInput, { passive: false });

// Mouse
canvas.addEventListener('mousedown', handleInput);

// UI Buttons
document.getElementById('start-btn').addEventListener('click', () => {
    startGame();
});

document.getElementById('play-btn').addEventListener('click', () => {
    startGame();
});

document.getElementById('share-btn').addEventListener('click', () => {
    const text = `I scored ${score} in Flappy Fury! Can you beat my score?`;
    if (navigator.share) {
        navigator.share({ title: 'Flappy Fury', text: text });
    } else {
        navigator.clipboard.writeText(text).then(() => {
            alert('Score copied to clipboard!');
        });
    }
});

document.getElementById('sound-toggle').addEventListener('click', function() {
    soundManager.init();
    const enabled = soundManager.toggle();
    this.className = enabled ? 'sound-on' : 'sound-off';
    this.textContent = enabled ? '🔊' : '🔇';
});

// ============================================
// MAIN GAME LOOP
// ============================================

function update() {
    gameTime++;
    
    // Day/night cycle (full cycle every ~2 minutes of gameplay)
    if (gameState === GameState.PLAYING) {
        dayProgress = (dayProgress + 0.0001) % 1;
    }
    
    updatePlayer();
    updateObstacles();
    checkCollisions();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Draw layers
    drawBackground();
    drawObstacles();
    drawGround();
    
    // Draw player
    if (gameState !== GameState.MENU) {
        drawFuryPlane(player.x, player.y, player.rotation);
    }
    
    // Ready state - show tap instruction
    if (gameState === GameState.READY) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('TAP TO FLY', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
        ctx.textAlign = 'left';
        
        // Animated hand/tap icon
        const handY = GAME_HEIGHT / 2 + 40 + Math.sin(gameTime * 0.1) * 5;
        ctx.fillStyle = '#fff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('👆', GAME_WIDTH / 2, handY);
        ctx.textAlign = 'left';
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();

// Initial state
showScreen('title-screen');

