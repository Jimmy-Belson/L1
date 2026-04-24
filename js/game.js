// ==========================================
// ORBITRON: TECH-CORE ENGINE v2.1 [STABLE]
// ==========================================
import { getRankByScore } from '../js/ranks.js';

window.GameProgression = {
    credits: 999999, 
    
    // Пытаемся достать купленное перед ребутом, иначе дефолт
    activeUpgrades: JSON.parse(sessionStorage.getItem('temp_upgrades')) || {
        weaponType: 'default',
        twin: false,
        shieldCharges: 0,
        extraLives: 0,
        coolingFactor: 1
    },

    saveCredits(amount) {
        if (this.credits < 900000) {
            this.credits += amount;
            localStorage.setItem('orbitron_credits', this.credits);
        }
    },

    buy(item, cost) {
        if (this.credits >= cost || this.credits > 900000) {
            switch(item) {
                case 'laser':    this.activeUpgrades.weaponType = 'laser'; break;
                case 'triple':   this.activeUpgrades.weaponType = 'triple'; break;
                case 'twin':     this.activeUpgrades.twin = true; break;
                case 'shield':   this.activeUpgrades.shieldCharges += 3; break;
                case 'berserk':  this.activeUpgrades.weaponType = 'berserk'; break;
            }
            
            // СОХРАНЯЕМ ВО ВРЕМЕННОЕ ХРАНИЛИЩЕ (sessionStorage)
            // Оно очистится только если закрыть вкладку, но выживет при REBOOT
            sessionStorage.setItem('temp_upgrades', JSON.stringify(this.activeUpgrades));
            
            this.updateShopUI();
            return true;
        }
        return false;
    },

    // Очистка только если мы реально хотим сбросить всё (например, после реального проигрыша)
    resetAfterMatch() {
        // Если хочешь, чтобы после смерти апгрейды сгорали СРАЗУ, раскомментируй:
        // sessionStorage.removeItem('temp_upgrades');
    },

    updateShopUI() {
        const display = document.getElementById('shop-credits');
        if (display) display.innerText = this.credits > 900000 ? "INF" : this.credits;
    }
};

// Функция для интеграции с кнопками HTML
window.buyItem = (id, cost, btn) => {
    if (window.GameProgression.buy(id, cost)) {
        btn.innerHTML = "EQUIPPED";
        btn.style.background = "#00f2ff";
        btn.style.color = "#000";
        btn.disabled = true;
    } else {
        const original = btn.innerHTML;
        btn.innerHTML = "INSUFFICIENT FUNDS";
        btn.style.color = "#ff0000";
        setTimeout(() => {
            btn.innerHTML = original;
            btn.style.color = "";
        }, 1000);
    }
};

