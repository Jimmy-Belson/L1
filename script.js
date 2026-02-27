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
            }
        });
        this.UI();
        this.loop();
    },

    UI() {
        const tl = document.getElementById('todo-list');
        if (tl) {
            tl.addEventListener('dragover', (e) => {
                e.preventDefault();
                const dragging = document.querySelector('.dragging');
                if (!dragging) return;
                const afterElement = [...tl.querySelectorAll('.task:not(.dragging)')].reduce((closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = e.clientY - box.top - box.height / 2;
                    if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
                    else return closest;
                }, { offset: Number.NEGATIVE_INFINITY }).element;
                if (afterElement == null) tl.appendChild(dragging);
                else tl.insertBefore(dragging, afterElement);
            });
        }
    },

    Chat: {
        async load() { 
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending:false}).limit(50); 
            if(data) { const s = document.getElementById('chat-stream'); s.innerHTML = ''; data.reverse().forEach(m => this.render(m)); } 
        },
        render(m) {
            const s = document.getElementById('chat-stream'); if(!s) return;
            const d = document.createElement('div'); d.className = 'msg-container';
            d.innerHTML = `<div class="msg-nick">${(m.nickname||'PILOT').toUpperCase()}</div><div class="msg-text">${m.message}</div>`;
            s.appendChild(d); s.scrollTop = s.scrollHeight;
        }
    },

    Todo: {
        async load() {
            const { data } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            const l = document.getElementById('todo-list'); if (l && data) { l.innerHTML = ''; data.forEach(t => this.render(t)); }
        },
        render(t) {
            const l = document.getElementById('todo-list');
            const d = document.createElement('div'); d.className = 'task'; d.draggable = true;
            d.innerText = '> ' + t.task.toUpperCase();
            d.addEventListener('dragstart', () => d.classList.add('dragging'));
            d.addEventListener('dragend', () => d.classList.remove('dragging'));
            l.appendChild(d);
        }
    },

    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield');
            this.ctx = this.cvs.getContext('2d');
            this.res();
            window.addEventListener('resize', () => this.res());
            this.stars = Array.from({length:150}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, v:Math.random()*0.5, s:Math.random()*2}));
            this.ufo = {x:-200, y:300, v:1.5, parts: []};
            this.crew = Array.from({length:2}, () => ({x:Math.random()*500, y:Math.random()*500, vx:0.2, vy:0.1, rot:0, phase:Math.random()*10}));
            this.comet = {x: -100, y: 0, active: false};
        },
        res() { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; },
        
        drawPlanet() {
            const ctx = this.ctx;
            const x = this.cvs.width - 200, y = 200, r = 80;
            ctx.save();
            // Сама планета
            const g = ctx.createRadialGradient(x-20, y-20, 5, x, y, r);
            g.addColorStop(0, '#4facfe'); g.addColorStop(1, '#001a33');
            ctx.fillStyle = g;
            ctx.shadowBlur = 40; ctx.shadowColor = '#4facfe';
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
            // Полоски атмосферы (исправлено)
            ctx.shadowBlur = 0; ctx.globalAlpha = 0.2; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            for(let i=-r; i<r; i+=15) {
                ctx.beginPath();
                const sw = Math.sqrt(r*r - i*i); // Ширина полоски по сфере
                ctx.moveTo(x - sw, y + i); ctx.lineTo(x + sw, y + i); ctx.stroke();
            }
            ctx.restore();
            // Кольцо
            ctx.strokeStyle = 'rgba(79, 172, 254, 0.3)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.ellipse(x, y, r+40, 20, Math.PI/6, 0, Math.PI*2); ctx.stroke();
        },

        drawUFO() {
            const u = this.ufo, ctx = this.ctx;
            u.x += u.v; if(u.x > this.cvs.width + 100) u.x = -100;
            const uy = u.y + Math.sin(Date.now()/500)*20;
            // След (партиклы)
            if(Math.random() > 0.5) u.parts.push({x: u.x-40, y: uy, a: 1});
            u.parts.forEach((p, i) => {
                p.x -= 0.5; p.a -= 0.02;
                ctx.fillStyle = `rgba(0, 255, 255, ${p.a})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI*2); ctx.fill();
                if(p.a <= 0) u.parts.splice(i, 1);
            });
            // Корпус
            ctx.fillStyle = '#1a1a1a'; ctx.strokeStyle = '#0ff';
            ctx.beginPath(); ctx.ellipse(u.x, uy, 40, 10, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            // Огни (диоды)
            for(let i=0; i<5; i++) {
                ctx.fillStyle = (Math.floor(Date.now()/200)%5 === i) ? '#f0f' : '#0ff';
                ctx.beginPath(); ctx.arc(u.x-20+i*10, uy+2, 1.5, 0, Math.PI*2); ctx.fill();
            }
        },

        drawAstro(a) {
            const ctx = this.ctx; a.x += a.vx; a.y += a.vy; a.phase += 0.03;
            const s = Math.sin(a.phase)*5;
            ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.phase*0.1);
            // Конечности
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(-10, 15+s); ctx.stroke(); // Левая нога
            ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(10, 15-s); ctx.stroke();  // Правая нога
            // Тело
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(-6, -10, 12, 20, 3); ctx.fill();
            // Визор
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.roundRect(-4, -8, 8, 5, 2); ctx.fill();
            ctx.restore();
        },

        draw() {
            this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
            // Звезды
            this.ctx.fillStyle = '#fff';
            this.stars.forEach(s => {
                s.x -= s.v; if(s.x < 0) s.x = this.cvs.width;
                this.ctx.globalAlpha = 0.5 + Math.sin(Date.now()/500)*0.5;
                this.ctx.beginPath(); this.ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); this.ctx.fill();
            });
            this.ctx.globalAlpha = 1;
            
            // Комета
            if(!this.comet.active && Math.random() < 0.005) { this.comet = {x:this.cvs.width+50, y:Math.random()*300, active:true}; }
            if(this.comet.active) {
                this.comet.x -= 10; this.comet.y += 2;
                this.ctx.strokeStyle = '#0ff'; ctx.beginPath(); this.ctx.moveTo(this.comet.x, this.comet.y); this.ctx.lineTo(this.comet.x+50, this.comet.y-10); this.ctx.stroke();
                if(this.comet.x < -100) this.comet.active = false;
            }

            this.drawPlanet();
            this.drawUFO();
            this.crew.forEach(a => this.drawAstro(a));
        }
    },

    loop() {
        this.Canvas.draw();
        requestAnimationFrame(() => this.loop());
    }
};

window.onload = () => Core.init();
