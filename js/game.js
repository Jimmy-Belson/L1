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
    if (engine.gameTime > 115 && engine.gameTime < 120 && !engine.bossSpawned) {
        // Улетают ВВЕРХ (минус speed) и в стороны от центра
        this.y -= this.speed * 100 * dt; 
        this.x += (this.x > canvas.width / 2 ? 10 : -10); // Разлетаются от центра к краям
        
        this.color = '#fff';
    } else {
        this.y += this.speed * 60 * dt;
    }
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
class MimicBoss {
    constructor() {
        this.x = canvas.width / 2;
        this.y = -100;
        this.targetY = 150;
        this.hp = 800;
        this.maxHp = 800;
        
        this.type = 'mimic';
        this.state = 'move'; 
        this.stateTimer = 0;
        this.color = '#ff0055';

        this.fPresses = 0;
        this.isGrabbed = false;
        this.executionProjectileSpawned = false; // Флаг для пули-казни

        // УВЕЛИЧЕННАЯ СКОРОСТЬ
        this.moveDir = 1;
        this.vx = 5; // Было 3, теперь 8 — он носится очень быстро
    }

    update(dt) {
    if (this.y < this.targetY && this.state !== 'dash') {
        this.y += 2 * 60 * dt;
    }

    this.stateTimer += dt;

    if (this.state === 'move') {
        this.x += this.vx * this.moveDir * (60 * dt);
        if (this.x > canvas.width - 100 || this.x < 100) this.moveDir *= -1;
        if (Math.random() > 0.90) this.shootSmall();

        if (this.stateTimer > 3) {
            const rand = Math.random();
            if (rand < 0.4) this.state = 'dash';
            else if (rand < 0.7) this.state = 'barrage';
            else this.state = 'grab';
            this.stateTimer = 0;
            this.hitDealt = false; // Сброс урона перед тараном
        }
    } 

else if (this.state === 'dash') {
        if (this.stateTimer < 0.8) {
            this.x += Math.sin(Date.now()) * 10;
        } else {
            let prevY = this.y; 
            this.y += 40 * (60 * dt); // Скорость падения

            // ПРОВЕРКА ТАРАНА
            // 1. Проверяем, находится ли игрок под боссом по горизонтали
            if (Math.abs(this.x - engine.player.x) < 80) {
                // 2. Проверяем, пересек ли босс линию игрока по вертикали в этом кадре
                if (prevY <= engine.player.y && this.y >= engine.player.y) {
                    if (!this.hitDealt) {
                        engine.player.lives--; // В твоем движке жизни называются lives, а не hp!
                        engine.shake = 60;
                        this.hitDealt = true; 
                        console.log("MIMIC RAMMED YOU!");
                    }
                }
            }

            if (this.y > canvas.height + 200) {
                this.y = -100; 
                this.state = 'move';
                this.stateTimer = 0;
                this.hitDealt = false; // Сбрасываем для следующего раза
            }
        }
    }

    else if (this.state === 'grab') {
        if (!this.isGrabbed) {
            this.isGrabbed = true;
            this.executionProjectileSpawned = false;
            this.fPresses = 0;
        }
        
        // Притягиваем игрока (но оставляем ему шанс дергаться)
        engine.player.x += (this.x - engine.player.x) * 0.1;

        if (this.stateTimer > 1.5 && !this.executionProjectileSpawned) {
            this.shootExecution();
            this.executionProjectileSpawned = true;
        }

        if (this.fPresses >= 3) {
            this.isGrabbed = false;
            this.state = 'move';
            this.stateTimer = 0;
        }
    }

        else if (this.state === 'grab') {
            if (!this.isGrabbed) {
                this.isGrabbed = true;
                this.executionProjectileSpawned = false;
                this.fPresses = 0;
            }
            
            // Плавное притягивание
            engine.player.x += (this.x - engine.player.x) * 0.1;

            // ПУЛЯ-КАЗНЬ: если игрок не успел освободиться за 1.5 секунды
            if (this.stateTimer > 1.5 && !this.executionProjectileSpawned) {
                this.shootExecution();
                this.executionProjectileSpawned = true;
            }

            if (this.fPresses >= 3) {
                this.isGrabbed = false;
                this.state = 'move';
                this.stateTimer = 0;
                engine.shake = 20;
            }
        }
    }

