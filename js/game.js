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
        // Позиционирование по центру канваса
        this.x = canvas.width / 2;
        this.y = canvas.height - 60; 

        this.score = 0;
        this.lives = CONFIG.BALANCE.LIVES;
        this.targetX = this.x;

        this.heat = 0;
        this.maxHeat = 100; // Добавим максимум для корректных расчетов
        this.overheated = false;
        
        // Для AAA-эффекта наклона
        this.tilt = 0; 
    }

    update(dt) {
        const prevX = this.x;
        // Движение к курсору
        this.x += (this.targetX - this.x) * (0.3 * dt * 60);
        
        // Расчет наклона корпуса (AAA динамика)
        const velocity = (this.x - prevX) * 0.2;
        this.tilt = velocity * Math.PI / 180;

        // Логика перегрева
        if (this.overheated) {
            this.heat -= 0.5 * 60 * dt; 
            if (this.heat <= 0) { 
                this.overheated = false; 
                this.heat = 0; 
            }
        } else {
            this.heat = Math.max(0, this.heat - 1 * 60 * dt);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.tilt); 

        const color = this.overheated ? '#ff3300' : '#00f2ff';

        // 1. Основной корпус (Сложная геометрия "Aegis")
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;

        ctx.beginPath();
        ctx.moveTo(0, -25);     
        ctx.lineTo(8, -10);     
        ctx.lineTo(25, 15);     
        ctx.lineTo(10, 15);     
        ctx.lineTo(0, 5);       
        ctx.lineTo(-10, 15);    
        ctx.lineTo(-25, 15);    
        ctx.lineTo(-8, -10);    
        ctx.closePath();
        ctx.stroke();

        // 2. Внутренние механизмы
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, 0); ctx.lineTo(8, 0);   
        ctx.moveTo(0, -10); ctx.lineTo(0, 5);  
        ctx.stroke();

        // 3. Кабина (Блик системы)
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, -12); ctx.lineTo(5, 2); ctx.lineTo(-5, 2);
        ctx.closePath();
        ctx.fill();

        // 4. Двигатели (Пульсирующий шлейф)
        ctx.globalAlpha = 0.4;
        const enginePulse = Math.sin(Date.now() / 50) * 5;
        ctx.fillStyle = color;
        ctx.fillRect(-18, 15, 6, 10 + enginePulse); 
        ctx.fillRect(12, 15, 6, 10 + enginePulse);  
        
        ctx.restore();
    }
}

class Enemy {
    constructor() {
        const rand = Math.random();
        
        if (rand < 0.15) { 
            this.type = 'tank';
            this.size = 50;
            this.hp = 5;
            this.speed = 1 + Math.random() * 0.5;
            this.color = '#ffea00'; 
            this.scoreValue = 50;
        } else if (rand < 0.35) { 
            this.type = 'sprinter';
            this.size = 15;
            this.hp = 1;
            this.speed = 5 + Math.random() * 2;
            this.color = '#00ff44'; 
            this.scoreValue = 30;
        } else { 
            this.type = 'normal';
            this.size = 30;
            this.hp = 1;
            this.speed = 2 + Math.random() * 2;
            this.color = '#ff00e5'; 
            this.scoreValue = 10;
        }

        this.x = Math.random() * (canvas.width - this.size * 2) + this.size;
        this.y = -this.size;
    }

    update(dt) {
        this.y += this.speed * 60 * dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        const s = this.size / 2;

        switch (this.type) {
            case 'tank':
                ctx.lineWidth = 3;
                // Массивный восьмиугольник
                ctx.beginPath();
                ctx.moveTo(-s/2, -s); ctx.lineTo(s/2, -s);
                ctx.lineTo(s, -s/2); ctx.lineTo(s, s/2);
                ctx.lineTo(s/2, s); ctx.lineTo(-s/2, s);
                ctx.lineTo(-s, s/2); ctx.lineTo(-s, -s/2);
                ctx.closePath();
                ctx.stroke();

                // Техно-паттерн внутри
                ctx.lineWidth = 1;
                for (let i = -s + 10; i < s; i += 10) {
                    ctx.beginPath();
                    ctx.moveTo(-s + 5, i); ctx.lineTo(s - 5, i);
                    ctx.stroke();
                }
                // Фронтальные орудия
                ctx.fillStyle = this.color;
                ctx.fillRect(-s/3, -s - 5, 5, 10);
                ctx.fillRect(s/3 - 5, -s - 5, 5, 10);
                break;

            case 'sprinter':
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -s * 2); 
                ctx.lineTo(s, s);      
                ctx.lineTo(0, s/2);    
                ctx.lineTo(-s, s);     
                ctx.closePath();
                ctx.stroke();

                // Линии скорости
                ctx.beginPath();
                ctx.moveTo(0, -s); ctx.lineTo(0, s/2);
                ctx.stroke();
                break;

            default: // normal
                ctx.lineWidth = 2;
                // Ядро-ромб
                ctx.beginPath();
                ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
                ctx.closePath();
                ctx.stroke();

                // Внешние пластины
                ctx.beginPath();
                ctx.moveTo(-s - 5, -s/2); ctx.lineTo(-s - 5, s/2);
                ctx.moveTo(s + 5, -s/2); ctx.lineTo(s + 5, s/2);
                ctx.stroke();

                // Пульсирующий глаз
                ctx.shadowBlur = 10 + Math.sin(Date.now() / 100) * 10;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
                break;
        }

