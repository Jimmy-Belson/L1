const Core = {
    sb: window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'),
    user: null,

    init() {
        this.Canvas.init(); 
        this.Audio.setup(); 
        
        this.sb.auth.onAuthStateChange((event, session) => {
            const path = window.location.pathname.toLowerCase();
            const isLoginPage = path.includes('station.html');
            const isMainPage = path.endsWith('/') || path.includes('index.html') || path.endsWith('/l1/');

            if (session) {
                this.user = session.user;
                if (isLoginPage) {
                    window.location.href = 'index.html'; 
                    return;
                }
                // Загрузка данных при входе
                if (document.getElementById('chat-stream')) this.Chat.load();
                if (document.getElementById('todo-list')) this.Todo.load();
            } else {
                if (isMainPage) {
                    window.location.href = 'station.html';
                    return;
                }
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

    Auth: async () => {
        const emailEl = document.getElementById('email');
        const passEl = document.getElementById('pass');
        if(!emailEl || !passEl) return;
        const { error } = await Core.sb.auth.signInWithPassword({email:emailEl.value, password:passEl.value});
        if(error) alert("ACCESS_DENIED: " + error.message);
    },

    Register: async () => {
        const emailEl = document.getElementById('email');
        const passEl = document.getElementById('pass');
        if(!emailEl || !passEl) return;
        const { error } = await Core.sb.auth.signUp({email:emailEl.value, password:passEl.value});
        if(error) alert("REG_ERROR: " + error.message); 
        else alert("PILOT_REGISTERED. NOW PRESS INITIATE_SESSION.");
    },

    Logout: async () => {
        await Core.sb.auth.signOut();
        window.location.href = 'station.html';
    },

    Todo: {
        async load() {
            const { data, error } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            if (error) return console.error("Ошибка загрузки задач:", error);
            const list = document.getElementById('todo-list');
            if (list) {
                list.innerHTML = '';
                data.forEach(t => this.render(t));
            }
        },

        render(t) {
            const list = document.getElementById('todo-list');
            if (!list) return;
            const d = document.createElement('div');
            d.className = `task ${t.is_completed ? 'completed' : ''}`;
            d.dataset.id = t.id;
            d.draggable = true;
            d.innerText = '> ' + t.task.toUpperCase();

            d.onclick = async () => {
                const newState = !d.classList.contains('completed');
                d.classList.toggle('completed');
                await Core.sb.from('todo').update({ is_completed: newState }).eq('id', t.id);
            };

            d.oncontextmenu = async (ev) => {
                ev.preventDefault();
                d.classList.add('removing');
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
            else if(error) console.error("Ошибка сохранения:", error);
        }
    },

    Chat: {
        async load() { 
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending:true}); 
            if(data) { 
                const stream = document.getElementById('chat-stream');
                if(stream) {
                    stream.innerHTML = ''; 
                    data.forEach(m => this.render(m)); 
                }
            } 
        },

        render(m) { 
            const s = document.getElementById('chat-stream');
            if(!s) return;
            
            const d = document.createElement('div'); 
            d.className = 'msg-container';
            
            const myNick = Core.user ? Core.user.email.split('@')[0] : null;
            const isMyMsg = m.nickname === myNick;

            const time = new Date(m.created_at || Date.now()).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
            
            d.innerHTML = `
                <div class="msg-nick" style="${isMyMsg ? 'color: var(--n);' : ''}">
                    ${(m.nickname||'PILOT').toUpperCase()} 
                    ${isMyMsg ? '<span style="font-size:8px; opacity:0.5;">(YOU)</span>' : ''}
                    <span style="opacity:0.4; font-size:9px;">${time}</span>
                </div>
                <div class="msg-text" style="${isMyMsg ? 'border-color: rgba(0,242,255,0.3);' : ''}">${m.message}</div>
            `; 

            if (isMyMsg) {
                d.oncontextmenu = async (ev) => {
                    ev.preventDefault();
                    if (confirm("DELETE_MESSAGE FROM_DATABASE?")) {
                        d.style.opacity = '0.3';
                        const { error } = await Core.sb.from('comments').delete().eq('id', m.id);
                        if (!error) {
                            d.remove();
                        } else {
                            d.style.opacity = '1';
                            alert("ERROR_DELETING: " + error.message);
                        }
                    }
                };
                d.title = "Right click to delete";
            }

            s.appendChild(d); 
            s.scrollTop = s.scrollHeight; 
        },

        async send() { 
            const i = document.getElementById('chat-in'); 
            if(!i || !i.value || !Core.user) return; 
            
            const n = Core.user.email.split('@')[0];
            const v = i.value; 
            i.value = ''; 
            
            const { data, error } = await Core.sb.from('comments').insert([{message: v, nickname: n}]).select();
            
            if (!error && data) {
                this.render(data[0]); 
            }
        }
    },

    UI() {
        const todoIn = document.getElementById('todo-in');
        const todoList = document.getElementById('todo-list');

        if (todoIn) {
            todoIn.onkeypress = async (e) => {
                if (e.key === 'Enter' && e.target.value) {
                    await this.Todo.add(e.target.value);
                    e.target.value = '';
                }
            };
        }

        if (todoList) {
            todoList.addEventListener('dragover', (e) => {
                e.preventDefault();
                const draggingItem = document.querySelector('.dragging');
                if (!draggingItem) return;
                const siblings = [...todoList.querySelectorAll('.task:not(.dragging)')];
                const nextSibling = siblings.find(sibling => {
                    const box = sibling.getBoundingClientRect();
                    return e.clientY <= box.top + box.height / 2;
                });
                if (nextSibling) todoList.insertBefore(draggingItem, nextSibling);
                else todoList.appendChild(draggingItem);
            });
        }
        
        const chatIn = document.getElementById('chat-in');
        if (chatIn) {
            chatIn.onkeypress = (e) => { if(e.key === 'Enter') this.Chat.send(); };
        }
    },

    Audio: {
        setup() { 
            this.el = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'); 
            this.el.loop = true; 
            this.el.volume = 0.2;
        },
        toggle() {
            const b = document.getElementById('audio-btn');
            if(!b) return;
            if(this.el.paused) { this.el.play(); b.classList.add('playing'); }
            else { this.el.pause(); b.classList.remove('playing'); }
        }
    },

    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield'); 
            if(!this.cvs) return;
            this.ctx = this.cvs.getContext('2d'); 
            this.res();
            window.addEventListener('resize', () => this.res());
            this.stars = Array.from({length:200}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, s:Math.random()*2, v:Math.random()*0.3, b:Math.random()}));
            this.debris = Array.from({length:25}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, s:Math.random()*3+1, vx:-Math.random()*0.5}));
            this.crew = Array.from({length:3}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, rot:Math.random()*6, vr:0.005, vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3}));
            this.ufo = {x:-100, y:350, p:[]}; 
            this.comet = {x:-200, y:0, active:false};
        },
        res() { 
            if(!this.cvs) return;
            this.cvs.width = window.innerWidth; 
            this.cvs.height = window.innerHeight; 
        },
        drawAstro(a) {
            const ctx = this.ctx; ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
            ctx.fillStyle = '#fff'; ctx.beginPath(); 
            if(ctx.roundRect) ctx.roundRect(-8,-12,16,24,5); else ctx.rect(-8,-12,16,24); 
            ctx.fill();
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0,-7,6,0,Math.PI*2); ctx.fill(); ctx.strokeStyle = '#0ff'; ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.ellipse(-2,-8,3,2,1,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ccc'; ctx.fillRect(-11,-8,3,15); ctx.restore();
        },
        drawUFO(u) {
            const ctx = this.ctx; u.x += 1.1; if(u.x > this.cvs.width + 150) u.x = -150;
            let uy = u.y + Math.sin(Date.now()/800) * 50;
            if(Date.now() % 3 === 0) u.p.push({x: u.x - 40, y: uy + (Math.random()*10 - 5), s: Math.random()*3+1, a: 1, vx: -Math.random()*2});
            for(let i = u.p.length - 1; i >= 0; i--) {
                let p = u.p[i]; p.x += p.vx; p.a -= 0.02; ctx.fillStyle = `rgba(0,242,255,${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill(); if(p.a <= 0) u.p.splice(i, 1);
            }
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(u.x, uy, 55, 16, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#0ff'; ctx.lineWidth = 2; ctx.stroke();
            let d = ctx.createLinearGradient(u.x, uy-35, u.x, uy-10); d.addColorStop(0, 'rgba(0,242,255,0.7)'); d.addColorStop(1, 'transparent');
            ctx.fillStyle = d; ctx.beginPath(); ctx.ellipse(u.x, uy-11, 28, 20, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
            for(let i=0; i<5; i++) { ctx.fillStyle = (Math.floor(Date.now()/150)%5 === i) ? '#f0f' : '#044'; ctx.beginPath(); ctx.arc(u.x-32+i*16, uy+3, 2, 0, Math.PI*2); ctx.fill(); }
        },
        draw() {
            if(!this.ctx) return;
            const ctx = this.ctx, cvs = this.cvs; ctx.fillStyle = '#01050a'; ctx.fillRect(0,0,cvs.width,cvs.height);
            this.stars.forEach(s => { s.x -= s.v; if(s.x < 0) s.x = cvs.width; ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(Math.sin(Date.now()*0.001 + s.b*10))*0.7})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill(); });
            this.debris.forEach(d => { d.x += d.vx; if(d.x < -10) d.x = cvs.width + 10; ctx.fillStyle = 'rgba(0,242,255,0.1)'; ctx.fillRect(d.x, d.y, d.s, d.s); });
            if(!this.comet.active && Math.random() < 0.004) { this.comet.active = true; this.comet.x = -200; this.comet.y = Math.random() * cvs.height; }
            if(this.comet.active) { this.comet.x += 12; this.comet.y += 1.5; let g = ctx.createLinearGradient(this.comet.x, this.comet.y, this.comet.x-80, this.comet.y-5); g.addColorStop(0, '#fff'); g.addColorStop(1, 'transparent'); ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(this.comet.x, this.comet.y); ctx.lineTo(this.comet.x-80, this.comet.y-5); ctx.stroke(); if(this.comet.x > cvs.width + 200) this.comet.active = false; }
            this.crew.forEach(a => { a.x += a.vx; a.y += a.vy; a.rot += a.vr; if(a.x < -50) a.x = cvs.width+50; if(a.y < -50) a.y = cvs.height+50; this.drawAstro(a); });
            const px = cvs.width * 0.85, py = cvs.height * 0.3;
            ctx.strokeStyle = 'rgba(0,242,255,0.1)'; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(px, py, 200, 45, 0.4, 0, Math.PI*2); ctx.stroke();
            let pg = ctx.createRadialGradient(px-30, py-30, 10, px, py, 110); pg.addColorStop(0, '#00f2ff'); pg.addColorStop(0.7, '#003344'); pg.addColorStop(1, '#01050a'); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 110, 0, Math.PI*2); ctx.fill();
            this.drawUFO(this.ufo);
        }
    },
    loop() { 
        Core.Canvas.draw(); 
        requestAnimationFrame(() => Core.loop()); 
    }
};

window.onload = () => Core.init();