    shootSmall() {
        engine.enemyProjectiles.push({ x: this.x, y: this.y + 20, vx: (Math.random()-0.5)*4, vy: 10, size: 5, color: this.color });
    }

    shootBarrage() {
        const angle = Math.random() * Math.PI * 2;
        engine.enemyProjectiles.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * 6,
            vy: Math.sin(angle) * 6,
            size: 4, color: '#00f2ff'
        });
    }

    // Специальная пуля для фазы захвата
    shootExecution() {
    engine.enemyProjectiles.push({
        x: this.x,
        y: this.y + 20,
        vx: 0,
        vy: 5, // Начальная скорость небольшая
        size: 12,
        color: '#ff0000',
        isHoming: true, // Флаг для самонаведения
        target: engine.player
    });
}

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(1, -1);
        this.renderMimicShip(ctx, this.color, 1.0);
        ctx.restore();

        if (this.isGrabbed) {
            this.drawGrabUI(ctx);
        }
        this.drawUI(ctx);
    }

    // Твой метод отрисовки (Aegis)
    renderMimicShip(ctx, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.moveTo(0, -25); ctx.lineTo(8, -10); ctx.lineTo(25, 15);
        ctx.lineTo(10, 15); ctx.lineTo(0, 5); ctx.lineTo(-10, 15);
        ctx.lineTo(-25, 15); ctx.lineTo(-8, -10);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    drawGrabUI(ctx) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 40px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText("SYSTEM LOCK!", canvas.width/2, canvas.height/2 - 50);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Orbitron';
        ctx.fillText(`PRESS [F] TO REBOOT: ${this.fPresses}/3`, canvas.width/2, canvas.height/2);
    }

    drawUI(ctx) {
        const barW = 200;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(this.x - barW/2, this.y - 70, barW, 4);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - barW/2, this.y - 70, (this.hp/this.maxHp)*barW, 4);
    }
}

class Boss {
    constructor() {
        this.x = canvas.width / 2;
        this.y = -150;
        this.targetY = 120;
        this.hp = 100;
        this.maxHp = 100;
        
        // ВОТ ЭТОЙ СТРОЧКИ НЕ ХВАТАЛО:
        this.phase = 1; 

        this.color = '#ff0055';
        this.angle = 0;
        this.moveTimer = 0;
        this.shootTimer = 0;
    }