        ctx.restore();
    }
}

// ==========================================
// ДВИЖАТЕЛЬ
// ==========================================
class Boss {
    constructor() {
        this.x = canvas.width / 2;
        this.y = -150;          // Появляется сверху за экраном
        this.targetY = 120;     // Остановится на этой высоте
        this.hp = 100;          // Жизни
        this.maxHp = 100;
        this.color = '#ff0055'; // Цвет первого босса (Кроваво-розовый)
        this.angle = 0;         // Для вращения колец
        this.moveTimer = 0;
    }

    update(dt) {
        // Плавный въезд на арену
        if (this.y < this.targetY) {
            this.y += 1.5 * 60 * dt;
        }

        // Движение влево-вправо "восьмеркой"
        this.moveTimer += dt;
        this.x = (canvas.width / 2) + Math.sin(this.moveTimer * 0.8) * 250;
        
        // Вращение декоративных элементов
        this.angle += 0.02 * 60 * dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // --- ВНЕШНИЕ КОЛЬЦА (AAA ДЕТАЛИЗАЦИЯ) ---
        ctx.strokeStyle = this.color;
        ctx.shadowBlur = 25;
        ctx.shadowColor = this.color;
        ctx.lineWidth = 2;

        // Кольцо 1 (вращается вправо)
        ctx.save();
        ctx.rotate(this.angle);
        ctx.beginPath();
        ctx.arc(0, 0, 70, 0, Math.PI * 2);
        ctx.stroke();
        // Зазубрины на кольце
        for(let i=0; i<4; i++) {
            ctx.rotate(Math.PI/2);
            ctx.strokeRect(65, -5, 10, 10);
        }
        ctx.restore();

        // Кольцо 2 (вращается влево)
        ctx.save();
        ctx.rotate(-this.angle * 1.5);
        ctx.setLineDash([10, 15]);
        ctx.beginPath();
        ctx.arc(0, 0, 90, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // --- ЯДРО БОССА ---
        ctx.setLineDash([]);
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 40;
        ctx.beginPath();
        // Сложная форма ядра (ромб в квадрате)
        ctx.moveTo(0, -30); ctx.lineTo(30, 0); ctx.lineTo(0, 30); ctx.lineTo(-30, 0);
        ctx.closePath();
        ctx.fill();

        // --- ПОЛОСКА HP БОССА ---
        this.drawUI(ctx);

        ctx.restore();
    }

    drawUI(ctx) {
        const barW = 300;
        const barH = 6;
        // Тень/Фон полоски
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-barW/2, -110, barW, barH);
        // Сама полоска
        const currentW = (this.hp / this.maxHp) * barW;
        ctx.fillStyle = this.color;
        ctx.fillRect(-barW/2, -110, currentW, barH);
        // Текст названия
        ctx.font = '10px Orbitron';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText("SENTINEL-01: ARCHITECT", 0, -115);
    }
}

class GameEngine {
    constructor() {
        this.player = new Player();
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.spawnTimer = 0;
        this.shake = 0;
         this.gameTime = 0;          // Таймер игры
        this.bossSpawned = false;    // Флаг, что босс уже вызван
        this.boss = null;            // Ссылка на объект босса
        
        this.setupListeners();
        
    }
 
