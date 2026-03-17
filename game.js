// ==========================================
// ORBITRON: LEGENDARY EDITION v1.0
// ==========================================
// Полный переписанный модуль боевого сектора.
// Включает: ранги, боссов, перегрев, VFX и интеграцию Supabase.
// ==========================================

import { getRankByScore } from './ranks.js';





const canvas = document.getElementById('gameCanvas');

const ctx = canvas.getContext('2d');


const CONFIG = {
    WIDTH: 600,
    HEIGHT: 800,
    GAME_JUICE: { SHAKE_INTENSITY: 5, PARTICLE_COUNT: 10, GLOW_COLOR: '#00f2ff' },
    BALANCE: { LIVES: 3, SPAWN_INTERVAL: 60, SCORE_PER_LEVEL: 500 }
};

canvas.width = CONFIG.WIDTH;
canvas.height = CONFIG.HEIGHT;

function resizeGame() {
    const padding = 20;
    const availableWidth = window.innerWidth - padding;
    const availableHeight = window.innerHeight - padding;
    const ratio = CONFIG.WIDTH / CONFIG.HEIGHT;
    let newWidth = availableWidth;
    let newHeight = availableWidth / ratio;
    if (newHeight > availableHeight) {
        newHeight = availableHeight;
        newWidth = availableHeight * ratio;
    }
    

    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
}


window.addEventListener('resize', resizeGame);
resizeGame();

window.gameActive = false; 
window.Core = window.Core || null;
// Глобальная привязка Ядра ORBITRON
window.Core = window.Core || null; 


// ==========================================
// КЛАССЫ И СУЩНОСТИ ИГРЫ
// ==========================================

// --- 1. КЛАСС VFX (Частицы и Световые эффекты) ---
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY += 0.1; // Гравитация
        this.life -= this.decay;
        this.size *= 0.95; // Уменьшение
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- 2. КЛАСС ИГРОК И ОРУЖИЕ ---
class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 80;
        this.width = 40;
        this.height = 45;
        this.targetX = canvas.width / 2;
        this.speed = 0.15;
        this.tilt = 0;
        this.lives = CONFIG.BALANCE.LIVES;
        this.score = 0;

        // Механика Перегрева (Твоя идея №1)
        this.heat = 0;
        this.maxHeat = 100;
        this.overheated = false;
    }

    update(targetX) {
        // Плавное движение
        this.tilt = (targetX - this.x) * 0.1;
        this.x += (targetX - this.x) * this.speed;

        // Охлаждение
        if (this.overheated) {
            this.heat -= 0.5; // Медленное охлаждение при клине
            if (this.heat <= 0) {
                this.overheated = false;
                if(window.Core) window.Core.Msg("WEAPONS_ONLINE", "info");
            }
        } else if (this.heat > 0) {
            this.heat -= 1; // Стандартное охлаждение
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.tilt * Math.PI / 180);

        // Двигатель (Неоновый выхлоп)
        const engineFluff = Math.random() * 10 + 15;
        ctx.beginPath();
        ctx.moveTo(-5, 20);
        ctx.lineTo(0, 20 + engineFluff);
        ctx.lineTo(5, 20);
        ctx.fillStyle = this.overheated ? '#550000' : (Math.random() > 0.5 ? '#00f2ff' : '#ff00e5');
        ctx.fill();

        // Корпус корабля (Неоновый ретро)
        ctx.strokeStyle = this.overheated ? '#f00' : '#00f2ff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = this.overheated ? 5 : 15;
        ctx.shadowColor = this.overheated ? '#f00' : '#00f2ff';

        ctx.beginPath();
        ctx.moveTo(0, -25); // Нос
        ctx.lineTo(-20, 20); // Левое крыло
        ctx.lineTo(0, 10);  // Корма
        ctx.lineTo(20, 20);  // Правое крыло
        ctx.closePath();
        ctx.fillStyle = '#0a0a0f'; 
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    shoot() {
        if (this.overheated || !window.gameActive) return null;
        this.heat += 15; // Нагрев за выстрел
        
        if (this.heat >= this.maxHeat) {
            this.overheated = true;
            this.heat = this.maxHeat; // Клин
            if(window.Core) window.Core.Msg("WEAPONS_OVERHEATED", "error");
            return null;
        }

        // Создаем две пули
        return [
            { x: this.x - 20, y: this.y, speed: 10, color: '#ff00e5' },
            { x: this.x + 20, y: this.y, speed: 10, color: '#ff00e5' }
        ];
    }
}