    update(dt) {
    // Проверка смены фазы
    if (this.phase === 1 && this.hp < this.maxHp / 2) {
        this.phase = 2;
        this.color = '#ffaa00'; // Меняем цвет на оранжевый (режим тревоги)
        engine.shake = 50;      // Тряска при переходе
    }
        // Плавный въезд на арену
        if (this.y < this.targetY) {
            this.y += 1.5 * 60 * dt;
        }

        // Движение влево-вправо "восьмеркой"
        this.moveTimer += dt;
        this.x = (canvas.width / 2) + Math.sin(this.moveTimer * 0.8) * 250;
        
        // Вращение декоративных элементов
        this.angle += 0.02 * 60 * dt;


 // ОБНОВЛЕННАЯ ЛОГИКА СТРЕЛЬБЫ
    this.shootTimer += dt;
    
    let interval = this.phase === 1 ? 1.5 : 0.45; // Во второй фазе стреляет почти в 2 раза чаще

    if (this.shootTimer > interval) {
        this.shoot();
        this.shootTimer = 0;
    }
}

shoot() {
    if (this.phase === 1) {
        // Первая фаза: обычный веер из 5 шаров вниз
        for (let i = -2; i <= 2; i++) {
            const angle = Math.PI / 2 + (i * 0.2);
            this.spawnProjectile(angle, 4);
        }
    } else {
        // ФАЗА 2: ХАОТИЧНЫЙ ОБСТРЕЛ (Chaos Mode)
        // Выпускаем, например, 5 шаров за один раз в абсолютно случайных направлениях
        for (let i = 0; i < 12; i++) {
            // Случайный угол от 0 до 360 градусов (в радианах это 0...Math.PI * 2)
            const randomAngle = Math.random() * Math.PI * 2;
            
            // Случайная скорость, чтобы шары летели неравномерно
            const randomSpeed = 3 + Math.random() * 5; 
            
            // Спавним оранжевый шар (размер 8)
            this.spawnProjectile(randomAngle, randomSpeed, 8, '#ffaa00');
        }
    }
}
// Вспомогательный метод, чтобы не дублировать код
spawnProjectile(angle, speed) {
    engine.enemyProjectiles.push({
        x: this.x,
        y: this.y + 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6
    });
}
    

// Внутри класса Boss
draw(ctx) {
    ctx.save(); // Сохраняем чистое состояние холста
    
    // --- 1. AAA ЭФФЕКТ: ГЛИТЧ (РАСЧЕТ КООРДИНАТ) ---
    let gx = this.x; // Берем базовую позицию X
    let gy = this.y; // Берем базовую позицию Y
    
    // Если вторая фаза, с шансом 20% смещаем координаты (дергаем модельку)
    if (this.phase === 2 && Math.random() > 0.8) {
        gx += Math.random() * 10 - 5; // Смещение от -5 до +5 пикселей
        gy += Math.random() * 10 - 5;
    }
    
    // --- 2. ТРАНСЛЕЙТ (ОСТАВЛЯЕМ! ИСПОЛЬЗУЕМ ГЛИТЧ-КООРДИНАТЫ) ---
    // Мы переносим центр рисования в точку gx, gy.
    // Теперь все moveTo, lineTo и arc будут считаться от этой точки (0,0).
    ctx.translate(gx, gy);

    // --- 3. ВНЕШНИЕ КОЛЬЦА (AAA ДЕТАЛИЗАЦИЯ) ---
    // Убедись, что используешь ctx.strokeStyle = this.color, 
    // чтобы цвет реально менялся на оранжевый во второй фазе.
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
    ctx.setLineDash([10, 15]); // Пунктирное кольцо
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // --- 4. ЯДРО БОССА ---
    ctx.setLineDash([]); // Сброс пунктира
    ctx.fillStyle = '#fff'; // Ядро всегда белое и яркое
    ctx.shadowBlur = 40;
    ctx.beginPath();
    // Сложная форма ядра (ромб в квадрате)
    ctx.moveTo(0, -30); ctx.lineTo(30, 0); ctx.lineTo(0, 30); ctx.lineTo(-30, 0);
    ctx.closePath();
    ctx.fill();

    // --- 5. ПОЛОСКА HP БОССА (UI) ---
    this.drawUI(ctx); // Вызываем метод отрисовки UI (он тоже считается отgx, gy)

    ctx.restore(); // Восстанавливаем холст (убираем глитч и транслейт для других объектов)
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
        this.boss = null;    
        this.enemyProjectiles = [];   
        this.bossTitleTimer = 0; // Таймер показа текста
this.bossTitleText = "";  // Текст названия     // Ссылка на объект босса
        
        this.setupListeners();
        
    }
 
