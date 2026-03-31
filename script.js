import { getRankByScore } from './ranks.js';

// МГНОВЕННАЯ ИНИЦИАЛИЗАЦИЯ (Самый верх файла)
window.Core = {
    sb: (window.supabase) ? window.supabase.createClient(
        'https://ebjsxlympwocluxgmwcu.supabase.co', 
        'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
    ) : null,
    user: null
};

// Проверка в консоли для тебя
if (window.Core.sb) {
    console.log("%c[CORE] Supabase Client Initialized", "color: #0ff");
} else {
    console.error("[CORE] Supabase SDK missing!");
}




const Core = {
    // Инициализируем клиент один раз при обращении
    sb: (window.supabase) ? window.supabase.createClient(
        'https://ebjsxlympwocluxgmwcu.supabase.co', 
        'sb_publishable_8HhPj3Y8g5V7Np8Vy5xbzQ_2B7LjTkj'
    ) : null,

    user: null,
    
    toggleChat() {
        const chatWindow = document.getElementById('main-chat-window');
        if (chatWindow) chatWindow.classList.toggle('minimized');
    },

getAvatar(user_id, current_avatar) {
    // 1. Если передана реальная ссылка (не робот и не заглушка) — возвращаем её
    if (current_avatar && current_avatar.length > 15 && !current_avatar.includes('dicebear')) {
        return current_avatar;
    }
    // 2. Иначе генерируем робота
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${user_id}&backgroundColor=001a2d`;
},

Msg(text, type = 'info') {
    const container = document.getElementById('notify-container');
    if (!container) return;

    const t = document.createElement('div');
    // Класс 'toast' запустит анимацию slideInRight из твоего CSS
    t.className = `toast ${type === 'error' ? 'error' : ''}`;
    t.innerHTML = `<span style="opacity:0.5">>></span> ${text}`;
    
    container.prepend(t);
    
    setTimeout(() => {
        // 1. Добавляем класс 'hide'. 
        // CSS увидит это и запустит анимацию slideOutRight (улет вправо)
        t.classList.add('hide'); 
        
        // 2. ВАЖНО: Ждем 500мс (время анимации в CSS), пока плашка улетит
        setTimeout(() => {
            t.remove(); // Только теперь удаляем из кода страницы
        }, 500); 
    }, 4000); // Плашка висит 4 секунды перед уходом
},

    async CustomConfirm(text) {
    let overlay = document.getElementById('custom-confirm');
    
    // Если в HTML блока нет, создаем его программно
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'custom-confirm';
        overlay.className = 'confirm-overlay';
    overlay.style.cssText = "display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,5,10,0.85); z-index:99999; align-items:center; justify-content:center; backdrop-filter:blur(4px); pointer-events: auto;";
        overlay.innerHTML = `
            <div class="confirm-box" style="background: rgba(0, 10, 20, 0.95); border: 1px solid #0ff; padding: 20px; width: 320px; text-align: center; box-shadow: 0 0 30px rgba(0,255,255,0.2); position: relative; border-radius: 2px;">
                <div style="color: #0ff; font-size: 11px; margin-bottom: 20px; letter-spacing: 2px; font-family: 'Orbitron'; border-bottom: 1px solid rgba(0,255,255,0.2); padding-bottom: 10px;">
                    SYSTEM_CONFIRMATION
                </div>
                <div class="confirm-body" style="color: #fff; margin-bottom: 25px; font-family: 'Share Tech Mono'; font-size: 14px; line-height: 1.4;"></div>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="confirm-yes" style="background: rgba(0,255,255,0.1); border: 1px solid #0ff; color: #0ff; padding: 8px 20px; cursor: pointer; font-family: 'Orbitron'; font-size: 10px; transition: 0.3s;">[ CONFIRM ]</button>
                    <button id="confirm-no" style="background: rgba(255,0,0,0.1); border: 1px solid #f00; color: #f00; padding: 8px 20px; cursor: pointer; font-family: 'Orbitron'; font-size: 10px; transition: 0.3s;">[ ABORT ]</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    }

    const body = overlay.querySelector('.confirm-body');
    const yesBtn = document.getElementById('confirm-yes');
    const noBtn = document.getElementById('confirm-no');
    
    
    body.innerText = text;
    overlay.style.display = 'flex';

    return new Promise((resolve) => {
        yesBtn.onclick = () => { overlay.style.display = 'none'; resolve(true); };
        noBtn.onclick = () => { overlay.style.display = 'none'; resolve(false); };
    });
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

async init() {
    // 1. МГНОВЕННЫЙ ЗАПУСК ВИЗУАЛА (без ожидания)
    // Это включит звезды, часы и UI сразу, до проверки сессии
    if (this.Canvas) this.Canvas.init();
    this.Canvas.res();
    if (this.Audio) this.Audio.setup();
    this.UI();
    this.loop();
    
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        setInterval(() => {
            clockEl.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        }, 1000);
    }

    // 2. АСИНХРОННАЯ ПРОВЕРКА (в фоне)
    // Мы не ставим await перед getSession, чтобы не тормозить поток
    this.sb.auth.getSession().then(({ data: { session } }) => {
        const path = window.location.pathname;
        const isStation = path.includes('station.html');

        if (!session) {
            if (!isStation) {
                window.location.replace('station.html');
            }
        } else {
            this.user = session.user;
            if (isStation) {
                window.location.replace('index.html');
            } else {
                // Грузим данные только если мы внутри
                this.Chat.load();
                this.Chat.subscribe();
                if (document.getElementById('todo-list')) this.Todo.load();
                if (typeof this.SyncProfile === 'function') this.SyncProfile(this.user);
            }
        }
    });

    // Слушатель выхода
    // Внутри метода init() замени старый слушатель на этот:
this.sb.auth.onAuthStateChange((event, session) => {
    console.log("AUTH_EVENT:", event); // Посмотришь в консоли, что происходит

    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (window.location.pathname.includes('station.html')) {
            this.Msg("CONNECTION_ESTABLISHED. REDIRECTING...");
            setTimeout(() => {
                window.location.replace('index.html');
            }, 1000);
        }
    }
    
    if (event === 'SIGNED_OUT') {
        window.location.replace('station.html');
    }
});
},

