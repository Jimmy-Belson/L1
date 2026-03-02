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
    
    // Чистая структура: Ник и Текст отдельно
    d.innerHTML = `
        <div class="msg-nick" style="${isMy ? 'color:var(--n)' : ''}">
            ${(m.nickname || 'PILOT').toUpperCase()}
        </div>
        <div class="msg-text">${m.message}</div>
    `;

    // Логика удаления (ПКМ)
    if (isMy) {
        d.oncontextmenu = (e) => {
            e.preventDefault(); e.stopPropagation();
            const menu = document.getElementById('custom-menu');
            if(!menu) return;
            menu.style.display = 'block';
            menu.style.position = 'fixed';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
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
            this.res(); window.addEventListener('resize', () => this.res());
            
            // Звёзды (мерцающие)
            this.stars = Array.from({length:150}, () => ({
                x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, 
                s:Math.random()*2, v:Math.random()*0.3, p:Math.random()*Math.PI
            }));
            
            // НЛО (детализированное)
            this.ufo = {x:-250, y:350, v:2.1, parts: []}; // Увеличили скорость
            
            // Астронавты (детализированные)
            this.crew = Array.from({length:3}, () => ({
                x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, 
                vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3, 
                rot:Math.random()*Math.PI*2, vr:0.005, p:Math.random()*Math.PI*2
            }));
            
            // Комета
            this.comet = {x:-100, y:0, active:false};
        },
        res() { if(this.cvs) { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; } },
        
        // --- ПРОРАБОТАННАЯ ПЛАНЕТА ---
        drawPlanet() {
            const ctx = this.ctx, x = this.cvs.width - 250, y = 250, r = 100;
            ctx.save();
            
            // 1. Мягкая внешняя атмосфера (Swaying atmosphere)
            ctx.shadowBlur = 50; 
            ctx.shadowColor = 'rgba(79, 172, 254, 0.4)';
            
            // 2. Глубокий градиент поверхности (Planet Core)
            const planetGrad = ctx.createRadialGradient(x-30, y-30, 10, x, y, r);
            planetGrad.addColorStop(0, '#4facfe'); // Яркий центр
            planetGrad.addColorStop(0.8, '#001a33'); // Глубокий синий
            planetGrad.addColorStop(1, '#000'); // Черная тень
            
            ctx.fillStyle = planetGrad; 
            ctx.beginPath(); 
            ctx.arc(x, y, r, 0, Math.PI*2); 
            ctx.fill();
            
            // 3. Тень для объема (Atmospheric Shadow)
            ctx.shadowBlur = 0; // Сброс тени
            const shadowGrad = ctx.createLinearGradient(x-r, y-r, x+r, y+r);
            shadowGrad.addColorStop(0, 'rgba(0,0,0,0.1)'); // Свет
            shadowGrad.addColorStop(0.6, 'rgba(0,0,0,0.8)'); // Тень
            shadowGrad.addColorStop(1, 'rgba(0,0,0,1)'); // Полная тень
            
            ctx.fillStyle = shadowGrad; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
            
            ctx.restore(); // Сброс всех стилей и теней

            // 4. Кольцо планеты (Subtle Ring)
            ctx.strokeStyle = 'rgba(79, 172, 254, 0.15)'; // Очень тусклое
            ctx.lineWidth = 4;
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI/5);
            ctx.beginPath(); ctx.ellipse(0, 0, r+70, 25, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
        },

        // --- ДЕТАЛИЗИРОВАННОЕ НЛО ---
        drawUFO() {
            const u = this.ufo, ctx = this.ctx;
            u.x += u.v; if(u.x > this.cvs.width + 250) u.x = -250;
            const uy = u.y + Math.sin(Date.now() / 600) * 35; // Покачивание

            // 1. Инверсионный след (Particles)
            if (Math.random() > 0.4) {
                u.parts.push({
                    x: u.x - 45, 
                    y: uy + (Math.random() - 0.5) * 8, 
                    a: 1.0, // Прозрачность
                    s: Math.random() * 3 + 1 // Размер
                });
            }

            u.parts.forEach((p, i) => {
                p.x -= 1.2; p.a -= 0.02; // Частицы отстают и исчезают
                if (p.a <= 0) u.parts.splice(i, 1);
                else { ctx.fillStyle = `rgba(0, 255, 255, ${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); }
            });

            // 2. Классический диск (Metal Hull)
            // Купол
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)'; // Полупрозрачный голубой
            ctx.strokeStyle = '#0ff'; // Яркий неон
            ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(u.x, uy - 5, 18, Math.PI, 0); ctx.fill(); ctx.stroke();

            // Тарелка (Темный металл с неоном)
            ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(u.x, uy, 55, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

            // 3. Мерцающие неоновые огни (Running Lights)
            const activeLight = Math.floor(Date.now() / 150) % 5;
            for (let i = 0; i < 5; i++) {
                ctx.fillStyle = (i === activeLight) ? '#f0f' : '#066'; // Активный огонь — розовый
                ctx.beginPath(); ctx.arc(u.x - 30 + i * 15, uy + 4, 2.5, 0, Math.PI * 2); ctx.fill();
                
                if (i === activeLight) { // Свечение для активного огня
                    ctx.shadowBlur = 10; ctx.shadowColor = '#f0f';
                    ctx.beginPath(); ctx.arc(u.x - 30 + i * 15, uy + 4, 3, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0; // Сброс
                }
            }
        },

        // --- ДЕТАЛИЗИРОВАННЫЕ АСТРОНАВТЫ ---
        drawAstro(a) {
            const ctx = this.ctx, time = Date.now();
            a.x += a.vx; a.y += a.vy; a.rot += a.vr;
            
            // Бесконечное пространство
            if(a.x > this.cvs.width+100) a.x = -100; if(a.x < -100) a.x = this.cvs.width+100;
            if(a.y > this.cvs.height+100) a.y = -100; if(a.y < -100) a.y = this.cvs.height+100;

            ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
            
            // 1. Костюм (Body & Helmet)
            ctx.fillStyle = '#fff'; ctx.fillRect(-8, -12, 16, 24); // Тело
            ctx.fillStyle = '#fefefe'; ctx.fillRect(-7, -19, 14, 10); // Шлем
            
            // Визор (Мерцающий)
            ctx.fillStyle = `rgba(0, 242, 255, ${0.7 + Math.sin(time/200 + a.p)*0.2})`; ctx.fillRect(-5, -17, 10, 6);
            
            // 2. Рюкзак (Life Support)
            ctx.fillStyle = '#ccc'; ctx.fillRect(-10, -8, 20, 16);
            // Мерцающий индикатор
            ctx.fillStyle = (Math.sin(time/300 + a.p) > 0) ? '#f00' : '#033'; ctx.beginPath(); ctx.arc(-7, -4, 1.5, 0, Math.PI*2); ctx.fill();

            // 3. Конечности (Arms & Legs)
            ctx.fillStyle = '#fff'; ctx.fillRect(-12, -10, 4, 14); // Рука л
            ctx.fillRect(8, -10, 4, 14); // Рука п
            ctx.fillRect(-6, 12, 5, 8); // Нога л
            ctx.fillRect(1, 12, 5, 8); // Нога п

            ctx.restore();
        },

        // --- ГЛАВНЫЙ ЦИКЛ ---
        draw() {
            if(!this.ctx) return;
            const ctx = this.ctx;
            
            // Фоновая заливка (Глубокий космос)
            ctx.fillStyle = '#01050a'; ctx.fillRect(0,0,this.cvs.width,this.cvs.height);
            
            // 1. Отрисовка Звёзд
            this.stars.forEach(s => {
                s.x -= s.v; if(s.x < 0) s.x = this.cvs.width;
                // Мерцание (Sinusoidal opacity)
                ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(Math.sin(Date.now()/1000 + s.p))})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill();
            });
            
            // 2. Отрисовка Кометы
            if(!this.comet.active && Math.random() < 0.003) this.comet = {x:this.cvs.width+100, y:Math.random()*400, active:true};
            if(this.comet.active) {
                this.comet.x -= 15; this.comet.y += 3;
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.comet.x, this.comet.y); ctx.lineTo(this.comet.x+40, this.comet.y-10); ctx.stroke();
                if(this.comet.x < -100) this.comet.active = false;
            }
            
            // 3. Сначала планета (она на фоне)
            this.drawPlanet(); 
            
            // 4. Потом НЛО
            this.drawUFO(); 
            
            // 5. И сверху астронавты
            this.crew.forEach(a => this.drawAstro(a));
        }
    },
}