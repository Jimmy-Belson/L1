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
            this.el = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'); 
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
            this.stars = Array.from({length: 220}, () => ({
                x: Math.random() * this.cvs.width,
                y: Math.random() * this.cvs.height,
                s: Math.random() * 2.5,
                v: Math.random() * 0.4 + 0.1,
                p: Math.random() * Math.PI
            }));
            this.crew = Array.from({length: 3}, () => ({ x: Math.random()*this.cvs.width, y: Math.random()*this.cvs.height, r: Math.random()*6, vr: 0.006, vx: 0.1, vy: 0.1 }));
            this.ufo = { x: -150, y: 280, v: 1.1 };
            this.planet = { x: 220, y: 220, r: 85 };
            this.comet = { x: -200, y: 0, active: false };
        },
        res: function() { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; },
        draw: function() {
            const ctx = this.ctx; const cvs = this.cvs;
            if(!ctx) return;

            // Фон градиент
            const bg = ctx.createRadialGradient(cvs.width/2, cvs.height/2, 0, cvs.width/2, cvs.height/2, cvs.width);
            bg.addColorStop(0, '#041528'); bg.addColorStop(1, '#01050a');
            ctx.fillStyle = bg; ctx.fillRect(0,0,cvs.width,cvs.height);

            // Звезды
            this.stars.forEach(s => {
                s.x -= s.v; if(s.x < 0) s.x = cvs.width;
                const alpha = 0.4 + Math.abs(Math.sin(Date.now()/1000 + s.p)) * 0.6;
                ctx.fillStyle = 'rgba(255,255,255,'+alpha+')';
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill();
            });

            // Планета
            const p = this.planet;
            ctx.save();
            ctx.shadowBlur = 40; ctx.shadowColor = '#4facfe';
            const g = ctx.createRadialGradient(p.x-25, p.y-25, 10, p.x, p.y, p.r);
            g.addColorStop(0, '#4facfe'); g.addColorStop(1, '#001a33');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
            // Полосы
            ctx.clip();
            ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 12;
            for(let i=0; i<12; i++) {
                ctx.beginPath(); ctx.moveTo(p.x-p.r, p.y-p.r+(i*18)); ctx.lineTo(p.x+p.r, p.y-p.r+(i*18)+15); ctx.stroke();
            }
            ctx.restore();

            // Комета
            if(!this.comet.active && Math.random() < 0.004) this.comet = {x:cvs.width+100, y:Math.random()*cvs.height, active:true};
            if(this.comet.active) {
                this.comet.x -= 7; this.comet.y += 2;
                ctx.strokeStyle = 'rgba(0,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(this.comet.x, this.comet.y); ctx.lineTo(this.comet.x+70, this.comet.y-20); ctx.stroke();
                if(this.comet.x < -100) this.comet.active = false;
            }

            // НЛО
            this.ufo.x += this.ufo.v; if(this.ufo.x > cvs.width+200) this.ufo.x = -200;
            let uy = this.ufo.y + Math.sin(Date.now()/700)*35;
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(this.ufo.x, uy, 45, 14, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#0ff'; ctx.stroke();

            // Космонавты
            this.crew.forEach(a => {
                a.x += a.vx; a.y += a.vy; a.r += a.vr;
                ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.r);
                ctx.fillStyle = 'white'; ctx.fillRect(-7, -11, 14, 22);
                ctx.fillStyle = '#222'; ctx.fillRect(-4, -8, 8, 6);
                ctx.restore();
            });
        }
    },
    loop: function() { Core.Canvas.draw(); requestAnimationFrame(() => Core.loop()); }
};

window.onload = () => Core.init();
