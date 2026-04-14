export const CommModule = {
    activeTarget: null,

// Внутри CommModule в comm.js

async openPanel(uid, nickname) {
    this.activeTarget = uid;
    const panel = document.getElementById('private-panel');
    const input = document.getElementById('private-in'); // Находим инпут
    
    if (!panel) return;

    panel.classList.remove('private-panel-hidden');
    panel.style.display = 'flex';

    // --- ФИКС КНОПКИ ENTER ---
    if (input) {
        // Убираем старые слушатели, чтобы они не копились
        input.onkeydown = null; 
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Чтобы страница не перезагрузилась
                this.sendPrivate(); // Вызываем твой метод отправки
            }
        };
        
        // Автофокус на поле ввода при открытии
        setTimeout(() => input.focus(), 100); 
    }
    // -------------------------

    const titleEl = document.getElementById('private-target-name');
    if (titleEl) titleEl.innerText = `SECURE_LINE: ${nickname.toUpperCase()}`;
    
    await this.loadPrivateHistory(uid);
    this.subscribeToPrivate(uid);
},

subscribeToPrivate(targetUid) {
    // Если уже есть активный канал — закрываем его перед созданием нового
    if (this.privateChannel) {
        window.Core.sb.removeChannel(this.privateChannel);
    }

    // Создаем уникальное имя канала для текущей пары пользователей
    const myId = window.Core.user.id;
    
    this.privateChannel = window.Core.sb
        .channel(`private-comm-${targetUid}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'comments',
            filter: `recipient_id=eq.${myId}` // Слушаем сообщения, присланные МНЕ
        }, payload => {
            const m = payload.new;
            // Рендерим только если сообщение пришло от того, кто сейчас открыт
            if (m.user_id === targetUid) {
                this.renderPrivateMsg(m);
            } else {
                // Если пришло от другого — можно показать системное уведомление
                if (window.Core.Msg) window.Core.Msg(`NEW SIGNAL FROM ${m.nickname.toUpperCase()}`, "info");
            }
        })
        .subscribe();
},

// Не забудь обновить метод отправки, чтобы он тоже рендерил сообщение локально
async sendPrivate() {
    const input = document.getElementById('private-in');
    if (!input || !input.value.trim() || !this.activeTarget) return;

    const val = input.value;
    input.value = '';

    const { data, error } = await window.Core.sb.from('comments').insert([{
        message: val,
        user_id: window.Core.user.id,
        recipient_id: this.activeTarget,
        nickname: window.Core.userProfile?.nickname || "PILOT"
    }]).select();

    if (data && data[0]) {
        this.renderPrivateMsg(data[0]); // Рендерим свое сообщение сразу
    }
},

closePanel(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const panel = document.getElementById('private-panel');
    if (panel) {
        panel.style.display = 'none'; // Прячем через стиль (это надежнее)
        panel.classList.add('private-panel-hidden');
    }
    this.activeTarget = null;
},

closePanel(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    const panel = document.getElementById('private-panel');
    if (panel) {
        panel.style.display = 'none'; // Прячем полностью
        panel.classList.add('private-panel-hidden');
    }
    this.activeTarget = null;
},

    // 3. Загрузка истории
    async loadPrivateHistory(uid) {
        const container = document.getElementById('private-messages');
        if (!container) return;

        container.innerHTML = '<div style="opacity:0.5; font-size:10px; padding:10px;">>> DECRYPTING_ARCHIVES...</div>';

        const myId = window.Core.user?.id;
        if (!myId) return;

        try {
            const { data, error } = await window.Core.sb
                .from('comments')
                .select('*')
                .or(`and(user_id.eq.${myId},recipient_id.eq.${uid}),and(user_id.eq.${uid},recipient_id.eq.${myId})`)
                .order('created_at', { ascending: true });

            if (error) throw error;

            container.innerHTML = '';
            if (data && data.length > 0) {
                data.forEach(m => this.renderPrivateMsg(m));
                container.scrollTop = container.scrollHeight;
            } else {
                container.innerHTML = '<div style="opacity:0.3; font-size:10px; padding:10px; text-align:center;">--- NO_DATA_FOUND ---</div>';
            }
        } catch (err) {
            console.error("HISTORY_LOAD_ERROR:", err.message);
            container.innerHTML = '<div style="color:red; font-size:10px;">>> LINK_ERROR_RCV</div>';
        }
    },

    // 4. Отправка сообщения
    async sendPrivate() {
        const input = document.getElementById('private-in');
        if (!input) return;

        const val = input.value.trim();
        const myProfile = window.Core.userProfile;
        
        if (!val || !this.activeTarget || !window.Core.user) return;

        try {
            const { data, error } = await window.Core.sb.from('comments').insert([{
                message: val,
                nickname: myProfile?.nickname || "PILOT",
                user_id: window.Core.user.id,
                recipient_id: this.activeTarget 
            }]).select();

            if (error) throw error;

            input.value = '';
            if (data && data[0]) this.renderPrivateMsg(data[0]);
            
        } catch (err) {
            console.error("PRIVATE_SEND_ERROR:", err.message);
            if (window.Core.Msg) window.Core.Msg("SIGNAL_FAILED", "error");
        }
    },

    // 5. Отрисовка
    renderPrivateMsg(m) {
        const container = document.getElementById('private-messages');
        if (!container) return;

        const isMy = m.user_id === window.Core.user?.id;
        
        // Формат 24 часа
        const time = new Date(m.created_at).toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit', 
            hour12: false 
        });

        const displayName = isMy ? "YOU" : (m.nickname || "PILOT").toUpperCase();

        const msgEl = document.createElement('div');
        msgEl.id = `priv-msg-${m.id}`;
        msgEl.style.cssText = `
            margin-bottom: 12px;
            padding: 8px;
            background: ${isMy ? 'rgba(255,0,85,0.05)' : 'rgba(0,255,255,0.05)'};
            border-left: 2px solid ${isMy ? 'var(--neon-pink)' : '#0ff'};
            position: relative;
        `;

        // Добавляем кнопку удаления, если сообщение наше
        const delBtnHtml = isMy 
            ? `<span class="del-priv-trigger" style="cursor:pointer; color:var(--neon-pink); opacity:0.5; margin-left:10px; font-size:14px;">×</span>` 
            : '';

        msgEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:9px; margin-bottom:4px; opacity:0.7; font-family:'Orbitron';">
                <span style="color:${isMy ? 'var(--neon-pink)' : '#0ff'}">${displayName}</span>
                <span>${time} ${delBtnHtml}</span>
            </div>
            <div style="color:#fff; font-family:'Share Tech Mono'; font-size:13px; line-height:1.4; word-break:break-all;">
                ${m.message}
            </div>
        `;

        // Привязка удаления
        const delTrigger = msgEl.querySelector('.del-priv-trigger');
        if (delTrigger) {
            delTrigger.onclick = async () => {
                // Используем твой CustomConfirm
                const confirmed = await window.CustomConfirm("Are you sure lil bro?");
                if (confirmed) {
                    try {
                        const { error } = await window.Core.sb.from('comments').delete().eq('id', m.id);
                        if (!error) {
                            msgEl.remove();
                            if (window.Core.Msg) window.Core.Msg("SIGNAL_PURGED", "success");
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
            };
        }

        container.appendChild(msgEl);
        container.scrollTop = container.scrollHeight;
    }
};

// Добавь это в CommModule или просто в файл comm.js
function makeDraggable(el, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    handle.onmousedown = dragMouseDown;

    handle.onmousedown = (e) => {
    // Если кликнули по кнопке закрытия или ресайзеру - не тащим
    if (e.target.closest('.close-comm-btn') || e.target.id === 'private-resizer') return;
    dragMouseDown(e);
};

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    el.style.transform = "none"; // УБИРАЕМ ТРАНСФОРМАЦИЮ ПРИ ПЕРЕТАСКИВАНИИ
    el.style.top = (el.offsetTop - pos2) + "px";
    el.style.left = (el.offsetLeft - pos1) + "px";
    el.style.bottom = "auto";
    el.style.right = "auto";
}
    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function makeResizable(el, resizer) {
    resizer.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Чтобы не сработало перетаскивание при попытке ресайза
        
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    });

    function resize(e) {
        // Вычисляем новую ширину и высоту относительно положения элемента
        const rect = el.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        const newHeight = e.clientY - rect.top;

        // Устанавливаем минимальные границы, чтобы окно не схлопнулось
        if (newWidth > 250) el.style.width = newWidth + 'px';
        if (newHeight > 200) el.style.height = newHeight + 'px';
    }

    function stopResize() {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResize);
    }
}

// Инициализация (вызвать в конце файла или при загрузке)
setTimeout(() => {
    const panel = document.getElementById('private-panel');
    const handle = document.getElementById('private-drag-handle');
    const resizer = document.getElementById('private-resizer');
    if (panel && handle) makeDraggable(panel, handle);
    if (panel && resizer) makeResizable(panel, resizer);
}, 1000);

window.CommModule = CommModule;