// --- 3. КЛАСС ВРАГИ (Разные типы) ---
const ENEMY_TYPES = {
    SCOUT: { hp: 1, speed: 5, color: '#ffff00', score: 20, size: 20, isTank: false },
    BASIC: { hp: 1, speed: 2, color: '#ff3333', score: 10, size: 30, isTank: false },
    TANK:  { hp: 3, speed: 1, color: '#ff00ff', score: 50, size: 50, isTank: true }
};

class Enemy {
    constructor(typeKey) {
        const type = ENEMY_TYPES[typeKey];
        this.typeKey = typeKey;
        this.hp = type.hp;
        this.currentHp = type.hp;
        this.speed = type.speed;
        this.color = type.color;
        this.score = type.score;
        this.size = type.size;
        this.isTank = type.isTank;

        this.x = Math.random() * (canvas.width - this.size * 2) + this.size;
        this.y = -50;
    }

    update() {
        this.y += this.speed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Визуализация HP (если больше 1)
        if (this.hp > 1) {
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(-this.size/2, -this.size/2 - 10, this.size, 5);
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size/2, -this.size/2 - 10, (this.currentHp / this.hp) * this.size, 5);
        }

        // Ретро-дизайн врага (Квадрат + кабина)
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size/2, -this.size/2, this.size, this.size);
        ctx.beginPath();
        ctx.arc(0, -5, this.size / 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    hit() {
        this.currentHp--;
        return this.currentHp <= 0; // Возвращает true, если уничтожен
    }
}

// --- 4. КЛАСС БОСС: STATION_DESTROYER ---
class Boss {
    constructor() {
        this.name = "STATION_DESTROYER";
        this.x = canvas.width / 2;
        this.y = -200; // Появляется сверху
        this.targetY = 150;
        this.width = 180;
        this.height = 120;
        this.hp = 100;
        this.currentHp = 100;
        this.speed = 1.5;
        this.score = 1000;
        this.color = '#ff9900';
        this.phase = 'INTRO';
        this.spawnTimer = 0;
        this.gunPositions = [ -70, -30, 0, 30, 70 ];
        this.active = true;
    }

    update() {
        if (this.phase === 'INTRO') {
            this.y += this.speed;
            if (this.y >= this.targetY) {
                this.phase = 'ATTACK';
                if(window.Core) window.Core.Msg("STATION_DESTROYER: ENGAGED", "error");
            }
        } else if (this.phase === 'ATTACK') {
            // Движение влево-вправо
            this.x += Math.sin(Date.now() / 1000) * 2;
            this.y = this.targetY + Math.sin(Date.now() / 500) * 10;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // HP Бар
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-this.width/2, -this.height/2 - 20, this.width, 10);
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(-this.width/2, -this.height/2 - 20, (this.currentHp / this.hp) * this.width, 10);

        // Отрисовка Босса (Ретро-Фрегат)
        ctx.strokeStyle = this.color;
        ctx.fillStyle = '#111';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.moveTo(0, this.height/2); // Корма
        ctx.lineTo(-this.width/2, -this.height/2 + 20); // Левое крыло
        ctx.lineTo(-this.width/4, -this.height/2); // Левый корпус
        ctx.lineTo(0, -this.height/2); // Глава
        ctx.lineTo(this.width/4, -this.height/2); // Правый корпус
        ctx.lineTo(this.width/2, -this.height/2 + 20); // Правое крыло
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Орудия
        this.gunPositions.forEach(gx => {
            ctx.fillStyle = this.color;
            ctx.fillRect(gx - 5, this.height/2, 10, 15);
        });

        ctx.restore();
    }

