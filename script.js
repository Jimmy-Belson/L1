import { getRankByScore } from './ranks.js';






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

getAvatar(user_id, avatar_url) {
    // 1. Если аватара нет вообще — даем робота
    if (!avatar_url || avatar_url === "" || avatar_url === "null") {
        const seed = user_id || "guest";
return 'https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=001a2d';
    }

    // 2. Если это уже полная ссылка (начинается с http) — возвращаем её
    if (avatar_url.startsWith('http')) {
        return avatar_url;
    }
    
    // 3. Если это имя файла (например "0.123.png"), получаем публичную ссылку из твоего бакета
    try {
        const { data } = this.sb.storage.from('avatars').getPublicUrl(avatar_url);
        return data.publicUrl;
    } catch (e) {
        // Если что-то пошло не так со Storage — запасной вариант (робот)
return 'https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=001a2d';
    }
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

// Добавь это внутрь объекта Core в script.js
previewFile() {
    const preview = document.getElementById('avatar-img');
    const file = document.getElementById('avatar-file').files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
        if (preview) preview.src = reader.result;
    };

    if (file) {
        reader.readAsDataURL(file);
    }
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
    // 1. МГНОВЕННЫЙ ЗАПУСК ВИЗУАЛА (Сначала рисуем, потом грузим данные)
    if (this.Canvas) {
        this.Canvas.init();
        // Запускаем петлю отрисовки сразу!
        this.loop();
    }
    
    this.UI();
    this.startClock(); 
    if (this.Audio) this.Audio.setup();

    // 2. ФОНОВАЯ ПРОВЕРКА СЕССИИ
    const { data: { session } } = await this.sb.auth.getSession();
    const path = window.location.pathname;
    const isStation = path.includes('station.html');

    if (!session) {
        if (!isStation) window.location.replace('station.html');
        return; // Дальше не идем, если нет юзера
    }

    this.user = session.user;
    if (isStation) {
        window.location.replace('index.html');
    } else {
        // Подгружаем данные профиля в фоне
        this.loadAppData();
    }

    this.sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') window.location.replace('station.html');
    });
},

// Вынес загрузку данных в отдельный метод, чтобы не блокировать поток
async loadAppData() {
    // 1. Запускаем всё ПАРАЛЛЕЛЬНО. Не ждем профиль, чтобы загрузить чат.
    Promise.all([
        this.SyncProfile(this.user),
        this.Todo.load(),
        this.Chat.load()
    ]).then(() => {
        // Подписываемся на новые сообщения только когда старые уже отрисованы
        if (this.Chat.subscribe) this.Chat.subscribe();
    }).catch(e => console.warn("DATA_LOAD_PARTIAL_FAILURE", e));
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
            // СОХРАНЯЕМ ДАННЫЕ В КЭШ CORE
            this.userProfile = data; 

            const nickEl = document.getElementById('nick-display');
            const avatarEl = document.getElementById('avatar-display');
            
            if (nickEl) {
                const rank = getRankByScore(data.combat_score || 0);
                nickEl.innerText = data.nickname || user.email.split('@')[0];
                nickEl.style.color = rank.color;
                nickEl.style.textShadow = `0 0 8px ${rank.color}`;
            }
            // Обновляем главную аватарку в шапке
            if (avatarEl) avatarEl.src = data.avatar_url || this.getAvatar(user.id);
        }
    } catch (e) {
        console.warn("SYNC_PROFILE_WARNING:", e.message);
    }
},

