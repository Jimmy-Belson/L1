import { getRankByScore } from './ranks.js';

const Core = {
    sb: window.supabase ? window.supabase.createClient(
        'https://ebjsxlympwocluxgmwcu.supabase.co', 
        'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
    ) : null,
    
    user: null,
    userProfile: null,

    async init() {
        console.log("STATION_INITIALIZING...");
        this.Canvas.init();
        this.startClock();
        
        const { data: { session } } = await this.sb.auth.getSession();
        if (!session) {
            window.location.href = 'station.html';
            return;
        }
        this.user = session.user;
        
        // Загрузка данных
        await this.SyncProfile(this.user);
        await this.Todo.load();
        await this.Chat.load();
        this.Chat.subscribe();
        
        this.UI();
        this.loop();
        this.Msg("UPLINK_ESTABLISHED", "info");
    },

    // --- СЕРВИСЫ ---
    Msg(text, type) {
        const container = document.getElementById('notify-container');
        if (!container) return;
        const t = document.createElement('div');
        t.className = `toast ${type === 'error' ? 'error' : ''}`;
        t.style.cssText = "background:rgba(0,20,30,0.9); border-left:3px solid #0ff; color:#0ff; padding:10px; margin-bottom:5px; font-family:'Share Tech Mono'; font-size:12px; animation: slideIn 0.3s forwards;";
        t.innerHTML = `> ${text}`;
        container.prepend(t);
        setTimeout(() => t.remove(), 4000);
    },

    UI() {
        // Фикс ввода для Todo
        const ti = document.getElementById('todo-in');
        if (ti) {
            ti.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && ti.value.trim()) {
                    this.Todo.add(ti.value.trim());
                    ti.value = '';
                }
            });
        }

        // Фикс ввода для Чата
        const ci = document.getElementById('chat-in');
        if (ci) {
            ci.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && ci.value.trim()) {
                    this.Chat.send();
                }
            });
        }
    },

    // --- КАНВАС (AURA-7 & SPACE) ---
    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield');
            this.ctx = this.cvs.getContext('2d');
            this.res();
            this.stars = Array.from({length: 100}, () => ({
                x: Math.random() * this.cvs.width,
                y: Math.random() * this.cvs.height,
                v: 0.1 + Math.random() * 0.5,
                o: Math.random()
            }));
            window.addEventListener('resize', () => this.res());
        },
        res() {
            this.cvs.width = window.innerWidth;
            this.cvs.height = window.innerHeight;
        },
        draw() {
            const ctx = this.ctx;
            ctx.fillStyle = '#00050a';
            ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);

            // Звезды
            this.stars.forEach(s => {
                s.x -= s.v;
                if (s.x < 0) s.x = this.cvs.width;
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(Date.now()/1000 + s.o))})`;
                ctx.fillRect(s.x, s.y, 1.5, 1.5);
            });

            // Планета AURA-7
            this.drawAura7();
        },
        drawAura7() {
            const ctx = this.ctx;
            const img = document.getElementById('planet-pic');
            const size = 180;
            const x = this.cvs.width - 250;
            const y = 200;

            // Внешнее неоновое кольцо
            ctx.beginPath();
            ctx.arc(x, y, size/2 + 5, 0, Math.PI*2);
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.1 + Math.sin(Date.now()/500)*0.05})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Сама планета
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, size/2, 0, Math.PI*2);
            ctx.clip();
            
            if (img && img.complete) {
                ctx.drawImage(img, x - size/2, y - size/2, size, size);
            } else {
                ctx.fillStyle = '#012';
                ctx.fill();
            }

            // Наложение тени для объема
            const grad = ctx.createRadialGradient(x - 30, y - 30, 10, x, y, size/2);
            grad.addColorStop(0, 'rgba(0,255,255,0.1)');
            grad.addColorStop(1, 'rgba(0,0,0,0.8)');
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();

            // Подпись
            ctx.fillStyle = '#0ff';
            ctx.font = '9px Orbitron';
            ctx.fillText("OBJECT: AURA-7 // STABLE", x - 60, y + size/2 + 30);
        }
    },

    // --- ЧАТ ---
    Chat: {
        async load() {
            const { data } = await Core.sb.from('comments').select('*').order('created_at', { ascending: false }).limit(30);
            const stream = document.getElementById('chat-stream');
            if (data && stream) {
                stream.innerHTML = '';
                data.reverse().forEach(m => this.render(m));
                stream.scrollTop = stream.scrollHeight;
            }
        },
        async send() {
            const input = document.getElementById('chat-in');
            const val = input.value.trim();
            if (!val) return;
            input.value = '';

            const payload = {
                message: val,
                user_id: Core.user.id,
                nickname: Core.userProfile?.nickname || Core.user.email.split('@')[0],
                avatar_url: Core.userProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${Core.user.id}`
            };

            const { data, error } = await Core.sb.from('comments').insert([payload]).select();
            if (data) this.render(data[0]);
            if (error) Core.Msg("SEND_ERROR", "error");
        },
        render(m) {
            const s = document.getElementById('chat-stream');
            if (!s) return;
            const d = document.createElement('div');
            const isMy = m.user_id === Core.user?.id;
            d.style.cssText = `margin-bottom: 10px; padding: 5px; border-left: 2px solid ${isMy ? '#0ff' : '#444'}; background: rgba(255,255,255,0.03);`;
            d.innerHTML = `
                <div style="font-size: 9px; color: ${isMy ? '#0ff' : '#888'}; opacity: 0.7;">${m.nickname.toUpperCase()}</div>
                <div style="font-size: 13px; color: #eee; font-family: 'Share Tech Mono';">${m.message}</div>
            `;
            s.appendChild(d);
            s.scrollTop = s.scrollHeight;
        },
        subscribe() {
            Core.sb.channel('any').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
                if (payload.new.user_id !== Core.user.id) this.render(payload.new);
            }).subscribe();
        }
    },

    // --- TODO ---
    Todo: {
        async load() {
            const { data } = await Core.sb.from('todo').select('*').eq('user_id', Core.user.id);
            const list = document.getElementById('todo-list');
            if (list && data) {
                list.innerHTML = data.map(t => `
                    <div class="task" style="padding: 8px; border-bottom: 1px solid #0ff1; font-size: 11px; cursor: pointer; color: ${t.is_completed ? '#555' : '#0ff'}">
                        ${t.is_completed ? '[X]' : '[ ]'} ${t.task.toUpperCase()}
                    </div>
                `).join('');
            }
        },
        async add(val) {
            await Core.sb.from('todo').insert([{ task: val, user_id: Core.user.id, is_completed: false }]);
            this.load();
            Core.Msg("OBJECTIVE_ADDED");
        }
    },

    startClock() {
        setInterval(() => {
            const el = document.getElementById('clock');
            if (el) el.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        }, 1000);
    },

    async SyncProfile(u) {
        const { data } = await this.sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
        if (data) {
            this.userProfile = data;
            const nickDisplay = document.getElementById('nick-display');
            if (nickDisplay) nickDisplay.innerText = data.nickname || u.email;
        }
    },

    loop() {
        this.Canvas.draw();
        requestAnimationFrame(() => this.loop());
    },

    async Logout() {
        await this.sb.auth.signOut();
        window.location.href = 'station.html';
    }
};

window.Core = Core;
document.addEventListener('DOMContentLoaded', () => Core.init());