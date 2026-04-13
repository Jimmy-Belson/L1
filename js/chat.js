export const ChatModule = {
    channel: null,
    isSubscribed: false, 

    async subscribe(Core) {
        if (this.channel) await Core.sb.removeChannel(this.channel);

        this.channel = Core.sb.channel('global-chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
                const m = payload.new;
                if (m.user_id !== Core.user?.id) {
                    this.render(m, Core);
                    Core.SystemNotify(`NEW_SIGNAL: ${m.nickname}`, m.message);
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, payload => {
                const el = document.getElementById(`msg-${payload.old.id}`);
                if (el) el.remove();
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') this.isSubscribed = true;
                if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    this.isSubscribed = false;
                    setTimeout(() => this.subscribe(Core), 3000);
                }
            });
    },

    async load(Core) { 
        const s = document.getElementById('chat-stream');
        if (!s) return;
        s.innerHTML = '<div style="opacity:0.5; padding:10px;">>> RECOVERING_ARCHIVES...</div>';

        const { data, error } = await Core.sb
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); 
        
        if (data) { 
            s.innerHTML = ''; 
            data.reverse().forEach(m => this.render(m, Core)); 
            s.scrollTop = s.scrollHeight;
        } 
    },

    async send(Core) { 
        const i = document.getElementById('chat-in'); 
        if (!i || !i.value.trim() || !Core.user) return; 

        const val = i.value;
        i.value = ''; 

        let avatarName = Core.userProfile?.avatar_url || null;
        if (avatarName && avatarName.includes('/avatars/')) {
            avatarName = avatarName.split('/avatars/').pop();
        }

        const nickname = Core.userProfile?.nickname || Core.user.email.split('@')[0];

        try {
            const { data, error } = await Core.sb.from('comments').insert([{
                message: val, 
                nickname: nickname, 
                avatar_url: avatarName,
                user_id: Core.user.id
            }]).select();

            if (data && data[0]) {
                this.render(data[0], Core);
                Core.UpdateStat('message_count', 1);
            }
        } catch (err) {
            Core.Msg("SIGNAL_LOST", "error");
            i.value = val;
        }
    },

    async deleteMessage(id, Core) {
    // Используем confirm (или твой Core.Confirm, если он есть в confirm.js)
    if (!confirm("DATA_PURGE: Удалить сообщение из архива?")) return;

    try {
        const { error } = await Core.sb
            .from('comments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        // Нам не нужно удалять элемент вручную здесь, 
        // так как .on('postgres_changes', { event: 'DELETE' ... }) в subscribe сделает это за нас!
        console.log("SIGNAL_TERMINATED:", id);
    } catch (err) {
        console.error("PURGE_ERROR:", err.message);
        Core.Msg("PURGE_FAILED", "error");
    }
},

render(m, Core) {
    const s = document.getElementById('chat-stream'); 
    if (!s || document.getElementById(`msg-${m.id}`)) return;

    const isMy = m.user_id === Core.user?.id;
    const avatar = Core.getAvatar(m.user_id, m.avatar_url);
    const time = new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

   // 1. Сначала подготавливаем HTML кнопки удаления, если сообщение наше
const deleteBtnHtml = isMy 
    ? `<span class="del-msg-trigger" style="margin-left:10px; cursor:pointer; color:var(--neon-pink); opacity:0.5;">×</span>` 
    : '';
    const d = document.createElement('div'); 
    d.id = `msg-${m.id}`;
    d.className = `msg-container ${isMy ? 'my-msg' : ''}`;
    
    // 2. Теперь вставляем переменную deleteBtnHtml в общую строку
    d.innerHTML = `
        <div class="chat-row-layout">
            <div class="avatar-wrapper" style="cursor:pointer"><img src="${avatar}" class="chat-row-avatar"></div>
            <div class="chat-content-block">
                <div class="msg-header">
                    <span class="msg-nick" style="cursor:pointer; color:${isMy ? 'var(--n)' : '#0ff'}">${(m.nickname || "PILOT").toUpperCase()}</span>
                    <span class="msg-time">${time}</span>
                    ${deleteBtnHtml}
                </div>
                <div class="msg-text">${m.message}</div>
            </div>
        </div>`;

    // 3. Привязываем события (профиль)
    d.querySelector('.avatar-wrapper').onclick = (e) => this.openPop(m.user_id, Core, e);
    d.querySelector('.msg-nick').onclick = (e) => this.openPop(m.user_id, Core, e);

    // 4. Привязываем удаление
    const delTrigger = d.querySelector('.del-msg-trigger');
    if (delTrigger) {
        delTrigger.onclick = (e) => {
            e.stopPropagation(); // Чтобы не открывался профиль при клике на крестик
            this.deleteMessage(m.id, Core);
        };
    }

    s.appendChild(d);
    s.scrollTop = s.scrollHeight;
},

async openPop(uid, Core, event) {
        if (event) event.stopPropagation();

        const pop = document.getElementById('user-popover');
        if (!pop) return;

        pop.style.display = 'block';

        try {
            const { data: p, error } = await Core.sb.from('profiles')
                .select('*')
                .eq('id', uid)
                .maybeSingle();
            
            if (error) throw error;

            if (p) {
                document.getElementById('pop-nick').innerText = (p.nickname || "PILOT").toUpperCase();
                document.getElementById('pop-avatar').src = Core.getAvatar(p.id, p.avatar_url);
                
                // СТАТИСТИКА
                document.getElementById('pop-kills').innerText = p.combat_score || 0;
                document.getElementById('pop-msgs').innerText = p.message_count || 0;
                
                // ИСПРАВЛЕНО: берем данные из колонки nlo_clicks
                const ufoEl = document.getElementById('pop-ufo');
                if (ufoEl) {
                    ufoEl.innerText = p.nlo_clicks || 0; 
                }

            // РАНГ
// РАНГ
            const rankEl = document.getElementById('pop-rank');
            
            // Пробуем найти функцию в глобальном окне (window), так как ranks.js подключен в index.html
            const rankCalculator = window.getRankByScore;

            if (rankEl && rankCalculator) { 
                const rank = rankCalculator(p.combat_score || 0);
                rankEl.innerText = rank.name.toUpperCase();
                rankEl.style.color = rank.color;
            } else {
                // Если функция не найдена, ставим дефолт
                if (rankEl) {
                    rankEl.innerText = "PILOT";
                    rankEl.style.color = "#0ff";
                }
                console.warn("RANK_SYSTEM_OFFLINE: getRankByScore not found in window");
            }
            }
        } catch (err) {
            console.error("POPOVER_SYNC_ERROR:", err.message);
        }
    },
};