async UpdateProfile() {
    if (!this.user) return;
    const btn = document.getElementById('save-btn');
    const fileInput = document.getElementById('avatar-file');
    const nickInput = document.getElementById('nick-input');
    
    btn.disabled = true;
    btn.innerText = ">> UPLOADING...";

    try {
        let fileName = this.userProfile?.avatar_url || ""; 

        // Если юзер выбрал новый файл
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const ext = file.name.split('.').pop();
            fileName = `${this.user.id}-${Date.now()}.${ext}`; // Уникальное имя

            // Грузим в бакет
            const { error: uploadErr } = await this.sb.storage
                .from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadErr) throw uploadErr;
        }

        // Обновляем таблицу
        const { error: updateErr } = await this.sb.from('profiles').upsert({
            id: this.user.id,
            nickname: nickInput.value,
            avatar_url: fileName // ТЕПЕРЬ ТУТ ВСЕГДА ЛИБО ПУСТО, ЛИБО ИМЯ ФАЙЛА
        });

        if (updateErr) throw updateErr;

        this.Msg("DATA_SYNCED");
        setTimeout(() => location.href = 'index.html', 1000);
    } catch (err) {
        this.Msg("ERROR: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "[ SYNC_WITH_STATION ]";
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
    if (!window.Core.user) return;

    // Сначала получаем текущий счет, чтобы не перезаписать его меньшим
    const { data: profile } = await window.Core.sb
        .from('profiles')
        .select('combat_score')
        .eq('id', window.Core.user.id)
        .single();

    const currentScore = profile?.combat_score || 0;

    // Сохраняем, только если новый счет больше старого (рекорд)
    if (newScore > currentScore) {
        const { error } = await window.Core.sb
            .from('profiles')
            .update({ combat_score: newScore })
            .eq('id', window.Core.user.id);

        if (error) console.error("Update Error:", error);
        else console.log("NEW_RECORD_SAVED:", newScore);
    }
},

Todo: {
    items: [],

    async load() {
        if (!window.Core.user) return;
        
        const { data, error } = await window.Core.sb.from('todo')
            .select('*')
            .eq('user_id', window.Core.user.id) 
            .order('id', { ascending: false });

        if (error) return console.error("TODO_LOAD_ERR:", error);
        
        const list = document.getElementById('todo-list');
        if (!list) return;

        list.innerHTML = ''; 
        this.items = data;

        const fragment = document.createDocumentFragment();
        data.forEach(t => fragment.appendChild(this.createTaskNode(t)));
        list.appendChild(fragment);

        // Инициализируем логику перемещения для контейнера
        this.initDragLogic(list);
    },

    createTaskNode(t) {
        const d = document.createElement('div');
        d.className = `task ${t.is_completed ? 'completed' : ''}`;
        d.id = `task-${t.id}`;
        d.draggable = true; 

        const dateStr = t.deadline ? 
            `<span class="deadline-tag">[UNTIL: ${new Date(t.deadline).toLocaleDateString()}]</span>` : '';

        d.innerHTML = `
            <div class="task-drag-handle" style="cursor: grab;">::</div>
            <div class="task-content">
                <span class="task-text">> ${t.task.toUpperCase()}</span>
                ${dateStr}
            </div>
            <div class="task-status-icon"></div>
        `;

        // События Drag
        d.ondragstart = (e) => {
            d.classList.add('dragging');
            e.dataTransfer.setData('text/plain', t.id);
            e.dataTransfer.effectAllowed = 'move';
        };

        d.ondragend = () => {
            d.classList.remove('dragging');
            // Здесь можно вызвать сохранение порядка в БД, если добавишь колонку position
            window.Core.Msg("OBJECTIVE_REORDERED");
        };

        // Клик (выполнение)
        d.onclick = async (e) => {
            if (e.target.classList.contains('task-drag-handle')) return;
            const newState = !d.classList.contains('completed');
            d.classList.toggle('completed');
            await window.Core.sb.from('todo').update({ is_completed: newState }).eq('id', t.id);
        };

        // ПКМ (удаление)
        d.oncontextmenu = async (ev) => {
            ev.preventDefault();
            const confirmed = await window.Core.CustomConfirm("ERASE_OBJECTIVE?");
            if (confirmed) {
                d.classList.add('removing-task'); 
                setTimeout(async () => {
                    const { error } = await window.Core.sb.from('todo').delete().eq('id', t.id);
                    if (!error) {
                        d.remove();
                        window.Core.Msg("OBJECTIVE_TERMINATED");
                    } else {
                        d.classList.remove('removing-task');
                    }
                }, 400);
            }
        };

        return d;
    },

    // Логика перемещения внутри списка
    initDragLogic(list) {
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(list, e.clientY);
            const dragging = document.querySelector('.dragging');
            if (afterElement == null) {
                list.appendChild(dragging);
            } else {
                list.insertBefore(dragging, afterElement);
            }
        });
    },

    // Вспомогательная функция для определения позиции вставки
    getDragAfterElement(container, y) {
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
    },

    render(t) {
        const list = document.getElementById('todo-list'); 
        if (!list) return;
        const node = this.createTaskNode(t);
        list.prepend(node); // Новые задачи всегда в начало
    },

    async add(val, date) {
        const core = window.Core;
        if (!core.user || !val) return;

        try {
            const { data, error } = await core.sb.from('todo').insert([{ 
                task: val, 
                is_completed: false,
                user_id: core.user.id,
                deadline: date || null
            }]).select();

            if (error) throw error;
            
            if (data && data[0]) {
                this.render(data[0]);
                core.Msg("MISSION_ESTABLISHED", "info");
                const list = document.getElementById('todo-list');
                list.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (e) {
            core.Msg("UPLINK_ERROR", "error");
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
    // Если канал уже есть, удаляем старый перед созданием нового
    if (this.channel) {
        await Core.sb.removeChannel(this.channel);
    }

    this.channel = Core.sb.channel('global-chat')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, payload => {
            const m = payload.new;
            // Рендерим только если сообщение не наше (наше рендерится сразу в send)
            if (m.user_id !== Core.user?.id) {
                this.render(m);
                Core.SystemNotify(`NEW_SIGNAL: ${m.nickname}`, m.message);
            }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'comments' }, payload => {
            const el = document.getElementById(`msg-${payload.old.id}`);
            if (el) el.remove();
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                console.log("COMM_LINK: ESTABLISHED");
                this.isSubscribed = true;
            }
            if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                console.warn("COMM_LINK: LOST. RECONNECTING...");
                this.isSubscribed = false;
                // Реконнект через 3 секунды
                setTimeout(() => this.subscribe(), 3000);
            }
        });
},

