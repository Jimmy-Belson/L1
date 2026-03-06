import { createClient } from 'https://jspm.dev/@supabase/supabase-js';

// ПРОВЕРЬ ЭТИ КЛЮЧИ! Они должны быть такими же, как в основном файле
const sbURL = 'https://ebjsxlympwocluxgmwcu.supabase.co';
const sbKey = 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'; 
const supabase = createClient(sbURL, sbKey);

async function loadAllStats() {
    console.log("DB_CONNECT: Fetching stats...");

    // Загружаем данные по очереди
    await fetchTable('profiles', 'kills_astronauts', 'list-kills');
    await fetchTable('profiles', 'nlo_clicks', 'list-clicks');
    await fetchTable('profiles', 'message_count', 'list-messages');
}

async function fetchTable(table, field, containerId) {
    const { data, error } = await supabase
        .from(table)
        .select(`nickname, avatar_url, ${field}`)
        .order(field, { ascending: false })
        .limit(10);

    const container = document.getElementById(containerId);
    
    if (error) {
        console.error(`Ошибка загрузки ${field}:`, error);
        container.innerHTML = `<div style="color:red">CONNECTION_LOST</div>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<div style="opacity:0.5">NO_DATA_FOUND</div>`;
        return;
    }

// Внутри stats.js в функции fetchTable измени метод отрисовки:

container.innerHTML = data.map((user, index) => {
    // Если в базе есть нормальная ссылка - берем её, если нет - генерим робота
    const avatar = (user.avatar_url && user.avatar_url.length > 10) 
        ? user.avatar_url 
        : `https://api.dicebear.com/7.x/bottts/svg?seed=${user.nickname || index}&backgroundColor=001a2d`;

    return `
        <div class="user-item">
            <div class="user-rank">${index + 1}</div>
            <img src="${avatar}" class="user-avatar" onerror="this.src='space.png'">
            <div class="user-name">${(user.nickname || 'PILOT').split('@')[0]}</div>
            <div class="user-score">${user[field] || 0}</div>
        </div>
    `;
}).join('');
}

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', loadAllStats);