const Core = {
    sb: window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'),
    user: null,

    Msg(text, type) {
        const container = document.getElementById('notify-container');
        if (!container) return;
        const t = document.createElement('div');
        t.className = "toast" + (type === 'error' ? ' error' : '');
        t.innerHTML = '<span style="opacity:0.5">>></span> ' + text;
        container.appendChild(t);
        setTimeout(() => {
            t.classList.add('hide');
            setTimeout(() => t.remove(), 400);
        }, 4000);
    },

    TogglePass() {
        const p = document.getElementById('pass');
        const b = document.getElementById('toggle-pass');
        if (!p || !b) return;
        p.type = p.type === 'password' ? 'text' : 'password';
        b.classList.toggle('viewing');
        this.Msg(p.type === 'text' ? "DECRYPTING_OVERSIGHT: VISIBLE" : "ENCRYPTING_OVERSIGHT: HIDDEN");
    },

    init() {
        this.Canvas.init(); 
        this.Audio.setup(); 
        
        this.sb.auth.onAuthStateChange((event, session) => {
            const path = window.location.pathname.toLowerCase();
            if (session) {
                this.user = session.user;
                if (path.includes('station.html')) window.location.href = 'index.html';
                if (document.getElementById('chat-stream')) this.Chat.load();
                if (document.getElementById('todo-list')) this.Todo.load();
            } else {
                if (path.includes('index.html') || path.endsWith('/')) window.location.href = 'station.html';
            }
        });

        if (document.getElementById('clock')) {
            this.UI();
            setInterval(() => {
                const el = document.getElementById('clock');
                if(el) el.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false });
            }, 1000);
        }
        this.loop();
    },

    Auth: async function() {
        const e = document.getElementById('email').value, p = document.getElementById('pass').value;
        const { error } = await Core.sb.auth.signInWithPassword({email: e, password: p});
        if(error) Core.Msg("ACCESS_DENIED: " + error.message, "error");
    },

    Register: async function() {
        const e = document.getElementById('email').value, p = document.getElementById('pass').value;
        const { error } = await Core.sb.auth.signUp({email: e, password: p});
        if(error) Core.Msg("REG_ERROR: " + error.message, "error"); 
        else Core.Msg("PILOT_REGISTERED. INITIATE SESSION.");
    },

    Logout: async () => { await Core.sb.auth.signOut(); window.location.href = 'station.html'; },

    Todo: {
        async load() {
            const { data } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            const list = document.getElementById('todo-list');
            if (list && data) { list.innerHTML = ''; data.forEach(t => this.render(t)); }
        },
        render(t) {
            const list = document.getElementById('todo-list');
            const d = document.createElement('div');
            d.className = 'task' + (t.is_completed ? ' completed' : '');
            d.innerText = '> ' + t.task.toUpperCase();
            d.onclick = async () => {
                const ns = !d.classList.contains('completed');
                d.classList.toggle('completed');
                await Core.sb.from('todo').update({ is_completed: ns }).eq('id', t.id);
            };
            d.oncontextmenu = async (e) => { e.preventDefault(); await Core.sb.from('todo').delete().eq('id', t.id); d.remove(); };
            list.appendChild(d);
        },
        async add(val) {
            const { data } = await Core.sb.from('todo').insert([{ task: val, is_completed: false }]).select();
            if (data) this.render(data[0]);
        }
    },

    Chat: {
        async load() {
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending: false}).limit(50);
            const s = document.getElementById('chat-stream');
            if(s && data) { s.innerHTML = ''; data.reverse().forEach(m => this.render(m)); }
        },
        render(m) {
            const s = document.getElementById('chat-stream');
            const d = document.createElement('div');
            d.className = 'msg-container';
            d.innerHTML = '<div class="msg-nick">' + (m.nickname || 'PILOT').toUpperCase() + '</div><div class="msg-text">' + m.message + '</div>';
            s.appendChild(d);
            s.scrollTop = s.scrollHeight;
        },
        async send() {
            const i = document.getElementById('chat-in');
            const n = Core.user ? Core.user.email.split('@')[0] : 'PILOT';
            if(!i.value) return;
            const { data } = await Core.sb.from('comments').insert([{message: i.value, nickname: n}]).select();
            if(data) { this.render(data[0]); i.value = ''; }
        }
    },

    UI() {
        document.getElementById('todo-in')?.addEventListener('keypress', (e) => { if(e.key==='Enter' && e.target.value) { this.Todo.add(e.target.value); e.target.value=''; } });
        document.getElementById('chat-in')?.addEventListener('keypress', (e) => { if(e.key==='Enter') this.Chat.send(); });
    },

    Audio: {
        setup() { this.el = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'); this.el.loop = true; this.el.volume = 0.1; },
        toggle() { this.el.paused ? this.el.play() : this.el.pause(); }
    },

    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield'); if(!this.cvs) return;
            this.ctx = this.cvs.getContext('2d'); this.res();
            window.onresize = () => this.res();
            this.stars = Array.from({length: 250}, () => ({ x: Math.random()*this.cvs.width, y: Math.random()*this.cvs.height, s: Math.random()*2, v: Math.random()*0.3+0.1, p: Math.random()*Math.PI }));
            this.crew = Array.from({length: 3}, () => ({ x: Math.random()*this.cvs.width, y: Math.random()*this.cvs.height, r: Math.random()*6, vr: 0.005, vx: 0.1, vy: 0.08 }));
            this.ufo = { x: -200, y: 400, v: 1.5 };
            this.comet = { x: -200, y: 0, active: false };
        },
        res() { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; },
        
        drawUfo(ctx, x, y) {
            ctx.save();
            let ty = y + Math.sin(Date.now()/700)*30;
            // Купол
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.beginPath(); ctx.arc(x, ty-5, 15, Math.PI, 0); ctx.fill();
            // Корпус
            ctx.fillStyle = '#222'; ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(x, ty, 45, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            // Огни
            ctx.fillStyle = (Date.now()%600 > 300) ? '#f0f' : '#0ff';
            for(let i=-2; i<=2; i++) { ctx.beginPath(); ctx.arc(x + i*15, ty+2, 2, 0, Math.PI*2); ctx.fill(); }
            ctx.restore();
        },

        drawAstro(ctx, a) {
            ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.r);
            // Ранец
            ctx.fillStyle = '#ccc'; ctx.fillRect(-10, -8, 20, 16);
            // Тело
            ctx.fillStyle = 'white'; ctx.beginPath(); ctx.roundRect(-8, -12, 16, 24, 4); ctx.fill();
            // Шлем
            ctx.fillStyle = '#111'; ctx.strokeStyle = '#4facfe'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(-5, -10, 10, 7, 2); ctx.fill(); ctx.stroke();
            ctx.restore();
        },

        draw() {
            const ctx = this.ctx, cvs = this.cvs; if(!ctx) return;
            // Фон
            const bg = ctx.createRadialGradient(cvs.width/2, cvs.height/2, 0, cvs.width/2, cvs.height/2, cvs.width);
            bg.addColorStop(0, '#041528'); bg.addColorStop(1, '#01050a');
            ctx.fillStyle = bg; ctx.fillRect(0,0,cvs.width,cvs.height);

            // Звезды
            this.stars.forEach(s => {
                s.x -= s.v; if(s.x < 0) s.x = cvs.width;
                ctx.fillStyle = 'rgba(255,255,255,'+(0.3+Math.abs(Math.sin(Date.now()/1000+s.p))*0.7)+')';
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill();
            });

            // ПЛАНЕТА (СПРАВА)
            const px = cvs.width - 250, py = 250, pr = 100;
            ctx.save();
            ctx.shadowBlur = 60; ctx.shadowColor = '#4facfe';
            const pg = ctx.createRadialGradient(px-30, py-30, 10, px, py, pr);
            pg.addColorStop(0, '#4facfe'); pg.addColorStop(0.6, '#001a33'); pg.addColorStop(1, '#000');
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            // Полоски
            ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 15;
            for(let i=0; i<15; i++) { ctx.beginPath(); ctx.moveTo(px-pr, py-pr+i*20); ctx.lineTo(px+pr, py-pr+i*20+10); ctx.stroke(); }
            ctx.restore();
            // Кольцо
            ctx.strokeStyle = 'rgba(79, 172, 254, 0.2)'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.ellipse(px, py, pr+60, 25, Math.PI/6, 0, Math.PI*2); ctx.stroke();

            // Комета
            if(!this.comet.active && Math.random() < 0.005) this.comet = {x:cvs.width+100, y:Math.random()*cvs.height, active:true};
            if(this.comet.active) {
                this.comet.x -= 10; this.comet.y += 3;
                const cg = ctx.createLinearGradient(this.comet.x, this.comet.y, this.comet.x+100, this.comet.y-30);
                cg.addColorStop(0, '#0ff'); cg.addColorStop(1, 'transparent');
                ctx.strokeStyle = cg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.comet.x, this.comet.y); ctx.lineTo(this.comet.x+100, this.comet.y-30); ctx.stroke();
                if(this.comet.x < -100) this.comet.active = false;
            }

            // НЛО и Космонавты
            this.ufo.x += this.ufo.v; if(this.ufo.x > cvs.width+200) this.ufo.x = -200;
            this.drawUfo(ctx, this.ufo.x, this.ufo.y);
            this.crew.forEach(a => { a.x += a.vx; a.y += a.vy; a.r += a.vr; this.drawAstro(ctx, a); });
        }
    },
    loop() { Core.Canvas.draw(); requestAnimationFrame(() => Core.loop()); }
};
window.onload = () => Core.init();
