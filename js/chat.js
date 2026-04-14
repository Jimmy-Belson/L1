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
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
    const m = payload.new;
    // ДОБАВЛЯЕМ УСЛОВИЕ: только если нет получателя (публичное)
    if (!m.recipient_id && m.user_id !== Core.user?.id) {
        this.render(m, Core);
        Core.SystemNotify(`NEW_SIGNAL: ${m.nickname}`, m.message);
    }
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
    // 1. Вызываем твой CustomConfirm из confirm.js
    // Если функция в глобальной видимости, вызываем так:
    const confirmed = await CustomConfirm(" DO YOU WANT TO REMOVE THIS MESSAGE FROM THE NETWORK?");

    // Если нажали [ ABORT ], выходим из функции
    if (!confirmed) {
        console.log("PURGE_ABORTED");
        return;
    }

    try {
        // 2. Если нажали [ CONFIRM ], отправляем запрос в Supabase
        const { error } = await Core.sb
            .from('comments') // Твоя таблица
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        // Уведомление через твою систему Core
        if (Core.Msg) Core.Msg("SIGNAL_TERMINATED", "success");
        
    } catch (err) {
        console.error("PURGE_ERROR:", err.message);
        if (Core.Msg) Core.Msg("PURGE_FAILED", "error");
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
// В методе render (chat.js)
// В методе render (chat.js)
const delTrigger = d.querySelector('.del-msg-trigger');
if (delTrigger) {
    delTrigger.onclick = (e) => {
        e.stopPropagation(); 
        // Безопасный вызов через имя объекта модуля
        ChatModule.deleteMessage(m.id, Core); 
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
            
            const ufoEl = document.getElementById('pop-ufo');
            if (ufoEl) ufoEl.innerText = p.nlo_clicks || 0; 

            // РАНГ
            const rankEl = document.getElementById('pop-rank');
            const rankCalculator = window.getRankByScore;

            if (rankEl && rankCalculator) { 
                const rank = rankCalculator(p.combat_score || 0);
                rankEl.innerText = rank.name.toUpperCase();
                rankEl.style.color = rank.color;
            } else if (rankEl) {
                rankEl.innerText = "PILOT";
                rankEl.style.color = "#0ff";
            }

            // --- ВНЕДРЕНИЕ КНОПОК СВЯЗИ ---
            // Ищем контейнер для кнопок в поповере (убедись, что в HTML есть div с таким id или классом)
            let actionsCont = pop.querySelector('.pop-actions');
            if (!actionsCont) {
                // Если контейнера нет, создаем его динамически в конце поповера
                actionsCont = document.createElement('div');
                actionsCont.className = 'pop-actions';
                actionsCont.style.cssText = "margin-top:15px; display:flex; gap:10px; padding:10px; border-top:1px solid rgba(0,255,255,0.1);";
                pop.appendChild(actionsCont);
            }

            // Очищаем старые кнопки и добавляем новые, если это не наш профиль
            actionsCont.innerHTML = '';
            const isMe = uid === Core.user?.id;

            if (!isMe) {
                const btnStyle = "flex:1; background:rgba(255,0,85,0.1); border:1px solid var(--neon-pink); color:var(--neon-pink); font-family:'Orbitron'; font-size:9px; padding:8px; cursor:pointer; transition:0.3s;";
                
                const commBtn = document.createElement('button');
                commBtn.innerText = "[ ESTABLISH_COMM ]";
                commBtn.style.cssText = btnStyle;
                commBtn.onclick = () => {
                    if (window.CommModule) {
                        window.CommModule.openPanel(p.id, p.nickname || "PILOT");
                        pop.style.display = 'none'; // Закрываем поповер после открытия панели
                    } else {
                        console.error("CommModule_OFFLINE");
                    }
                };

                actionsCont.appendChild(commBtn);
            }
            // ------------------------------
        }
    } catch (err) {
        console.error("POPOVER_SYNC_ERROR:", err.message);
    }
},
}