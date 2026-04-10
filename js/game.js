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
        this.x = window.innerWidth / 2;
        this.y = window.innerHeight - 80;
        this.score = 0;
        this.lives = CONFIG.BALANCE.LIVES;
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
        this.player = new Player();
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.spawnTimer = 0;
        this.shake = 0;
        this.setupListeners();
    }

setupListeners() {
    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        // Рассчитываем позицию мыши относительно канваса
        let mX = e.clientX - rect.left;

        // Ограничиваем движение рамками холста (30px от краев)
        const margin = 30;
        if (mX < margin) mX = margin;
        if (mX > canvas.width - margin) mX = canvas.width - margin;

        this.player.targetX = mX;
    });

    window.addEventListener('mousedown', () => {
        if (this.player.overheated) return;
        this.player.heat += 20;
        if (this.player.heat >= 100) this.player.overheated = true;
        this.projectiles.push({x: this.player.x, y: this.player.y - 20});
    });
}
    update() {
        if (!window.gameActive) return;
        this.player.update();
        
        // Спавн
        if (++this.spawnTimer > CONFIG.BALANCE.SPAWN_INTERVAL) {
            this.enemies.push(new Enemy());
            this.spawnTimer = 0;
        }

        // Пули
        this.projectiles.forEach((p, i) => {
            p.y -= 10;
            if (p.y < -20) this.projectiles.splice(i, 1);
        });

        // Враги
    // Враги
        this.enemies.forEach((e, i) => {
            e.update();
            
            // Коллизия с пулей
            this.projectiles.forEach((p, pi) => {
                // Дистанция коллизии зависит от размера врага
                if (Math.hypot(p.x - e.x, p.y - e.y) < e.size) {
                    
                    e.hp -= 1; // УМЕНЬШАЕМ HP
                    this.projectiles.splice(pi, 1); // Пуля исчезает

                    if (e.hp <= 0) {
                        // Если HP кончились — уничтожаем
                        this.player.score += e.scoreValue; // Очки за конкретный тип
                        for(let j=0; j<10; j++) this.particles.push(new Particle(e.x, e.y, e.color));
                        this.enemies.splice(i, 1);
                    } else {
                        // Эффект попадания (мини-взрыв) без уничтожения
                        for(let j=0; j<3; j++) this.particles.push(new Particle(p.x, p.y, '#fff'));
                    }
                }
            });

            // Пропуск или столкновение с игроком
            if (e.y > canvas.height + 50 || Math.hypot(e.x - this.player.x, e.y - this.player.y) < 30) {
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
        ctx.fillStyle = '#01050a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        if (this.shake > 0) {
            ctx.translate(Math.random()*this.shake, Math.random()*this.shake);
            this.shake *= 0.9;
        }

        this.particles.forEach(p => p.draw(ctx));
        this.enemies.forEach(e => e.draw(ctx));
        this.player.draw(ctx);
        
        this.projectiles.forEach(p => {
            ctx.fillStyle = '#ff00e5';
            ctx.fillRect(p.x-2, p.y, 4, 15);
        });
        ctx.restore();

        // UI
        const rank = getRankByScore(this.player.score);
        ctx.fillStyle = '#0ff';
        ctx.font = '16px Orbitron';
        ctx.fillText(`SCORE: ${this.player.score} | LIVES: ${this.player.lives}`, 20, 40);
        ctx.fillStyle = rank.color;
        ctx.fillText(`RANK: ${rank.name}`, 20, 65);
    }

async gameOver() { // Добавили async
    window.gameActive = false;
    
    // Показываем игроку, что идет сохранение
    console.log("SYSTEM: SYNCING_COMBAT_DATA...");

    if (window.Core?.UpdateCombatScore) {
        // ЖДЕМ, пока данные реально запишутся в Supabase
        await window.Core.UpdateCombatScore(this.player.score); 
    }

    alert(`STATION_DEFENSE_CRITICAL: FAILED\nFINAL SCORE: ${this.player.score}`);
    
    // Только ПОСЛЕ этого переходим на главную
    window.location.href = '../index.html';
}

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// --- СТАРТ ---
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    
    // 1. Убиваем фон из script.js
    killBackgroundProcesses();

    // 2. Ресайз
const res = () => {
    // Теперь холст всегда 900x600, как в CSS
    canvas.width = 900;
    canvas.height = 600;
};
    window.addEventListener('resize', res);
    res();

    // 3. Запуск
    const engine = new GameEngine();
    engine.loop();
});