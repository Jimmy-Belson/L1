const Core = {
    sb: window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'),
    user: null,

    Msg(text, type = 'info') {
        const container = document.getElementById('notify-container');
        if (!container) return;
        const t = document.createElement('div');
        t.className = `toast ${type === 'error' ? 'error' : ''}`;
        t.innerHTML = `<span style="opacity:0.5">>></span> ${text}`;
        container.appendChild(t);
        setTimeout(() => {
            t.classList.add('hide');
            setTimeout(() => t.remove(), 400);
        }, 4000);
    },

    TogglePass() {
        const passInput = document.getElementById('pass');
        const toggleBtn = document.getElementById('toggle-pass');
        if (!passInput || !toggleBtn) return;
        if (passInput.type === 'password') {
            passInput.type = 'text';
            toggleBtn.classList.add('viewing');
            this.Msg("DECRYPTING_OVERSIGHT: VISIBLE");
        } else {
            passInput.type = 'password';
            toggleBtn.classList.remove('viewing');
            this.Msg("ENCRYPTING_OVERSIGHT: HIDDEN");
        }
    },

    init() {
        this.Canvas.init(); 
        this.Audio.setup(); 
        
        this.sb.auth.onAuthStateChange((event, session) => {
            const path = window.location.pathname.toLowerCase();
            const isLoginPage = path.includes('station.html');
            const isMainPage = path.endsWith('/') || path.includes('index.html');
            if (session) {
                this.user = session.user;
                if (isLoginPage) { window.location.href = 'index.html'; return; }
                if (document.getElementById('chat-stream')) this.Chat.load();
                if (document.getElementById('todo-list')) this.Todo.load();
            } else {
                if (isMainPage) { window.location.href = 'station.html'; return; }
            }
        });

        window.addEventListener('click', () => {
            const menu = document.getElementById('custom-menu');
            if(menu) menu.style.display = 'none';
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

    Auth: async () => {
        const emailEl = document.getElementById('email'), passEl = document.getElementById('pass');
        if(!emailEl || !passEl) return;
        const { error } = await Core.sb.auth.signInWithPassword({email:emailEl.value, password:passEl.value});
        if(error) Core.Msg("ACCESS_DENIED: " + error.message, "error");
    },

    Register: async () => {
        const emailEl = document.getElementById('email'), passEl = document.getElementById('pass');
        if(!emailEl || !passEl) return;
        const { error } = await Core.sb.auth.signUp({email:emailEl.value, password:passEl.value});
        if(error) Core.Msg("REG_ERROR: " + error.message, "error"); 
        else Core.Msg("PILOT_REGISTERED. INITIATE SESSION.");
    },

    Logout: async () => { await Core.sb.auth.signOut(); window.location.href = 'station.html'; },

    Todo: {
        async load() {
            const { data, error } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            if (error) return;
            const list = document.getElementById('todo-list');
            if (list) { list.innerHTML = ''; data.forEach(t => this.render(t)); }
        },
        render(t) {
            const list = document.getElementById('todo-list'); if (!list) return;
            const d = document.createElement('div');
            d.className = `task ${t.is_completed ? 'completed' : ''}`;
            d.draggable = true; d.innerText = '> ' + t.task.toUpperCase();
            d.onclick = async () => {
                const newState = !d.classList.contains('completed');
                d.classList.toggle('completed');
                await Core.sb.from('todo').update({ is_completed: newState }).eq('id', t.id);
            };
            d.oncontextmenu = async (ev) => {
                ev.preventDefault(); d.classList.add('removing');
                const { error } = await Core.sb.from('todo').delete().eq('id', t.id);
                if(!error) setTimeout(() => d.remove(), 400);
            };
            d.addEventListener('dragstart', () => setTimeout(() => d.classList.add('dragging'), 0));
            d.addEventListener('dragend', () => d.classList.remove('dragging'));
            list.appendChild(d);
        },
        async add(val) {
            const { data, error } = await Core.sb.from('todo').insert([{ task: val, is_completed: false }]).select();
            if (!error && data) this.render(data[0]);
        }
    },

   Chat: {
        async load() { 
            // Запрашиваем все данные (*), чтобы получить created_at
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending:false}).limit(50); 
            if(data) { 
                const stream = document.getElementById('chat-stream');
                if(stream) { stream.innerHTML = ''; data.reverse().forEach(m => this.render(m)); }
            } 
        },
        render(m) {
            const s = document.getElementById('chat-stream'); 
            if(!s) return;

            const d = document.createElement('div'); 
            d.className = 'msg-container';
            const isMy = Core.user && m.nickname === Core.user.email.split('@')[0];
            
            // Форматируем время
            const date = m.created_at ? new Date(m.created_at) : new Date();
            const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            d.innerHTML = `
                <div class="msg-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <span class="msg-nick" style="font-size:10px; font-family:'Orbitron'; ${isMy ? 'color:var(--n)' : 'color:var(--p)'}">
                        ${(m.nickname || 'PILOT').toUpperCase()}
                    </span>
                    <span class="msg-time" style="font-size:9px; opacity:0.4; font-family:'Share Tech Mono'">${timeStr}</span>
                </div>
                <div class="msg-text">${m.message}</div>
            `;

            if (isMy) {
                d.oncontextmenu = (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const menu = document.getElementById('custom-menu');
                    if(!menu) return;
                    menu.style.display = 'block'; menu.style.position = 'fixed';
                    menu.style.left = e.clientX + 'px'; menu.style.top = e.clientY + 'px';
                    menu.innerHTML = '<div class="menu-item">TERMINATE SIGNAL</div>';
                    menu.onclick = async (me) => {
                        me.stopPropagation();
                        if (!(await Core.sb.from('comments').delete().eq('id', m.id)).error) d.remove();
                        menu.style.display = 'none';
                    };
                };
            }
            s.appendChild(d);
            s.scrollTop = s.scrollHeight;
        },
        async send() { 
            const i = document.getElementById('chat-in'); if(!i || !i.value || !Core.user) return; 
            const n = Core.user.email.split('@')[0], v = i.value; i.value = ''; 
            const { data, error } = await Core.sb.from('comments').insert([{message: v, nickname: n}]).select();
            if(!error && data) this.render(data[0]);
        }
    },

    UI() {
        const todoIn = document.getElementById('todo-in'), todoList = document.getElementById('todo-list');
        if (todoIn) { todoIn.onkeypress = async (e) => { if (e.key === 'Enter' && e.target.value) { await this.Todo.add(e.target.value); e.target.value = ''; } }; }
        if (todoList) {
            todoList.addEventListener('dragover', (e) => {
                e.preventDefault(); const draggingItem = document.querySelector('.dragging'); if (!draggingItem) return;
                const siblings = [...todoList.querySelectorAll('.task:not(.dragging)')];
                const nextSibling = siblings.find(sibling => { const box = sibling.getBoundingClientRect(); return e.clientY <= box.top + box.height / 2; });
                if (nextSibling) todoList.insertBefore(draggingItem, nextSibling); else todoList.appendChild(draggingItem);
            });
        }
        const chatIn = document.getElementById('chat-in'); if (chatIn) { chatIn.onkeypress = (e) => { if(e.key === 'Enter') this.Chat.send(); }; }
    },

  Audio: {
        el: null,
        // Переименовали в setup, чтобы Core.init() не выдавал ошибку
        setup() {
            if (!this.el) {
                this.el = new Audio('track.mp3'); 
                this.el.loop = true;
                this.el.volume = 0.1;
            }

        },
        toggle() {
            this.setup();
            const btn = document.getElementById('audio-btn'); 
            
            if (this.el.paused) {
                this.el.play().catch(e => console.log("Нужен клик по странице"));
                if(btn) btn.classList.add('playing');
            } else {
                this.el.pause();
                if(btn) btn.classList.remove('playing');
            }
        }
    },
Canvas: {
        init() {
            this.cvs = document.getElementById('starfield'); 
            if(!this.cvs) return;
            this.ctx = this.cvs.getContext('2d');
            this.res();
            window.addEventListener('resize', () => this.res());
            
            // Инициализация объектов
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
                vx: (Math.random() - 0.5) * 0.3, 
                vy: (Math.random() - 0.5) * 0.3, 
                rot: Math.random() * Math.PI * 2, 
                vr: 0.005,
                p: Math.random() * Math.PI
            }));
            
            this.comet = { x: -100, y: 0, active: false };
        },

        res() { 
            if(this.cvs) { 
                this.cvs.width = window.innerWidth; 
                this.cvs.height = window.innerHeight; 
            } 
        },
        
        drawPlanet() {
            const ctx = this.ctx, x = this.cvs.width - 250, y = 250, r = 100;
            ctx.save();
            
            // Атмосфера
            ctx.shadowBlur = 40; ctx.shadowColor = 'rgba(79, 172, 254, 0.5)';
            
            // Поверхность (Градиент)
            const g = ctx.createRadialGradient(x-30, y-30, 10, x, y, r);
            g.addColorStop(0, '#4facfe'); g.addColorStop(0.8, '#001a33'); g.addColorStop(1, '#000');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
            
            // Кольцо
            ctx.restore();
            ctx.strokeStyle = 'rgba(79, 172, 254, 0.2)'; ctx.lineWidth = 3;
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI/5);
            ctx.beginPath(); ctx.ellipse(0, 0, r+70, 25, 0, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        },

        drawUFO() {
            const u = this.ufo, ctx = this.ctx;
            u.x += u.v; if(u.x > this.cvs.width + 300) { u.x = -300; u.parts = []; }
            const uy = u.y + Math.sin(Date.now() / 600) * 35;

            // След (частицы)
            if (Math.random() > 0.5) u.parts.push({x: u.x - 45, y: uy, a: 1.0, s: Math.random()*2+1});
            u.parts.forEach((p, i) => {
                p.x -= 1; p.a -= 0.015;
                if(p.a <= 0) u.parts.splice(i, 1);
                else { ctx.fillStyle = `rgba(0,255,255,${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill(); }
            });

            // Кабина и Диск
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)'; ctx.strokeStyle = '#0ff';
            ctx.beginPath(); ctx.arc(u.x, uy-5, 18, Math.PI, 0); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.ellipse(u.x, uy, 55, 14, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();

            // Огни
            const light = Math.floor(Date.now() / 200) % 5;
            for(let i=0; i<5; i++) {
                ctx.fillStyle = (i === light) ? '#f0f' : '#066';
                ctx.beginPath(); ctx.arc(u.x-30+(i*15), uy+4, 2.5, 0, Math.PI*2); ctx.fill();
            }
        },

        drawAstro(a) {
            const ctx = this.ctx, time = Date.now();
            a.x += a.vx; a.y += a.vy; a.rot += a.vr;
            if(a.x > this.cvs.width+100) a.x = -100; if(a.y > this.cvs.height+100) a.y = -100;

            ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
            // Костюм
            ctx.fillStyle = '#fff'; ctx.fillRect(-8, -12, 16, 24); // Тело
            ctx.fillRect(-7, -19, 14, 10); // Шлем
            // Визор (мерцает)
            ctx.fillStyle = `rgba(0, 242, 255, ${0.5 + Math.sin(time/400 + a.p)*0.4})`;
            ctx.fillRect(-5, -17, 10, 6);
            // Детали (рюкзак)
            ctx.fillStyle = '#ccc'; ctx.fillRect(-9, -8, 18, 14);
            ctx.restore();
        },

        draw() {
            if(!this.ctx) return;
            const ctx = this.ctx;
            ctx.fillStyle = '#01050a'; ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
            
            // Звёзды
            this.stars.forEach(s => {
                s.x -= s.v; if(s.x < 0) s.x = this.cvs.width;
                ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(Math.sin(Date.now()/1000 + s.p))})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill();
            });

            this.drawPlanet();
            this.drawUFO();
            this.crew.forEach(a => this.drawAstro(a));
        }
    },
     loop() {
        if (this.Canvas && this.Canvas.draw) {
            this.Canvas.draw();
        }
        requestAnimationFrame(() => this.loop());
    }
};


