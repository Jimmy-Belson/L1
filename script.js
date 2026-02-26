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
        const emailEl = document.getElementById('email');
        const passEl = document.getElementById('pass');
        if(!emailEl || !passEl) return;
        const { error } = await Core.sb.auth.signInWithPassword({email:emailEl.value, password:passEl.value});
        if(error) Core.Msg("ACCESS_DENIED: " + error.message, "error");
    },

    Register: async () => {
        const emailEl = document.getElementById('email');
        const passEl = document.getElementById('pass');
        if(!emailEl || !passEl) return;
        const { error } = await Core.sb.auth.signUp({email:emailEl.value, password:passEl.value});
        if(error) Core.Msg("REG_ERROR: " + error.message, "error"); 
        else Core.Msg("PILOT_REGISTERED. INITIATE SESSION.");
    },

    Logout: async () => {
        await Core.sb.auth.signOut();
        window.location.href = 'station.html';
    },

    Todo: {
        async load() {
            const { data, error } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            if (error) return console.error(error);
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
        }
    },

    Chat: {
        async load() { 
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending:false}).limit(50); 
            if(data) { 
                const stream = document.getElementById('chat-stream');
                if(stream) {
                    stream.innerHTML = ''; 
                    data.reverse().forEach(m => this.render(m)); 
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
            const time = new Date(m.created_at).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
            d.innerHTML = `
                <div class="msg-nick" style="${isMyMsg ? 'color: var(--n);' : ''}">
                    ${(m.nickname||'PILOT').toUpperCase()} ${isMyMsg ? '<span style="font-size:8px;opacity:0.5">(YOU)</span>' : ''}
                    <span style="opacity:0.4; font-size:9px;">${time}</span>
                </div>
                <div class="msg-text">${m.message}</div>
            `; 
            if (isMyMsg) {
                d.oncontextmenu = (e) => {
                    e.preventDefault();
                    const menu = document.getElementById('custom-menu');
                    menu.style.display = 'block';
                    menu.style.left = e.pageX + 'px';
                    menu.style.top = e.pageY + 'px';
                    menu.innerHTML = <div class="menu-item">Terminate Message</div>;
                    menu.onclick = async () => {
                        const { error } = await Core.sb.from('comments').delete().eq('id', m.id);
                        if (!error) d.remove();
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
        if (chatIn) { chatIn.onkeypress = (e) => { if(e.key === 'Enter') this.Chat.send(); }; }
    },

    Audio: {
        setup() { 
            this.el = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'); 
            this.el.loop = true; this.el.volume = 0.2;
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
            this.cvs = document.getElementById('starfield'); if(!this.cvs) return;
            this.ctx = this.cvs.getContext('2d'); this.res();
            window.addEventListener('resize', () => this.res());
            this.stars = Array.from({length:200}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, s:Math.random()*2, v:Math.random()*0.3, b:Math.random()}));
            this.debris = Array.from({length:25}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, s:Math.random()*3+1, vx:-Math.random()*0.5}));
            this.crew = Array.from({length:3}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, rot:Math.random()*6, vr:0.005, vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3}));
            this.ufo = {x:-100, y:350, p:[]}; this.comet = {x:-200, y:0, active:false};
        },
        res() { if(!this.cvs) return; this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; },
        drawAstro(a) {
            const ctx = this.ctx; ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.rect(-8,-12,16,24); ctx.fill();
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0,-7,6,0,Math.PI*2); ctx.fill(); ctx.restore();
        },
        drawUFO(u) {
            const ctx = this.ctx; u.x += 1.1; if(u.x > this.cvs.width + 150) u.x = -150;
            let uy = u.y + Math.sin(Date.now()/800) * 50;
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(u.x, uy, 55, 16, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#0ff'; ctx.stroke();
        },
        draw() {
            if(!this.ctx) return;
            const ctx = this.ctx, cvs = this.cvs; ctx.fillStyle = '#01050a'; ctx.fillRect(0,0,cvs.width,cvs.height);
            this.stars.forEach(s => { s.x -= s.v; if(s.x < 0) s.x = cvs.width; ctx.fillStyle = rgba(255,255,255,0.7); ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill(); });
            this.drawUFO(this.ufo);
            this.crew.forEach(a => { a.x += a.vx; a.y += a.vy; a.rot += a.vr; this.drawAstro(a); });
        }
    },
    loop() { Core.Canvas.draw(); requestAnimationFrame(() => Core.loop()); }
};

window.onload = () => Core.init();