// Добавь эту вспомогательную функцию внутри Core
startClock() {
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        const update = () => {
            clockEl.innerText = new Date().toLocaleTimeString('ru-RU', { hour12: false });
        };
        update();
        setInterval(update, 1000);
    }
    

},

async SyncProfile(user) {
    if (!user) return;
    try {
        const { data, error } = await this.sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (error) throw error;
        
        if (data) {
            const nickEl = document.getElementById('nick-display');
            const avatarEl = document.getElementById('avatar-display');
            
            if (nickEl) {
                // РАССЧИТЫВАЕМ РАНГ ДЛЯ СЕБЯ
                const rank = getRankByScore(data.combat_score || 0);
                nickEl.innerText = data.nickname || user.email.split('@')[0];
                
                // КРАСИМ СВОЙ НИК В ЦВЕТ РАНГА
                nickEl.style.color = rank.color;
                nickEl.style.textShadow = `0 0 8px ${rank.color}`;
            }
            if (avatarEl && data.avatar_url) avatarEl.src = data.avatar_url;
        }
    } catch (e) {
        console.warn("SYNC_PROFILE_WARNING:", e.message);
    }
},

async UpdateProfile() {
    if (!this.user) return;

    const btn = document.getElementById('save-btn');
    const nickInput = document.getElementById('nick-input'); 
    const previewImg = document.getElementById('avatar-img');
    
    if (!nickInput || !btn) return;

    btn.innerText = ">> SYNCING...";
    btn.disabled = true;

    try {
        const nick = nickInput.value.trim();
        const ava = previewImg ? previewImg.src : null;

        // .upsert — это "создай, если нет, или обнови, если есть"
        const { error } = await this.sb
            .from('profiles')
            .upsert({ 
                id: this.user.id, 
                nickname: nick, 
                avatar_url: ava,
                
            });

        if (error) throw error;

        this.Msg("SYSTEM: DATA_SYNCED");
        
        // Уходим на главную через секунду
        setTimeout(() => { window.location.href = 'index.html'; }, 1000);

    } catch (e) {
        console.error(e);
        this.Msg("SYNC_ERROR: " + e.message, "error");
    } finally {
        btn.innerText = "[ SYNC_WITH_STATION ]";
        btn.disabled = false;
    }
    


},

