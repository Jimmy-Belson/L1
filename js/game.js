// ==========================================
// ORBITRON: TECH-CORE ENGINE v2.1 [STABLE]
// ==========================================
import { getRankByScore } from '../js/ranks.js';

let canvas, ctx;
window.gameActive = true; 




const CONFIG = {
    FPS: 60,
    GAME_JUICE: { SHAKE_INTENSITY: 8, PARTICLE_COUNT: 15 },
    BALANCE: { LIVES: 3, SPAWN_INTERVAL: 80 }
};

// --- СИСТЕМА ПРЕДОТВРАЩЕНИЯ КОНФЛИКТОВ ---
const killBackgroundProcesses = () => {
    if (window.Core) {
        console.log("%c[SYSTEM] DETECTED_CORE: SHUTTING_DOWN_BACKGROUND_VISUALS", "color: #ff00e5");
        
        // 1. Останавливаем отрисовку звезд и планет из основного скрипта
        if (window.Core.Canvas) {
            window.Core.Canvas.draw = () => {}; 
        }
        
        // 2. Блокируем автоматические редиректы Core на время игры
        const originalInit = window.Core.init;
        window.Core.init = async function() {
            console.log("[SYSTEM] CORE_STANDBY_MODE: GAME_PRIORITY");
            // Выполняем только важную часть (авторизацию), без запуска петель отрисовки
            const { data: { session } } = await this.sb.auth.getSession();
            if (session) this.user = session.user;
        };
    }
};

// ==========================================
// КЛАССЫ (ИГРОК, ВРАГИ, ЧАСТИЦЫ)
// ==========================================

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = 0.02;
    }
    update() { this.x += this.speedX; this.y += this.speedY; this.life -= this.decay; }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
}

class Player {
    constructor() {
        // Заменяем window.innerWidth на canvas.width
        // Это поставит корабль ровно по центру игровой зоны (450px)
        this.x = canvas.width / 2;

        // Заменяем window.innerHeight на canvas.height
        // Это гарантирует, что корабль будет внизу рамки, а не улетит под экран
        this.y = canvas.height - 60; 

        this.score = 0;
        this.lives = CONFIG.BALANCE.LIVES;

        // Целевая точка для мыши тоже должна быть привязана к центру канваса
        this.targetX = this.x;

        this.heat = 0;
        this.overheated = false;
    }
    update() {
        this.x += (this.targetX - this.x) * 0.15;
        if (this.overheated) {
            this.heat -= 0.5;
            if (this.heat <= 0) { this.overheated = false; this.heat = 0; }
        } else {
            this.heat = Math.max(0, this.heat - 1);
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const color = this.overheated ? '#f00' : '#0ff';
        ctx.strokeStyle = color;
        ctx.shadowBlur = 15; ctx.shadowColor = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.lineTo(-20, 15); ctx.lineTo(0, 5); ctx.lineTo(20, 15);
        ctx.closePath(); ctx.stroke();
        ctx.restore();
    }
}

class Enemy {
    constructor() {
        const rand = Math.random();
        
        if (rand < 0.15) { 
            // ТАНК (15% шанс)
            this.type = 'tank';
            this.size = 50;
            this.hp = 5; // Нужно 5 попаданий
            this.speed = 1 + Math.random() * 0.5;
            this.color = '#ffea00'; // Желтый неоновый
            this.scoreValue = 50;
        } else if (rand < 0.35) { 
            // СПРИНТЕР (20% шанс)
            this.type = 'sprinter';
            this.size = 15;
            this.hp = 1;
            this.speed = 5 + Math.random() * 2;
            this.color = '#00ff44'; // Ярко-зеленый
            this.scoreValue = 30;
        } else { 
            // ОБЫЧНЫЙ (65% шанс)
            this.type = 'normal';
            this.size = 30;
            this.hp = 1;
            this.speed = 2 + Math.random() * 2;
            this.color = '#ff00e5'; // Твой стандартный розовый
            this.scoreValue = 10;
        }

        this.x = Math.random() * (canvas.width - this.size * 2) + this.size;
        this.y = -this.size;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        
        // Отрисовка формы в зависимости от типа
        if (this.type === 'tank') {
            ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
            // Добавим полоску брони сверху
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        } else if (this.type === 'sprinter') {
            // Треугольник для шустрого врага
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.size);
            ctx.lineTo(this.x - this.size, this.y - this.size);
            ctx.lineTo(this.x + this.size, this.y - this.size);
            ctx.fill();
        } else {
            // Обычный ромб или круг
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    update() {
        this.y += this.speed;
    }
}

// ==========================================
// ДВИЖАТЕЛЬ
// ==========================================

class GameEngine {
    constructor() {
        // Сначала определяем холст внутри класса
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.player = new Player();
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.spawnTimer = 0;
        this.shake = 0;
        
        this.setupListeners();
    }

    requestLock() {
        // Запрашиваем захват курсора
        const req = this.canvas.requestPointerLock || this.canvas.mozRequestPointerLock;
        if (req) req.call(this.canvas);
    }

