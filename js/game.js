// ==========================================
// ORBITRON: TECH-CORE ENGINE v2.1 [STABLE]
// ==========================================
import { getRankByScore } from '../js/ranks.js';

let canvas, ctx;
let lastTime = performance.now();
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
    update(dt) { 
    this.x += this.speedX * 60 * dt; 
    this.y += this.speedY * 60 * dt; 
    this.life -= this.decay * 60 * dt; 
}
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
    update(dt) {
    // Умножаем 0.15 на dt * 60
    this.x += (this.targetX - this.x) * (0.15 * dt * 60);
    
    if (this.overheated) {
        this.heat -= 0.5 * 60 * dt; // Остывание по времени
        if (this.heat <= 0) { this.overheated = false; this.heat = 0; }
    } else {
        this.heat = Math.max(0, this.heat - 1 * 60 * dt);
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
    update(dt) {
    // Важно принимать dt и умножать на 60
    this.y += this.speed * 60 * dt;
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
    // Прячем курсор сразу при инициализации слушателей
    canvas.style.cursor = 'none'; 

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        
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
update(dt) {
        if (!window.gameActive) return;

        // 1. Обновляем игрока (передаем dt)
        this.player.update(dt);
        
        // 2. Спавн врагов
        // Умножаем на 60, чтобы привязать логику к "тикам" в секунду
        this.spawnTimer += dt * 60; 
        if (this.spawnTimer > CONFIG.BALANCE.SPAWN_INTERVAL) {
            this.enemies.push(new Enemy());
            this.spawnTimer = 0;
        }

        // 3. Пули
        this.projectiles.forEach((p, i) => {
            // 600 - это скорость (10 пикселей * 60 кадров)
            p.y -= 600 * dt; 
            if (p.y < -20) this.projectiles.splice(i, 1);
        });

        // 4. Враги
        this.enemies.forEach((e, i) => {
            // Передаем dt в метод врага
            e.update(dt);
            
            // --- Коллизия с пулей (математику не трогаем) ---
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

            // Пропуск или столкновение с игроком
            if (e.y > canvas.height + 50 || Math.hypot(e.x - this.player.x, e.y - this.player.y) < 30) {
                this.enemies.splice(i, 1);
                this.player.lives--;
                this.shake = 10;
                if (this.player.lives <= 0) this.gameOver();
            }
        });

        // 5. Частицы
        this.particles.forEach((p, i) => {
            p.update(dt); // Передаем dt
            if (p.life <= 0) this.particles.splice(i, 1);
        });
    }

draw() {
    // 1. Чистим холст
    ctx.fillStyle = '#01050a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // 2. Эффект тряски экрана (Screen Shake)
    if (this.shake > 0) {
        ctx.translate(Math.random() * this.shake - this.shake / 2, Math.random() * this.shake - this.shake / 2);
        this.shake *= 0.9;
        if (this.shake < 0.1) this.shake = 0;
    }

    // 3. Отрисовка игровых объектов
    this.particles.forEach(p => p.draw(ctx));
    this.enemies.forEach(e => e.draw(ctx));
    
    // Рисуем игрока (теперь он точно будет внутри после фикса в конструкторе)
    this.player.draw(ctx);
    
    // 4. Отрисовка снарядов с неоновым свечением
    this.projectiles.forEach(p => {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff00e5';
        ctx.fillStyle = '#ff00e5';
        ctx.fillRect(p.x - 2, p.y, 4, 15);
        ctx.restore();
    });
    
    ctx.restore(); // Закрываем область тряски

    // 5. Отрисовка UI (всегда поверх всего и не трясется)
    const rank = getRankByScore(this.player.score);
    
    ctx.save();
    ctx.font = '16px Orbitron';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#0ff';
    ctx.fillStyle = '#0ff';
    ctx.fillText(`SCORE: ${this.player.score} | LIVES: ${this.player.lives}`, 20, 40);
    
    ctx.fillStyle = rank.color;
    ctx.shadowColor = rank.color;
    ctx.fillText(`RANK: ${rank.name}`, 20, 65);
    ctx.restore();
}

async gameOver() {
    window.gameActive = false;
    
    // Получаем элементы нашего нового окна
    const overlay = document.getElementById('game-over-overlay');
    const scoreDisplay = document.getElementById('final-score-value');
    const rankDisplay = document.getElementById('final-rank-value');

    // Заполняем данные
    const rank = getRankByScore(this.player.score);
    scoreDisplay.innerText = this.player.score;
    rankDisplay.innerText = rank.name;
    rankDisplay.style.color = rank.color;

    // Показываем окно
    overlay.classList.add('game-over-visible');

    // Синхронизация с БД (делаем в фоне)
    if (window.Core?.UpdateCombatScore) {
        await window.Core.UpdateCombatScore(this.player.score);
        console.log("Data synced successfully");
    }








}

loop() {
        const currentTime = performance.now();
        // Вычисляем дельту в секундах (например, 0.016 для 60fps)
        const dt = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        // Ограничиваем dt, чтобы при лагах игра не "прыгала" слишком далеко
        const limitedDt = Math.min(dt, 0.1);

        this.update(limitedDt); // Передаем dt в update
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