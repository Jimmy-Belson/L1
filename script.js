import { getRankByScore } from './ranks.js';

const Core = {
    // 1. Инициализация клиента (добавлена проверка window)
    sb: (typeof window !== 'undefined' && window.supabase) ? window.supabase.createClient(
        'https://ebjsxlympwocluxgmwcu.supabase.co', 
        'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
    ) : null,
    
    user: null,
    userProfile: null,

    // Утилиты
    toggleChat: () => document.getElementById('main-chat-window')?.classList.toggle('minimized'),
    
    getAvatar: (id, url) => (url?.length > 15 && !url.includes('dicebear')) ? url : `https://api.dicebear.com/7.x/bottts/svg?seed=${id}&backgroundColor=001a2d`,

    Msg(text, type = 'info') {
        const c = document.getElementById('notify-container');
        if (!c) return;
        const t = document.createElement('div');
        t.className = `toast ${type === 'error' ? 'error' : ''}`;
        t.innerHTML = `<span style="opacity:0.5">>></span> ${text}`;
        c.prepend(t);
        setTimeout(() => {
            t.classList.add('hide');
            setTimeout(() => t.remove(), 500);
        }, 4000);
    },

    async CustomConfirm(text) {
        let o = document.getElementById('custom-confirm');
        if (!o) {
            o = document.createElement('div');
            o.id = 'custom-confirm';
            o.className = 'confirm-overlay';
            o.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,5,10,0.85); z-index:99999; align-items:center; justify-content:center; backdrop-filter:blur(4px);";
            o.innerHTML = `<div class="confirm-box" style="background: rgba(0, 10, 20, 0.95); border: 1px solid #0ff; padding: 20px; width: 320px; text-align: center; border-radius: 2px;">
                <div style="color: #0ff; font-size: 11px; margin-bottom: 20px; letter-spacing: 2px; font-family: 'Orbitron'; border-bottom: 1px solid rgba(0,255,255,0.2); padding-bottom: 10px;">SYSTEM_CONFIRMATION</div>
                <div class="confirm-body" style="color: #fff; margin-bottom: 25px; font-family: 'Share Tech Mono'; font-size: 14px;"></div>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="confirm-yes" style="background: rgba(0,255,255,0.1); border: 1px solid #0ff; color: #0ff; padding: 8px 20px; cursor: pointer; font-size: 10px;">[ CONFIRM ]</button>
                    <button id="confirm-no" style="background: rgba(255,0,0,0.1); border: 1px solid #f00; color: #f00; padding: 8px 20px; cursor: pointer; font-size: 10px;">[ ABORT ]</button>
                </div></div>`;
            document.body.appendChild(o);
        }
        o.querySelector('.confirm-body').innerText = text;
        o.style.display = 'flex';
        return new Promise(res => {
            document.getElementById('confirm-yes').onclick = () => { o.style.display = 'none'; res(true); };
            document.getElementById('confirm-no').onclick = () => { o.style.display = 'none'; res(false); };
        });
    },

    SystemNotify: (t, b) => ("Notification" in window && Notification.permission === "granted") && new Notification(t, {body: b, icon: 'space.png'}),

    async init() {
        if (this.Canvas) this.Canvas.init();
        this.loop();
        this.UI();
        this.startClock();
        if (this.Audio) this.Audio.setup();

        const { data: { session } } = await this.sb.auth.getSession();
        if (!session) {
            if (!window.location.pathname.includes('station.html')) window.location.replace('station.html');
            return;
        }

        this.user = session.user;
        window.location.pathname.includes('station.html') ? window.location.replace('index.html') : this.loadAppData();
        this.sb.auth.onAuthStateChange(ev => ev === 'SIGNED_OUT' && window.location.replace('station.html'));
    },

    async loadAppData() {
        try {
            await Promise.all([this.SyncProfile(this.user), this.Todo.load(), this.Chat.load()]);
            if (this.Chat.subscribe) this.Chat.subscribe();
        } catch(e) { console.warn("LOAD_ERR", e); }
    },

    startClock() {
        const el = document.getElementById('clock');
        const up = () => { if(el) el.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false }); };
        up(); setInterval(up, 1000);
    },

    async SyncProfile(u) {
        if (!u) return;
        const { data } = await this.sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
        if (data) {
            this.userProfile = data;
            const nickEl = document.getElementById('nick-display'), avaEl = document.getElementById('avatar-display');
            if (nickEl) {
                const r = getRankByScore(data.combat_score || 0);
                nickEl.innerText = data.nickname || u.email.split('@')[0];
                nickEl.style.color = r.color;
                nickEl.style.textShadow = `0 0 8px ${r.color}`;
            }
            if (avaEl && data.avatar_url) avaEl.src = data.avatar_url;
        }
    },

    async UpdateProfile() {
        const b = document.getElementById('save-btn'), n = document.getElementById('nick-input'), p = document.getElementById('avatar-img');
        if (!n || !b) return;
        b.innerText = ">> SYNCING..."; b.disabled = true;
        const { error } = await this.sb.from('profiles').upsert({ id: this.user.id, nickname: n.value.trim(), avatar_url: p?.src });
        if (!error) { this.Msg("SYSTEM: DATA_SYNCED"); setTimeout(() => { window.location.href = 'index.html'; }, 1000); }
        else { this.Msg("ERR: " + error.message, "error"); b.innerText = "[ SYNC_WITH_STATION ]"; b.disabled = false; }
    },

    async Auth() {
        const e = document.getElementById('email')?.value, p = document.getElementById('pass')?.value;
        const { error } = await this.sb.auth.signInWithPassword({ email: e, password: p });
        error ? this.Msg("DENIED: " + error.message, "error") : (this.Msg("GRANTED"), setTimeout(() => { window.location.href='index.html'; }, 1000));
    },

    async Register() {
        const e = document.getElementById('email')?.value, p = document.getElementById('pass')?.value;
        const { error } = await this.sb.auth.signUp({ email: e, password: p });
        error ? this.Msg("REG_ERR: " + error.message, "error") : (this.Msg("REGISTERED"), setTimeout(() => { window.location.href='index.html'; }, 1500));
    },

    async Logout() { await this.sb.auth.signOut(); window.location.href = 'station.html'; },

    async UpdateStat(f, v = 1) {
        if (!this.user) return;
        const { data } = await this.sb.from('profiles').select(f).eq('id', this.user.id).single();
        if (data) await this.sb.from('profiles').update({ [f]: (data[f] || 0) + v }).eq('id', this.user.id);
    },

    Todo: {
        items: [],
        async load() {
            const { data } = await Core.sb.from('todo').select('*').eq('user_id', Core.user.id).order('id', { ascending: false });
            const l = document.getElementById('todo-list'); if (!l || !data) return;
            l.innerHTML = ''; this.items = data;
            const f = document.createDocumentFragment();
            data.forEach(t => f.appendChild(this.createTaskNode(t)));
            l.appendChild(f);
        },
        createTaskNode(t) {
            const d = document.createElement('div');
            d.className = `task ${t.is_completed ? 'completed' : ''}`; d.id = `task-${t.id}`; d.draggable = true;
            d.innerHTML = `<div class="task-drag-handle">::</div><div class="task-content"><span class="task-text">> ${t.task.toUpperCase()}</span>${t.deadline ? `<span class="deadline-tag">[UNTIL: ${new Date(t.deadline).toLocaleDateString()}]</span>` : ''}</div><div class="task-status-icon"></div>`;
            d.onclick = async (e) => {
                if (e.target.className === 'task-drag-handle') return;
                const ns = d.classList.toggle('completed');
                await Core.sb.from('todo').update({ is_completed: ns }).eq('id', t.id);
            };
            d.oncontextmenu = async (e) => {
                e.preventDefault();
                if (await Core.CustomConfirm("ERASE_OBJECTIVE?")) {
                    d.classList.add('removing-task');
                    setTimeout(async () => { await Core.sb.from('todo').delete().eq('id', t.id); d.remove(); Core.Msg("TERMINATED"); }, 400);
                }
            };
            return d;
        },
        async add(val, date) {
            const { data } = await Core.sb.from('todo').insert([{ task: val, is_completed: false, user_id: Core.user.id, deadline: date || null }]).select();
            if (data?.[0]) { await this.load(); Core.Msg("MISSION_ESTABLISHED"); }
        }
    },

    Chat: {
        channel: null,
        async subscribe() {
            if (this.channel) Core.sb.removeChannel(this.channel);
            this.channel = Core.sb.channel('global-chat')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, p => p.new.user_id !== Core.user?.id && this.render(p.new))
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, p => document.getElementById(`msg-${p.old.id}`)?.remove())
                .subscribe();
        },
        async load() {
            const s = document.getElementById('chat-stream'); if (!s) return;
            const { data } = await Core.sb.from('comments').select('*').order('created_at', { ascending: false }).limit(50);
            if (data) { s.innerHTML = ''; data.reverse().forEach(m => this.render(m)); s.scrollTop = s.scrollHeight; }
        },
        async send() {
            const i = document.getElementById('chat-in'), nick = Core.userProfile?.nickname || Core.user.email.split('@')[0];
            if (!i?.value.trim()) return;
            const val = i.value; i.value = '';
            const { data } = await Core.sb.from('comments').insert([{ message: val, nickname: nick, avatar_url: Core.getAvatar(Core.user.id, Core.userProfile?.avatar_url), user_id: Core.user.id }]).select();
            if (data?.[0]) { this.render(data[0]); Core.UpdateStat('message_count', 1); }
        },
        render(m) {
            const s = document.getElementById('chat-stream');
            if (!s || document.getElementById(`msg-${m.id}`)) return;
            const isMy = m.user_id === Core.user?.id, ava = Core.getAvatar(m.user_id, m.avatar_url);
            const d = document.createElement('div'); d.id = `msg-${m.id}`; d.className = `msg-container ${isMy ? 'my-msg' : ''}`;
            d.innerHTML = `<div class="chat-row-layout"><div class="avatar-wrapper"><img src="${ava}" class="chat-row-avatar"></div><div class="chat-content-block"><div class="msg-header"><span class="msg-nick" style="color:${isMy ? 'var(--n)' : '#0ff'}">${(m.nickname || 'PILOT').toUpperCase()}</span><span class="msg-time">${new Date(m.created_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'})}</span></div><div class="msg-text">${m.message}</div></div></div>`;
            
            const openPop = async (e) => {
                e.stopPropagation(); const pop = document.getElementById('user-popover'); if (!pop) return;
                pop.style.display = 'block';
                pop.style.left = `${Math.max(10, Math.min(e.pageX - 80, window.innerWidth - 170))}px`;
                pop.style.top = `${Math.max(10, Math.min(e.pageY - 80, window.innerHeight - 170))}px`;
                const { data: p } = await Core.sb.from('profiles').select('*').eq('id', m.user_id).maybeSingle();
                if (p) {
                    const r = getRankByScore(p.combat_score || 0);
                    const map = { 'pop-nick': p.nickname, 'pop-rank': r.name, 'pop-kills': p.kills_astronauts, 'pop-msgs': p.message_count, 'pop-score': p.combat_score };
                    Object.entries(map).forEach(([id, v]) => { const el = document.getElementById(id); if (el) el.innerText = v ?? 0; });
                    const pAva = document.getElementById('pop-avatar'); if(pAva) pAva.src = p.avatar_url || ava;
                }
            };
            d.querySelector('.avatar-wrapper').onclick = openPop;
            if (isMy) d.oncontextmenu = async (e) => { e.preventDefault(); if (await Core.CustomConfirm("TERMINATE_DATA?")) { await Core.sb.from('comments').delete().eq('id', m.id); d.remove(); } };
            s.appendChild(d); s.scrollTop = s.scrollHeight;
        }
    },

    UI() {
        const tI = document.getElementById('todo-in'), cI = document.getElementById('chat-in');
        if (tI) tI.onkeypress = e => (e.key === 'Enter' && tI.value.trim()) && (this.Todo.add(tI.value, document.getElementById('todo-date')?.value), tI.value='');
        if (cI) cI.onkeypress = e => (e.key === 'Enter') && this.Chat.send();
    },

    Audio: {
        el: null,
        setup() { if (!this.el) { this.el = new Audio('track.mp3'); this.el.loop = true; this.el.volume = 0.1; } },
        toggle() { this.setup(); this.el.paused ? (this.el.play(), document.getElementById('audio-btn')?.classList.add('playing')) : (this.el.pause(), document.getElementById('audio-btn')?.classList.remove('playing')); }
    },

    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield'); if (!this.cvs) return;
            this.ctx = this.cvs.getContext('2d'); this.res();
            this.stars = Array.from({length: 150}, () => ({ x: Math.random() * this.cvs.width, y: Math.random() * this.cvs.height, s: Math.random() * 2, v: Math.random() * 0.3, p: Math.random() * Math.PI }));
            this.ufo = { x: -250, y: 350, v: 2.1, parts: [] };
            this.crew = Array.from({length: 3}, () => ({ x: Math.random() * this.cvs.width, y: Math.random() * this.cvs.height, vx: (Math.random()-0.5)*0.4, vy: (Math.random()-0.5)*0.4, rot: Math.random()*Math.PI*2, vr: (Math.random()-0.5)*0.02, p: Math.random()*Math.PI, isFalling: false }));
            
            window.onmousedown = e => {
                if (e.target.closest('.panel') || e.target.tagName === 'BUTTON') return;
                const rect = this.cvs.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
                this.crew.forEach(a => { if (Math.hypot(a.x - mx, a.y - my) < 60 && !a.isFalling) { a.isFalling = true; a.vy = 10; Core.UpdateStat('kills_astronauts', 1); Core.Msg("PILOT_LOST"); } });
                const uy = this.ufo.y + Math.sin(Date.now() / 600) * 35;
                if (Math.hypot(this.ufo.x - mx, uy - my) < 70) { this.ufo.v = 15; Core.UpdateStat('nlo_clicks', 1); setTimeout(() => this.ufo.v = 2.1, 600); }
            };
        },
        res() { if(this.cvs) { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; } },
        draw() {
            const ctx = this.ctx; if (!ctx) return;
            ctx.fillStyle = '#01050a'; ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
            this.stars.forEach(s => {
                s.x -= s.v; if (s.x < 0) s.x = this.cvs.width;
                ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(Math.sin(Date.now()/1000 + s.p))})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill();
            });
            this.drawUFO(); this.crew.forEach(a => this.drawAstro(a));
        },
        drawUFO() {
            const u = this.ufo, ctx = this.ctx, uy = u.y + Math.sin(Date.now() / 600) * 35;
            u.x += u.v; if (u.x > this.cvs.width + 300) u.x = -300;
            ctx.fillStyle = 'rgba(0,255,255,0.3)'; ctx.beginPath(); ctx.arc(u.x, uy-5, 18, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(u.x, uy, 55, 14, 0, 0, Math.PI*2); ctx.fill();
        },
        drawAstro(a) {
            const ctx = this.ctx; a.x += a.vx; a.y += a.vy; a.rot += a.vr;
            if (a.isFalling && a.y > this.cvs.height + 100) { a.y = -100; a.isFalling = false; a.vy = (Math.random()-0.5)*0.4; }
            ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
            ctx.fillStyle = '#eee'; ctx.fillRect(-8, -10, 16, 20);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -14, 8, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    },

    loop() {
        if (this.Canvas && this.Canvas.draw) this.Canvas.draw();
        requestAnimationFrame(() => this.loop());
    }
};

// Экспорт для доступа из других файлов
window.Core = Core;
window.addEventListener('click', e => {
    const pop = document.getElementById('user-popover');
    if (pop && !e.target.closest('#user-popover') && !e.target.closest('.avatar-wrapper')) pop.style.display = 'none';
});
Core.init();
window.dispatchEvent(new Event('core-ready'));