// ==========================================
// ORBITRON: TECH-CORE ENGINE v2.0
// ==========================================
import { getRankByScore } from './ranks.js';

// 1. ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ (Теперь они видны всем классам ниже)
let canvas, ctx;
window.gameActive = true; 

// --- ГЛОБАЛЬНЫЙ КОНФИГ ---
const CONFIG = {
    FPS: 60,
    GAME_JUICE: { SHAKE_INTENSITY: 8, PARTICLE_COUNT: 15 },
    BALANCE: { LIVES: 3, SPAWN_INTERVAL: 45, SCORE_PER_LEVEL: 1000 }
};

// ==========================================
// КЛАССЫ СУЩНОСТЕЙ
// ==========================================

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.size = Math.random() * 4 + 1;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
    }
    update() {
        this.x += this.speedX; this.y += this.speedY;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

class Player {
    constructor() {
        this.reset();
    }
    reset() {
        // Используем глобальный canvas
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.width = 40;
        this.speed = 0.15; // Плавность хода
        this.score = 0;
        this.lives = CONFIG.BALANCE.LIVES;
        this.heat = 0;
        this.maxHeat = 100;
        this.overheated = false;
        this.targetX = canvas.width / 2;
    }
    update() {
        this.x += (this.targetX - this.x) * this.speed;
        
        if (this.overheated) {
            this.heat -= 0.4;
            if (this.heat <= 0) {
                this.overheated = false;
                this.heat = 0;
            }
        } else {
            this.heat = Math.max(0, this.heat - 0.8);
        }
    }
    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const shipColor = this.overheated ? '#ff3333' : '#00f2ff';
        ctx.shadowBlur = 15; ctx.shadowColor = shipColor;
        ctx.strokeStyle = shipColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -25); ctx.lineTo(-25, 20); ctx.lineTo(0, 5); ctx.lineTo(25, 20);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }
    shoot() {
        if (this.overheated) return null;
        this.heat += 18;
        if (this.heat >= this.maxHeat) {
            this.overheated = true;
            return null;
        }
        return [
            { x: this.x - 22, y: this.y, speed: 12, color: '#ff00e5' },
            { x: this.x + 22, y: this.y, speed: 12, color: '#ff00e5' }
        ];
    }
}

class Enemy {
    constructor(type = 'BASIC') {
        const types = {
            BASIC: { hp: 1, speed: 3, score: 10, color: '#0ff', size: 30 },
            TANK:  { hp: 3, speed: 1.5, score: 50, color: '#ff00e5', size: 50 },
            SCOUT: { hp: 1, speed: 6, score: 25, color: '#ffff00', size: 20 }
        };
        const t = types[type];
        const margin = canvas.width * 0.15; 
        this.x = margin + Math.random() * (canvas.width - margin * 2);
        this.y = -50;
        Object.assign(this, t);
        this.speed *= (0.9 + Math.random() * 0.4); 
    }
    update() { this.y += this.speed; }
    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 15; ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        const half = this.size / 2;
        ctx.strokeRect(this.x - half, this.y - half, this.size, this.size);
        ctx.restore();
    }
}

// ==========================================
// ЯДРО ДВИЖКА
// ==========================================

class GameEngine {
    constructor() {
        this.player = new Player();
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.spawnTimer = 0;
        this.shake = 0;
        this.initControls();
    }

    initControls() {
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.player.targetX = e.clientX - rect.left;
        });

        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && window.gameActive) {
                const shots = this.player.shoot();
                if (shots) this.projectiles.push(...shots);
            }
        });
    }

    addExplosion(x, y, color) {
        for(let i=0; i<CONFIG.GAME_JUICE.PARTICLE_COUNT; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    update() {
        if (!window.gameActive) return;
        this.player.update();
        this.spawnTimer++;
        if (this.spawnTimer > CONFIG.BALANCE.SPAWN_INTERVAL) {
            const r = Math.random();
            const type = r > 0.9 ? 'TANK' : (r > 0.7 ? 'SCOUT' : 'BASIC');
            this.enemies.push(new Enemy(type));
            this.spawnTimer = 0;
        }
        this.projectiles.forEach((p, i) => {
            p.y -= p.speed;
            if (p.y < -20) this.projectiles.splice(i, 1);
        });
        this.enemies.forEach((e, ei) => {
            e.update();
            if (Math.hypot(e.x - this.player.x, e.y - this.player.y) < e.size) {
                this.enemies.splice(ei, 1);
                this.player.lives--;
                this.shake = 15;
                this.addExplosion(e.x, e.y, '#f00');
            }
            this.projectiles.forEach((p, pi) => {
                if (Math.hypot(p.x - e.x, p.y - e.y) < e.size) {
                    this.projectiles.splice(pi, 1);
                    e.hp--;
                    if (e.hp <= 0) {
                        this.player.score += e.score;
                        this.addExplosion(e.x, e.y, e.color);
                        this.enemies.splice(ei, 1);
                    }
                }
            });
            if (e.y > canvas.height + 50) {
                this.enemies.splice(ei, 1);
                this.player.lives--;
            }
        });
        this.particles.forEach((p, i) => {
            p.update();
            if (p.life <= 0) this.particles.splice(i, 1);
        });

        if (this.player.lives <= 0) {
            window.gameActive = false;
            if (window.Core?.UpdateCombatScore) window.Core.UpdateCombatScore(this.player.score);
            alert("STATION_PROTOCOL_FAILED: SCORE " + this.player.score);
            window.location.reload();
        }
    }

    draw() {
        ctx.save();
        if (this.shake > 0) {
            ctx.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
            this.shake *= 0.9;
        }
        ctx.fillStyle = '#01050a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.particles.forEach(p => p.draw(ctx));
        this.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x-2, p.y, 4, 20);
        });
        this.enemies.forEach(e => e.draw(ctx));
        this.player.draw(ctx);
        ctx.restore();
        this.drawUI();
    }

    drawUI() {
        const rank = getRankByScore(this.player.score);
        ctx.fillStyle = '#0ff';
        ctx.font = '20px Share Tech Mono';
        ctx.fillText(`SCORE: ${this.player.score}`, 20, 40);
        ctx.fillText(`LIVES: ${this.player.lives}`, 20, 70);
        ctx.fillStyle = rank.color;
        ctx.fillText(`RANK: ${rank.name}`, 20, 100);
    }

    run() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.run());
    }
}

// 3. ФИНАЛЬНЫЙ ЗАПУСК (После загрузки DOM)
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return; // Тихо выходим, если мы не на странице игры
    
    ctx = canvas.getContext('2d');
    
    // Адаптация экрана
    const res = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', res);
    res();

    // Старт движка
    const engine = new GameEngine();
    engine.run();
});