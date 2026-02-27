const Core = {
    sb: window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'),
    user: null,

    // --- ВХОД (ДЛЯ STATION.HTML) ---
    async Auth() {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('pass').value;
        if(!email || !pass) return alert("REQUIRED: IDENTIFIER & CODE");

        const { data, error } = await this.sb.auth.signInWithPassword({ email, password: pass });
        if (error) alert("ACCESS DENIED: " + error.message);
        else window.location.href = 'index.html';
    },

    // --- РЕГИСТРАЦИЯ (ДЛЯ STATION.HTML) ---
    async Register() {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('pass').value;
        if(!email || !pass) return alert("REQUIRED: EMAIL & PASS");

        const { error } = await this.sb.auth.signUp({ email, password: pass });
        if (error) alert("REGISTRATION FAILED: " + error.message);
        else { alert("ID CREATED. CONNECTING..."); window.location.href = 'index.html'; }
    },

    // --- ВЫХОД ---
    async Logout() {
        const { error } = await this.sb.auth.signOut();
        if (!error) window.location.href = 'station.html'; 
    },

    // --- ГЛАЗОК ПАРОЛЯ ---
    TogglePass() {
        const p = document.getElementById('pass');
        const w = document.querySelector('.password-wrapper');
        if (!p) return;
        p.type = (p.type === "password") ? "text" : "password";
        if(w) w.classList.toggle('viewing');
    },

   Audio: {
        el: null,
        init() {
            if (!this.el) {
                this.el = new Audio('track.mp3'); 
                this.el.loop = true;
                this.el.volume = 0.1;
            }
        },
        toggle() {
            this.init();
            const btn = document.getElementById('audio-btn'); 
            
            if (this.el.paused) {
                this.el.play().catch(e => console.log("Нужен клик по странице"));
                if(btn) btn.classList.add('playing');
                console.log("MUSIC: START, CLASS: ADDED");
            } else {
                this.el.pause();
                if(btn) btn.classList.remove('playing');
                console.log("MUSIC: STOP, CLASS: REMOVED");
            }
        }
    },
    init() {
        this.Canvas.init();
        this.sb.auth.onAuthStateChange((event, session) => {
            if (session) {
                this.user = session.user;
                if (document.getElementById('chat-stream')) this.Chat.load();
                if (document.getElementById('todo-list')) this.Todo.load();
            } else if (!window.location.pathname.includes('station.html')) {
                window.location.href = 'station.html';
            }
        });
        this.UI();
        this.loop();
    },

    UI() {
    const musicBtn = document.getElementById('music-engine-btn');
    if (musicBtn) {
        musicBtn.onclick = () => this.Audio.toggle();
    }
        const upClock = () => {
            const el = document.getElementById('clock');
            if(el) el.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        };
        setInterval(upClock, 1000); upClock();

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.onclick = () => this.Logout();

        const btn = document.getElementById('chat-send');
        if(btn) btn.onclick = () => this.Chat.send();
        
        const ci = document.getElementById('chat-in');
        if(ci) ci.onkeypress = (e) => { if(e.key === 'Enter') this.Chat.send(); };

        const ti = document.getElementById('todo-in');
        if(ti) {
            ti.onkeypress = async (e) => {
                if(e.key === 'Enter' && e.target.value.trim()) {
                    await this.Todo.add(e.target.value.trim());
                    e.target.value = '';
                }
            };
        }

        const tl = document.getElementById('todo-list');
        if(tl) {
            tl.addEventListener('dragover', (e) => {
                e.preventDefault();
                const drg = document.querySelector('.dragging');
                if(!drg) return;
                const siblings = [...tl.querySelectorAll('.task:not(.dragging)')];
                const next = siblings.find(sib => e.clientY <= sib.getBoundingClientRect().top + sib.offsetHeight/2);
                tl.insertBefore(drg, next || null);
            });
        }

        window.onclick = () => { 
            const m = document.getElementById('custom-menu');
            if(m) m.style.display = 'none'; 
        };
    },

    Chat: {
        async load() { 
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending:false}).limit(30); 
            if(data) { 
                const s = document.getElementById('chat-stream'); 
                if(s) {
                    s.innerHTML = ''; 
                    data.reverse().forEach(m => this.render(m)); 
                }
            } 
        },
        render(m) {
            const s = document.getElementById('chat-stream'); 
            if(!s) return;
            
            const d = document.createElement('div'); 
            d.className = 'msg-container';
            const isMy = Core.user && m.nickname === Core.user.email.split('@')[0];
            d.innerHTML = <div class="msg-nick" style="${isMy?'color:var(--n)':''}">${(m.nickname||'PILOT').toUpperCase()}</div><div class="msg-text">${m.message}</div>;
            
            // ВОТ ТУТ ВОЗВРАЩАЕМ УДАЛЕНИЕ
            d.oncontextmenu = (e) => {
                if (!isMy) return; // Удалять можно только свои
                e.preventDefault();
                const menu = document.getElementById('custom-menu');
                if(!menu) return;

                menu.style.display = 'block'; 
                menu.style.left = e.pageX + 'px'; 
                menu.style.top = e.pageY + 'px';
                menu.innerHTML = '<div class="menu-item">TERMINATE SIGNAL</div>';
                
                menu.onclick = async () => { 
                    const { error } = await Core.sb.from('comments').delete().eq('id', m.id);
                    if (!error) d.remove(); 
                    menu.style.display = 'none';
                };
            };
            s.appendChild(d); 
            s.scrollTop = s.scrollHeight;
        },
        async send() {
            const i = document.getElementById('chat-in'); 
            if(!i || !i.value || !Core.user) return;
            const nick = Core.user.email.split('@')[0];
            const { data, error } = await Core.sb.from('comments').insert([{message: i.value, nickname: nick}]).select();
            if(data) { this.render(data[0]); i.value = ''; }
        }
    },

    Todo: {
        async load() {
            const { data } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            const l = document.getElementById('todo-list'); if (l && data) { l.innerHTML = ''; data.forEach(t => this.render(t)); }
        },
        async add(task) {
            const { data } = await Core.sb.from('todo').insert([{task: task, is_completed: false}]).select();
            if(data) this.render(data[0]);
        },
        render(t) {
            const l = document.getElementById('todo-list'); 
            if (!l) return;

            const d = document.createElement('div');
            // ВАЖНО: Используем обратные кавычки для работы классов
            d.className = `task ${t.is_completed ? 'completed' : ''}`;
            d.draggable = true;
            d.innerText = '> ' + t.task.toUpperCase();

            // Drag & Drop события
            d.addEventListener('dragstart', () => d.classList.add('dragging'));
            d.addEventListener('dragend', () => d.classList.remove('dragging'));

            // КЛИК: Перечеркивание задачи
            d.onclick = async () => {
                const state = !d.classList.contains('completed');
                d.classList.toggle('completed'); // Визуально переключаем сразу
                
                // Обновляем в Supabase
                await Core.sb.from('todo')
                    .update({ is_completed: state })
                    .eq('id', t.id);
            };

            // ПРАВЫЙ КЛИК: Удаление с анимацией
            d.oncontextmenu = async (e) => {
                e.preventDefault();
                d.classList.add('removing'); // Запускаем твою CSS анимацию taskExit

                setTimeout(async () => {
                    const { error } = await Core.sb.from('todo').delete().eq('id', t.id);
                    if (!error) {
                        d.remove(); 
                    } else {
                        d.classList.remove('removing'); // Если ошибка, возвращаем в строй
                        console.error("TERMINATION_FAILED");
                    }
                }, 400); // Задержка под твой CSS (0.4s)
            };

            l.appendChild(d);
        }
    },

    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield'); 
            if(!this.cvs) return;
            this.ctx = this.cvs.getContext('2d');
            this.res(); window.addEventListener('resize', () => this.res());
            this.stars = Array.from({length:150}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, s:Math.random()*2, v:Math.random()*0.3, p:Math.random()*Math.PI}));
            this.ufo = {x:-200, y:350, v:1.8, parts: []};
            this.crew = Array.from({length:3}, () => ({
                x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, 
                vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3, 
                rot:Math.random()*Math.PI*2, vr:0.005
            }));
            this.comet = {x:-100, y:0, active:false};
        },
        res() { if(this.cvs) { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; } },
        
        drawPlanet() {
            const ctx = this.ctx, x = this.cvs.width - 250, y = 250, r = 100;
            ctx.save();
            ctx.shadowBlur = 50; ctx.shadowColor = 'rgba(79, 172, 254, 0.4)';
            const g = ctx.createRadialGradient(x-30, y-30, 10, x, y, r);
            g.addColorStop(0, '#4facfe'); g.addColorStop(0.8, '#001a33'); g.addColorStop(1, '#000');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
            ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 10;
            for(let i=-r; i<r; i+=18) {
                const w = Math.sqrt(r*r - i*i);
                ctx.beginPath(); ctx.moveTo(x-w, y+i); ctx.lineTo(x+w, y+i); ctx.stroke();
            }
            ctx.restore();
            ctx.strokeStyle = 'rgba(79, 172, 254, 0.15)'; ctx.lineWidth = 4;
            ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI/5);
            ctx.beginPath(); ctx.ellipse(0, 0, r+70, 25, 0, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        },

        drawUFO() {
            const u = this.ufo, ctx = this.ctx;
            u.x += u.v; if(u.x > this.cvs.width + 250) u.x = -250;
            const uy = u.y + Math.sin(Date.now() / 600) * 35;
            if (Math.random() > 0.4) u.parts.push({x: u.x - 45, y: uy + (Math.random() - 0.5) * 8, a: 1.0, s: Math.random() * 3 + 1});
            u.parts.forEach((p, i) => {
                p.x -= 1.2; p.a -= 0.02; 
                if (p.a <= 0) u.parts.splice(i, 1);
                else { ctx.fillStyle = `rgba(0, 255, 255, ${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); }
            });
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)'; ctx.strokeStyle = '#0ff'; ctx.beginPath(); ctx.arc(u.x, uy-5, 18, Math.PI, 0); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#0ff'; ctx.beginPath(); ctx.ellipse(u.x, uy, 55, 14, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        },

        drawAstro(a) {
    const ctx = this.ctx;
    a.x += a.vx; a.y += a.vy; a.rot += a.vr;
    if(a.x > this.cvs.width+100) a.x = -100; if(a.x < -100) a.x = this.cvs.width+100;
    if(a.y > this.cvs.height+100) a.y = -100; if(a.y < -100) a.y = this.cvs.height+100;

    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
    
    ctx.fillStyle = '#ccc'; ctx.fillRect(-10, -6, 20, 12); 
    ctx.fillStyle = '#fff'; ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(-8, -14, 16, 26, 5); else ctx.rect(-8, -14, 16, 26);
    ctx.fill();

    ctx.fillStyle = '#000'; ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(-5, -11, 10, 8, 3); else ctx.rect(-5, -11, 10, 8);
    ctx.fill();

    ctx.strokeStyle = '#fff'; 
    ctx.lineWidth = 3; 
    ctx.lineCap = 'round';
    
    ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(-8, 18); ctx.stroke();  
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(8, 18); ctx.stroke();   
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-13, 6); ctx.stroke(); 
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(13, 6); ctx.stroke();   
    
    ctx.restore();
},

        draw() {
            if(!this.ctx) return;
            const ctx = this.ctx;
            ctx.fillStyle = '#01050a'; ctx.fillRect(0,0,this.cvs.width,this.cvs.height);
            this.stars.forEach(s => {
                s.x -= s.v; if(s.x < 0) s.x = this.cvs.width;
                ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(Math.sin(Date.now()/1000 + s.p))})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill();
            });
            if(!this.comet.active && Math.random() < 0.003) this.comet = {x:this.cvs.width+100, y:Math.random()*400, active:true};
            if(this.comet.active) {
                this.comet.x -= 15; this.comet.y += 3;
                ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(this.comet.x, this.comet.y); ctx.lineTo(this.comet.x+40, this.comet.y-10); ctx.stroke();
                if(this.comet.x < -100) this.comet.active = false;
            }
            this.drawPlanet(); this.drawUFO(); this.crew.forEach(a => this.drawAstro(a));
        }
    },
    loop() { if(this.Canvas.ctx) this.Canvas.draw(); requestAnimationFrame(() => this.loop()); }
};
window.onload = () => Core.init();