   requestPointerLock() {
    // Вызываем метод корректно, без перезаписи
    const request = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
    if (request) {
        request.call(canvas);
    }
}

spawnBossSequence(title, createBossFn) {
    this.bossSpawned = true; // Блокируем повторный вход
    this.enemies = [];       // Очищаем обычных мобов
    this.projectiles = [];   // Очищаем пули игрока
    this.enemyProjectiles = []; // Очищаем пули врагов
    this.shake = 60;         // Мощная тряска при анонсе
    
    this.bossTitleText = title;
    this.bossTitleTimer = 3.5; // Титры висят чуть дольше

    console.log`([SYSTEM] INITIALIZING: ${title})`;

    setTimeout(() => {
        if (window.gameActive) {
            this.boss = createBossFn(); // Создаем нужного босса через функцию
            console.log("[SYSTEM] BOSS_MATERIALIZED");
        }
    }, 3000); // Пауза 3 секунды перед появлением
}

triggerMimicPrank() {
    // 1. Помечаем, что шутка сработала
    this.boss.hasResurrected = true;
    
    // 2. Временно "прячем" босса (убираем его координаты за экран)
    const originalY = this.boss.y;
    this.boss.y = -500; 
    
    // 3. Выводим издевательскую надпись
    this.bossTitleText = "JOKEEEE AHAHAHAAHH";
    this.bossTitleTimer = 2.5;
    this.shake = 100; // Дикая тряска от его "смеха"

    // 4. Через 2 секунды возвращаем его с 30% HP
    setTimeout(() => {
        if (this.boss && window.gameActive) {
            this.boss.y = originalY;
            this.boss.hp = this.boss.maxHp * 0.3; // 30% здоровья
            this.bossTitleText = "MIMIC: RE-INITIALIZED";
            this.bossTitleTimer = 1.5;
            
            // Включаем глитч-эффект на максимум
            this.boss.phase = 2; 
        }
    }, 2000);
}

setupListeners() {
    // 1. Клики и стрельба
    window.addEventListener('mousedown', (e) => {
        if (e.target.closest('.back-btn') || e.target.closest('#game-over-overlay')) return;
        if (!window.gameActive) return;
        
        // БЛОКИРОВКА СТРЕЛЬБЫ ПРИ ЗАХВАТЕ: Если игрока схватили, он не может стрелять
        if (this.boss && this.boss.type === 'mimic' && this.boss.isGrabbed) return;

        if (document.pointerLockElement !== canvas) {
            this.requestPointerLock();
        }

        if (!this.player.overheated) {
            this.player.heat += 15; 
            if (this.player.heat >= 100) this.player.overheated = true;
            this.projectiles.push({ x: this.player.x, y: this.player.y - 20 });

            // Зеркальный выстрел Мимика (оставь, если хочешь, чтобы он отвечал на клики в фазе движения)
            if (this.boss && this.boss.type === 'mimic' && !this.boss.isGrabbed) {
                this.boss.mirrorShot();
            }
            
            this.shake = 2;
        }
    });

    // 2. Движение (С ПРОВЕРКОЙ БЛОКИРОВКИ)
    window.addEventListener('mousemove', (e) => {
        if (!window.gameActive) return;
        
        // БЛОКИРОВКА ДВИЖЕНИЯ: Если активен захват Мимика, движение игнорируется
        if (this.boss && this.boss.type === 'mimic' && this.boss.isGrabbed) return;

        if (document.pointerLockElement === canvas) {
            this.player.targetX += e.movementX * 1.5;
        } else {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            this.player.targetX = (e.clientX - rect.left) * scaleX;
        }

        const margin = 40; 
        if (this.player.targetX < margin) this.player.targetX = margin;
        if (this.player.targetX > canvas.width - margin) this.player.targetX = canvas.width - margin;
    });

    // 3. НОВЫЙ ЛИСТЕНЕР ДЛЯ КЛАВИШИ [F]
    window.addEventListener('keydown', (e) => {
        if (!window.gameActive) return;

        // Проверяем нажатие F (английскую и русскую раскладку)
        if (e.code === 'KeyF' || e.key === 'f' || e.key === 'а' || e.key === 'А') {
            if (this.boss && this.boss.type === 'mimic' && this.boss.isGrabbed) {
                this.boss.fPresses++; // Увеличиваем счетчик нажатий в классе босса
                this.shake = 8;       // Визуальный отклик на нажатие
                
                // Звуковой эффект или лог (по желанию)
                console.log(`Rebooting system... ${this.boss.fPresses}/3`);
            }
        }
    });

}
update(dt) {
        if (!window.gameActive) return;
            // --- ВСТАВИТЬ ЭТО В НАЧАЛО UPDATE ---
// Внутри GameEngine -> update(dt)
this.gameTime += dt;

 if (this.bossTitleTimer > 0) {
    this.bossTitleTimer -= dt;
}

// За 5 секунд до босса включаем "Панику"
if (this.gameTime >= 115 && this.gameTime < 120 && !this.bossSpawned) {
    this.enemies.forEach(e => {
        // Устанавливаем фиксированную повышенную скорость ОДИН раз,
        // а не умножаем её каждый кадр.
        if (e.type === 'normal') e.speed = 8;
        if (e.type === 'tank') e.speed = 5;
        if (e.type === 'sprinter') e.speed = 12;
        
        e.color = '#fff'; 
    });
    
    this.shake = Math.max(this.shake, (this.gameTime - 115) * 2);
}

// --- СИСТЕМА СПАВНА БОССОВ ---

// 1. БОСС №1: SENTINEL (2-я минута / 120 сек)
if (this.gameTime >= 120 && this.gameTime < 130 && !this.bossSpawned) {
    this.spawnBossSequence("SENTINEL-01: ARCHITECT", () => new Boss());
}

// 2. БОСС №2: MIMIC (4-я минута / 240 сек)
// Проверяем, что Sentinel уже побежден (this.boss === null) и пришло время
if (this.gameTime >= 240 && !this.bossSpawned && !this.boss) {
    this.spawnBossSequence("WARNING: SYSTEM CORRUPTION // MIMIC", () => new MimicBoss());
}




// Вспомогательный метод внутри GameEngine для запуска заставки
// (Если вставляешь прямо в update, можно вынести функцию наружу или оставить так)

    // Если босс на экране, обновляем его
    if (this.boss) {
        this.boss.update(dt);
    }

    

// Обновление вражеских снарядов
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
        let ep = this.enemyProjectiles[i];

        // --- НОВАЯ ЛОГИКА МАГНИТА (САМОНАВЕДЕНИЯ) ---
        if (ep.isHoming && ep.target) {
            let dx = ep.target.x - ep.x;
            let dy = ep.target.y - ep.y;
            let dist = Math.hypot(dx, dy);
            
            if (dist > 1) {
                // Плавно притягиваем вектор скорости к игроку
                ep.vx += (dx / dist) * 0.4;
                ep.vy += (dy / dist) * 0.4;
                
                // Ограничиваем скорость, чтобы пуля не стала слишком быстрой
                const maxSpeed = 10;
                let speed = Math.hypot(ep.vx, ep.vy);
                if (speed > maxSpeed) {
                    ep.vx = (ep.vx / speed) * maxSpeed;
                    ep.vy = (ep.vy / speed) * maxSpeed;
                }
            }
        }

        // Обычное движение (твои старые строки)
        ep.x += ep.vx * 60 * dt;
        ep.y += ep.vy * 60 * dt;

        // Проверка столкновения (твой старый код...)
        const dist = Math.hypot(ep.x - this.player.x, ep.y - this.player.y);
        if (dist < 25) {
            this.player.lives--;
            this.shake = 20;
            this.enemyProjectiles.splice(i, 1);
            if (this.player.lives <= 0) this.gameOver();
            continue;
        }

    // Удаление за экраном
    if (ep.y > canvas.height + 20 || ep.x < -20 || ep.x > canvas.width + 20) {
        this.enemyProjectiles.splice(i, 1);
    }
}


