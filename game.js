// game.js
import { getRankByScore } from './ranks.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Адаптируем размер под контейнер в battle.html
canvas.width = 600;
canvas.height = 800;

// Добавь это в начало game.js после определения canvas
function resizeCanvas() {
    // Сохраняем пропорции 3:4, но подгоняем под высоту экрана
    const padding = 40;
    const availableHeight = window.innerHeight - padding;
    canvas.height = availableHeight;
    canvas.width = availableHeight * 0.75; 
}

// Вызови один раз или оставь свои фиксированные 600x800
// resizeCanvas();

window.Core = Core;

window.gameActive = false; 

const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 40,
    height: 45,
    targetX: canvas.width / 2,
    speed: 0.15,
    tilt: 0,
    lives: 3,
    score: 0
};

const projectiles = [];
const enemies = [];
let spawnTimer = 0;

// --- НОВАЯ ФУНКЦИЯ: Загрузка Лидерборда ---
async function updateTacticalLog() {
    const listEl = document.getElementById('highscores-list');
    if (!listEl || !window.Core) return;

    const { data: pilots, error } = await window.Core.sb
        .from('profiles')
        .select('nickname, kills_astronauts')
        .order('kills_astronauts', { ascending: false })
        .limit(10);

    if (!error && pilots) {
        listEl.innerHTML = '';
        pilots.forEach((p, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${i + 1}. ${p.nickname || 'PILOT'}</span> <span>${p.kills_astronauts || 0}</span>`;
            listEl.appendChild(li);
        });
    }
}

// Управление
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.targetX = e.clientX - rect.left;
});

window.addEventListener('mousedown', (e) => {
    // Стреляем только если игра активна и клик по левой кнопке
    if (e.button === 0 && window.gameActive) { 
        shoot();
    }
});

function shoot() {
    const offset = 20; 
    projectiles.push({ x: player.x - offset, y: player.y, speed: 10 });
    projectiles.push({ x: player.x + offset, y: player.y, speed: 10 });
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    player.tilt = (player.targetX - player.x) * 0.1;
    ctx.rotate(player.tilt * Math.PI / 180);

    const engineFluff = Math.random() * 10 + 15;
    ctx.beginPath();
    ctx.moveTo(-5, 20);
    ctx.lineTo(0, 20 + engineFluff);
    ctx.lineTo(5, 20);
    ctx.fillStyle = Math.random() > 0.5 ? '#00f2ff' : '#ff00e5';
    ctx.fill();

    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-15, 5); ctx.lineTo(-25, 15); ctx.lineTo(-15, 20);
    ctx.moveTo(15, 5); ctx.lineTo(25, 15); ctx.lineTo(15, 20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -25); ctx.lineTo(-15, 20); ctx.lineTo(0, 10); ctx.lineTo(15, 20);
    ctx.closePath();
    ctx.fillStyle = '#0a0a0f'; 
    ctx.fill();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f2ff';
    ctx.strokeStyle = '#00f2ff';
    ctx.stroke();
    ctx.restore();
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.y -= p.speed;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y - 15);
        ctx.strokeStyle = '#ff00e5';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        if (p.y < 0) projectiles.splice(i, 1);
    }
}

function updateEnemies() {
    if (!window.gameActive) return;

    spawnTimer++;
    if (spawnTimer > 60) {
        const size = 30;
        enemies.push({
            x: Math.random() * (canvas.width - size) + size / 2,
            y: -size,
            width: size,
            height: 20,
            speed: 2 + Math.random() * 2
        });
        spawnTimer = 0;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.y += e.speed;
        ctx.strokeStyle = '#ff3333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, e.width / 2, e.height / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(e.x, e.y - 5, 7, 0, Math.PI * 2);
        ctx.stroke();
        if (e.y > canvas.height + 50) enemies.splice(i, 1);
    }
}

async function checkCollisions() {
    if (!window.gameActive) return;

    // Пуля -> Враг
    for (let i = projectiles.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            const p = projectiles[i];
            const e = enemies[j];
            if (!p || !e) continue;
            const dist = Math.hypot(p.x - e.x, p.y - e.y);
            if (dist < 25) {
                projectiles.splice(i, 1);
                enemies.splice(j, 1);
                player.score += 10;
                break; 
            }
        }
    }

    // Враг -> Игрок
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const distToPlayer = Math.hypot(e.x - player.x, e.y - player.y);
        if (distToPlayer < 35) {
            enemies.splice(i, 1);
            player.lives -= 1;
            
            // --- ЛОГИКА СМЕРТИ ---
            if (player.lives <= 0) {
                window.gameActive = false;
                const earnedKills = Math.floor(player.score / 10);

                // Сохраняем результат в Supabase
                if (window.Core && earnedKills > 0) {
                    await window.Core.UpdateStat('kills_astronauts', earnedKills);
                }

                alert(`CRITICAL DAMAGE. MISSION FAILED.\nSCORE: ${player.score}\nKILLS ADDED: ${earnedKills}`);
                
                // Перенаправляем на главную
                window.location.href = 'index.html';
            }
        }
    }
}

// УДАЛЕНО: window.addEventListener('scroll') больше не нужен!

function update() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (window.gameActive) {
        const dx = player.targetX - player.x;
        player.x += dx * player.speed;
        updateProjectiles();
        updateEnemies();
        checkCollisions();
    }

    drawPlayer();

    // ИНТЕРФЕЙС
  
    const currentRank = getRankByScore(player.score);
 
    ctx.fillStyle = '#00f2ff';
    ctx.font = 'bold 16px Share Tech Mono';
    ctx.fillText(`SCORE: ${player.score}`, 20, 30);
    ctx.fillText(`LIVES: ${player.lives}`, 20, 55);
    

    ctx.fillStyle = currentRank.color || '#ff00e5';
    ctx.font = 'bold 18px Orbitron';
    ctx.fillText(`RANK: ${currentRank.name}`, 20, 85);

    requestAnimationFrame(update);
}

// Запуск
update();
updateTacticalLog(); // Грузим ТОП при старте