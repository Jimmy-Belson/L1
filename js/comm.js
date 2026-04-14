export const CommModule = {
    activeTarget: null,

    // 1. Открыть панель
    async openPanel(uid, nickname) {
        this.activeTarget = uid;
        const panel = document.getElementById('private-panel');
        if (!panel) return;

        const titleEl = document.getElementById('private-target-name');
        if (titleEl) titleEl.innerText = `SECURE_LINE: ${nickname.toUpperCase()}`;
        
        panel.classList.remove('private-panel-hidden');
        await this.loadPrivateHistory(uid);
    },

    // 2. Закрыть панель
    closePanel() {
        const panel = document.getElementById('private-panel');
        if (panel) panel.classList.add('private-panel-hidden');
        this.activeTarget = null;
        
        const container = document.getElementById('private-messages');
        if (container) container.innerHTML = '';
    },

    // 3. Загрузка истории
    async loadPrivateHistory(uid) {
        const container = document.getElementById('private-messages');
        if (!container) return;

        container.innerHTML = '<div style="opacity:0.5; font-size:10px; padding:10px;">>> DECRYPTING_ARCHIVES...</div>';

        const myId = window.Core.user?.id;
        if (!myId) return;

        try {
            const { data, error } = await window.Core.sb
                .from('comments')
                .select('*')
                .or(`and(user_id.eq.${myId},recipient_id.eq.${uid}),and(user_id.eq.${uid},recipient_id.eq.${myId})`)
                .order('created_at', { ascending: true });

            if (error) throw error;

            container.innerHTML = '';
            if (data && data.length > 0) {
                data.forEach(m => this.renderPrivateMsg(m));
                container.scrollTop = container.scrollHeight;
            } else {
                container.innerHTML = '<div style="opacity:0.3; font-size:10px; padding:10px; text-align:center;">--- NO_DATA_FOUND ---</div>';
            }
        } catch (err) {
            console.error("HISTORY_LOAD_ERROR:", err.message);
            container.innerHTML = '<div style="color:red; font-size:10px;">>> LINK_ERROR_RCV</div>';
        }
    },

    // 4. Отправка сообщения
    async sendPrivate() {
        const input = document.getElementById('private-in');
        if (!input) return;

        const val = input.value.trim();
        const myProfile = window.Core.userProfile;
        
        if (!val || !this.activeTarget || !window.Core.user) return;

        try {
            const { data, error } = await window.Core.sb.from('comments').insert([{
                message: val,
                nickname: myProfile?.nickname || "PILOT",
                user_id: window.Core.user.id,
                recipient_id: this.activeTarget 
            }]).select();

            if (error) throw error;

            input.value = '';
            if (data && data[0]) this.renderPrivateMsg(data[0]);
            
        } catch (err) {
            console.error("PRIVATE_SEND_ERROR:", err.message);
            if (window.Core.Msg) window.Core.Msg("SIGNAL_FAILED", "error");
        }
    },

    // 5. Отрисовка
    renderPrivateMsg(m) {
        const container = document.getElementById('private-messages');
        if (!container) return;

        const isMy = m.user_id === window.Core.user?.id;
        const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const msgEl = document.createElement('div');
        msgEl.style.cssText = `
            margin-bottom: 12px;
            padding: 8px;
            background: ${isMy ? 'rgba(255,0,85,0.05)' : 'rgba(0,255,255,0.05)'};
            border-left: 2px solid ${isMy ? 'var(--neon-pink)' : '#0ff'};
        `;

        msgEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:9px; margin-bottom:4px; opacity:0.7; font-family:'Orbitron';">
                <span style="color:${isMy ? 'var(--neon-pink)' : '#0ff'}">${isMy ? 'LOG_OUT' : 'LOG_IN'}</span>
                <span>${time}</span>
            </div>
            <div style="color:#fff; font-family:'Share Tech Mono'; font-size:13px; line-height:1.4; word-break:break-all;">
                ${m.message}
            </div>
        `;

        container.appendChild(msgEl);
        container.scrollTop = container.scrollHeight;
    }
};

// Чтобы onclick в HTML продолжал работать с модулем
window.CommModule = CommModule;