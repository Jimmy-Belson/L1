export const ChatModule = {
    channel: null,
    isSubscribed: false, 

    async subscribe(Core) {
        if (this.channel) await Core.sb.removeChannel(this.channel);

        this.channel = Core.sb.channel('global-chat')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'comments' 
            }, payload => {
                const m = payload.new;

                // КРИТИЧЕСКИЙ ФИКС: Игнорируем сообщение, если:
                // 1. Это личное сообщение (есть recipient_id)
                // 2. Это наше собственное сообщение (оно рендерится локально при отправке)
                if (m.recipient_id) return; 
                if (m.user_id === Core.user?.id) return;

                this.render(m, Core);
                if (Core.SystemNotify) {
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
            .is('recipient_id', null) // Загружаем только публичные
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
                user_id: Core.user.id,
                recipient_id: null // Явно указываем, что это публичное
            }]).select();

            if (data && data[0]) {
                this.render(data[0], Core);
                if (Core.UpdateStat) Core.UpdateStat('message_count', 1);
            }
        } catch (err) {
            if (Core.Msg) Core.Msg("SIGNAL_LOST", "error");
            i.value = val;
        }
    },

    // ... методы deleteMessage и render остаются без изменений ...

    async openPop(uid, Core, event) {
        if (event) event.stopPropagation();

        const pop = document.getElementById('user-popover');
        if (!pop) return;

        // Показываем поповер, удаляя класс скрытия
        pop.classList.remove('popover-hidden');
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
                document.getElementById('pop-kills').innerText = p.combat_score || 0;
                document.getElementById('pop-msgs').innerText = p.message_count || 0;
                
                const ufoEl = document.getElementById('pop-ufo');
                if (ufoEl) ufoEl.innerText = p.nlo_clicks || 0; 

                const rankEl = document.getElementById('pop-rank');
                const rankCalculator = window.getRankByScore;

                if (rankEl && rankCalculator) { 
                    const rank = rankCalculator(p.combat_score || 0);
                    rankEl.innerText = rank.name.toUpperCase();
                    rankEl.style.color = rank.color;
                }

                let actionsCont = pop.querySelector('.pop-actions');
                if (!actionsCont) {
                    actionsCont = document.createElement('div');
                    actionsCont.className = 'pop-actions';
                    actionsCont.style.cssText = "margin-top:15px; display:flex; gap:10px; padding:10px; border-top:1px solid rgba(0,255,255,0.1);";
                    pop.appendChild(actionsCont);
                }

                actionsCont.innerHTML = '';
                const isMe = uid === Core.user?.id;

                if (!isMe) {
                    const btnStyle = "flex:1; background:rgba(255,0,85,0.1); border:1px solid var(--neon-pink); color:var(--neon-pink); font-family:'Orbitron'; font-size:9px; padding:8px; cursor:pointer; transition:0.3s; text-transform:uppercase;";
                    
                    const commBtn = document.createElement('button');
                    commBtn.innerText = "[ Establish Comm ]";
                    commBtn.style.cssText = btnStyle;
                    commBtn.onmouseover = () => {
                        commBtn.style.background = "var(--neon-pink)";
                        commBtn.style.color = "#000";
                    };
                    commBtn.onmouseout = () => {
                        commBtn.style.background = "rgba(255,0,85,0.1)";
                        commBtn.style.color = "var(--neon-pink)";
                    };

                    commBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.CommModule) {
                            window.CommModule.openPanel(p.id, p.nickname || "PILOT");
                            pop.classList.add('popover-hidden');
                            pop.style.display = 'none';
                        }
                    };
                    actionsCont.appendChild(commBtn);
                }
            }
        } catch (err) {
            console.error("POPOVER_SYNC_ERROR:", err.message);
        }
    },
    
    // Не забываем добавить вспомогательные методы, если они используются внутри render
    render(m, Core) {
        // Твой существующий код метода render...
        // (Я его не менял, чтобы не сломать твою верстку)
    }
}