    setupListeners() {
        // 1. Активируем захват при клике
        this.canvas.addEventListener('mousedown', (e) => {
            if (window.gameActive && document.pointerLockElement !== this.canvas) {
                this.requestLock();
            }
            
            if (!window.gameActive || this.player.overheated) return;
            this.player.heat += 20;
            if (this.player.heat >= 100) this.player.overheated = true;
            this.projectiles.push({x: this.player.x, y: this.player.y - 20});
        });

        // 2. Движение
        window.addEventListener('mousemove', (e) => {
            if (!window.gameActive) return;

            if (document.pointerLockElement === this.canvas) {
                // Плавное движение при захвате (делим на 1.5 для комфорта)
                this.player.targetX += e.movementX / 1.5;
            } else {
                const rect = this.canvas.getBoundingClientRect();
                this.player.targetX = e.clientX - rect.left;
            }

            // Ограничения
            const margin = 30;
            if (this.player.targetX < margin) this.player.targetX = margin;
            if (this.player.targetX > this.canvas.width - margin) this.player.targetX = this.canvas.width - margin;
        });
    }

    update() {
        if (!window.gameActive) return;
        this.player.update();
        
        if (++this.spawnTimer > CONFIG.BALANCE.SPAWN_INTERVAL) {
            this.enemies.push(new Enemy());
            this.spawnTimer = 0;
        }

        this.projectiles.forEach((p, i) => {
            p.y -= 10;
            if (p.y < -20) this.projectiles.splice(i, 1);
        });

        this.enemies.forEach((e, i) => {
            e.update();
            this.projectiles.forEach((p, pi) => {
                if (Math.hypot(p.x - e.x, p.y - e.y) < e.size) {
                    e.hp -= 1;
                    this.projectiles.splice(pi, 1);
                    if (e.hp <= 0) {
                        this.player.score += e.scoreValue;
                        for(let j=0; j<10; j++) this.particles.push(new Particle(e.x, e.y, e.color));
                        this.enemies.splice(i, 1);
                    } else {
                        for(let j=0; j<3; j++) this.particles.push(new Particle(p.x, p.y, '#fff'));
                    }
                }
            });

            if (e.y > this.canvas.height + 50 || Math.hypot(e.x - this.player.x, e.y - this.player.y) < 30) {
                this.enemies.splice(i, 1);
                this.player.lives--;
                this.shake = 10;
                if (this.player.lives <= 0) this.gameOver();
            }
        });

        this.particles.forEach((p, i) => {
            p.update();
            if (p.life <= 0) this.particles.splice(i, 1);
        });
    }

    draw() {
        this.ctx.fillStyle = '#01050a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        if (this.shake > 0) {
            this.ctx.translate(Math.random() * this.shake - this.shake / 2, Math.random() * this.shake - this.shake / 2);
            this.shake *= 0.9;
        }

        this.particles.forEach(p => p.draw(this.ctx));
        this.enemies.forEach(e => e.draw(this.ctx));
        this.player.draw(this.ctx);
        
        this.projectiles.forEach(p => {
            this.ctx.save();
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#ff00e5';
            this.ctx.fillStyle = '#ff00e5';
            this.ctx.fillRect(p.x - 2, p.y, 4, 15);
            this.ctx.restore();
        });
        
        this.ctx.restore();

        const rank = getRankByScore(this.player.score);
        this.ctx.save();
        this.ctx.font = '16px Orbitron';
        this.ctx.fillStyle = '#0ff';
        this.ctx.fillText(`SCORE: ${this.player.score} | LIVES: ${this.player.lives}`, 20, 40);
        this.ctx.fillStyle = rank.color;
        this.ctx.fillText(`RANK: ${rank.name}`, 20, 65);
        this.ctx.restore();
    }

    async gameOver() {
        window.gameActive = false;
        
        // Освобождаем курсор
        if (document.exitPointerLock) document.exitPointerLock();
        this.canvas.style.cursor = 'default';
        document.body.style.cursor = 'default';
        
        const overlay = document.getElementById('game-over-overlay');
        const scoreDisplay = document.getElementById('final-score-value');
        const rankDisplay = document.getElementById('final-rank-value');

        const rank = getRankByScore(this.player.score);
        scoreDisplay.innerText = this.player.score;
        rankDisplay.innerText = rank.name;
        rankDisplay.style.color = rank.color;

        overlay.classList.add('game-over-visible');

        if (window.Core?.UpdateCombatScore) {
            await window.Core.UpdateCombatScore(this.player.score);
        }
    }

    loop() {
        this.update();
        this.draw();
        
        if (window.gameActive && document.pointerLockElement === this.canvas) {
            this.canvas.style.cursor = 'none';
        }

        requestAnimationFrame(() => this.loop());
    }
}

// Запуск (теперь чистый)
document.addEventListener('DOMContentLoaded', () => {
    killBackgroundProcesses();
    const engine = new GameEngine();
    
    const res = () => {
        engine.canvas.width = 900;
        engine.canvas.height = 600;
    };
    window.addEventListener('resize', res);
    res();
    
    engine.loop();
});