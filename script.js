const Core = {
    sb: window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'),
    user: null,

    Msg(text, type) {
        const container = document.getElementById('notify-container');
        if (!container) return;
        const t = document.createElement('div');
        t.className = "toast" + (type === 'error' ? ' error' : '');
        t.innerHTML = <span>>></span> ${text};
        container.appendChild(t);
        setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 400); }, 4000);
    },

    TogglePass() {
        const p = document.getElementById('pass'), b = document.getElementById('toggle-pass');
        if (!p || !b) return;
        if (p.type === 'password') {
            p.type = 'text';
            b.classList.add('viewing');
            this.Msg("SENSITIVE_DATA: EXPOSED");
        } else {
            p.type = 'password';
            b.classList.remove('viewing');
            this.Msg("SENSITIVE_DATA: ENCRYPTED");
        }
    },

    init() {
        this.Canvas.init();
        this.Audio.setup();
        this.Draggable.init(); // Функция перетаскивания
        
        this.sb.auth.onAuthStateChange((event, session) => {
            if (session) {
                this.user = session.user;
                if (window.location.pathname.includes('station.html')) window.location.href = 'index.html';
                this.Chat.load(); this.Todo.load();
            } else if (window.location.pathname.includes('index.html')) {
                window.location.href = 'station.html';
            }
        });
        this.UI();
        this.loop();
    },

    UI() {
        const c = document.getElementById('clock');
        if(c) setInterval(() => c.innerText = new Date().toLocaleTimeString('ru-RU', {hour12:false}), 1000);
        
        document.getElementById('todo-in')?.addEventListener('keypress', (e) => { 
            if(e.key==='Enter' && e.target.value) { this.Todo.add(e.target.value); e.target.value=''; }
        });
        
        document.getElementById('chat-in')?.addEventListener('keypress', (e) => { 
            if(e.key==='Enter') this.Chat.send(); 
        });

        document.getElementById('toggle-pass')?.addEventListener('click', () => this.TogglePass());
    },

    // --- ФУНКЦИЯ DRAG & DROP ---
    Draggable: {
        init() {
            const handles = document.querySelectorAll('.widget-header');
            handles.forEach(h => {
                h.onmousedown = (e) => {
                    const w = h.parentElement;
                    let ox = e.clientX - w.offsetLeft;
                    let oy = e.clientY - w.offsetTop;
                    document.onmousemove = (e) => {
                        w.style.left = (e.clientX - ox) + 'px';
                        w.style.top = (e.clientY - oy) + 'px';
                        w.style.position = 'absolute';
                    };
                    document.onmouseup = () => document.onmousemove = null;
                };
            });
        }
    },

    Chat: {
        async load() {
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending: false}).limit(50);
            const s = document.getElementById('chat-stream');
            if(s && data) { s.innerHTML = ''; data.reverse().forEach(m => this.render(m)); }
        },
        render(m) {
            const s = document.getElementById('chat-stream'); if(!s) return;
            const d = document.createElement('div'); 
            d.className = 'msg-container';
            d.innerHTML = <div class="msg-nick">${(m.nickname||'PILOT').toUpperCase()}</div><div class="msg-text">${m.message}</div>;
            
            // --- УДАЛЕНИЕ СООБЩЕНИЙ ---
            d.oncontextmenu = async (e) => {
                e.preventDefault();
                if(confirm("DELETE MESSAGE FROM STATION LOG?")) {
                    await Core.sb.from('comments').delete().eq('id', m.id);
                    d.remove();
                    Core.Msg("LOG_ENTRY_DELETED", "error");
                }
            };
            
            s.appendChild(d);
            s.scrollTop = s.scrollHeight;
        },
        async send() {
            const i = document.getElementById('chat-in');
            if(!i.value || !Core.user) return;
            const n = Core.user.email.split('@')[0];
            const { data } = await Core.sb.from('comments').insert([{message: i.value, nickname: n}]).select();
            if(data) { this.render(data[0]); i.value = ''; }
        }
    },

    Todo: {
        async load() {
            const { data } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            const list = document.getElementById('todo-list');
            if (list && data) { list.innerHTML = ''; data.forEach(t => this.render(t)); }
        },
        render(t) {
            const list = document.getElementById('todo-list'); if(!list) return;
            const d = document.createElement('div');
            d.className = 'task' + (t.is_completed ? ' completed' : '');
            d.innerText = '> ' + t.task.toUpperCase();
            d.onclick = async () => {
                const ns = !d.classList.contains('completed');
                d.classList.toggle('completed');
                await Core.sb.from('todo').update({ is_completed: ns }).eq('id', t.id);
            };
            d.oncontextmenu = async (e) => { 
                e.preventDefault(); 
                await Core.sb.from('todo').delete().eq('id', t.id); 
                d.remove(); 
            };
            list.appendChild(d);
        },
        async add(val) {
            const { data } = await Core.sb.from('todo').insert([{ task: val, is_completed: false }]).select();
            if (data) this.render(data[0]);
        }
    },

    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield');
            this.ctx = this.cvs.getContext('2d');
            this.res();
            window.onresize = () => this.res();
            this.stars = Array.from({length: 200}, () => ({ x: Math.random()*this.cvs.width, y: Math.random()*this.cvs.height, s: Math.random()*2, v: Math.random()*0.5 }));
            this.crew = Array.from({length: 3}, () => ({ x: Math.random()*this.cvs.width, y: Math.random()*this.cvs.height, r: Math.random()*6, vr: 0.005, vx: 0.1, vy: 0.05 }));
            this.ufo = { x: -100, y: 300, v: 1.2 };
        },
        res() { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; },
        draw() {
            const ctx = this.ctx, cvs = this.cvs;
            ctx.fillStyle = '#01050a'; ctx.fillRect(0,0,cvs.width,cvs.height);
            
            // Звезды
            ctx.fillStyle = 'white';
            this.stars.forEach(s => { 
                s.x -= s.v; if(s.x<0) s.x = cvs.width; 
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill(); 
            });

            // Планета (Классика)
            const px = cvs.width - 250, py = 250, pr = 100;
            ctx.save();
            ctx.shadowBlur = 50; ctx.shadowColor = '#4facfe';
            const g = ctx.createRadialGradient(px-30, py-30, 10, px, py, pr);
            g.addColorStop(0, '#4facfe'); g.addColorStop(1, '#001a33');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI*2); ctx.fill();
            ctx.restore();

            // НЛО
            this.ufo.x += this.ufo.v; if(this.ufo.x > cvs.width+200) this.ufo.x = -200;
            ctx.fillStyle = '#111'; ctx.strokeStyle = '#0ff';
            ctx.beginPath(); ctx.ellipse(this.ufo.x, this.ufo.y + Math.sin(Date.now()/500)*30, 40, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

            // Космонавты
            this.crew.forEach(a => {
                a.x += a.vx; a.y += a.vy; a.r += a.vr;
                ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.r);
                ctx.fillStyle = 'white'; ctx.fillRect(-8, -12, 16, 24);
                ctx.fillStyle = '#111'; ctx.fillRect(-5, -9, 10, 7);
                ctx.restore();
            });
        }
    },

    Audio: { 
        setup() { this.el = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'); this.el.loop=true; this.el.volume=0.1; },
        toggle() { this.el.paused ? this.el.play() : this.el.pause(); }
    },

    loop() { Core.Canvas.draw(); requestAnimationFrame(() => Core.loop()); }
};

window.onload = () => Core.init();
