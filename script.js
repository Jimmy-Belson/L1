const Core = {
    sb: window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'),
    user: null,

    init() {
        this.Canvas.init();
        this.sb.auth.onAuthStateChange((event, session) => {
            if (session) {
                this.user = session.user;
                if (document.getElementById('chat-stream')) this.Chat.load();
                if (document.getElementById('todo-list')) this.Todo.load();
            } else {
                if (!window.location.pathname.includes('station.html')) window.location.href = 'station.html';
            }
        });
        this.UI();
        this.loop();
    },

    UI() {
        // Логика Чата
        const ci = document.getElementById('chat-in');
        if (ci) ci.onkeypress = (e) => { if(e.key === 'Enter') this.Chat.send(); };

        // Логика Todo (Drag & Drop)
        const tl = document.getElementById('todo-list');
        if (tl) {
            tl.addEventListener('dragover', (e) => {
                e.preventDefault();
                const drg = document.querySelector('.dragging');
                if (!drg) return;
                const siblings = [...tl.querySelectorAll('.task:not(.dragging)')];
                const next = siblings.find(sib => {
                    const box = sib.getBoundingClientRect();
                    return e.clientY <= box.top + box.height / 2;
                });
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
            if(data) { const s = document.getElementById('chat-stream'); s.innerHTML = ''; data.reverse().forEach(m => this.render(m)); } 
        },
        render(m) {
            const s = document.getElementById('chat-stream'); if(!s) return;
            const d = document.createElement('div'); d.className = 'msg-container';
            const isMy = Core.user && m.nickname === Core.user.email.split('@')[0];
            d.innerHTML = `<div class="msg-nick" style="${isMy?'color:var(--n)':''}">${(m.nickname||'PILOT').toUpperCase()}</div><div class="msg-text">${m.message}</div>`;
            
            if (isMy) {
                d.oncontextmenu = (e) => {
                    e.preventDefault();
                    const menu = document.getElementById('custom-menu');
                    menu.style.display = 'block'; menu.style.left = e.pageX + 'px'; menu.style.top = e.pageY + 'px';
                    menu.innerHTML = '<div class="menu-item">Terminate Signal</div>';
                    menu.onclick = async () => { if (!(await Core.sb.from('comments').delete().eq('id', m.id)).error) d.remove(); };
                };
            }
            s.appendChild(d); s.scrollTop = s.scrollHeight;
        },
        async send() {
            const i = document.getElementById('chat-in'); if(!i.value || !Core.user) return;
            const nick = Core.user.email.split('@')[0];
            const { data } = await Core.sb.from('comments').insert([{message: i.value, nickname: nick}]).select();
            if(data) { this.render(data[0]); i.value = ''; }
        }
    },

    Todo: {
        async load() {
            const { data } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            const l = document.getElementById('todo-list'); if (l && data) { l.innerHTML = ''; data.forEach(t => this.render(t)); }
        },
        render(t) {
            const l = document.getElementById('todo-list');
            const d = document.createElement('div'); d.className = `task ${t.is_completed?'completed':''}`;
            d.draggable = true; d.innerText = '> ' + t.task.toUpperCase();
            d.addEventListener('dragstart', () => d.classList.add('dragging'));
            d.addEventListener('dragend', () => d.classList.remove('dragging'));
            d.onclick = async () => {
                const state = !d.classList.contains('completed');
                d.classList.toggle('completed');
                await Core.sb.from('todo').update({ is_completed: state }).eq('id', t.id);
            };
            d.oncontextmenu = async (e) => { e.preventDefault(); if(!(await Core.sb.from('todo').delete().eq('id', t.id)).error) d.remove(); };
            l.appendChild(d);
        }
    },

    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield'); this.ctx = this.cvs.getContext('2d');
            this.res(); window.addEventListener('resize', () => this.res());
            this.stars = Array.from({length:150}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, s:Math.random()*2, v:Math.random()*0.4}));
            this.ufo = {x:-200, y:300, v:1.8, parts: []};
            this.crew = Array.from({length:2}, () => ({x:Math.random()*400, y:Math.random()*400, vx:0.2, vy:0.1, rot:0, p:Math.random()*10}));
            this.comet = {x:-100, y:0, active:false};
        },
        res() { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; },
        
        drawPlanet() {
            const ctx = this.ctx, x = this.cvs.width - 250, y = 250, r = 100;
            ctx.save();
            // Атмосферное свечение
            ctx.shadowBlur = 50; ctx.shadowColor = '#4facfe';
            const g = ctx.createRadialGradient(x-30, y-30, 10, x, y, r);
            g.addColorStop(0, '#4facfe'); g.addColorStop(0.8, '#001a33'); g.addColorStop(1, '#000');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
            // Полосы на поверхности
            ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 10;
            for(let i=-r; i<r; i+=15) {
                const w = Math.sqrt(r*r - i*i);
                ctx.beginPath(); ctx.moveTo(x-w, y+i); ctx.lineTo(x+w, y+i); ctx.stroke();
            }
            ctx.restore();
            // Кольца
            ctx.strokeStyle = 'rgba(79, 172, 254, 0.2)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(x, y, r+60, 20, Math.PI/4, 0, Math.PI*2); ctx.stroke();
        },

        drawUFO() {
            const u = this.ufo, ctx = this.ctx;
            u.x += u.v; if(u.x > this.cvs.width+200) u.x = -200;
            const uy = u.y + Math.sin(Date.now()/600)*30;
            // Частицы шлейфа
            if(Math.random()>0.3) u.parts.push({x:u.x-40, y:uy, a:1});
            u.parts.forEach((p,i) => {
                p.x -= 0.8; p.a -= 0.02;
                ctx.fillStyle = `rgba(0,255,255,${p.a})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
                if(p.a<=0) u.parts.splice(i,1);
            });
            // Корпус
            ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.ellipse(u.x, uy, 50, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            // Мигающие диоды (5 штук)
            for(let i=0; i<5; i++) {
                ctx.fillStyle = (Math.floor(Date.now()/150)%5 === i) ? '#f0f' : '#066';
                ctx.beginPath(); ctx.arc(u.x-30+i*15, uy+3, 2, 0, Math.PI*2); ctx.fill();
            }
        },

        drawAstro(a) {
            const ctx = this.ctx; a.x += a.vx; a.y += a.vy; a.p += 0.03;
            const swing = Math.sin(a.p)*5;
            ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.p*0.1);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
            // Ноги и руки
            ctx.beginPath(); ctx.moveTo(-4,8); ctx.lineTo(-7,18+swing); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(4,8); ctx.lineTo(7,18-swing); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(-12,8+swing); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(6,0); ctx.lineTo(12,8-swing); ctx.stroke();
            // Рюкзак и тело
            ctx.fillStyle = '#ccc'; ctx.fillRect(-9,-6,18,12);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-7,-12,14,24,4); ctx.fill();
            // Визор шлема
            ctx.fillStyle = '#000'; ctx.strokeStyle = '#4facfe'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.roundRect(-4,-9,8,6,2); ctx.fill(); ctx.stroke();
            ctx.restore();
        },

        draw() {
            const ctx = this.ctx; ctx.clearRect(0,0,this.cvs.width,this.cvs.height);
            // Звезды
            this.stars.forEach(s => {
                s.x -= s.v; if(s.x < 0) s.x = this.cvs.width;
                ctx.fillStyle = `rgba(255,255,255,${0.3+Math.abs(Math.sin(Date.now()/1000))})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill();
            });
            // Кометы
            if(!this.comet.active && Math.random() < 0.004) this.comet = {x:this.cvs.width+100, y:Math.random()*400, active:true};
            if(this.comet.active) {
                this.comet.x -= 12; this.comet.y += 3;
                ctx.strokeStyle = '#0ff'; ctx.beginPath(); ctx.moveTo(this.comet.x, this.comet.y); ctx.lineTo(this.comet.x+60, this.comet.y-15); ctx.stroke();
                if(this.comet.x < -100) this.comet.active = false;
            }
            this.drawPlanet();
            this.drawUFO();
            this.crew.forEach(a => this.drawAstro(a));
        }
    },
    loop() { Core.Canvas.draw(); requestAnimationFrame(() => Core.loop()); }
};
window.onload = () => Core.init();
