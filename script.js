import { getRankByScore } from './ranks.js';

const Core = {
    sb: (window.supabase) ? window.supabase.createClient(
        'https://ebjsxlympwocluxgmwcu.supabase.co', 
        'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
    ) : null,
    
    user: null,
    userProfile: null,

    // --- УТИЛИТЫ ---
    toggleChat() {
        const win = document.getElementById('main-chat-window');
        const icon = document.getElementById('chat-toggle-icon');
        if (win) {
            win.classList.toggle('minimized');
            if (icon) icon.className = win.classList.contains('minimized') ? 'fa-solid fa-window-maximize' : 'fa-solid fa-window-minimize';
        }
    },
    
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
        if (!o) return confirm(text); // Fallback
        o.querySelector('.confirm-body').innerText = text;
        o.style.display = 'flex';
        return new Promise(res => {
            document.getElementById('confirm-yes').onclick = () => { o.style.display = 'none'; res(true); };
            document.getElementById('confirm-no').onclick = () => { o.style.display = 'none'; res(false); };
        });
    },

    // --- СИСТЕМА ---
    async init() {
        // 1. Сначала визуальный запуск
        if (this.Canvas) this.Canvas.init();
        this.startClock();
        this.UI();
        
        // 2. Проверка авторизации
        const { data: { session } } = await this.sb.auth.getSession();
        if (!session) {
            if (!window.location.pathname.includes('station.html')) window.location.replace('station.html');
            return;
        }

        this.user = session.user;
        
        // 3. Загрузка данных
        if (window.location.pathname.includes('station.html')) {
            window.location.replace('index.html');
        } else {
            await this.loadAppData();
        }

        // Запускаем цикл отрисовки
        this.loop();
    },

    async loadAppData() {
        try {
            await Promise.all([
                this.SyncProfile(this.user),
                this.Todo.load(),
                this.Chat.load()
            ]);
            this.Chat.subscribe(); // Включаем реалтайм
        } catch(e) { console.error("SYSTEM_LOAD_FAILURE", e); }
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
            const nickEl = document.getElementById('nick-display');
            const avaEl = document.getElementById('avatar-display');
            if (nickEl) {
                const r = getRankByScore(data.combat_score || 0);
                nickEl.innerText = data.nickname || u.email.split('@')[0];
                nickEl.style.color = r.color;
            }
            if (avaEl) avaEl.src = this.getAvatar(u.id, data.avatar_url);
        }
    },

    // --- МОДУЛЬ ЧАТА ---
    Chat: {
        channel: null,
        async subscribe() {
            if (this.channel) Core.sb.removeChannel(this.channel);
            this.channel = Core.sb.channel('global-chat')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, p => {
                    if (p.new.user_id !== Core.user?.id) this.render(p.new);
                })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, p => {
                    document.getElementById(`msg-${p.old.id}`)?.remove();
                })
                .subscribe();
        },
        async load() {
            const s = document.getElementById('chat-stream'); if (!s) return;
            const { data, error } = await Core.sb.from('comments').select('*').order('created_at', { ascending: false }).limit(50);
            if (data) { 
                s.innerHTML = ''; 
                data.reverse().forEach(m => this.render(m)); 
                s.scrollTop = s.scrollHeight; 
            }
        },
        async send() {
            const i = document.getElementById('chat-in');
            if (!i || !i.value.trim()) return;
            const val = i.value; i.value = '';
            
            const nick = Core.userProfile?.nickname || Core.user.email.split('@')[0];
            const ava = Core.getAvatar(Core.user.id, Core.userProfile?.avatar_url);

            const { data, error } = await Core.sb.from('comments').insert([{ 
                message: val, 
                nickname: nick, 
                avatar_url: ava, 
                user_id: Core.user.id 
            }]).select();

            if (data?.[0]) {
                this.render(data[0]);
                Core.UpdateStat('message_count', 1);
            } else if (error) {
                Core.Msg("UPLINK_ERROR", "error");
                i.value = val;
            }
        },
        render(m) {
            const s = document.getElementById('chat-stream');
            if (!s || document.getElementById(`msg-${m.id}`)) return;
            const isMy = m.user_id === Core.user?.id;
            const ava = Core.getAvatar(m.user_id, m.avatar_url);
            const d = document.createElement('div');
            d.id = `msg-${m.id}`;
            d.className = `msg-container ${isMy ? 'my-msg' : ''}`;
            d.innerHTML = `
                <div class="chat-row-layout">
                    <div class="avatar-wrapper"><img src="${ava}" class="chat-row-avatar"></div>
                    <div class="chat-content-block">
                        <div class="msg-header">
                            <span class="msg-nick" style="color:${isMy ? '#0ff' : '#aaa'}">${(m.nickname || 'PILOT').toUpperCase()}</span>
                            <span class="msg-time">${new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div class="msg-text">${m.message}</div>
                    </div>
                </div>`;
            s.appendChild(d);
            s.scrollTop = s.scrollHeight;
        }
    },

    // --- МОДУЛЬ КАНВАСА (AURA-7) ---
    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield');
            if (!this.cvs) return;
            this.ctx = this.cvs.getContext('2d');
            this.res();
            this.stars = Array.from({length: 150}, () => ({ 
                x: Math.random() * this.cvs.width, 
                y: Math.random() * this.cvs.height, 
                s: Math.random() * 2, 
                v: Math.random() * 0.3, 
                p: Math.random() * Math.PI 
            }));
            this.ufo = { x: -250, y: 350, v: 2.1, parts: [] };
            this.crew = Array.from({length: 3}, () => ({ 
                x: Math.random() * this.cvs.width, 
                y: Math.random() * this.cvs.height, 
                vx: (Math.random()-0.5)*0.4, 
                vy: (Math.random()-0.5)*0.4, 
                rot: Math.random()*Math.PI*2, 
                vr: (Math.random()-0.5)*0.02, 
                isFalling: false 
            }));

            window.addEventListener('resize', () => this.res());
        },
        res() { if(this.cvs) { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; } },
        
        draw() {
            const ctx = this.ctx; if (!ctx) return;
            ctx.fillStyle = '#01050a'; 
            ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
            
            // 1. Звезды
            this.stars.forEach(s => {
                s.x -= s.v; if (s.x < 0) s.x = this.cvs.width;
                ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.abs(Math.sin(Date.now()/1000 + s.p))})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill();
            });

            // 2. Планета Aura-7 (Технологичная отрисовка)
            this.drawPlanet();
            
            // 3. НЛО и Экипаж
            this.drawUFO();
            this.crew.forEach(a => this.drawAstro(a));
        },

        drawPlanet() {
            const ctx = this.ctx;
            const img = document.getElementById('planet-pic');
            const r = Math.min(Math.max(this.cvs.width * 0.12, 60), 150);
            const x = this.cvs.width - r - 80;
            const y = r + 80;

            // Атмосферное свечение
            ctx.save();
            ctx.shadowBlur = r * 0.5;
            ctx.shadowColor = 'rgba(0, 255, 255, 0.2)';
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
            ctx.restore();

            if (img && img.complete && img.naturalWidth !== 0) {
                ctx.save();
                ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.clip();
                ctx.drawImage(img, x-r, y-r, r*2, r*2);
                ctx.restore();
            }

            // Тень (терминатор)
            const grad = ctx.createRadialGradient(x-r/2, y-r/2, r/2, x, y, r);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0.8)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(x, y, r + 1, 0, Math.PI*2); ctx.fill();

            // Текст названия
            ctx.fillStyle = '#0ff';
            ctx.font = '10px "Orbitron"';
            ctx.textAlign = 'center';
            ctx.fillText("DATA_OBJECT: AURA-7", x, y + r + 25);
        },

        drawUFO() {
            const u = this.ufo, ctx = this.ctx;
            const uy = u.y + Math.sin(Date.now() / 600) * 35;
            u.x += u.v; if (u.x > this.cvs.width + 300) u.x = -300;
            ctx.fillStyle = 'rgba(0,255,255,0.2)'; ctx.beginPath(); ctx.arc(u.x, uy-5, 15, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(u.x, uy, 45, 10, 0, 0, Math.PI*2); ctx.fill();
        },

        drawAstro(a) {
            const ctx = this.ctx;
            a.x += a.vx; a.y += a.vy; a.rot += a.vr;
            if (a.isFalling && a.y > this.cvs.height + 100) { a.y = -100; a.isFalling = false; }
            ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
            ctx.fillStyle = '#fff'; ctx.fillRect(-5, -7, 10, 14);
            ctx.fillStyle = '#333'; ctx.fillRect(-3, -5, 6, 4); // Визор
            ctx.restore();
        }
    },

    // --- ОБЩИЕ МЕТОДЫ ---
    UI() {
        const ci = document.getElementById('chat-in');
        if (ci) ci.onkeypress = e => { if(e.key === 'Enter') this.Chat.send(); };
        
        const ti = document.getElementById('todo-in');
        if (ti) ti.onkeypress = e => { if(e.key === 'Enter') { this.Todo.add(ti.value); ti.value = ''; }};
    },

    loop() {
        if (this.Canvas && this.Canvas.draw) this.Canvas.draw();
        requestAnimationFrame(() => this.loop());
    },

    async UpdateStat(f, v = 1) {
        if (!this.user) return;
        const { data } = await this.sb.from('profiles').select(f).eq('id', this.user.id).single();
        if (data) await this.sb.from('profiles').update({ [f]: (data[f] || 0) + v }).eq('id', this.user.id);
    },

    Todo: {
        async load() {
            const { data } = await Core.sb.from('todo').select('*').eq('user_id', Core.user.id).order('id', { ascending: false });
            const l = document.getElementById('todo-list'); if (!l || !data) return;
            l.innerHTML = '';
            data.forEach(t => {
                const d = document.createElement('div');
                d.className = `task ${t.is_completed ? 'completed' : ''}`;
                d.innerHTML = `<span class="task-text">> ${t.task.toUpperCase()}</span>`;
                d.onclick = async () => {
                    const ns = !t.is_completed;
                    await Core.sb.from('todo').update({ is_completed: ns }).eq('id', t.id);
                    this.load();
                };
                l.appendChild(d);
            });
        },
        async add(val) {
            await Core.sb.from('todo').insert([{ task: val, user_id: Core.user.id, is_completed: false }]);
            this.load();
        }
    },

    async Logout() { await this.sb.auth.signOut(); window.location.href = 'station.html'; }
};

window.Core = Core;
Core.init();