async Auth() {
    const emailEl = document.getElementById('email'), passEl = document.getElementById('pass');
    if(!emailEl || !passEl) return;

    const { data, error } = await this.sb.auth.signInWithPassword({
        email: emailEl.value, 
        password: passEl.value
    });

    if(error) {
        this.Msg("ACCESS_DENIED: " + error.message, "error");
    } else {
        this.Msg("ACCESS_GRANTED. WELCOME BACK.");
        
        // Моментальный переход после логина
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    }
},

async Register() {
    const emailEl = document.getElementById('email'), passEl = document.getElementById('pass');
    

    
    if(!emailEl || !passEl) return;
    
    const { data, error } = await this.sb.auth.signUp({
        email: emailEl.value.trim(),
        password: passEl.value
    });

    if(error) {
        console.error("SUPABASE_ERR:", error);
        this.Msg("REG_ERROR: " + error.message, "error"); 
    } else {
        this.Msg("PILOT_REGISTERED. INITIATING SESSION...");
        
        // ВАЖНО: Если регистрация прошла успешно, 
        // принудительно перекидываем пользователя на главную через секунду
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500); 
    }
},

async Logout() { 
    await this.sb.auth.signOut(); 
    window.location.href = 'station.html'; 
},

async UpdateStat(field, value = 1) {
    if (!this.user) return;
    try {
        const { data, error } = await this.sb.from('profiles').select(field).eq('id', this.user.id).single();
        if (error) throw error;
        if (data) {
            const newValue = (data[field] || 0) + value;
            await this.sb.from('profiles').update({ [field]: newValue }).eq('id', this.user.id);
        }
    } catch (e) {
        console.error("STAT_UPDATE_ERROR:", e.message);
    }
}, // Запятая важна!

async UpdateCombatScore(newScore) {
    if (!this.user) return;
    try {
        console.log("SYNCING_COMBAT_XP: " + newScore);
        
        // 1. Получаем текущие очки из базы
        const { data, error } = await this.sb
            .from('profiles')
            .select('combat_score')
            .eq('id', this.user.id)
            .single();

        if (error) throw error;

        // 2. Суммируем
        const currentScore = data.combat_score || 0;
        const totalScore = currentScore + newScore;

        // 3. Сохраняем
        const { error: updError } = await this.sb
            .from('profiles')
            .update({ combat_score: totalScore })
            .eq('id', this.user.id);

        if (updError) throw updError;

        this.Msg(`COMBAT_REPORT: +${newScore} XP_GAINED`);
        
        // Обновляем визуальный ранг на странице
        if (typeof this.SyncProfile === 'function') this.SyncProfile(this.user);

    } catch (e) {
        console.error("SCORE_SYNC_ERROR:", e.message);
        this.Msg("SYNC_FAILED: CONNECTION_LOST", "error");
    }
}, // Запятая важна!


Todo: {
    async load() {
        if (!Core.user) return;
        const { data, error } = await Core.sb.from('todo')
            .select('*')
            .eq('user_id', Core.user.id) 
            .order('id', { ascending: false });

        if (error) return;
        const list = document.getElementById('todo-list');
        if (list) { 
            list.innerHTML = ''; 
            data.forEach(t => this.render(t)); 
        }
    },

render(t) { // Обязательно с маленькой буквы, как в load()
    const list = document.getElementById('todo-list'); 
    if (!list) return;

    const d = document.createElement('div');
    d.className = `task ${t.is_completed ? 'completed' : ''}`;
    d.id = `task-${t.id}`;
    d.setAttribute('draggable', true);

    // События для Drag-and-Drop
    d.addEventListener('dragstart', () => d.classList.add('dragging'));
    d.addEventListener('dragend', () => d.classList.remove('dragging'));
    
    // ИСПРАВЛЕНО: Теперь это строка в обратных кавычках
    const dateStr = t.deadline ? 
        `<span class="deadline-tag">[UNTIL: ${new Date(t.deadline).toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}]</span>` : '';

    d.innerHTML = `
        <div class="task-content">
            <span>> ${t.task.toUpperCase()}</span>
            ${dateStr}
        </div>
    `;

    // Клик для отметки выполнения
    d.onclick = async (e) => {
        if (d.classList.contains('dragging')) return;
        const newState = !d.classList.contains('completed');
        d.classList.toggle('completed');
        await Core.sb.from('todo').update({ is_completed: newState }).eq('id', t.id);
    };

    // Удаление через контекстное меню с анимацией
   d.oncontextmenu = async (ev) => {
    ev.preventDefault();
    d.classList.add('removing');

    setTimeout(async () => {
        const { error } = await Core.sb.from('todo').delete().eq('id', t.id);
        if (!error) {
            d.remove();
            // ВОЗВРАЩАЕМ УВЕДОМЛЕНИЕ:
            Core.Msg("OBJECTIVE_TERMINATED", "info"); 
        } else {
            d.classList.remove('removing');
            Core.Msg("TERMINATION_FAILED", "error");
        }
    }, 400);
};

    list.appendChild(d);
},

    async add(val, date) {
        if (!Core.user || !val.trim()) return;
        // Отправляем и задачу, и дату дедлайна
        const { data, error } = await Core.sb.from('todo').insert([{ 
            task: val, 
            is_completed: false,
            user_id: Core.user.id,
            deadline: date || null
        }]).select();

        if (!error && data) {
            this.render(data[0]);
            Core.Msg("MISSION_UPDATED");
        } else {
            console.error("TODO_ERROR:", error);
            Core.Msg("SYNC_ERROR", "error");
        }
    }
},