// ==========================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И ДВИЖОК
// ==========================================

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
        console.log(`%c[SYSTEM] DETECTED_CORE: SHUTTING_DOWN_BACKGROUND_VISUALS`, "color: #ff00e5");
        
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
        this.x = canvas.width / 2;
        this.y = canvas.height - 60; 
        this.invulTimer = 0;
        this.score = 0;

        // ИЗМЕНИ ЭТУ СТРОКУ: Базовые жизни + купленные в магазине
        this.lives = CONFIG.BALANCE.LIVES + window.GameProgression.activeUpgrades.extraLives;

        this.targetX = this.x;
        this.heat = 0;
        this.maxHeat = 100;
        this.overheated = false;
        this.tilt = 0; 
    }

    update(dt) {
        const prevX = this.x;

        // Если босс существует, он мимик и он схватил нас — ПРЕРЫВАЕМ движение
        if (window.engine && window.engine.boss && window.engine.boss.isGrabbed) {
            // Игрок заблокирован, двигает только сам босс (в классе MimicBoss)
        } else {
            // Стандартная логика движения к курсору
            this.x += (this.targetX - this.x) * (0.3 * dt * 60);
        }
        
        // Расчет наклона корпуса (AAA динамика)
        const velocity = (this.x - prevX) * 0.2;
        this.tilt = velocity * Math.PI / 180;

        // Таймер бессмертия
        if (this.invulTimer > 0) {
            this.invulTimer -= dt;
        }

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
        // --- ДОБАВЬ ЭТОТ БЛОК ДЛЯ ОРИСОВКИ БЛИЗНЕЦА ---
if (window.GameProgression.activeUpgrades.twin) {
    ctx.save();
    // Рисуем его чуть правее и делаем полупрозрачным (эффект фантома)
    ctx.translate(60, 0); 
    ctx.globalAlpha = 0.5; 
    // Используем тот же метод отрисовки, что и у игрока
    this.player.draw(ctx); 
    ctx.restore();
}
        
        // В начале Player.draw(ctx)
if (this.invulTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
    ctx.globalAlpha = 0.3; // Делаем полупрозрачным или мигающим
}

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

         if (this.isGlitching) return; 

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
    let renderX = this.x;
    let renderY = this.y;
    
    // ЭФФЕКТ ГЛЮКА (вибрация и инверсия цвета)
    if (this.isGlitching) {
        renderX += Math.random() * 14 - 7; // Сильная тряска
        renderY += Math.random() * 14 - 7;
        if (Math.random() > 0.5) ctx.filter = 'invert(100%)'; // Глючный негатив
    }

    ctx.save();
    ctx.translate(renderX, renderY);
    // ... далее твой switch(this.type) ...
    


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
        
    ctx.filter = 'none'; // СБРОС ФИЛЬТРА ОБЯЗАТЕЛЕН

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
        this.hp = 40;
        this.maxHp = 40;
        
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
    // 1. Плавный въезд босса на экран (только если не в режиме тарана)
    if (this.y < this.targetY && this.state !== 'dash') {
        this.y += 2 * 60 * dt;
    }

    this.stateTimer += dt;

    // --- МАШИНА СОСТОЯНИЙ ---
    switch (this.state) {
        case 'move':
            // Движение влево-вправо
            this.x += this.vx * this.moveDir * (60 * dt);
            if (this.x > canvas.width - 100 || this.x < 100) this.moveDir *= -1;
            
            // Обычная стрельба
            if (Math.random() > 0.90) this.shootSmall();

            // Переход в другие состояния
            if (this.stateTimer > 3) {
                const rand = Math.random();
                if (rand < 0.3) this.state = 'dash';
                else if (rand < 0.6) this.state = 'barrage';
                else this.state = 'grab';
                
                this.stateTimer = 0;
                this.hitDealt = false; // Сброс урона для тарана
            }
            break;

        case 'dash':
            if (this.stateTimer < 0.8) {
                this.x += Math.sin(Date.now() * 0.5) * 10; // Тряска перед броском
            } else {
                let prevY = this.y;
                this.y += 40 * (60 * dt); // Полет вниз

                // Проверка тарана (урон игроку)
                if (Math.abs(this.x - engine.player.x) < 80) {
                    if (prevY <= engine.player.y && this.y >= engine.player.y) {
                        if (!this.hitDealt) {
                            engine.player.lives--; // Минус жизнь
                            engine.shake = 60;
                            this.hitDealt = true;
                        }
                    }
                }

                // Возврат босса сверху
                if (this.y > canvas.height + 200) {
                    this.y = -200;
                    this.state = 'move';
                    this.stateTimer = 0;
                }
            }
            break;

        case 'barrage':
            // Шквал пуль (по 3 штуки за кадр)
            for (let i = 0; i < 1; i++) {
                this.shootBarrage();
            }
            if (this.stateTimer > 2.5) {
                this.state = 'move';
                this.stateTimer = 0;
            }
            break;

        case 'grab':
            if (!this.isGrabbed) {
                this.isGrabbed = true;
                this.executionProjectileSpawned = false;
                this.fPresses = 0;
            }
            
            // Притягиваем игрока к центру босса
            engine.player.x += (this.x - engine.player.x) * (0.1 * 60 * dt);

            // Выстрел самонаводящейся пулей-казнью через 1.5 сек
            if (this.stateTimer > 1.5 && !this.executionProjectileSpawned) {
                this.shootExecution();
                this.executionProjectileSpawned = true;
            }

            // Условие освобождения (3 нажатия F) или автоматический конец фазы через 4 сек
            // Внутри case 'grab':
if (this.fPresses >= 3 || this.stateTimer > 4) {
    this.isGrabbed = false;
    this.fPresses = 0;
    this.state = 'move';
    this.stateTimer = 0;
    engine.shake = 30;

    // 1. Убираем старые пули, чтобы они не "кемпили" тебя на выходе
    engine.enemyProjectiles = []; 

    // 2. Даем игроку 1.5 секунды бессмертия, чтобы успеть отлететь
    engine.player.invulTimer = 1.5; 

    // 3. Синхронизируем прицел мыши с текущим положением корабля
    engine.player.targetX = engine.player.x; 
}

            break;
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
        this.enemiesExploded = false;
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
    // 0. СИНХРОНИЗАЦИЯ ПРИ ВХОДЕ В POINTER LOCK
    // Это критично, чтобы не было прыжка в момент клика
    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === canvas) {
            this.player.targetX = this.player.x;
        }
    });

    // 1. КЛИКИ И СТРЕЛЬБА
    window.addEventListener('mousedown', (e) => {
        if (e.target.closest('.back-btn') || e.target.closest('#game-over-overlay')) return;
        if (!window.gameActive) return;
        
        // Блокировка стрельбы при захвате мимиком
        if (this.boss?.type === 'mimic' && this.boss.isGrabbed) return;

        // Включаем Pointer Lock при первом клике
        if (document.pointerLockElement !== canvas) {
            this.requestPointerLock();
            return; // Пропускаем выстрел в момент активации лока, чтобы избежать скачка
        }

        if (!this.player.overheated) {
            this.player.heat += 15; 
            if (this.player.heat >= 100) this.player.overheated = true;

               const upg = window.GameProgression.activeUpgrades;

    // Вспомогательная функция для создания пули в зависимости от оружия
    const fire = (startX, startY) => {
        switch(upg.weaponType) {
            case 'triple':
                for(let i = -1; i <= 1; i++) this.projectiles.push({ x: startX, y: startY, vx: i * 3, type: 'normal' });
                break;
            case 'laser':
    this.projectiles.push({ 
        x: startX, 
        y: 0, // Лазер мгновенно занимает всю вертикаль
        originX: startX,
        originY: startY,
        type: 'laser', 
        life: 0.2 // Длительность вспышки в секундах
    });
    break;
            case 'grenade':
                this.projectiles.push({ x: startX, y: startY, type: 'grenade' });
                break;
            case 'berserk':
                for(let i = 0; i < 8; i++) {
                    const a = (Math.PI*2/8)*i;
                    this.projectiles.push({ x: startX, y: startY, vx: Math.cos(a)*8, vy: Math.sin(a)*8, type: 'berserk' });
                }
                break;
            default:
                this.projectiles.push({ x: startX, y: startY, vx: 0, type: 'normal' });
        }
    };

    // Стреляет основной игрок
    fire(this.player.x, this.player.y - 20);

    // Если куплен Брат-близнец — он стреляет рядом!
    if (upg.twin) {
        fire(this.player.x + 60, this.player.y);
    }

           
            this.shake = 2;
        }
    });

    // 2. ДВИЖЕНИЕ
    window.addEventListener('mousemove', (e) => {
        if (!window.gameActive) return;
        
        // Блокировка движения при захвате
        if (this.boss?.type === 'mimic' && this.boss.isGrabbed) {
            this.player.targetX = this.player.x; 
            return;
        }

        if (document.pointerLockElement === canvas) {
            // В режиме Pointer Lock используем накопление относительного движения
            // Множитель 1.2 обычно комфортнее, чем 1.5, для точного прицеливания
            this.player.targetX += e.movementX * 1.2;
        } else {
            // Обычный режим (курсор над канвасом)
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            this.player.targetX = (e.clientX - rect.left) * scaleX;
        }

        // Жесткий Clamp (ограничение) по краям экрана
        const margin = 40; 
        if (this.player.targetX < margin) this.player.targetX = margin;
        if (this.player.targetX > canvas.width - margin) this.player.targetX = canvas.width - margin;
    });

    // 3. КЛАВИША [F] (Освобождение от захвата)
    window.addEventListener('keydown', (e) => {
        if (!window.gameActive) return;

        const isKeyF = e.code === 'KeyF' || e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'а';
        
        if (isKeyF) {
            if (this.boss?.type === 'mimic' && this.boss.isGrabbed) {
                this.boss.fPresses++; 
                this.shake = 8; 
                console.log`([SYSTEM] REBOOTING... ${this.boss.fPresses}/3)`;
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

// --- СИСТЕМА СПАВНА БОССОВ (ОПТИМИЗИРОВАННАЯ) ---

// 1. БОСС №1: SENTINEL (120 сек)
if (this.gameTime >= 120 && this.gameTime < 130 && !this.bossSpawned) {
    this.spawnBossSequence("SENTINEL-01: ARCHITECT", () => new Boss());
}

// 2. ФАЗА "ГЛЮКА" (235 - 238 сек): Те, кто УЖЕ на экране, замирают и трясутся
if (this.gameTime >= 235 && this.gameTime < 238) {
    this.enemies.forEach(e => {
        e.speed = 0;           
        e.isGlitching = true;  
    });
    this.shake = 2; // Легкий гул
}

// 3. ФАЗА "ВЗРЫВА" (Ровно в 238 сек)
if (this.gameTime >= 238 && !this.enemiesExploded) { 
    this.enemies.forEach(e => {
        // Создаем частицы взрыва
        for (let j = 0; j < 15; j++) {
            let p = new Particle(e.x, e.y, e.color);
            p.speedX *= 3; 
            p.speedY *= 3;
            p.size = Math.random() * 6;
            this.particles.push(p);
        }
    });
    
    this.enemies = []; // Очищаем массив
    this.enemiesExploded = true; // Флаг, чтобы не взрывать пустой массив каждый кадр
    this.shake = 50; 
    this.player.invulTimer = 3; 
}

// Сбрось флаг где-нибудь в начале игры или при спавне Мимика
// (добавь this.enemiesExploded = false в constructor GameEngine)

// 4. БОСС №2: MIMIC (на 240 сек)
if (this.gameTime >= 240 && !this.bossSpawned && !this.boss) {
    this.spawnBossSequence("WARNING: SYSTEM CORRUPTION // MIMIC", () => new MimicBoss());
}

// 5. ОБНОВЛЕНИЕ БОССА (если он уже заспавнился)
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

            if (this.player.invulTimer > 0) {
        this.enemyProjectiles.splice(i, 1);
        continue;
    }
            this.player.lives--;
            this.player.invulTimer = 1.5; // Даем 1.5 сек бессмертия после удара
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

// 2. Спавн врагов
this.spawnTimer += dt * 60; 

// Добавляем проверку: не спавнить, если до Мимика осталось менее 5 сек (с 235-й секунды)
const prepPhase = (this.gameTime >= 235 && this.gameTime < 240);

if (this.spawnTimer > CONFIG.BALANCE.SPAWN_INTERVAL && !this.boss && this.bossTitleTimer <= 0 && !prepPhase) {
    this.enemies.push(new Enemy());
    this.spawnTimer = 0;
}

        // 3. Пули (идем с конца массива)
for (let i = this.projectiles.length - 1; i >= 0; i--) {
    let p = this.projectiles[i];


    if (p.type === 'laser') {
    // 1. Уменьшаем время жизни луча
    p.life -= dt;
    if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
    }

    // 2. Проверка урона по врагам (луч бьет всех на одной линии X)
    this.enemies.forEach((e, index) => {
        // Если враг находится по горизонтали близко к лучу (ширина хитбокса луча ~20px)
        if (Math.abs(e.x - p.originX) < 25 && e.y < p.originY) {
            e.hp -= 0.5; // Лазер бьет часто или насквозь, можно регулировать урон
            this.shake = 2;
        }
    });

    // 3. Урон по боссу
    if (this.boss && Math.abs(this.boss.x - p.originX) < 60) {
        this.boss.hp -= 0.2;
    }
    
    continue; // Пропускаем стандартное движение p.y -= 700 для лазера
}
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

for (let i = this.enemies.length - 1; i >= 0; i--) {
    let e = this.enemies[i];
    e.update(dt);
    
    // 1. СТОЛКНОВЕНИЕ С ПУЛЯМИ
    for (let j = this.projectiles.length - 1; j >= 0; j--) {
        let p = this.projectiles[j];
        if (Math.hypot(p.x - e.x, p.y - e.y) < e.size) {
            e.hp--;
            this.projectiles.splice(j, 1);
            if (e.hp <= 0) break;
        }
    }

    // 2. СМЕРТЬ ВРАГА (Начисление очков)
    if (e.hp <= 0) {
        this.player.score += e.scoreValue;
        for(let j=0; j<8; j++) this.particles.push(new Particle(e.x, e.y, e.color));
        this.enemies.splice(i, 1);
        continue;
    }

    // 3. ПРОВЕРКА ПРОПУСКА (Улетел за экран)
    if (e.y > canvas.height + 50) {
        // Отнимаем жизнь, если это не аптечка и не фаза перед боссом
        if (e.type !== 'repair' && this.gameTime < 115) {


             // ПРОВЕРКА ЩИТА ИЗ МАГАЗИНА
        if (window.GameProgression.activeUpgrades.shieldCharges > 0) {
            window.GameProgression.activeUpgrades.shieldCharges--;
            this.shake = 5; // Легкая тряска, что щит сработал
            console.log("Shield blocked leakage! Charges left:", window.GameProgression.activeUpgrades.shieldCharges);
        } else {
            // Если щитов нет — теряем жизнь
            this.player.lives--;
            this.shake = 10;
            if (this.player.lives <= 0) this.gameOver();
        }
    
    }
        this.enemies.splice(i, 1);
        continue; 
    }

    // 4. ПРЯМОЕ СТОЛКНОВЕНИЕ С ИГРОКОМ
    const distToPlayer = Math.hypot(e.x - this.player.x, e.y - this.player.y);
    if (distToPlayer < 30) {
        if (e.type === 'repair') {
            this.player.lives = Math.min(this.player.lives + 1, 5);
            this.player.score += 500;
            this.shake = 5;
        } else {
            // Если у игрока нет бессмертия
            if (!(this.player.invulTimer > 0)) {
                this.player.lives--;
                this.player.invulTimer = 1.5;
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
    if (p.type === 'laser') {
        // РИСУЕМ ЛАЗЕРНЫЙ ЛУЧ
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0ff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4 * (p.life / 0.2); // Луч сужается со временем
        
        ctx.beginPath();
        ctx.moveTo(p.originX, p.originY);
        ctx.lineTo(p.originX, 0); // Луч до верхнего края
        ctx.stroke();

        // Дополнительное внешнее свечение
        ctx.globalAlpha = p.life * 5;
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 15;
        ctx.stroke();
    } else {
        // ОБЫЧНАЯ ПУЛЯ
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff00e5';
        ctx.fillStyle = '#ff00e5';
        ctx.fillRect(p.x - 2, p.y, 4, 15);
    }
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

        // --- ДИНАМИЧЕСКИЙ РАЗМЕР ШРИФТА ---
        // Если текст длиннее 20 символов, уменьшаем шрифт с 50 до 30
        let fontSize = this.bossTitleText.length > 20 ? 30 : 50;
        ctx.font = `bold ${fontSize}px Orbitron`;
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // --- ГЛИТЧ-ПОДЛОЖКА ---
        ctx.fillStyle = '#ff0055';
        ctx.fillText(this.bossTitleText, 3, 3);
        ctx.fillStyle = '#00f2ff';
        ctx.fillText(this.bossTitleText, -3, -3);

        // --- ЦВЕТ ОСНОВНОГО ТЕКСТА ---
        let mainColor = '#fff';
        if (this.bossTitleText.includes("WARNING")) {
            mainColor = '#ffff00'; // Желтый для Мимика
        }

        ctx.fillStyle = mainColor;
        ctx.shadowBlur = 20;
        ctx.shadowColor = mainColor;
        ctx.fillText(this.bossTitleText, 0, 0);

        // --- ДЕКОРАТИВНЫЕ ЛИНИИ (подстраиваем под ширину текста) ---
        ctx.lineWidth = 2;
        ctx.strokeStyle = mainColor;
        ctx.beginPath();
        // Линии теперь тоже зависят от размера шрифта
        const lineOffset = fontSize < 40 ? 30 : 45; 
        ctx.moveTo(-canvas.width/2 + 50, lineOffset); ctx.lineTo(canvas.width/2 - 50, lineOffset);
        ctx.moveTo(-canvas.width/2 + 50, -lineOffset); ctx.lineTo(canvas.width/2 - 50, -lineOffset);
        ctx.stroke();

        ctx.restore();
    }
}

async gameOver() {
    window.gameActive = false;


      // 1. Сохраняем заработанные очки как валюту
    window.GameProgression.saveCredits(this.player.score);
    

    
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


window.toggleShop = (show) => {
    const panel = document.getElementById('black-market-panel');
    if (show) {
        panel.classList.add('active');
        window.GameProgression.updateShopUI(); // Обновляем баланс при открытии
    } else {
        panel.classList.remove('active');
    }
};

// Обнови функцию покупки, чтобы она вешала класс купленного товара
const originalBuyItem = window.buyItem;
window.buyItem = (id, cost, element) => {
    if (window.GameProgression.buy(id, cost)) {
        element.classList.add('bought');
        element.querySelector('.price').innerText = "EQUIPPED";
        // Маленькая встряска экрана для эффекта покупки
        if (window.engine) window.engine.shake = 10;
    } else {
        // Эффект нехватки денег
        element.style.borderColor = "red";
        setTimeout(() => element.style.borderColor = "", 500);
    }
};





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
        // ДОБАВЬ ЭТО:
    window.GameProgression.updateShopUI();

    
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