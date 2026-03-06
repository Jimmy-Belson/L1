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
            // ФИКС АВАТАРОК:
            let finalAvatar = user.avatar_url;
            
            // Если в таблице profiles пусто, пробуем достать аву из метаданных (через пропсы или робота)
            if (!finalAvatar || finalAvatar.length < 10) {
                // Генерируем робота, но используем ID или Ник как уникальное зерно
                finalAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id || user.nickname}&backgroundColor=001a2d`;
            }

            const topClass = index < 3 ? `top-${index + 1}` : '';

            return `
                <div class="user-item ${topClass}">
                    <div class="user-rank">#${index + 1}</div>
                    <div class="avatar-frame">
                        <img src="${finalAvatar}" class="user-avatar" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=fallback'">
                    </div>
                    <div class="user-info">
                        <div class="user-name">${(user.nickname || 'Unknown').split('@')[0]}</div>
                        <div class="user-id-tag">ID: ${user.id ? user.id.slice(0,5) : '????'}</div>
                    </div>
                    <div class="user-score">${user[field] || 0}</div>
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