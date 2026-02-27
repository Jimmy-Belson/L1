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
        p.type = p.type === 'password' ? 'text' : 'password';
        b.classList.toggle('viewing');
    },

    init() {
        this.Canvas.init();
        this.Audio.setup();
        this.sb.auth.onAuthStateChange((event, session) => {
            if (session) {
                this.user = session.user;
                if (window.location.pathname.includes('station.html')) window.location.href = 'index.html';
                if (this.Chat) this.Chat.load();
                if (this.Todo) this.Todo.load();
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
        document.getElementById('todo-in')?.addEventListener('keypress', (e) => { if(e.key==='Enter' && e.target.value) { this.Todo.add(e.target.value); e.target.value=''; }});
        document.getElementById('chat-in')?.addEventListener('keypress', (e) => { if(e.key==='Enter') this.Chat.send(); });
        document.getElementById('logout-btn')?.addEventListener('click', () => this.Logout());
        document.getElementById('toggle-pass')?.addEventListener('click', () => this.TogglePass());
    },

    Logout: async function() { await this.sb.auth.signOut(); window.location.href = 'station.html'; },

    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield');
            this.ctx = this.cvs.getContext('2d');
            this.res();
            window.onresize = () => this.res();
            
            // Объекты
            this.stars = Array.from({length: 350}, () => ({ x: Math.random()*this.cvs.width, y: Math.random()*this.cvs.height, s: Math.random()*1.8, v: Math.random()*0.3, p: Math.random()*Math.PI }));
            this.crew = Array.from({length: 2}, (v, i) => ({ 
                x: 100 + i*300, y: 200 + i*100, vx: 0.12, vy: 0.06, 
                r: Math.random()*Math.PI, vr: 0.002, 
                phase: Math.random()*Math.PI*2 
            }));
            this.ufo = { x: -300, y: 500, v: 2.1, phase: 0 };
            this.particles = [];
            this.planet = { x: 0, y: 0, r: 160 };
        },

        res() { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; },

        spawnPart(x, y, vx, vy, life, color, size = 1.5) {
            this.particles.push({ x, y, vx, vy, life, maxLife: life, c: color, s: size });
        },

        drawAstro(ctx, a) {
            a.x += a.vx; a.y += a.vy; a.r += a.vr;
            a.phase += 0.03;
            const move = Math.sin(a.phase) * 6;

            ctx.save();
            ctx.translate(a.x, a.y);
            ctx.rotate(a.r);

            // Трос (фал)
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-100, -50); ctx.stroke();

            // Ноги
            ctx.strokeStyle = '#ddd'; ctx.lineWidth = 4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(-3, 10); ctx.lineTo(-6 + move/2, 22); ctx.stroke(); // Левая
            ctx.beginPath(); ctx.moveTo(3, 10); ctx.lineTo(6 - move/2, 22); ctx.stroke();  // Правая

            // Руки
            ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-14, 6 + move); ctx.stroke();  // Левая
            ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(14, 6 - move); ctx.stroke();   // Правая

            // Рюкзак Жизнеобеспечения
            ctx.fillStyle = '#bbb';
            ctx.beginPath(); ctx.roundRect(-10, -8, 20, 18, 2); ctx.fill();

            // Скафандр
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.roundRect(-8, -14, 16, 26, 5); ctx.fill();

            // Визор (Шлем)
            ctx.fillStyle = '#050505';
            ctx.strokeStyle = '#4facfe'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(-5, -11, 10, 8, 3); ctx.fill(); ctx.stroke();

            // Партиклы кислорода (редко)
            if(Math.random() > 0.92) this.spawnPart(a.x, a.y, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, 1, 'rgba(255,255,255,0.4)', 1);

            ctx.restore();
        },

        drawUFO(ctx, u) {
            u.x += u.v; u.phase += 0.05;
            if(u.x > this.cvs.width + 300) u.x = -300;
            const ty = u.y + Math.sin(u.phase) * 50;

            // Инверсионный след (Engine particles)
            for(let i=0; i<4; i++) {
                this.spawnPart(u.x - 30, ty + (Math.random()-0.5)*10, -Math.random()*2, (Math.random()-0.5)*0.5, 0.8, '#0ff', 2);
            }

            ctx.save();
            // Свечение корпуса
            ctx.shadowBlur = 25; ctx.shadowColor = '#0ff';
            
            // Тарелка
            ctx.fillStyle = '#111'; ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(u.x, ty, 60, 15, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            
            // Кабина (Купол)
            ctx.shadowBlur = 10;
            ctx.fillStyle = 'rgba(0, 255, 255, 0.4)';
            ctx.beginPath(); ctx.arc(u.x, ty - 6, 18, Math.PI, 0); ctx.fill();
            ctx.strokeStyle = '#0ff'; ctx.stroke();

            // Сигнальные огни по периметру
            const time = Date.now();
            for(let i=0; i<5; i++) {
                ctx.fillStyle = (time + i*150) % 600 > 300 ? '#f0f' : '#0ff';
                ctx.beginPath(); ctx.arc(u.x - 30 + i*15, ty + 4, 2.5, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();
        },

        drawPlanet(ctx) {
            const x = this.cvs.width - 250, y = 250, r = 150;
            ctx.save();
            
            // Внешнее атмосферное свечение (Rim light)
            ctx.shadowBlur = 80; ctx.shadowColor = 'rgba(79, 172, 254, 0.4)';
            
            // Тело планеты (Газовый гигант с тенями)
            const g = ctx.createRadialGradient(x - 50, y - 50, 30, x, y, r);
            g.addColorStop(0, '#2b5a8a');   // Освещенная часть
            g.addColorStop(0.4, '#081a2d'); // Переход
            g.addColorStop(0.8, '#01050a'); // Терминатор
            g.addColorStop(1, '#000');      // Ночь
            
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
            
            // Детали поверхности (атмосферные потоки)
            ctx.clip();
            ctx.globalCompositeOperation = 'overlay';
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 20;
            for(let i=0; i<15; i++) {
                ctx.beginPath();
                ctx.moveTo(x - r, y - r + i*25);
                ctx.bezierCurveTo(x, y - r + i*25 - 20, x, y - r + i*25 + 20, x + r, y - r + i*25);
                ctx.stroke();
            }
            ctx.restore();

            // Кольца (физически корректные - тонкие слои)
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI/6);
            for(let i=0; i<4; i++) {
                ctx.strokeStyle = rgba(79, 172, 254, ${0.05 + i*0.03});
                ctx.lineWidth = 1 + i;
                ctx.beginPath(); ctx.ellipse(0, 0, r + 40 + i*8, 30 + i*3, 0, 0, Math.PI*2); ctx.stroke();
            }
            ctx.restore();
        },

        draw() {
            const ctx = this.ctx, cvs = this.cvs;
            // Фон (Абсолютная тьма с небольшим градиентом)
            const bg = ctx.createRadialGradient(cvs.width/2, cvs.height/2, 0, cvs.width/2, cvs.height/2, cvs.width);
            bg.addColorStop(0, '#02060c'); bg.addColorStop(1, '#000000');
            ctx.fillStyle = bg; ctx.fillRect(0, 0, cvs.width, cvs.height);

            // Звезды с параллаксом и мерцанием
            this.stars.forEach(s => {
                s.x -= s.v; if(s.x < 0) s.x = cvs.width;
                const alpha = 0.2 + Math.abs(Math.sin(Date.now()/1500 + s.p)) * 0.8;
                ctx.fillStyle = rgba(255,255,255,${alpha});
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI*2); ctx.fill();
            });

            this.drawPlanet(ctx);

            // Обработка системы частиц
            ctx.save();
            for(let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.x += p.vx; p.y += p.vy; p.life -= 0.015;
                if(p.life <= 0) { this.particles.splice(i, 1); continue; }
                
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.c;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.s * p.life, 0, Math.PI*2); ctx.fill();
            }
            ctx.restore();

            this.drawUFO(ctx, this.ufo);
            this.crew.forEach(a => this.drawAstro(ctx, a));
        }
    },

    Chat: {
        async load() {
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending: false}).limit(50);
            const s = document.getElementById('chat-stream');
            if(s && data) { s.innerHTML = ''; data.reverse().forEach(m => this.render(m)); s.scrollTop = s.scrollHeight; }
        },
        render(m) {
            const s = document.getElementById('chat-stream'); if(!s) return;
            const d = document.createElement('div'); d.className = 'msg-container';
            const isMe = Core.user && Core.user.email.split('@')[0] === m.nickname;
            d.innerHTML = <div class="msg-nick" style="${isMe?'color:#4facfe':''}">${(m.nickname||'PILOT').toUpperCase()}</div><div class="msg-text">${m.message}</div>;
            s.appendChild(d); s.scrollTop = s.scrollHeight;
        },
        async send() {
            const i = document.getElementById('chat-in'); if(!i.value || !Core.user) return;
            const n = Core.user.email.split('@')[0];
            const { data, error } = await Core.sb.from('comments').insert([{message: i.value, nickname: n}]).select();
            if(!error) { this.render(data[0]); i.value = ''; }
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
            d.oncontextmenu = async (e) => { e.preventDefault(); await Core.sb.from('todo').delete().eq('id', t.id); d.remove(); };
            list.appendChild(d);
        },
        async add(val) {
            const { data, error } = await Core.sb.from('todo').insert([{ task: val, is_completed: false }]).select();
            if (!error) this.render(data[0]);
        }
    },

    Audio: {
        setup() { 
            this.el = new Audio('track.mp3'); 
            this.el.loop = true; this.el.volume = 0.15; 
        },
        toggle() { this.el.paused ? this.el.play() : this.el.pause(); }
    },

    loop() { Core.Canvas.draw(); requestAnimationFrame(() => Core.loop()); }
};

window.onload = () => Core.init();
