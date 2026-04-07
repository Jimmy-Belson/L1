export const CanvasSystem = {
    // Вставляем объект Canvas целиком
    init() {
        this.cvs = document.getElementById('starfield');
        if (!this.cvs) return; 

        this.ctx = this.cvs.getContext('2d');
        this.res();
        window.addEventListener('resize', () => this.res());
        
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
            vx: (Math.random() - 0.5) * 0.4, 
            vy: (Math.random() - 0.5) * 0.4, 
            rot: Math.random() * Math.PI * 2, 
            vr: (Math.random() - 0.5) * 0.02,
            p: Math.random() * Math.PI,
            isFalling: false
        }));

        window.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.panel')) return;
            const rect = this.cvs.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            this.crew.forEach(a => {
                const dist = Math.hypot(a.x - mx, a.y - my);
                if (dist < 60 && !a.isFalling) { 
                    a.isFalling = true;
                    a.vy = 10;
                    a.vr = 0.2;
                    window.Core.Msg("PILOT_LOST: EMERGENCY_EXIT");
                    window.Core.UpdateStat('kills_astronauts', 1);
                }
            });

            const u = this.ufo;
            const ufoY = u.y + Math.sin(Date.now() / 600) * 35;
            if (Math.hypot(u.x - mx, ufoY - my) < 70) {
                u.v = 15;
                window.Core.Msg("UFO_BOOST: WARP_DRIVE");
                window.Core.UpdateStat('nlo_clicks', 1);
                setTimeout(() => u.v = 2.1, 600);
            }
        });
        
        this.comet = { x: -100, y: 0, active: false };
    },

    res() { 
        if(this.cvs) { 
            this.cvs.width = window.innerWidth; 
            this.cvs.height = window.innerHeight; 
        } 
    },

    DrawPlanet() {
        const ctx = this.ctx;
        const img = document.getElementById('planet-pic');
        if (!img || !img.complete || img.naturalWidth === 0) return;
        const r = Math.min(Math.max(this.cvs.width * 0.1, 40), 120); 
        const padding = r * 0.6; 
        const x = this.cvs.width - r - padding; 
        const y = r + padding + 30; 
        ctx.save();
        ctx.shadowBlur = r * 0.5; 
        ctx.shadowColor = 'rgba(100, 200, 255, 0.3)';
        ctx.fillStyle = 'rgba(0,0,0,0.01)';
        ctx.beginPath(); 
        ctx.arc(x, y, r, 0, Math.PI*2); 
        ctx.fill();
        ctx.restore();
        ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
        ctx.save();
        const shadowGrad = ctx.createRadialGradient(x - r/3, y - r/3, r/4, x, y, r);
        shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = 'rgba(79, 172, 254, 0.15)';
        ctx.lineWidth = Math.max(r * 0.02, 1);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI/6);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.4, r * 0.2, 0, 0, Math.PI*2); 
        ctx.stroke();
        ctx.restore();
    },

    drawUFO() {
        const u = this.ufo, ctx = this.ctx;
        u.x += u.v; 
        if(u.x > this.cvs.width + 300) { u.x = -300; u.parts = []; }
        const uy = u.y + Math.sin(Date.now() / 600) * 35;
        if (Math.random() > 0.5) {
            u.parts.push({x: u.x - 45, y: uy, a: 1.0, s: Math.random()*2+1});
        }
        u.parts.forEach((p, i) => {
            p.x -= 1; p.a -= 0.015;
            if(p.a <= 0) u.parts.splice(i, 1);
            else { 
                ctx.fillStyle = `rgba(0,255,255,${p.a})`; 
                ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill(); 
            }
        });
        ctx.fillStyle = 'rgba(0, 255, 255, 0.3)'; ctx.strokeStyle = '#0ff';
        ctx.beginPath(); ctx.arc(u.x, uy-5, 18, Math.PI, 0); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1a1a1a'; 
        ctx.beginPath(); ctx.ellipse(u.x, uy, 55, 14, 0, 0, Math.PI*2); 
        ctx.fill(); ctx.stroke();
        const light = Math.floor(Date.now() / 200) % 5;
        for(let i=0; i<5; i++) {
            ctx.fillStyle = (i === light) ? '#f0f' : '#066';
            ctx.beginPath(); ctx.arc(u.x-30+(i*15), uy+4, 2.5, 0, Math.PI*2); ctx.fill();
        }
    },

    drawAstro(a) {
        const ctx = this.ctx; const time = Date.now();
        a.x += a.vx; a.y += a.vy; a.rot += a.vr;
        if (a.isFalling) {
            if (a.y > this.cvs.height + 100) {
                a.y = -100; a.x = Math.random() * this.cvs.width;
                a.isFalling = false; a.vy = (Math.random() - 0.5) * 0.4;
                a.vr = (Math.random() - 0.5) * 0.04;
            }
        } else {
            if(a.x > this.cvs.width + 100) a.x = -100;
            if(a.x < -100) a.x = this.cvs.width + 100;
            if(a.y > this.cvs.height + 100) a.y = -100;
            if(a.y < -100) a.y = this.cvs.height + 100;
        }
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
        ctx.fillStyle = '#bcbcbc'; ctx.fillRect(-10, -8, 20, 16); 
        ctx.fillStyle = Math.sin(time / 500) > 0 ? '#f00' : '#500'; ctx.fillRect(6, -6, 2, 2);
        ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.roundRect(-8, -10, 16, 20, 4); ctx.fill();
        ctx.fillRect(-7, 8, 6, 8); ctx.fillRect(1, 8, 6, 8);
        ctx.save(); ctx.rotate(Math.sin(time / 1000 + a.p) * 0.2);
        ctx.fillRect(-12, -8, 5, 12); ctx.fillRect(7, -8, 5, 12); ctx.restore();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -14, 8, 0, Math.PI * 2); ctx.fill();
        const vGrad = ctx.createLinearGradient(0, -18, 0, -10);
        vGrad.addColorStop(0, '#001a33'); vGrad.addColorStop(0.5, '#00d2ff'); vGrad.addColorStop(1, '#001a33');
        ctx.fillStyle = vGrad; ctx.beginPath(); ctx.ellipse(0, -14, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(-2, -15, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    },
   
    draw() {
        if(!this.ctx) return;
        const ctx = this.ctx;
        ctx.fillStyle = '#01050a'; ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
        this.stars.forEach(s => {
            s.x -= s.v; 
            if(s.x < 0) s.x = this.cvs.width;
            ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(Math.sin(Date.now()/1000 + s.p))})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill();
        });
        if(!this.comet.active && Math.random() < 0.001) {
            this.comet = {x: this.cvs.width + 100, y: Math.random() * 400, active: true};
        }
        if(this.comet.active) {
            this.comet.x -= 20; this.comet.y += 4;
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.comet.x, this.comet.y); ctx.lineTo(this.comet.x+50, this.comet.y-12); ctx.stroke();
            if(this.comet.x < -100) this.comet.active = false;
        }
        this.DrawPlanet(); this.drawUFO(); this.crew.forEach(a => this.drawAstro(a));
    },

    // Основной цикл анимации
    loop() {
        if (!window.Core) return; 
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
};