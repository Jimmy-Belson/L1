const Core = {
    // Подключение Supabase
    sb: window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'),
    user: null,

    Msg(text, type = 'info') {
        const container = document.getElementById('notify-container');
        if (!container) return;
        const t = document.createElement('div');
        t.className = `toast ${type === 'error' ? 'error' : ''}`;
        t.innerHTML = `<span style="opacity:0.5">>></span> ${text}`;
        container.appendChild(t);
        setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 400); }, 4000);
    },

    TogglePass() {
        const p = document.getElementById('pass');
        const b = document.getElementById('toggle-pass');
        if (!p || !b) return;
        p.type = p.type === 'password' ? 'text' : 'password';
        b.classList.toggle('viewing');
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
            } else if (path.endsWith('/') || path.includes('index.html')) {
                window.location.href = 'station.html';
            }
        });
        window.addEventListener('click', () => {
            const m = document.getElementById('custom-menu');
            if(m) m.style.display = 'none';
        });
        this.UI();
        this.loop();
    },

    UI() {
        const cl = document.getElementById('clock');
        if (cl) setInterval(() => {
            const el = document.getElementById('clock');
            if(el) el.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        }, 1000);
        
        const ti = document.getElementById('todo-in');
        if (ti) ti.onkeypress = async (e) => { if (e.key === 'Enter' && e.target.value) { await this.Todo.add(e.target.value); e.target.value = ''; } };
        
        const ci = document.getElementById('chat-in');
        if (ci) ci.onkeypress = (e) => { if(e.key === 'Enter') this.Chat.send(); };
    },

    Chat: {
        async load() { 
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending:false}).limit(50); 
            if(data) { const s = document.getElementById('chat-stream'); if(s) { s.innerHTML = ''; data.reverse().forEach(m => this.render(m)); } } 
        },
        render(m) { 
            const s = document.getElementById('chat-stream'); if(!s) return;
            const d = document.createElement('div'); d.className = 'msg-container';
            const my = Core.user ? Core.user.email.split('@')[0] : null;
            const isMy = m.nickname === my;
            d.innerHTML = `<div class="msg-nick" style="${isMy ? 'color:var(--n);':''}">${(m.nickname||'PILOT').toUpperCase()}</div><div class="msg-text">${m.message}</div>`; 
            if (isMy) {
                d.oncontextmenu = (e) => {
                    e.preventDefault();
                    const menu = document.getElementById('custom-menu');
                    menu.style.display = 'block'; menu.style.left = e.pageX + 'px'; menu.style.top = e.pageY + 'px';
                    menu.innerHTML = '<div class="menu-item">Terminate Message</div>';
                    menu.onclick = async () => { if (!(await Core.sb.from('comments').delete().eq('id', m.id)).error) d.remove(); };
                };
            }
            s.appendChild(d); s.scrollTop = s.scrollHeight; 
        },
        async send() { 
            const i = document.getElementById('chat-in'); if(!i?.value || !Core.user) return; 
            const { data } = await Core.sb.from('comments').insert([{message: i.value, nickname: Core.user.email.split('@')[0]}]).select();
            if(data) { this.render(data[0]); i.value = ''; }
        }
    },

    Todo: {
        async load() {
            const { data } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            const l = document.getElementById('todo-list');
            if (l && data) { l.innerHTML = ''; data.forEach(t => this.render(t)); }
        },
        render(t) {
            const l = document.getElementById('todo-list'); if (!l) return;
            const d = document.createElement('div'); d.className = `task ${t.is_completed ? 'completed' : ''}`;
            d.draggable = true; d.innerText = '> ' + t.task.toUpperCase();
            d.onclick = async () => { d.classList.toggle('completed'); await Core.sb.from('todo').update({ is_completed: d.classList.contains('completed') }).eq('id', t.id); };
            d.oncontextmenu = async (ev) => { ev.preventDefault(); if(!(await Core.sb.from('todo').delete().eq('id', t.id)).error) d.remove(); };
            l.appendChild(d);
        },
        async add(val) { const { data } = await Core.sb.from('todo').insert([{ task: val, is_completed: false }]).select(); if (data) this.render(data[0]); }
    },

    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield'); if(!this.cvs) return;
            this.ctx = this.cvs.getContext('2d'); this.res();
            window.addEventListener('resize', () => this.res());
            this.stars = Array.from({length:200}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, s:Math.random()*2, v:Math.random()*0.3, p:Math.random()*Math.PI}));
            this.crew = Array.from({length:3}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, rot:Math.random()*6, vr:0.005, vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3, phase:Math.random()*Math.PI}));
            this.ufo = {x:-150, y:350, v:1.2, parts: []};
            this.comet = {x:-200, y:0, active:false};
        },
        res() { if(this.cvs) { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; } },
        drawAstro(a) {
            const ctx = this.ctx; a.phase += 0.025; a.rot += a.vr;
            const swing = Math.sin(a.phase) * 6;
            ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-3, 10); ctx.lineTo(-6 + swing, 22); ctx.stroke(); 
            ctx.beginPath(); ctx.moveTo(3, 10); ctx.lineTo(6 - swing, 22); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-7, 2); ctx.lineTo(-14, 8 + swing); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(7, 2); ctx.lineTo(14, 8 - swing); ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-8, -14, 16, 26, 5); ctx.fill();
            ctx.fillStyle = '#111'; ctx.strokeStyle = '#4facfe';
            ctx.beginPath(); ctx.roundRect(-5, -11, 10, 8, 3); ctx.fill(); ctx.stroke();
            ctx.restore();
        },
        drawUFO(u) {
            const ctx = this.ctx; u.x += u.v; if (u.x > this.cvs.width + 250) u.x = -250;
            let uy = u.y + Math.sin(Date.now() / 600) * 40;
            if (Math.random() > 0.4) u.parts.push({ x: u.x - 45, y: uy, l: 1 });
            u.parts.forEach((p, i) => {
                p.l -= 0.02; p.x -= 0.5;
                ctx.fillStyle = `rgba(0, 255, 255, ${p.l})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 * p.l, 0, Math.PI * 2); ctx.fill();
                if (p.l <= 0) u.parts.splice(i, 1);
            });
            ctx.save(); ctx.shadowBlur = 20; ctx.shadowColor = '#0ff';
            ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#0ff';
            ctx.beginPath(); ctx.ellipse(u.x, uy, 55, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            const idx = Math.floor(Date.now() / 150) % 5;
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = (i === idx) ? '#f0f' : '#066';
                ctx.beginPath(); ctx.arc(u.x - 30 + i * 15, uy + 4, 2.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        },
        drawPlanet() {
            const ctx = this.ctx; const px = this.cvs.width - 250, py = 250, pr = 110;
            ctx.save(); ctx.shadowBlur = 60; ctx.shadowColor = 'rgba(79, 172, 254, 0.5)';
            const g = ctx.createRadialGradient(px-35, py-35, 15, px, py, pr);
            g.addColorStop(0, '#4facfe'); g.addColorStop(0.7, '#081a2d'); g.addColorStop(1, '#000');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
            ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 12;
            for(let i=0; i<12; i++) { ctx.beginPath(); ctx.moveTo(px-pr, py-pr+i*22); ctx.lineTo(px+pr, py-pr+i*22+10); ctx.stroke(); }
            ctx.restore();
            ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI / 5);
            ctx.strokeStyle = 'rgba(79, 172, 254, 0.2)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(0, 0, pr + 65, 25, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        },
        draw() {
            if(!this.ctx) return;
            this.ctx.fillStyle = '#01050a'; this.ctx.fillRect(0,0,this.cvs.width,this.cvs.height);
            this.stars.forEach(s => {
                s.x -= s.v; if(s.x < 0) s.x = this.cvs.width;
                this.ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(Math.sin(Date.now()/1000 + s.p))})`;
                this.ctx.beginPath(); this.ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); this.ctx.fill();
            });
            this.drawPlanet(); this.drawUFO(this.ufo);
            this.crew.forEach(a => { a.x += a.vx; a.y += a.vy; this.drawAstro(a); });
        }
    },

    Audio: { setup() { this.el = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'); this.el.loop=true; this.el.volume=0.2; }, toggle() { this.el.paused ? this.el.play() : this.el.pause(); } },
    
    loop() { Core.Canvas.draw(); requestAnimationFrame(() => Core.loop()); }
};

window.onload = () => Core.init();