async load() { 
    const s = document.getElementById('chat-stream');
    if (!s) return;

    // Очищаем перед загрузкой, чтобы не дублировать
    s.innerHTML = '<div style="opacity:0.5; padding:10px;">>> RECOVERING_ARCHIVES...</div>';

    const { data, error } = await window.Core.sb
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false }) // Берем САМЫЕ НОВЫЕ
        .limit(50); 
    
    if (error) {
        console.error("CHAT_LOAD_ERROR:", error);
        return;
    }

    if (data) { 
        s.innerHTML = ''; 
        // .reverse() ВАЖЕН: переворачиваем массив, чтобы 
        // старые сообщения были вверху, а новые — внизу.
        data.reverse().forEach(m => this.render(m)); 
        
        // Мгновенная прокрутка в конец
        s.scrollTop = s.scrollHeight;
    } 
},

async send() { 
    const i = document.getElementById('chat-in'); 
    const core = window.Core;

    if (!i || !i.value.trim() || !core.user) return; 

    const val = i.value;
    i.value = ''; 

    // ВАЖНО: Вытаскиваем только имя файла из профиля, а не всю ссылку!
    let avatarName = core.userProfile?.avatar_url || null;
    
    // Если там вдруг затесалась полная ссылка, очищаем её до имени файла
    if (avatarName && avatarName.includes('/avatars/')) {
        avatarName = avatarName.split('/avatars/').pop();
    }

    const nickname = core.userProfile?.nickname || core.user.email.split('@')[0];

    try {
        const { data, error } = await core.sb.from('comments').insert([{
            message: val, 
            nickname: nickname, 
            avatar_url: avatarName, // ТЕПЕРЬ ТУТ ТОЛЬКО ИМЯ (напр. "0.0521.png")
            user_id: core.user.id
        }]).select();

        if (error) throw error;
        if (data && data[0]) {
            this.render(data[0]);
            core.UpdateStat('message_count', 1);
        }
    } catch (err) {
        console.error("CHAT_SEND_ERROR:", err);
        core.Msg("SIGNAL_LOST", "error");
        i.value = val;
    }
},

