export const ChatModule = {
    channel: null,
    isSubscribed: false, 

    async subscribe(Core) {
        if (this.channel) await Core.sb.removeChannel(this.channel);

        this.channel = Core.sb.channel('global-chat')
            // 1. СЛУШАТЕЛЬ ЧАТА (твой старый код)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'comments' 
            }, payload => {
                const m = payload.new;
                if (m.recipient_id || m.user_id === Core.user?.id) return; 
                this.render(m, Core);
                if (Core.SystemNotify) {
                    Core.SystemNotify(`NEW_SIGNAL: ${m.nickname}`, m.message);
                }
            })
            // 2. НОВЫЙ СЛУШАТЕЛЬ ЗВОНКОВ (добавляем сюда)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'calls',
                filter: `receiver_id=eq.${Core.user?.id}`
            }, payload => {
                const callData = payload.new;
                // Если звонок в статусе ожидания, вызываем наше неоновое окно
                if (callData.status === 'pending' && window.VoiceModule) {
                    window.VoiceModule.showIncomingCall(callData);
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
            .is('recipient_id', null) 
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
                recipient_id: null 
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

    async deleteMessage(id, Core) {
        if (!window.CustomConfirm) return;
        const confirmed = await window.CustomConfirm("REMOVE THIS SIGNAL FROM THE NETWORK?");
        if (!confirmed) return;

        try {
            const { error } = await Core.sb.from('comments').delete().eq('id', id);
            if (error) throw error;
            const el = document.getElementById(`msg-${id}`);
            if (el) el.remove();
            if (Core.Msg) Core.Msg("SIGNAL_TERMINATED", "success");
        } catch (err) {
            if (Core.Msg) Core.Msg("PURGE_FAILED", "error");
        }
    },

    render(m, Core) {
        const s = document.getElementById('chat-stream'); 
        if (!s || document.getElementById(`msg-${m.id}`)) return;

        const isMy = m.user_id === Core.user?.id;
        const avatar = Core.getAvatar ? Core.getAvatar(m.user_id, m.avatar_url) : m.avatar_url;
        const time = new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        const deleteBtnHtml = isMy 
            ? `<span class="del-msg-trigger" style="margin-left:10px; cursor:pointer; color:var(--neon-pink); opacity:0.5;">×</span>` 
            : '';

        const d = document.createElement('div'); 
        d.id = `msg-${m.id}`;
        d.className = `msg-container ${isMy ? 'my-msg' : ''}`;
        
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

        d.querySelector('.avatar-wrapper').onclick = (e) => this.openPop(m.user_id, Core, e);
        d.querySelector('.msg-nick').onclick = (e) => this.openPop(m.user_id, Core, e);

        const delTrigger = d.querySelector('.del-msg-trigger');
        if (delTrigger) {
            delTrigger.onclick = (e) => {
                e.stopPropagation(); 
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

        pop.classList.remove('popover-hidden');
        pop.style.display = 'block';

        try {
            const { data: p, error } = await Core.sb.from('profiles').select('*').eq('id', uid).maybeSingle();
            if (p) {
                document.getElementById('pop-nick').innerText = (p.nickname || "PILOT").toUpperCase();
                document.getElementById('pop-avatar').src = Core.getAvatar(p.id, p.avatar_url);
                document.getElementById('pop-kills').innerText = p.combat_score || 0;
                document.getElementById('pop-msgs').innerText = p.message_count || 0;
                document.getElementById('pop-ufo').innerText = p.nlo_clicks || 0;
                
                let actionsCont = pop.querySelector('.pop-actions');
                if (!actionsCont) {
                    actionsCont = document.createElement('div');
                    actionsCont.className = 'pop-actions';
                    actionsCont.style.cssText = "margin-top:15px; display:flex; gap:10px; padding:10px; border-top:1px solid rgba(0,255,255,0.1);";
                    pop.appendChild(actionsCont);
                }

                actionsCont.innerHTML = '';
                if (uid !== Core.user?.id) {
                    const btn = document.createElement('button');
                    btn.innerText = "[ ESTABLISH_COMM ]";
                    btn.style.cssText = "flex:1; background:rgba(255,0,85,0.1); border:1px solid var(--neon-pink); color:var(--neon-pink); font-family:'Orbitron'; font-size:9px; padding:8px; cursor:pointer;";
                    btn.onclick = () => {
                        if (window.CommModule) {
                            window.CommModule.openPanel(p.id, p.nickname || "PILOT");
                            pop.classList.add('popover-hidden');
                        }
                    };
                    actionsCont.appendChild(btn);


 // НОВАЯ КНОПКА: Добавить в друзья
    const btnAdd = document.createElement('button');
    btnAdd.innerText = "[ ADD_TO_CONTACTS ]";
    btnAdd.style.cssText = "flex:1; background:rgba(0,255,255,0.1); border:1px solid #0ff; color:#0ff; font-family:'Orbitron'; font-size:9px; padding:8px; cursor:pointer;";
    btnAdd.onclick = async () => {
        const { error } = await Core.sb.from('friends').insert([
            { user_id: Core.user.id, friend_id: uid }
        ]);
        if (error) Core.Msg("ALREADY_IN_LIST", "info");
        else {
            Core.Msg("CONTACT_SYNCED", "success");
            window.FriendsModule.loadFriends(); // Сразу обновляем список
        }
    };
    actionsCont.appendChild(btnAdd);
}
            }
        } catch (err) { console.error(err); }
    }
};