Chat: {


    // Шаблонные аватарки
    defaultAvatars: [
        'https://img.icons8.com/cosmetic-surgery/64/00ffff/astronaut.png',
        'https://img.icons8.com/external-flatart-icons-outline-flatarticons/64/00ffff/external-alien-space-flatart-icons-outline-flatarticons.png',
        'https://img.icons8.com/ios/64/00ffff/rocket.png',
        'https://img.icons8.com/external-vitaliy-gorbachev-lineal-vitaly-gorbachev/64/00ffff/external-satellite-space-vitaliy-gorbachev-lineal-vitaly-gorbachev.png'
    ],
    
    
    channel: null,
    isSubscribed: false, 

    async subscribe() {
        // Защита от спама: если уже подключены, ничего не делаем
        if (this.channel && this.channel.state === 'joined') return;
        if (this.channel) Core.sb.removeChannel(this.channel);

        this.channel = Core.sb.channel('global-chat')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
                const m = payload.new;
                if (m.user_id !== Core.user?.id) {
                    this.render(m);
                    Core.SystemNotify(`NEW_SIGNAL: ${m.nickname}`, m.message);
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, payload => {
                const el = document.getElementById(`msg-${payload.old.id}`);
                if (el) el.remove();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED' && !this.isSubscribed) {
                    console.log("COMM_LINK_READY");
                    this.isSubscribed = true;
                    // Уведомление теперь только в консоли, чтобы не бесило
                }
                if (status === 'CHANNEL_ERROR') {
                    this.isSubscribed = false;
                    setTimeout(() => this.subscribe(), 5000);
                }
            });
    },

    async load() { 
    console.log("CHAT_LOADING_DATA...");
    const { data, error } = await Core.sb.from('comments').select('*').order('created_at', {ascending: false}).limit(40); 
    
    if (error) {
        console.error("CHAT_LOAD_ERROR:", error);
        return;
    }

    const s = document.getElementById('chat-stream');
    if (s && data) { 
        s.innerHTML = ''; 
        // Переворачиваем, чтобы старые были сверху, новые снизу
        data.reverse().forEach(m => this.render(m)); 
        s.scrollTop = s.scrollHeight;
        console.log(`CHAT_LOADED: ${data.length} сообщений`);
    } 
},

async send() { 
    const i = document.getElementById('chat-in'); 
    if (!i || !i.value.trim() || !Core.user) return; 

    // 1. Сначала достаем свежайшие ник и аву из таблицы profiles
    const { data: p } = await Core.sb.from('profiles')
        .select('nickname, avatar_url')
        .eq('id', Core.user.id)
        .single();

    // 2. Если в профиле пусто, берем из почты
    const n = p?.nickname || Core.user.email.split('@')[0];
    const a = p?.avatar_url || Core.getAvatar(Core.user.id);

    const val = i.value; 
    i.value = ''; 

    // 3. Отправляем сообщение в базу
    const { data, error } = await Core.sb.from('comments').insert([{
        message: val, 
        nickname: n, 
        avatar_url: a, 
        user_id: Core.user.id
    }]).select();

    if (!error && data) {
        this.render(data[0]);
     
        Core.UpdateStat('message_count', 1);
    }
},