render(m) {
    const s = document.getElementById('chat-stream'); 
    if (!s || document.getElementById(`msg-${m.id}`)) return;

    const currentUserId = window.Core.user?.id;
    const isMy = m.user_id === currentUserId;
    
    // ОДНА СТРОКА вместо кучи проверок:
    const avatar = window.Core.getAvatar(m.user_id, m.avatar_url);

    const displayNick = (m.nickname || "PILOT_UNKNOWN").toUpperCase();
    const time = new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const d = document.createElement('div'); 
    d.id = `msg-${m.id}`;
    d.className = `msg-container ${isMy ? 'my-msg' : ''}`;
    
    d.innerHTML = `
        <div class="chat-row-layout">
            <div class="avatar-wrapper" style="cursor:pointer">
                <img src="${avatar}" class="chat-row-avatar">
            </div>
            <div class="chat-content-block">
                <div class="msg-header">
                    <span class="msg-nick" style="cursor:pointer; color:${isMy ? 'var(--n)' : '#0ff'}">${displayNick}</span>
                    <span class="msg-time">${time}</span>
                </div>
                <div class="msg-text">${m.message}</div>
            </div>
        </div>`;

    const openPop = async (e) => {
        e.stopPropagation();
        const pop = document.getElementById('user-popover');
        if (!pop) return;

        pop.style.display = 'block';
        pop.style.position = 'fixed';
        pop.style.top = '50%';
        pop.style.left = '50%';
        pop.style.transform = 'translate(-50%, -50%)';

        const { data: p } = await window.Core.sb.from('profiles').select('*').eq('id', m.user_id).maybeSingle();
        if (p) {
            const rank = (typeof getRankByScore === 'function') ? getRankByScore(p.combat_score || 0) : {name: 'RECRUIT', color: '#fff'};
            
            // Обновляем текст
            document.getElementById('pop-nick').innerText = (p.nickname || "UNKNOWN").toUpperCase();
            document.getElementById('pop-nick').style.color = rank.color;
            document.getElementById('pop-rank').innerText = rank.name;
            document.getElementById('pop-kills').innerText = p.kills_astronauts || 0;
            document.getElementById('pop-msgs').innerText = p.message_count || 0;
            document.getElementById('pop-score').innerText = p.combat_score || 0;

            // ОБНОВЛЯЕМ АВАТАР В ПОПОВЕРЕ ТОЖЕ ЧЕРЕЗ ФУНКЦИЮ
            const popAva = document.getElementById('pop-avatar');
            if (popAva) popAva.src = window.Core.getAvatar(p.id, p.avatar_url);
        }
    };

    const avWrapper = d.querySelector('.avatar-wrapper');
    const nickBtn = d.querySelector('.msg-nick');
    if (avWrapper) avWrapper.onclick = openPop;
    if (nickBtn) nickBtn.onclick = openPop;

    // ... (код удаления сообщения оставляй как был)
    s.appendChild(d);
    s.scrollTop = s.scrollHeight;
}
},

UI() {
    const todoIn = document.getElementById('todo-in');
    const todoDate = document.getElementById('todo-date');
    const chatIn = document.getElementById('chat-in');

    if (todoIn) {
        // Очищаем старые слушатели, чтобы не было дублей
        todoIn.onkeypress = null; 
        todoIn.onkeypress = async (e) => {
            if (e.key === 'Enter') {
                const val = todoIn.value.trim();
                if (val) {
                    // Явное обращение к объекту Todo внутри Core
                    await window.Core.Todo.add(val, todoDate ? todoDate.value : null);
                    todoIn.value = '';
                    if (todoDate) todoDate.value = '';
                }
            }
        };
    }

    if (chatIn) {
        chatIn.onkeypress = async (e) => { 
            if (e.key === 'Enter' && chatIn.value.trim()) {
                await window.Core.Chat.send(); 
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
    init() {
        // Проверяем сначала игровой холст, если его нет - ищем фоновый для индекса
    this.cvs = document.getElementById('starfield');
    
    if (!this.cvs) return; // Если мы на странице игры, где нет starfield — выходим
    
        
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
    // Если по какой-то причине Core перестал существовать, стопаем петлю
    if (!window.Core) return; 
    
    if (this.Canvas && this.Canvas.draw) {
        this.Canvas.draw();
    }
    requestAnimationFrame(() => this.loop());

    }
};

window.addEventListener('click', (e) => {
    const pop = document.getElementById('user-popover');
    if (pop && !pop.contains(e.target)) {
        pop.style.display = 'none';
    }
});





// Проверяем, существует ли Core, если нет — создаем пустой объект
window.Core = window.Core || {};

// Безопасно копируем методы в глобальный объект
Object.assign(window.Core, Core);

// Запускаем инициализацию

window.Core.init();


window.dispatchEvent(new Event('core-ready'));
console.log("CORE_SYSTEM: FULL_READY_SIGNAL_SENT");