        // 1. Обновляем игрока (передаем dt)
        this.player.update(dt);
        
       // Внутри GameEngine -> update(dt)

// 2. Спавн врагов (с защитой от боссфайта)
this.spawnTimer += dt * 60; 

// Добавляем проверку !this.boss (восклицательный знак означает "НЕТ")
if (this.spawnTimer > CONFIG.BALANCE.SPAWN_INTERVAL && !this.boss && this.bossTitleTimer <= 0) {
    this.enemies.push(new Enemy());
    this.spawnTimer = 0;
}

        // 3. Пули (идем с конца массива)
for (let i = this.projectiles.length - 1; i >= 0; i--) {
    let p = this.projectiles[i];
    p.y -= 700 * dt; 

    if (this.boss) {
        // Проверяем расстояние от пули до центра босса
        const dist = Math.hypot(p.x - this.boss.x, p.y - this.boss.y);
        if (dist < 60) { // 60 — радиус хитбокса босса
            this.boss.hp -= 1; // Урон от одной пули
            this.projectiles.splice(i, 1); // Удаляем пулю
            this.shake = 3; // Легкая тряска при попадании
            
           if (this.boss.hp <= 0) {
    // Если это МИМИК и он еще не воскресал
    if (this.boss.type === 'mimic' && !this.boss.hasResurrected) {
        this.triggerMimicPrank();
    } else {
        // Если это обычный босс или Мимик уже "шутил" — убиваем окончательно
        this.handleBossDeath();
    }
}
            continue; // Идем к следующей пуле
        }
    }
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
   // РАССТОЯНИЕ ДО ОБЪЕКТА
const distToPlayer = Math.hypot(e.x - this.player.x, e.y - this.player.y);

// 1. Проверка на выход за экран
if (e.y > canvas.height + 50) {
    this.enemies.splice(i, 1);
    continue;
}



    // --- ОБЪЕДИНЕННАЯ ЛОГИКА ПРОПУСКОВ И СТОЛКНОВЕНИЙ ---

    // 1. Проверка: Объект улетел за нижний край экрана
    if (e.y > canvas.height + 50) {
        // Если пропустили врага (не аптечку) и не в режиме паники — минус жизнь
        if (e.type !== 'repair' && this.gameTime < 115) {
            this.player.lives--;
            this.shake = 10;
            if (this.player.lives <= 0) this.gameOver();
        }
        this.enemies.splice(i, 1);
        continue; 
    }

    // 2. Проверка: Прямое столкновение игрока с объектом
    if (distToPlayer < 30) {
        if (e.type === 'repair') {
            // Подобрали аптечку
            this.player.lives = Math.min(this.player.lives + 1, 5);
            this.player.score += 500;
            this.shake = 5;
            console.log("%c[SYSTEM] REPAIR_KIT_APPLIED", "color: #00ff44");
        } else {
            // Врезались во врага
            if (this.gameTime < 115) {
                this.player.lives--;
                this.shake = 15;
                if (this.player.lives <= 0) this.gameOver();
            }
        }
        
        this.enemies.splice(i, 1);
        continue;
    }

}
        // 5. Универсальное обновление частиц и спецэффектов
for (let i = this.particles.length - 1; i >= 0; i--) {
    let p = this.particles[i];

    // Вызываем обновление, если оно есть у объекта
    if (typeof p.update === 'function') {
        p.update(dt);
    }

    // Условие удаления (универсальное)
    const isDead = (p.life !== undefined && p.life <= 0);
    const isfaded = (p.alpha !== undefined && p.alpha <= 0);

    if (isDead || isfaded) {
        this.particles.splice(i, 1);
    }
}

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

