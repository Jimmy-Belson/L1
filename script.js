const Core = {
    sb: window.supabase.createClient('https://ebjsxlympwocluxgmwcu.supabase.co', 'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'),
    user: null,

    // Твоя первая функция (внутренние уведомления)
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

    // ВТОРАЯ ФУНКЦИЯ: Системные уведомления (вне сайта)
    SystemNotify(title, body) {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: 'space.png' // Убедись, что путь к иконке верный
            });
        }
    },

    TogglePass() {
        const passInput = document.getElementById('pass');
        const toggleBtn = document.getElementById('toggle-pass');
        if (!passInput || !toggleBtn) return;
        passInput.type = (passInput.type === 'password') ? 'text' : 'password';
        toggleBtn.classList.toggle('viewing');
        this.Msg(passInput.type === 'text' ? "DECRYPTING_OVERSIGHT: VISIBLE" : "ENCRYPTING_OVERSIGHT: HIDDEN");
    },

init() {
    // 1. ЗАПРОС РАЗРЕШЕНИЯ НА УВЕДОМЛЕНИЯ (ВНЕ САЙТА)
    if ("Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }

    // Инициализация графики и звука
    if (this.Canvas) this.Canvas.init(); 
    if (this.Audio) this.Audio.setup(); 
    
    // Слушатель авторизации
    this.sb.auth.onAuthStateChange((event, session) => {
        const path = window.location.pathname.toLowerCase();
        const isLoginPage = path.includes('station.html');
        const isMainPage = path.endsWith('/') || path.includes('index.html');

        if (session) {
            this.user = session.user;
            if (isLoginPage) { window.location.href = 'index.html'; return; }
            
            // Если мы на главной странице (где есть чат)
            if (document.getElementById('chat-stream')) { 
                this.Chat.load(); 
                this.Chat.subscribe(); 
            }
            
            if (document.getElementById('todo-list')) this.Todo.load();
        } else {
            if (isMainPage) { window.location.href = 'station.html'; return; }
        }
    });

        // Глобальные клики (закрытие меню)
        window.addEventListener('click', () => {
            const menu = document.getElementById('custom-menu');
            if(menu) menu.style.display = 'none';
        });

        // Часы
        const clockEl = document.getElementById('clock');
        if (clockEl) {
            setInterval(() => {
                clockEl.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false });
            }, 1000);
        }

        // ВАЖНО: Инициализация кнопок и ввода вынесена из блока часов!
        this.UI();
        this.loop();
    },

    async Auth() {
        const emailEl = document.getElementById('email'), passEl = document.getElementById('pass');
        if(!emailEl || !passEl) return;
        const { error } = await this.sb.auth.signInWithPassword({email:emailEl.value, password:passEl.value});
        if(error) this.Msg("ACCESS_DENIED: " + error.message, "error");
    },

    async Register() {
        const emailEl = document.getElementById('email'), passEl = document.getElementById('pass');
        if(!emailEl || !passEl) return;
        const { error } = await this.sb.auth.signUp({email:emailEl.value, password:passEl.value});
        if(error) this.Msg("REG_ERROR: " + error.message, "error"); 
        else this.Msg("PILOT_REGISTERED. INITIATE SESSION.");
    },

    async Logout() { 
        await this.sb.auth.signOut(); 
        window.location.href = 'station.html'; 
    },

    Todo: {
        async load() {
            const { data, error } = await Core.sb.from('todo').select('*').order('id', {ascending: false});
            if (error) return;
            const list = document.getElementById('todo-list');
            if (list) { list.innerHTML = ''; data.forEach(t => this.render(t)); }
        },
   render(t) {
        const list = document.getElementById('todo-list'); 
        if (!list) return;

        const d = document.createElement('div');
        d.className = `task ${t.is_completed ? 'completed' : ''}`;
            
            // Включаем возможность перетаскивания
            d.draggable = true; 
            d.innerText = '> ' + t.task.toUpperCase();

            // 1. ЛКМ: Переключение статуса выполнено/не выполнено
            d.onclick = async () => {
                const isDone = d.classList.contains('completed');
                const newState = !isDone;
                
                // Сначала меняем визуально для скорости отклика
                d.classList.toggle('completed');
                
                // Обновляем в Supabase
                const { error } = await Core.sb.from('todo')
                    .update({ is_completed: newState })
                    .eq('id', t.id);
                
                if (error) {
                    Core.Msg("SYNC_ERROR: STATUS_NOT_UPDATED", "error");
                    d.classList.toggle('completed'); // Откатываем если ошибка
                }
            };

            // 2. ПКМ: Удаление задачи
            d.oncontextmenu = async (ev) => {
                ev.preventDefault();
                d.classList.add('removing');
                
                const { error } = await Core.sb.from('todo').delete().eq('id', t.id);
                
                if (!error) {
                    setTimeout(() => d.remove(), 400);
                } else {
                    d.classList.remove('removing');
                    Core.Msg("TERMINATE_ERROR: SIGNAL_LOST", "error");
                }
            };

            d.addEventListener('dragstart', () => {
                setTimeout(() => d.classList.add('dragging'), 0);
            });

            d.addEventListener('dragend', () => {
                d.classList.remove('dragging');
            });

            list.appendChild(d);
        },

        async add(val) {
            const { data, error } = await Core.sb.from('todo').insert([{ task: val, is_completed: false }]).select();
            if (!error && data) this.render(data[0]);
        }
    },

   Chat: {
        subscribe() {
            Core.sb
                .channel('public:comments')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
                    const m = payload.new;
                    // Исправлено: берем ник из метаданных или почту для сравнения
                    const myNick = Core.user?.user_metadata?.nickname || Core.user?.email.split('@')[0];
                    
                    if (m.nickname !== myNick) {
                        this.render(m);
                        Core.SystemNotify(`СИГНАЛ: ${m.nickname.toUpperCase()}`, m.message);
                    }
                })
                .subscribe();
        },

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
    
    const myNick = Core.user?.user_metadata?.nickname || Core.user?.email.split('@')[0];
    const isMy = m.nickname === myNick;
    const date = m.created_at ? new Date(m.created_at) : new Date();
    const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    // Увеличиваем размер до 65px и добавляем отступ справа gap: 20px
    d.innerHTML = `
    <div class="chat-row-layout">
        <img src="${m.avatar_url || 'https://via.placeholder.com/65'}" class="chat-row-avatar">
        
        <div class="chat-content-block">
            <div class="msg-header">
                <span class="msg-nick" style="${isMy ? 'color:var(--n)' : 'color:#0ff'}">${(m.nickname || 'PILOT').toUpperCase()}</span>
                <span class="msg-time">${timeStr}</span>
            </div>
            <div class="msg-text">${m.message}</div>
        </div>
    </div>
`;
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
                        const { error } = await Core.sb.from('comments').delete().eq('id', m.id);
                        if (!error) d.remove();
                        menu.style.display = 'none';
                    };
                };
            }

            s.appendChild(d);
            s.scrollTop = s.scrollHeight;
        },

        async send() { 
            const i = document.getElementById('chat-in'); 
            if(!i || !i.value.trim() || !Core.user) return; 

            // Сначала берем актуальные данные профиля
            const meta = Core.user.user_metadata || {};
            const n = meta.nickname || Core.user.email.split('@')[0];
            const a = meta.avatar_url || 'https://via.placeholder.com/50';
            
            const v = i.value; 
            i.value = ''; 

            // ВАЖНО: Если у тебя НЕТ колонки user_id в базе, удали строку ниже!
            const { data, error } = await Core.sb.from('comments').insert([{
                message: v, 
                nickname: n, 
                avatar_url: a
            }]).select();

            if(!error && data) {
                // Если мы сами отправили, рендерим сразу (для скорости)
                this.render(data[0]);
            } else if (error) {
                console.error("Ошибка чата:", error.message);
            }
        }
    },

    UI() {
        const todoIn = document.getElementById('todo-in');
        const todoList = document.getElementById('todo-list');
        const chatIn = document.getElementById('chat-in');

        // 1. Ввод новых задач
        if (todoIn) { 
            todoIn.onkeypress = async (e) => { 
                if (e.key === 'Enter' && e.target.value.trim()) { 
                    await this.Todo.add(e.target.value); 
                    e.target.value = ''; 
                } 
            }; 
        }

        // 2. Логика Drag-and-Drop (Перетаскивание)
        if (todoList) {
            // Вспомогательная функция для определения позиции вставки
            const getDragAfterElement = (container, y) => {
                const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];

                return draggableElements.reduce((closest, child) => {
                    const box = child.getBoundingClientRect();
                    const offset = y - box.top - box.height / 2;
                    
                    if (offset < 0 && offset > closest.offset) {
                        return { offset: offset, element: child };
                    } else {
                        return closest;
                    }
                }, { offset: Number.NEGATIVE_INFINITY }).element;
            };

            todoList.addEventListener('dragover', (e) => {
                e.preventDefault(); // Разрешаем сброс (Drop)
                const draggingItem = document.querySelector('.dragging');
                if (!draggingItem) return;

                const nextSibling = getDragAfterElement(todoList, e.clientY);

                if (nextSibling == null) {
                    todoList.appendChild(draggingItem);
                } else {
                    todoList.insertBefore(draggingItem, nextSibling);
                }
            });
        }

        // 3. Отправка сообщений в чат
        if (chatIn) { 
            chatIn.onkeypress = (e) => { 
                if (e.key === 'Enter' && e.target.value.trim()) {
                    this.Chat.send(); 
                }
            }; 
        }
    },

    Audio: {
        el: null,
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
                this.el.play().catch(e => console.log("Нужен клик"));
                if(btn) btn.classList.add('playing');
            } else {
                this.el.pause();
                if(btn) btn.classList.remove('playing');
            }
        }
    },

   Canvas: {
        // Инициализация холста и объектов
        init() {
            this.cvs = document.getElementById('starfield'); 
            if(!this.cvs) return; // Если холста нет, выходим
            this.ctx = this.cvs.getContext('2d');
            this.res(); // Устанавливаем размер при старте
            window.addEventListener('resize', () => this.res()); // И при изменении окна
            
            // Создаем мерцающие звёзды
            this.stars = Array.from({length: 150}, () => ({
                x: Math.random() * this.cvs.width, 
                y: Math.random() * this.cvs.height, 
                s: Math.random() * 2, // Размер
                v: Math.random() * 0.3, // Скорость движения
                p: Math.random() * Math.PI // Фаза мерцания
            }));
            
            // НЛО: позиция, скорость и массив для частиц хвоста
            this.ufo = { x: -250, y: 350, v: 2.1, parts: [] };
            
            // Астронавты: массив из 3-х детализированных пилотов
           this.crew = Array.from({length: 3}, () => ({
    x: Math.random() * this.cvs.width, 
    y: Math.random() * this.cvs.height, 
    vx: (Math.random() - 0.5) * 0.4, 
    vy: (Math.random() - 0.5) * 0.4, 
    rot: Math.random() * Math.PI * 2, 
    vr: (Math.random() - 0.5) * 0.02, // РАЗНЫЙ ДРИФТ: теперь крутятся в разные стороны
    p: Math.random() * Math.PI,
    isFalling: false // Состояние падения
}));
window.addEventListener('mousedown', (e) => {
    // Если мы кликнули по кнопке или инпуту — ничего не делаем
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.closest('.panel')) return;

    console.log("Клик дошел до системы!", e.clientX, e.clientY);

    const rect = this.cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    this.crew.forEach(a => {
        const dist = Math.hypot(a.x - mx, a.y - my);
        if (dist < 60) { // Увеличил радиус до 60 для легкости попадания
            a.isFalling = true;
            a.vy = 10;
            a.vr = 0.2;
            Core.Msg("PILOT_LOST: EMERGENCY_EXIT");
        }
    });

    const u = this.ufo;
    const ufoY = u.y + Math.sin(Date.now() / 600) * 35;
    if (Math.hypot(u.x - mx, ufoY - my) < 70) {
        u.v = 15;
        Core.Msg("UFO_BOOST: WARP_DRIVE");
        setTimeout(() => u.v = 2.1, 600);
    }
});
            
            // Комета (изначально неактивна)
            this.comet = { x: -100, y: 0, active: false };
        },

        // Установка размера холста на весь экран
        res() { 
            if(this.cvs) { 
                this.cvs.width = window.innerWidth; 
                this.cvs.height = window.innerHeight; 
            } 
        },
        
       drawPlanet() {
            const ctx = this.ctx;
            const img = document.getElementById('planet-pic');
            if (!img || !img.complete) return;

            const padding = 50; 
            const r = 80;       
            
            const x = this.cvs.width - r - padding; 
            const y = r + padding + 40; 

            ctx.save();

            ctx.shadowBlur = 40;
            ctx.shadowColor = 'rgba(100, 200, 255, 0.3)';
            ctx.fillStyle = 'rgba(0,0,0,0.01)';
            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
            ctx.restore();

            // 2. САМА ФОТОГРАФИЯ
            ctx.drawImage(img, x - r, y - r, r * 2, r * 2);

            // 3. ОБЪЕМНАЯ ТЕНЬ (Накладываем поверх фото)
            ctx.save();
            const shadowGrad = ctx.createRadialGradient(
                x - r/3, y - r/3, r/4, // Точка света
                x, y, r                // Граница тени
            );
            shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
            shadowGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
            
            ctx.fillStyle = shadowGrad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();

            // 4. ДЕЛИКАТНОЕ КОЛЬЦО
            ctx.strokeStyle = 'rgba(79, 172, 254, 0.1)';
            ctx.lineWidth = 2;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI/6);
            ctx.beginPath();
            ctx.ellipse(0, 0, r + 40, 15, 0, 0, Math.PI*2);
            ctx.stroke();
            ctx.restore();
        },

        // Отрисовка детализированного НЛО с хвостом
        drawUFO() {
            const u = this.ufo, ctx = this.ctx;
            u.x += u.v; // Движение
            // Перезапуск НЛО, когда оно улетает за экран
            if(u.x > this.cvs.width + 300) { u.x = -300; u.parts = []; }
            // Вертикальное покачивание
            const uy = u.y + Math.sin(Date.now() / 600) * 35;

            // 1. Инверсионный след (частицы)
            if (Math.random() > 0.5) {
                u.parts.push({x: u.x - 45, y: uy, a: 1.0, s: Math.random()*2+1});
            }
            // Отрисовка и обновление частиц
            u.parts.forEach((p, i) => {
                p.x -= 1; // Частицы отстают
                p.a -= 0.015; // И исчезают
                if(p.a <= 0) u.parts.splice(i, 1); // Удаляем невидимые
                else { 
                    ctx.fillStyle = `rgba(0,255,255,${p.a})`; 
                    ctx.beginPath(); 
                    ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); 
                    ctx.fill(); 
                }
            });

            // 2. Корпус НЛО (Кабина и Диск)
            // Купол
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)'; ctx.strokeStyle = '#0ff';
            ctx.beginPath(); ctx.arc(u.x, uy-5, 18, Math.PI, 0); ctx.fill(); ctx.stroke();
            // Тарелка (Темный металл)
            ctx.fillStyle = '#1a1a1a'; 
            ctx.beginPath(); 
            ctx.ellipse(u.x, uy, 55, 14, 0, 0, Math.PI*2); 
            ctx.fill(); 
            ctx.stroke();

            // 3. Мерцающие неоновые огни
            const light = Math.floor(Date.now() / 200) % 5; // Определяем активный огонь
            for(let i=0; i<5; i++) {
                ctx.fillStyle = (i === light) ? '#f0f' : '#066'; // Активный - розовый, остальные - тусклые
                ctx.beginPath(); 
                ctx.arc(u.x-30+(i*15), uy+4, 2.5, 0, Math.PI*2); 
                ctx.fill();
            }
        },

        // Отрисовка детализированного астронавта
       drawAstro(a) {
            const ctx = this.ctx; 
            const time = Date.now(); // ДОБАВЬ ЭТУ СТРОКУ (её не было)

            // Логика движения
            a.x += a.vx; 
            a.y += a.vy; 
            a.rot += a.vr;
            
            if (a.isFalling) {
                if (a.y > this.cvs.height + 100) {
                    a.y = -100;
                    a.x = Math.random() * this.cvs.width;
                    a.isFalling = false;
                    a.vy = (Math.random() - 0.5) * 0.4;
                    a.vr = (Math.random() - 0.5) * 0.04;
                }
            } else {
                if(a.x > this.cvs.width + 100) a.x = -100;
                if(a.x < -100) a.x = this.cvs.width + 100;
                if(a.y > this.cvs.height + 100) a.y = -100;
                if(a.y < -100) a.y = this.cvs.height + 100;
            }

            // РИСОВАНИЕ
            ctx.save(); // ЭТО ОЧЕНЬ ВАЖНО
            ctx.translate(a.x, a.y); // ПЕРЕМЕЩАЕМ К КООРДИНАТАМ АСТРОНАВТА
            ctx.rotate(a.rot); // ПОВОРАЧИВАЕМ

            // 1. Рюкзак (Life Support System)
            ctx.fillStyle = '#bcbcbc';
            ctx.fillRect(-10, -8, 20, 16); 
            // Маленький красный индикатор на рюкзаке
            ctx.fillStyle = Math.sin(time / 500) > 0 ? '#f00' : '#500';
            ctx.fillRect(6, -6, 2, 2);

            // 2. Скафандр (Туловище)
            ctx.fillStyle = '#eee';
            ctx.beginPath();
            ctx.roundRect(-8, -10, 16, 20, 4);
            ctx.fill();

            // 3. Ноги
            ctx.fillRect(-7, 8, 6, 8);  // Левая
            ctx.fillRect(1, 8, 6, 8);   // Правая

            // 4. Руки (в позе невесомости)
            ctx.save();
            ctx.rotate(Math.sin(time / 1000 + a.p) * 0.2);
            ctx.fillRect(-12, -8, 5, 12); // Левая
            ctx.fillRect(7, -8, 5, 12);  // Правая
            ctx.restore();

            // 5. Шлем
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, -14, 8, 0, Math.PI * 2);
            ctx.fill();

            // 6. Визор (Отражение космоса)
            const vGrad = ctx.createLinearGradient(0, -18, 0, -10);
            vGrad.addColorStop(0, '#001a33');
            vGrad.addColorStop(0.5, '#00d2ff');
            vGrad.addColorStop(1, '#001a33');
            ctx.fillStyle = vGrad;
            ctx.beginPath();
            ctx.ellipse(0, -14, 6, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Блик на стекле
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(-2, -15, 1.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore(); // ЗАКРЫВАЕМ ОСНОВНОЙ SAVE
        },
       
        draw() {
            if(!this.ctx) return;
            const ctx = this.ctx;
            // Фон (Глубокий космос)
            ctx.fillStyle = '#01050a'; 
            ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
            
            // 1. Отрисовка Звёзд
            this.stars.forEach(s => {
                s.x -= s.v; // Движение звёзд
                if(s.x < 0) s.x = this.cvs.width;
                // Эффект мерцания
                ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.abs(Math.sin(Date.now()/1000 + s.p))})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.s/2, 0, Math.PI*2); ctx.fill();
            });

            // 2. Отрисовка Кометы (иногда появляется)
            if(!this.comet.active && Math.random() < 0.001) { // 0.1% шанс появления
                this.comet = {x: this.cvs.width + 100, y: Math.random() * 400, active: true};
            }
            if(this.comet.active) {
                this.comet.x -= 20; this.comet.y += 4; // Быстрое движение
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.comet.x, this.comet.y); ctx.lineTo(this.comet.x+50, this.comet.y-12); ctx.stroke();
                // Деактивация за экраном
                if(this.comet.x < -100) this.comet.active = false;
            }

            // 3. Отрисовка основных объектов (по слоям)
            this.drawPlanet(); // Планета на фоне
            this.drawUFO();    // НЛО поверх планеты
            this.crew.forEach(a => this.drawAstro(a)); // Астронавты на переднем плане
        }
    },

    loop() {
        if (this.Canvas && this.Canvas.draw) {
            this.Canvas.draw();
        }
        requestAnimationFrame(() => this.loop());
    }
};

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => Core.init());