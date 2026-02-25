const Core = {
    sb: window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'),
    user: null,

    init() {
        console.log("SYSTEM_STARTING...");
        this.Canvas.init(); 
        this.Audio.setup(); 
        this.UI();
        
        // Часы
        setInterval(() => {
            const el = document.getElementById('clock');
            if(el) el.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        }, 1000);

        // Слушатель входа
        this.sb.auth.onAuthStateChange((_, s) => { 
            if(s) { 
                this.user = s.user; 
                document.getElementById('auth-gate').classList.add('hidden'); 
                this.Chat.load(); 
            }
        });
        
        this.loop();
    },

    Auth: async () => {
        const e = document.getElementById('email').value, p = document.getElementById('pass').value;
        const { error } = await Core.sb.auth.signInWithPassword({email:e, password:p});
        if(error) alert(error.message);
    },

    Register: async () => {
        const e = document.getElementById('email').value, p = document.getElementById('pass').value;
        const { error } = await Core.sb.auth.signUp({email:e, password:p});
        if(error) alert(error.message); else alert("PILOT_CREATED. CHECK_EMAIL_TO_CONFIRM.");
    },

    Audio: {
        setup() { 
            this.el = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'); 
            this.el.loop = true; 
            this.el.volume = 0.2;
        },
        toggle() {
            const b = document.getElementById('audio-btn');
            if(this.el.paused) { this.el.play(); b.classList.add('playing'); }
            else { this.el.pause(); b.classList.remove('playing'); }
        }
    },

    Chat: {
        async load() { 
            const { data } = await Core.sb.from('comments').select('*').order('created_at', {ascending:true}); 
            if(data) { document.getElementById('chat-stream').innerHTML = ''; data.forEach(m => this.render(m)); } 
        },
        render(m) { 
            const s = document.getElementById('chat-stream'), d = document.createElement('div'); 
            d.className = 'msg-container';
            const time = new Date(m.created_at || Date.now()).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
            d.innerHTML = `
                <div class="msg-nick">${(m.nickname||'PILOT').toUpperCase()} <span style="opacity:0.3; font-size:9px;">${time}</span></div>
                <div class="msg-text">${m.message}</div>
            `; 
            s.appendChild(d); 
            s.scrollTop = s.scrollHeight; 
        },
        async send() { 
            const i = document.getElementById('chat-in'); if(!i.value || !Core.user) return; 
            const n = Core.user.email.split('@')[0], v = i.value; i.value = ''; 
            this.render({nickname: n, message: v, created_at: new Date()}); 
            await Core.sb.from('comments').insert([{message: v, nickname: n}]); 
        }
    },

    UI() {
        document.getElementById('todo-in').onkeypress = (e) => { 
            if(e.key === 'Enter' && e.target.value) { 
                const d = document.createElement('div'); d.className = 'task'; 
                d.innerText = '> ' + e.target.value.toUpperCase(); 
                d.onclick = () => d.remove(); 
                document.getElementById('todo-list').prepend(d); e.target.value = ''; 
            } 
        };
        document.getElementById('chat-in').onkeypress = (e) => { if(e.key === 'Enter') this.Chat.send(); };
    },

    Canvas: {
        init() {
            this.cvs = document.getElementById('starfield'); this.ctx = this.cvs.getContext('2d'); 
            this.res(); window.addEventListener('resize', () => this.res());
            this.stars = Array.from({length:200}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, s:Math.random()*2, v:Math.random()*0.3}));
            this.crew = Array.from({length:3}, () => ({x:Math.random()*this.cvs.width, y:Math.random()*this.cvs.height, rot:Math.random()*6, vr:0.005, vx:(Math.random()-0.5)*0.3, vy:(Math.random()-0.5)*0.3}));
        },
        res() { this.cvs.width = window.innerWidth; this.cvs.height = window.innerHeight; },
        draw() {
            const ctx = this.ctx, cvs = this.cvs;
            ctx.fillStyle = '#01050a'; ctx.fillRect(0,0,cvs.width,cvs.height);
            this.stars.forEach(s => { s.x -= s.v; if(s.x < 0) s.x = cvs.width; ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.s, s.s); });
            this.crew.forEach(a => { 
                a.x += a.vx; a.y += a.vy; a.rot += a.vr;
                ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
                ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-5,-8,10,16);
                ctx.restore();
            });
        }
    },
    loop() { Core.Canvas.draw(); requestAnimationFrame(() => Core.loop()); }
};

window.onload = () => Core.init();