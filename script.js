const Core = {
    sb: window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'),
    user: null,

    Msg: function(text, type) {
        const container = document.getElementById('notify-container');
        if (!container) return;
        const t = document.createElement('div');
        t.className = "toast" + (type === 'error' ? ' error' : '');
        t.innerHTML = '<span style="opacity:0.5">>></span> ' + text;
        container.appendChild(t);
        setTimeout(function() {
            t.classList.add('hide');
            setTimeout(function() { t.remove(); }, 400);
        }, 4000);
    },

    TogglePass: function() {
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

    init: function() {
        this.Canvas.init(); 
        this.Audio.setup(); 
        
        const self = this;
        this.sb.auth.onAuthStateChange(function(event, session) {
            const path = window.location.pathname.toLowerCase();
            if (session) {
                self.user = session.user;
                if (path.includes('station.html')) window.location.href = 'index.html';
                if (document.getElementById('chat-stream')) self.Chat.load();
                if (document.getElementById('todo-list')) self.Todo.load();
            } else {
                if (path.includes('index.html') || path.endsWith('/')) window.location.href = 'station.html';
            }
        });

        if (document.getElementById('clock')) {
            this.UI();
            setInterval(function() {
                const el = document.getElementById('clock');
                if(el) el.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false });
            }, 1000);
        }
        this.loop();
    },

    Auth: async function() {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('pass').value;
        const { error } = await Core.sb.auth.signInWithPassword({email: email, password: pass});
        if(error) Core.Msg("ACCESS_DENIED: " + error.message, "error");
    },

    Register: async function() {
        const email = document.getElementById('email').value;
        const pass = document.getElementById('pass').value;
        const { error } = await Core.sb.auth.signUp({email: email, password: pass});
        if(error) Core.Msg("REG_ERROR: " + error.message, "error"); 
        else Core.Msg("PILOT_REGISTERED. INITIATE SESSION.");
    },

    Logout: async function() { 
        await Core.sb.auth.signOut(); 
        window.location.href = 'station.html'; 
    },

    Todo: {
        load: async function() {
            const { data } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            const list = document.getElementById('todo-list');
            if (list && data) { list.innerHTML = ''; data.forEach(t => this.render(t)); }
        },
        render: function(t) {
            const list = document.getElementById('todo-list');
            const d = document.createElement('div');
            d.className = 'task' + (t.is_completed ? ' completed' : '');
            d.innerText = '> ' + t.task.toUpperCase();
            d.onclick = async function() {
                const newState = !d.classList.contains('completed');
                d.classList.toggle('completed');
                await Core.sb.from('todo').update({ is_completed: newState }).eq('id', t.id);
            };
            d.oncontextmenu = async function(e) {
                e.preventDefault();
                await Core.sb.from('todo').delete().eq('id', t.id);
                d.remove();
            };
            list.appendChild(d);
        },
        add: async function(val) {
            const { data } = await Core.sb.from('todo').insert([{ task: val, is_completed: false }]).select();
            if (data) this.render(data[0]);
        }
    },

    Chat: {
        load: async function() {
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending: false}).limit(50);
            const s = document.getElementById('chat-stream');
            if(s && data) { s.innerHTML = ''; data.reverse().forEach(m => this.render(m)); }
        },
        render: function(m) {
            const s = document.getElementById('chat-stream');
            const d = document.createElement('div');
            d.className = 'msg-container';
            const nick = (m.nickname || 'PILOT').toUpperCase();
            d.innerHTML = '<div class="msg-nick">' + nick + '</div><div class="msg-text">' + m.message + '</div>';
            s.appendChild(d);
            s.scrollTop = s.scrollHeight;
        },
        send: async function() {
            const i = document.getElementById('chat-in');
            const n = Core.user ? Core.user.email.split('@')[0] : 'PILOT';
            if(!i.value) return;
            const { data } = await Core.sb.from('comments').insert([{message: i.value, nickname: n}]).select();
            if(data) { this.render(data[0]); i.value = ''; }
        }
    },

    UI: function() {
        const todoIn = document.getElementById('todo-in');
        if(todoIn) {
            todoIn.addEventListener('keypress', function(e) {
                if(e.key === 'Enter' && e.target.value) { Core.Todo.add(e.target.value); e.target.value = ''; }
            });
        }
        const chatIn = document.getElementById('chat-in');
        if(chatIn) {
            chatIn.addEventListener('keypress', function(e) {
                if(e.key === 'Enter') Core.Chat.send();
            });
        }
    },

    Audio: {
        setup: function() { 
            this.el = new Audio('track.mp3'); 
            this.el.loop = true; 
            this.el.volume = 0.1; 
        },
        toggle: function() { this.el.paused ? this.el.play() : this.el.pause(); }
    },

    Canvas: {
        init: function() {
            this.cvs = document.getElementById('starfield');
            if(!this.cvs) return;
            this.ctx = this.cvs.getContext('2d');
            this.res();
            window.onresize = () => this.res();
            this.stars = Array.from({length: 200}, () => ({ x: Math.random()*this.cvs.width, y: Math.random()*this.cvs.height, s: Math.random()*2, v: Math.random()*0.5 }));
            this.crew = Array.from({length: 3}, () => ({ x: Math.random()*this.cvs.width, y: Math.random()*this.cvs.height, r: Math.random()*6, vr: 0.01, vx: 0.2, vy: 0.1 }));
            this.ufo = { x: -100, y: 300, v: 1 };
            this.planet = { x: 200, y: 200, r: 80 };
        },
        res: function() { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; },
        drawAstro: function(a) {
            const ctx = this.ctx; ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.r);
            ctx.fillStyle = 'white'; ctx.fillRect(-8, -12, 16, 24);
            ctx.fillStyle = '#111'; ctx.fillRect(-5, -9, 10, 7); 
            ctx.restore();
        },
        drawPlanet: function() {
            const ctx = this.ctx; const p = this.planet;
            ctx.save();
            ctx.shadowBlur = 30; ctx.shadowColor = '#4facfe';
            const g = ctx.createRadialGradient(p.x-20, p.y-20, 5, p.x, p.y, p.r);
            g.addColorStop(0, '#4facfe'); g.addColorStop(1, '#001a33');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
            ctx.restore();
            ctx.strokeStyle = 'rgba(79, 172, 254, 0.3)'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r+40, 15, Math.PI/4, 0, Math.PI*2); ctx.stroke();
        },
        draw: function() {
            const ctx = this.ctx; const cvs = this.cvs;
            if(!ctx) return;
            ctx.fillStyle = '#01050a'; ctx.fillRect(0,0,cvs.width,cvs.height);
            ctx.fillStyle = 'white';
            this.stars.forEach(s => { 
                s.x -= s.v; if(s.x<0) s.x = cvs.width; 
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI*2); ctx.fill(); 
            });
            this.drawPlanet();
            this.ufo.x += this.ufo.v; if(this.ufo.x > cvs.width+100) this.ufo.x = -100;
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(this.ufo.x, this.ufo.y + Math.sin(Date.now()/500)*20, 40, 12, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#0ff'; ctx.stroke();
            this.crew.forEach(a => { a.x += a.vx; a.y += a.vy; a.r += a.vr; this.drawAstro(a); });
        }
    },
    loop: function() { Core.Canvas.draw(); requestAnimationFrame(() => Core.loop()); }
};

window.onload = () => Core.init();