    // Внутри класса GameEngine
skipToBoss() {
    console.log("%c[DEBUG] JUMPING_TO_BOSS_PHASE", "color: #00ffff; font-weight: bold;");
    
    // Прыгаем на 114-ю секунду (за 1 секунду до начала паники)
    this.gameTime = 114; 
    
    // Очищаем текущих врагов, чтобы не мешались
    this.enemies = []; 
    
    // Даем визуальный фидбек
    this.shake = 30;
}
// Прыжок ко второму боссу (Мимик)
skipToMimic() {
    console.log("%c[DEBUG] JUMPING_TO_MIMIC_PHASE", "color: #00ff44; font-weight: bold;");
    
    // Прыгаем на 235-ю секунду (за 5 сек до появления)
    this.gameTime = 235; 
    
    // Убеждаемся, что флаг босса сброшен, чтобы спавн сработал
    this.bossSpawned = false; 
    this.boss = null;
    
    // Очистка экрана
    this.enemies = []; 
    this.enemyProjectiles = [];
    this.projectiles = [];
    
    // Эффект перехода
    this.shake = 40;
}


handleBossDeath() {
    // 1. Замедляем игру (Slow-mo эффект)
    const originalDt = 1; 
    this.shake = 100;

    // 2. Спавним ОГРОМНОЕ количество частиц разных цветов
    for (let i = 0; i < 150; i++) {
        const color = i % 2 === 0 ? this.boss.color : '#ffffff';
        const p = new Particle(this.boss.x, this.boss.y, color);
        p.speedX *= 3; // Разлетаются быстрее
        p.speedY *= 3;
        this.particles.push(p);
    }

    // 3. Создаем "Кольцо взрыва" (Shockwave)
    this.spawnShockwave(this.boss.x, this.boss.y);

    // 4. Награда
    this.player.score += 5000;
    this.spawnLoot(this.boss.x, this.boss.y);

    this.boss = null;
    this.bossSpawned = false;
    this.gameTime = 0; // Таймер игры сбрасывается для следующего цикла
    
    // СБРОС ТАЙМЕРА СПАВНА:
    // Даем игроку 2-3 секунды тишины после победы
    this.spawnTimer = -180; // (минус 180 тиков даст задержку примерно в 3 секунды)
}

spawnShockwave(x, y) {
    const wave = {
        x: x, y: y,
        radius: 0,
        maxRadius: 500,
        alpha: 1,
        update: function(dt) {
            this.radius += 500 * dt;
            this.alpha -= 0.02 * 60 * dt;
        },
        draw: function(ctx) {
            ctx.save();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 4;
            ctx.globalAlpha = Math.max(0, this.alpha);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    };
    
    // Добавляем в массив частиц, чтобы движок его отрисовал
    // (Убедись, что в update частиц у тебя есть проверка на наличие метода update у объекта)
    this.particles.push(wave);
}

spawnLoot(x, y) {
    // Создаем объект "Аптечка" или "Усилитель"
    const loot = {
        x: x,
        y: y,
        size: 15,
        type: 'repair', // Восстановление жизней
        color: '#00ff44'
    };
    
    // Добавим его в массив врагов, чтобы не плодить новые массивы, 
    // но дадим ему отрицательную скорость, чтобы он падал как бонус
    this.enemies.push({
        ...loot,
        hp: 999, // Чтобы случайно не подстрелить
        speed: 1,
        scoreValue: 0,
        update: function(dt) { this.y += this.speed * 60 * dt; },
        draw: function(ctx) {
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.color;
            ctx.strokeStyle = this.color;
            ctx.strokeRect(this.x - 7, this.y - 7, 14, 14);
            ctx.fillStyle = this.color;
            ctx.font = '10px Orbitron';
            ctx.fillText("REPAIR", this.x - 20, this.y - 15);
            ctx.restore();
        }
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

    this.enemyProjectiles.forEach(ep => {
    ctx.save();
    // Используем цвет из объекта снаряда, если он есть
    ctx.fillStyle = ep.color || '#ff0055'; 
    ctx.shadowBlur = 10;
    ctx.shadowColor = ep.color || '#ff0055';
    
    ctx.beginPath();
    ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
});

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



    if (this.bossTitleTimer > 0) {
    ctx.save();
    
    const textShakeX = Math.random() * 10 - 5;
    const textShakeY = Math.random() * 10 - 5;
    ctx.translate(canvas.width / 2 + textShakeX, canvas.height / 2 + textShakeY);

    ctx.font = 'bold 50px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // --- 1. ГЛИТЧ-ПОДЛОЖКА (Всегда круто выглядит) ---
    ctx.fillStyle = '#ff0055';
    ctx.fillText(this.bossTitleText, 4, 4);
    ctx.fillStyle = '#00f2ff';
    ctx.fillText(this.bossTitleText, -4, -4);

    // --- 2. ДИНАМИЧЕСКИЙ ЦВЕТ ОСНОВНОГО ТЕКСТА ---
    let mainColor = '#fff'; // По умолчанию белый
    let glowColor = '#fff';

    if (this.bossTitleText === "JOKEEEE AHAHAHAAHH") {
        // Безумный режим для Мимика
        mainColor = Math.random() > 0.5 ? '#ff0000' : '#00ff00';
        glowColor = mainColor;
    } else if (this.bossTitleText.includes("WARNING") || this.bossTitleText.includes("CORRUPTION")) {
        // Тревожный желтый для появления Мимика
        mainColor = '#ffff00';
        glowColor = '#ffff00';
    }

    // Рисуем основной текст выбранным цветом
    ctx.fillStyle = mainColor;
    ctx.shadowBlur = 20;
    ctx.shadowColor = glowColor;
    ctx.fillText(this.bossTitleText, 0, 0);

    // --- 3. ДЕКОРАТИВНЫЕ ЛИНИИ (В цвет текста) ---
    ctx.lineWidth = 2;
    ctx.strokeStyle = mainColor; // Линии теперь тоже будут красными/зелеными/желтыми
    ctx.beginPath();
    ctx.moveTo(-300, 40); ctx.lineTo(300, 40);
    ctx.moveTo(-300, -40); ctx.lineTo(300, -40);
    ctx.stroke();

    ctx.restore();
}
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

    canvas.width = 900;
    canvas.height = 600;

    // 1. Создаем движок ОДИН раз
    const gameInstance = new GameEngine(); 

    // 2. Привязываем его к глобальным переменным
    engine = gameInstance;         // для внутреннего кода (loop)
    window.engine = gameInstance;  // для КОНСОЛИ (чтобы не было Uncaught ReferenceError)

    // 3. Запускаем
    engine.loop();
});