    shoot() {
        if (!this.active || this.phase !== 'ATTACK') return [];
        this.spawnTimer++;
        if (this.spawnTimer > 100) { // Медленный, но мощный залп
            this.spawnTimer = 0;
            if(window.gameEngine) window.gameEngine.applyScreenShake(3); // Тряска при выстреле
            return this.gunPositions.map(gx => ({
                x: this.x + gx, y: this.y + this.height/2, speed: 6, color: '#ff3333', size: 10, isBossBullet: true
            }));
        }
        return [];
    }

    hit(damage) {
        this.currentHp -= damage;
        if (this.currentHp <= 0) {
            this.active = false;
            return true; // Уничтожен
        }
        return false;
    }
}


// ==========================================
// ОСНОВНОЙ ДВИЖОК ИГРЫ
// ==========================================

class GameEngine {
    constructor() {
        this.player = new Player();
        this.projectiles = [];
        this.enemies = [];
        this.enemyProjectiles = []; // Снаряды врагов/босса
        this.particles = [];
        this.boss = null;
        this.spawnTimer = 0;
        this.scoreForNextLevel = CONFIG.BALANCE.SCORE_PER_LEVEL;
        
        this.screenShakeTime = 0;
        this.screenShakeIntensity = 0;

        // Инициализация холста
        this.setupCanvas();
        this.initControls();
    }

    setupCanvas() {
        // Адаптивный размер холста (Твоя идея №1)
        const resize = () => {
            const scale = Math.min(window.innerWidth / CONFIG.WIDTH, window.innerHeight / CONFIG.HEIGHT) * 0.9;
            canvas.style.width = `${CONFIG.WIDTH * scale}px`;
            canvas.style.height = `${CONFIG.HEIGHT * scale}px`;
        };
        window.addEventListener('resize', resize);
        resize();
    }

