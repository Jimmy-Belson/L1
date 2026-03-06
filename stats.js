// Используем esm.sh — он стабильнее jspm для Supabase
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sbURL = 'https://ebjsxlympwocluxgmwcu.supabase.co';
const sbKey = 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'; 
const supabase = createClient(sbURL, sbKey);

async function loadAllStats() {
    console.log("STAT_TERMINAL: Initiating data link...");
    
    // Загружаем данные. Если таблица profiles пустая, 
    // убедись, что ты зашел в чат под своим логином хотя бы раз.
    await Promise.all([
        fetchTable('kills_astronauts', 'list-kills'),
        fetchTable('nlo_clicks', 'list-clicks'),
        fetchTable('message_count', 'list-messages')
    ]);
}

async function fetchTable(field, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(`id, nickname, avatar_url, ${field}`) 
            .order(field, { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<div style="opacity:0.3; padding: 20px;">[ NO_RECORDS_FOUND ]</div>`;
            return;
        }

container.innerHTML = data.map((user, index) => {
    // 1. Пытаемся взять из базы
    let imgUrl = user.avatar_url;

    // 2. Если в базе пусто или там робот, но мы хотим проверить, 
    // не появилось ли что-то новое, добавляем проверку
    if (!imgUrl || imgUrl.length < 20) {
        imgUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}&backgroundColor=001a2d`;
    }

    return `
        <div class="user-item">
            <div class="user-rank">#${index + 1}</div>
            <div class="avatar-frame">
                <img src="${imgUrl}" 
                     class="user-avatar" 
                     referrerpolicy="no-referrer" 
                     onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=error'">
            </div>
            <div class="user-info">
                <div class="user-name">${(user.nickname || 'Unknown').split('@')[0]}</div>
                <div class="user-score">${user[field] || 0}</div>
            </div>
        </div>
    `;
}).join('');

    } catch (err) {
        console.error("STAT_ERROR:", err);
        // ИСПРАВЛЕНО: Добавлены кавычки вокруг HTML
        container.innerHTML = `<div style="color:#ff0055; padding:20px; font-size:10px;">> ERROR: LINK_FAILURE<br>> REASON: ${err.message}</div>`;
    }
}

document.addEventListener('DOMContentLoaded', loadAllStats);