render(m) {
    const s = document.getElementById('chat-stream'); 
    if (!s || document.getElementById(`msg-${m.id}`)) return;

    // ГЕНЕРАТОР ШАБЛОНА: 
    let avatar = m.avatar_url;
    if (!avatar || avatar.includes('placeholder') || avatar.length < 5) {
        avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user_id}&backgroundColor=001a2d`;
    }

    const d = document.createElement('div'); 
    d.id = `msg-${m.id}`;
    d.className = 'msg-container';
    const isMy = m.user_id === Core.user?.id;

    const time = new Date(m.created_at).toLocaleTimeString('ru-RU', {
        hour: '2-digit', minute: '2-digit', hour12: false 
    });

    d.innerHTML = `
        <div class="chat-row-layout">
            <img src="${avatar}" class="chat-row-avatar" referrerpolicy="no-referrer" style="cursor:pointer">
            <div class="chat-content-block">
                <div class="msg-header">
                    <span class="msg-nick" style="color:${isMy ? 'var(--n)' : '#0ff'}; cursor:pointer">${m.nickname.toUpperCase()}</span>
                    <span class="msg-time">${time}</span>
                </div>
                <div class="msg-text">${m.message}</div>
            </div>
        </div>`;

// --- ЛОГИКА ВСПЛЫВАЮЩЕЙ КАРТОЧКИ ---
const triggerElements = d.querySelectorAll('.chat-row-avatar, .msg-nick');
triggerElements.forEach(el => {
    el.onclick = async (e) => {
        e.stopPropagation();
        const pop = document.getElementById('user-popover');
        if (!pop) return;

        document.getElementById('pop-nick').innerText = "SCANNING...";

        const { data: p } = await Core.sb.from('profiles').select('*').eq('id', m.user_id).maybeSingle();
        
if (p) {
    const rank = getRankByScore(p.combat_score || 0);

    // 1. Ставим аватар и ник
    document.getElementById('pop-avatar').src = p.avatar_url || avatar;
    const nickEl = document.getElementById('pop-nick');
    nickEl.innerText = (p.nickname || "UNKNOWN_PILOT").toUpperCase();
    nickEl.style.color = rank.color; // Красим ник в цвет ранга

    // 2. ЗАПОЛНЯЕМ РАНГ
    const rankEl = document.getElementById('pop-rank');
    rankEl.innerText = rank.name.toUpperCase();
    rankEl.style.color = rank.color;
    rankEl.style.textShadow = `0 0 10px ${rank.color}`;
    
    // Добавляем фоновую плашку для ранга (необязательно, но стильно)
    rankEl.style.background = `${rank.color}22`; 
    rankEl.style.padding = "2px 6px";
    rankEl.style.border = `1px solid ${rank.color}44`;

    // 3. Остальная стата
    document.getElementById('pop-kills').innerText = p.kills_astronauts || 0;
    document.getElementById('pop-msgs').innerText = p.message_count || 0;
    document.getElementById('pop-ufo').innerText = p.nlo_clicks || 0;

    pop.style.display = 'block';
}
    };
});

    // Твоя логика удаления (контекстное меню)
    if (isMy) {
        d.oncontextmenu = async (e) => {
            e.preventDefault();
            const confirmed = await Core.CustomConfirm("ERASE_DATA_STREAM?");
            if (confirmed) {
                const { error } = await Core.sb.from('comments').delete().eq('id', m.id);
                if (!error) {
                    d.classList.add('removing');
                    setTimeout(() => d.remove(), 300);
                    Core.Msg("DATA_STREAM_ERASED", "info");
                }
            }
        };
    }

    s.appendChild(d);
    s.scrollTop = s.scrollHeight;
}
}, // Запятая здесь важна!

UI() {
    const todoIn = document.getElementById('todo-in');
    const todoDate = document.getElementById('todo-date');
    const todoList = document.getElementById('todo-list');
    const chatIn = document.getElementById('chat-in');

    if (todoIn) {
        todoIn.onkeypress = async (e) => {
            if (e.key === 'Enter' && todoIn.value.trim()) {
                await this.Todo.add(todoIn.value, todoDate ? todoDate.value : null);
                todoIn.value = '';
                if (todoDate) todoDate.value = '';
            }
        };
    }

    if (todoList) {
        todoList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingItem = document.querySelector('.dragging');
            if (!draggingItem) return;
            const siblings = [...todoList.querySelectorAll('.task:not(.dragging)')];
            const nextSibling = siblings.find(sibling => e.clientY <= sibling.getBoundingClientRect().top + sibling.getBoundingClientRect().height / 2);
            todoList.insertBefore(draggingItem, nextSibling);
        });
    }

    if (chatIn) {
        chatIn.onkeypress = (e) => { if (e.key === 'Enter') this.Chat.send(); };
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
    init() {
        // Проверяем сначала игровой холст, если его нет - ищем фоновый для индекса
        this.cvs = document.getElementById('game-canvas') || document.getElementById('starfield');
        
        if (!this.cvs) {
            console.log("CANVAS_SYSTEM: No canvas found on this page.");
            return; 
        }

        this.ctx = this.cvs.getContext('2d');
        this.res();
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

    const rect = this.cvs.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Проверка попадания в астронавтов
    this.crew.forEach(a => {
        const dist = Math.hypot(a.x - mx, a.y - my);
        // Добавили !a.isFalling, чтобы нельзя было "накликивать" на летящего вниз
        if (dist < 60 && !a.isFalling) { 
            a.isFalling = true;
            a.vy = 10;
            a.vr = 0.2;
            Core.Msg("PILOT_LOST: EMERGENCY_EXIT");
            
            // ОБНОВЛЕНИЕ СТАТИСТИКИ: Сбитые космонавты
            Core.UpdateStat('kills_astronauts', 1);
        }
    });

    // Проверка попадания в НЛО
    const u = this.ufo;
    const ufoY = u.y + Math.sin(Date.now() / 600) * 35;
    if (Math.hypot(u.x - mx, ufoY - my) < 70) {
        u.v = 15;
        Core.Msg("UFO_BOOST: WARP_DRIVE");
        
        // ОБНОВЛЕНИЕ СТАТИСТИКИ: Клики по НЛО
        Core.UpdateStat('nlo_clicks', 1);
        
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
        
DrawPlanet() {
            const ctx = this.ctx;
            const img = document.getElementById('planet-pic');
            
            // Проверка: если картинки нет или она не загрузилась, выходим из функции, чтобы не было ошибки
            if (!img || !img.complete || img.naturalWidth === 0) return;

            // --- АДАПТИВНЫЕ РАСЧЕТЫ ---
            // Радиус: 10% от ширины экрана (от 40px до 120px)
            const r = Math.min(Math.max(this.cvs.width * 0.1, 40), 120); 
            const padding = r * 0.6; 
            const x = this.cvs.width - r - padding; 
            const y = r + padding + 30; 

            // 1. СВЕЧЕНИЕ (Адаптивный блюр)
            ctx.save();
            ctx.shadowBlur = r * 0.5; 
            ctx.shadowColor = 'rgba(100, 200, 255, 0.3)';
            ctx.fillStyle = 'rgba(0,0,0,0.01)';
            ctx.beginPath(); 
            ctx.arc(x, y, r, 0, Math.PI*2); 
            ctx.fill();
            ctx.restore();

            // 2. ФОТОГРАФИЯ (Масштабируется под r)
            ctx.drawImage(img, x - r, y - r, r * 2, r * 2);

            // 3. ОБЪЕМНАЯ ТЕНЬ
            ctx.save();
            const shadowGrad = ctx.createRadialGradient(x - r/3, y - r/3, r/4, x, y, r);
            shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
            shadowGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
            ctx.fillStyle = shadowGrad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();

            // 4. ДЕЛИКАТНОЕ КОЛЬЦО
            ctx.strokeStyle = 'rgba(79, 172, 254, 0.15)';
            ctx.lineWidth = Math.max(r * 0.02, 1);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI/6);
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.4, r * 0.2, 0, 0, Math.PI*2); 
            ctx.stroke();
            ctx.restore();
        }, // Не забудь эту запятую, если после идет следующая функция!
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
            this.DrawPlanet(); // Планета на фоне
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







// Копируем методы (Msg, UpdateProfile и т.д.) в уже созданный объект
Object.assign(window.Core, Core);

// Запускаем
window.Core.init();


window.dispatchEvent(new Event('core-ready'));
console.log("CORE_SYSTEM: FULL_READY_SIGNAL_SENT");