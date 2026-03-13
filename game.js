// game.js
import { getRankByScore } from './ranks.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Настройки экрана
canvas.width = 600;
canvas.height = 800;

// Состояние игрока
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 40,
    height: 45,
    targetX: canvas.width / 2,
    speed: 0.15, // Коэффициент плавности следования
    tilt: 0,      // Наклон крыльев
    lives: 3,
    score: 0
};

// Отслеживание мыши
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.targetX = e.clientX - rect.left;
});

// Функция отрисовки твоего "необычного" корабля
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    
    // Эффект наклона при движении
    player.tilt = (player.targetX - player.x) * 0.1;
    ctx.rotate(player.tilt * Math.PI / 180);

    // 1. Огонь из двигателя (пульсирующий хвост)
    const engineFluff = Math.random() * 10 + 15;
    ctx.beginPath();
    ctx.moveTo(-5, 20);
    ctx.lineTo(0, 20 + engineFluff);
    ctx.lineTo(5, 20);
    ctx.fillStyle = Math.random() > 0.5 ? '#00f2ff' : '#ff00e5';
    ctx.fill();

    // 2. Крылья (Боковые элементы)
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Левое крыло
    ctx.moveTo(-15, 5);
    ctx.lineTo(-25, 15);
    ctx.lineTo(-15, 20);
    // Правое крыло
    ctx.moveTo(15, 5);
    ctx.lineTo(25, 15);
    ctx.lineTo(15, 20);
    ctx.stroke();

    // 3. Центральный корпус (Тот самый треугольник, но сложнее)
    ctx.beginPath();
    ctx.moveTo(0, -25); // Нос
    ctx.lineTo(-15, 20); // Левый угол
    ctx.lineTo(0, 10);   // Внутренняя выемка
    ctx.lineTo(15, 20);  // Правый угол
    ctx.closePath();

    // Свечение корпуса
    ctx.fillStyle = '#0a0a0f'; 
    ctx.fill();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f2ff';
    ctx.strokeStyle = '#00f2ff';
    ctx.stroke();

    ctx.restore();
}


// 1. Добавляем массив для снарядов в начало файла
const projectiles = [];

const enemies = [];
let spawnTimer = 0; // Таймер для контроля частоты появления

// 2. Слушатель нажатия (Стрельба)
window.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // Левая кнопка мыши
        shoot();
    }
});

function shoot() {
    // Создаем два снаряда (из левого и правого крыла)
    const offset = 20; 
    projectiles.push({ x: player.x - offset, y: player.y, speed: 10 });
    projectiles.push({ x: player.x + offset, y: player.y, speed: 10 });
    
    // Здесь позже добавим звук Core.Audio.play('laser');
}

// 3. Функция обновления снарядов (добавь её в основной цикл update)
function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.y -= p.speed; // Летит вверх

        // Рисуем лазер
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 15);
        ctx.strokeStyle = '#ff00e5'; // Розовый неон для выстрелов
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Удаляем, если вылетел за экран
        if (p.y < 0) projectiles.splice(i, 1);
    }
}



function updateEnemies() {
    spawnTimer++;
    
    // Появляется новый враг примерно каждые 60 кадров (1 секунда)
    if (spawnTimer > 60) {
        const size = 30;
        enemies.push({
            x: Math.random() * (canvas.width - size) + size / 2,
            y: -size,
            width: size,
            height: 20,
            speed: 2 + Math.random() * 2 // Рандомная скорость для разнообразия
        });
        spawnTimer = 0;
    }

    // Двигаем и рисуем врагов
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += e.speed;

        // Рисуем НЛО в стиле неонового вектора
        ctx.strokeStyle = '#ff3333'; // Красный неон
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Корпус-тарелка
        ctx.ellipse(e.x, e.y, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Кабина
        ctx.beginPath();
        ctx.arc(e.x, e.y - 5, 7, 0, Math.PI * 2);
        ctx.stroke();

        // Удаляем врага, если он улетел за нижний край
        if (e.y > canvas.height + 50) {
            enemies.splice(i, 1);
        }
    }
}

function checkCollisions() {
    // 1. Проверка: Лазер попал во врага
    for (let i = projectiles.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            const p = projectiles[i];
            const e = enemies[j];

            // Математика: расстояние между точками
            const dist = Math.hypot(p.x - e.x, p.y - e.y);

            if (dist < 25) { // Если попали
                projectiles.splice(i, 1);
                enemies.splice(j, 1);
                player.score += 10; // Начисляем очки
                break; 
            }
        }
    }

    // 2. Проверка: Враг врезался в игрока
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);

        if (distToPlayer < 35) {
            enemies.splice(i, 1);
            player.lives -= 1;
            
            if (player.lives <= 0) {
                // Пока просто сброс, позже сделаем сохранение ранга
                alert(`MISSION FAILED. SCORE: ${player.score}`);
                player.score = 0;
                player.lives = 3;
            }
        }
    }
}

// --- ОБЪЕДИНЕННЫЙ ГЛАВНЫЙ ЦИКЛ ---
function update() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const dx = player.targetX - player.x;
    player.x += dx * player.speed;

    updateProjectiles();
    updateEnemies();
    checkCollisions(); // <--- НОВАЯ ЛОГИКА ТУТ

    drawPlayer();

    // Отрисовка счета и жизней
    ctx.fillStyle = '#00f2ff';
    ctx.font = 'bold 16px Share Tech Mono';
    ctx.fillText(`SCORE: ${player.score}`, 20, 30);
    ctx.fillText(`LIVES: ${player.lives}`, 20, 55);

    requestAnimationFrame(update);
}
// ЗАПУСК ИГРЫ (только один раз!)
update();