   requestPointerLock() {
    // Вызываем метод корректно, без перезаписи
    const request = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
    if (request) {
        request.call(canvas);
    }
}

setupListeners() {
    // МЕНЯЕМ canvas на window, чтобы клики не блокировались интерфейсом
    window.addEventListener('mousedown', (e) => {
        // Игнорируем клики по кнопкам интерфейса (чтобы не стрелял, когда жмешь "Назад")
        if (e.target.closest('.back-btn') || e.target.closest('#game-over-overlay')) return;
        
        if (!window.gameActive) return;
        
        // Попытка захвата при каждом клике (Прячет курсор системы)
        if (document.pointerLockElement !== canvas) {
            this.requestPointerLock();
        }

        // Логика стрельбы
        if (!this.player.overheated) {
            this.player.heat += 15; 
            if (this.player.heat >= 100) this.player.overheated = true;
            this.projectiles.push({ x: this.player.x, y: this.player.y - 20 });
            
            // Тряска при выстреле
            this.shake = 2;
        }
    });

    // 2. Движение
    window.addEventListener('mousemove', (e) => {
        if (!window.gameActive) return;

        if (document.pointerLockElement === canvas) {
            // Режим захвата (курсор невидим, корабль двигается плавно)
            this.player.targetX += e.movementX * 1.5;
        } else {
            // Режим обычный (если игрок нажал ESC и сбросил захват)
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            this.player.targetX = (e.clientX - rect.left) * scaleX;
        }

        // Ограничиваем края 
        const margin = 40; 
        if (this.player.targetX < margin) this.player.targetX = margin;
        if (this.player.targetX > canvas.width - margin) this.player.targetX = canvas.width - margin;
    });
}
update(dt) {
        if (!window.gameActive) return;
            // --- ВСТАВИТЬ ЭТО В НАЧАЛО UPDATE ---
    this.gameTime += dt; 

    // Если прошло 120 сек и босса еще нет
    if (this.gameTime >= 120 && !this.bossSpawned) {
        this.bossSpawned = true;
        this.enemies = []; // Очищаем экран от мелочи
        this.shake = 30;   // Сильная тряска при появлении
        this.boss = new Boss(); // Создаем босса
    }

    // Если босс на экране, обновляем его
    if (this.boss) {
        this.boss.update(dt);
    }


        // 1. Обновляем игрока (передаем dt)
        this.player.update(dt);
        
        // 2. Спавн врагов
        // Умножаем на 60, чтобы привязать логику к "тикам" в секунду
        this.spawnTimer += dt * 60; 
        if (this.spawnTimer > CONFIG.BALANCE.SPAWN_INTERVAL) {
            this.enemies.push(new Enemy());
            this.spawnTimer = 0;
        }

        // 3. Пули (идем с конца массива)
for (let i = this.projectiles.length - 1; i >= 0; i--) {
    let p = this.projectiles[i];
    p.y -= 700 * dt; 
    if (p.y < -20) this.projectiles.splice(i, 1);
}

// 4. Враги
for (let i = this.enemies.length - 1; i >= 0; i--) {
    let e = this.enemies[i];
    e.update(dt);
    
    // Проверка столкновения с пулями
    for (let j = this.projectiles.length - 1; j >= 0; j--) {
        let p = this.projectiles[j];
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.size) {
            e.hp--;
            this.projectiles.splice(j, 1);
            if (e.hp <= 0) break;
        }
    }

    if (e.hp <= 0) {
        this.player.score += e.scoreValue;
        for(let j=0; j<8; j++) this.particles.push(new Particle(e.x, e.y, e.color));
        this.enemies.splice(i, 1);
        continue;
    }

    // Пропуск или смерть игрока
    if (e.y > canvas.height + 50 || Math.hypot(e.x - this.player.x, e.y - this.player.y) < 30) {
        this.enemies.splice(i, 1);
        this.player.lives--;
        this.shake = 15;
        if (this.player.lives <= 0) this.gameOver();
    }
}
        // 5. Частицы
        this.particles.forEach((p, i) => {
            p.update(dt); // Передаем dt
            if (p.life <= 0) this.particles.splice(i, 1);
        });

        // Внутри класса GameEngine, метод update
const heatFill = document.getElementById('heat-fill');
if (heatFill) {
    // Рассчитываем процент (от 0 до 100)
    const heatPercent = (this.player.heat / 100) * 100; 
    heatFill.style.width = Math.min(heatPercent, 100) + '%';
    
    // Добавляем класс перегрева родительскому контейнеру
    const container = document.querySelector('.heat-bar-container');
    if (this.player.overheated) {
        container.parentElement.classList.add('overheated-bar');
    } else {
        container.parentElement.classList.remove('overheated-bar');
    }
}
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

     // --- ВСТАВИТЬ ЭТО ---
    if (this.boss) {
        this.boss.draw(ctx);
    }
    
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
    // Возвращаем курсор пользователю
    if (document.exitPointerLock) {
        document.exitPointerLock();
    }
    
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
let engine; 

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    
    killBackgroundProcesses();

    // 1. СНАЧАЛА жестко задаем размер канваса
    canvas.width = 900;
    canvas.height = 600;

    // 2. ПОТОМ создаем движок (теперь корабль заспавнится четко внизу по координате 600)
    engine = new GameEngine(); 

    // 3. Запускаем игру
    engine.loop();
});