    initControls() {
        // Управление мышью
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            this.player.targetX = (e.clientX - rect.left) * scaleX;
        });

        // Стрельба (ЛКМ)
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0 && window.gameActive) {
                const shots = this.player.shoot();
                if (shots) {
                    this.projectiles.push(...shots);
                }
            }
        });
    }

    applyScreenShake(intensity = CONFIG.GAME_JUICE.SHAKE_INTENSITY) {
        this.screenShakeTime = 10; // Длительность тряски в кадрах
        this.screenShakeIntensity = intensity;
    }

    addExplosion(x, y, color) {
        for (let i = 0; i < CONFIG.GAME_JUICE.PARTICLE_COUNT * 2; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    checkCollisions() {
        if (!window.gameActive) return;

        // 1. Мои Пули -> Враги
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            // Проверка с Боссом
            if (this.boss && this.boss.active) {
                if (p.x > this.boss.x - this.boss.width/2 && p.x < this.boss.x + this.boss.width/2 &&
                    p.y > this.boss.y - this.boss.height/2 && p.y < this.boss.y + this.boss.height/2) {
                    
                    this.projectiles.splice(i, 1);
                    this.applyScreenShake(1);
                    if (this.boss.hit(1)) {
                        this.player.score += this.boss.score;
                        this.addExplosion(this.boss.x, this.boss.y, this.boss.color);
                        this.applyScreenShake(10);
                        this.boss = null;
                        this.scoreForNextLevel = this.player.score + CONFIG.BALANCE.SCORE_PER_LEVEL;
                    }
                    continue; // Пуля уничтожена
                }
            }

            // Проверка с обычными врагами
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const e = this.enemies[j];
                const dist = Math.hypot(p.x - e.x, p.y - e.y);
                if (dist < e.size) {
                    this.projectiles.splice(i, 1);
                    if (e.hit()) {
                        this.player.score += e.score;
                        this.enemies.splice(j, 1);
                        this.addExplosion(e.x, e.y, e.color);
                    }
                    break;
                }
            }
        }

        // 2. Пули Врагов -> Игрок
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
            
            if (dist < 30) {
                this.enemyProjectiles.splice(i, 1);
                this.player.lives -= 1;
                this.applyScreenShake(8);
                if (window.Core) window.Core.Msg("LIFE_LOST: Hull damaged!", "error");
                this.checkDeath();
            }
        }

        // 3. Враги -> Игрок (Столкновение)
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
            if (dist < e.size + 15) {
                this.enemies.splice(i, 1);
                this.player.lives -= 1;
                this.applyScreenShake(10);
                this.addExplosion(e.x, e.y, e.color);
                this.checkDeath();
            }
        }
    }

   checkDeath() {
    if (this.player.lives <= 0) {
        window.gameActive = false;
        
        const finalScore = this.player.score;
        const rank = getRankByScore(finalScore);

        // Интеграция с ORBITRON Core
        if (window.Core && finalScore > 0) {
            // Теперь отправляем в combat_score вместо kills_astronauts
            // Если твоя функция UpdateStat просто прибавляет значение:
            window.Core.UpdateStat('combat_score', finalScore);
            
            if (window.Core.Msg) {
                window.Core.Msg(`MISSION_END: ${finalScore} combat experience synced.`, "info");
            }
        }

        // Финальное сообщение
        alert(
            `--- MISSION FAILED ---\n\n` +
            `FINAL SCORE: ${finalScore}\n` +
            `PROMOTED TO: ${rank.name}\n\n` +
            `RETURNING TO STATION...`
        );

        // Редирект обратно на главную
        window.location.href = 'index.html'; 
    }
}

    update() {
        if (!window.gameActive) return;

        this.player.update(this.player.targetX);

        // Появление Босса
        if (this.player.score >= this.scoreForNextLevel && !this.boss) {
            this.boss = new Boss();
            this.enemies = []; // Очищаем обычных врагов для босса
        }

        // Обновление пуль игрока
        this.projectiles.forEach((p, i) => {
            p.y -= p.speed;
            if (p.y < 0) this.projectiles.splice(i, 1);
        });

        // Обновление пуль врагов
        this.enemyProjectiles.forEach((p, i) => {
            p.y += p.speed;
            if (p.y > canvas.height) this.enemyProjectiles.splice(i, 1);
        });

        // Спавн и обновление врагов
        this.spawnTimer++;
        if (this.spawnTimer > CONFIG.BALANCE.SPAWN_INTERVAL && !this.boss) {
            const rand = Math.random();
            const type = rand > 0.9 ? 'TANK' : (rand > 0.7 ? 'SCOUT' : 'BASIC');
            this.enemies.push(new Enemy(type));
            this.spawnTimer = 0;
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].update();
            
            // --- ЛОГИКА ПРОПУСКА (Твоя идея №3) ---
            if (this.enemies[i].y > canvas.height + 50) {
                const missed = this.enemies[i];
                this.enemies.splice(i, 1);
                this.player.lives -= 1;
                
                if (missed.isTank) {
                    if (window.Core) window.Core.Msg("BASE_CRITICAL: Tank breach!", "error");
                    this.applyScreenShake(5);
                } else {
                    if (window.Core) window.Core.Msg("BASE_BREACH: life lost.", "error");
                }
                this.checkDeath();
            }
        }

        // Обновление Босса
        if (this.boss && this.boss.active) {
            this.boss.update();
            const shots = this.boss.shoot();
            if (shots) this.enemyProjectiles.push(...shots);
        }

        // Партиклы
        this.particles.forEach((p, i) => {
            p.update();
            if (p.life <= 0) this.particles.splice(i, 1);
        });

        this.checkCollisions();
    }

    draw() {
        // Эффект Тряски экрана (Screen Shake) (Моя идея №2)
        ctx.save();
        if (this.screenShakeTime > 0) {
            const sx = (Math.random() - 0.5) * this.screenShakeIntensity;
            const sy = (Math.random() - 0.5) * this.screenShakeIntensity;
            ctx.translate(sx, sy);
            this.screenShakeTime--;
        }

        // Фон (Глубокий космос)
        ctx.fillStyle = '#01050a'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // VFX: Частицы и Динамический Неоновый Фон
        if (this.particles.length > 0) {
            // Подсветка холста цветом последней уничтоженной частицы
            ctx.fillStyle = `rgba(255, 255, 255, 0.01)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        this.particles.forEach(p => p.draw(ctx));

        if (!window.gameActive) {
            // Экран "Ожидание сессии"
            ctx.fillStyle = '#0ff';
            ctx.font = '20px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("WAITING FOR SESSION...", canvas.width/2, canvas.height/2);
            ctx.restore();
            return;
        }

        // Отрисовка пуль игрока
        this.projectiles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fillRect(p.x - 2, p.y, 4, 15);
            ctx.shadowBlur = 0;
        });

        // Отрисовка пуль врагов
        this.enemyProjectiles.forEach(p => {
            if (p.isBossBullet) {
                // Большой красный выстрел босса
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x - 2, p.y, 4, 15);
            }
        });

        // Отрисовка врагов
        this.enemies.forEach(e => e.draw(ctx));

        // Отрисовка Босса
        if (this.boss && this.boss.active) {
            this.boss.draw(ctx);
        }

        this.player.draw(ctx);

        ctx.restore(); // Сбрасываем тряску экрана

        this.drawInterface();
    }

    drawInterface() {
        if (!window.gameActive) return;

        // --- РАНГИ И ИНТЕРФЕЙС ---
        const rank = getRankByScore(this.player.score);

        // Подложка
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, 110);
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, canvas.width, 110);

        // SCORE & LIVES
        ctx.fillStyle = '#00f2ff';
        ctx.font = 'bold 16px Share Tech Mono';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.player.score}`, 20, 30);
        ctx.fillText(`LIVES: ${this.player.lives}`, 20, 55);
        
        // Шкала Жизней (Визуальная)
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < this.player.lives ? '#00f2ff' : '#044';
            ctx.fillRect(110 + (i*15), 45, 10, 10);
        }
        
        // RANK (Цвет динамический!)
        ctx.fillStyle = rank.color || '#ff00e5';
        ctx.font = 'bold 18px Orbitron';
        ctx.fillText(`RANK: ${rank.name}`, 20, 85);

        // Механика Перегрева: UI
        const heatX = canvas.width - 150;
        const heatY = 20;
        ctx.fillStyle = '#0ff';
        ctx.font = '12px Orbitron';
        ctx.fillText("WEAPONS HEAT:", heatX, heatY);
        
        // Рамка шкалы
        ctx.strokeStyle = this.player.overheated ? '#f00' : '#0ff';
        ctx.strokeRect(heatX, heatY + 10, 130, 15);
        // Заполнение шкалы
        const heatWidth = (this.player.heat / this.player.maxHeat) * 130;
        const heatColor = this.player.overheated ? '#ff3333' : `rgb(${this.player.heat*2.5}, ${255-this.player.heat*2.5}, 255)`;
        ctx.fillStyle = heatColor;
        ctx.fillRect(heatX + 1, heatY + 11, heatWidth - 2, 13);

        if (this.player.overheated) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText("!! WEAPONS_CLOCKED !!", heatX, heatY + 45);
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

// ==========================================
// ЗАПУСК СИСТЕМЫ
// ==========================================
// Мы ждем полной загрузки DOM, чтобы холст был готов.
// window.gameActive будет установлен в battle.html после успешной сессии.

document.addEventListener('DOMContentLoaded', () => {
    // Сохраняем движок глобально, чтобы мы могли достучаться из battle.html
    window.gameEngine = new GameEngine();
    window.gameEngine.loop();
});