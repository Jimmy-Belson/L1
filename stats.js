import { createClient } from 'https://jspm.dev/@supabase/supabase-js';

const sbURL = 'https://ebjsxlympwocluxgmwcu.supabase.co';
const sbKey = 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'; 
const supabase = createClient(sbURL, sbKey);

async function loadAllStats() {
    console.log("STAT_TERMINAL: Initiating data link...");
    
    // Запускаем загрузку всех трех таблиц одновременно
    await Promise.all([
        fetchTable('kills_astronauts', 'list-kills'),
        fetchTable('nlo_clicks', 'list-clicks'),
        fetchTable('message_count', 'list-messages')
    ]);
}

async function fetchTable(field, containerId) {
    const container = document.getElementById(containerId);
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(`nickname, avatar_url, ${field}`) // Тянем avatar_url, но будем его проверять
            .order(field, { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = `<div style="opacity:0.3; padding: 20px;">[ NO_RECORDS_IN_DATABASE ]</div>`;
            return;
        }

        container.innerHTML = data.map((user, index) => {
            // ЛОГИКА АВАТАРОК:
            // 1. Приоритет: ссылка из базы (user.avatar_url)
            // 2. Если ссылка слишком короткая (null, placeholder или ""), генерим робота
            let finalAvatar = user.avatar_url;
            
            if (!finalAvatar || finalAvatar.length < 10) {
                // Если авы нет, генерируем робота на базе никнейма (чтобы был уникальный)
                const seed = user.nickname || 'guest';
                finalAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=001a2d`;
            }

            // Классы для ТОП-3
            const topClass = index < 3 ? `top-${index + 1}` : '';

            return `
                <div class="user-item ${topClass}">
                    <div class="user-rank">#${index + 1}</div>
                    <img src="${finalAvatar}" class="user-avatar" onerror="this.src='space.png'">
                    <div class="user-name">${(user.nickname || 'Unknown').split('@')[0]}</div>
                    <div class="user-score">${user[field] || 0}</div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("STAT_ERROR:", err);
        container.innerHTML = <div style="color:red; padding:20px;">LINK_FAILURE</div>;
    }
}

document.addEventListener('DOMContentLoaded', loadAllStats);