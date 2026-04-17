import { UI } from './ui.js';
import { AvatarService } from './services.js';
import { supabase } from './supabase.js';
import { CustomConfirm } from './confirm.js';
import { Utils } from './utils.js';
import { CanvasSystem } from './canvas.js';
import { TodoModule } from './todo.js';
import { ChatModule } from './chat.js';
import { AuthModule } from './auth.js';

const Core = {
    sb: supabase,
    user: null,
    userProfile: null,

    // Добавь эти две строки:
    Utils: Utils, 
    getRank: window.getRankByScore, // Привязываем твои ранги к Core

    Chat: ChatModule,
    Todo: TodoModule,
    Canvas: CanvasSystem,
    Auth: AuthModule,
    CustomConfirm,
    SystemNotify: Utils.SystemNotify,
    Msg: UI.Msg,

    async SyncProfile(u) { await this.Auth.SyncProfile(this, u); },
    async UpdateProfile() { await this.Auth.UpdateProfile(this); },
    async Register() { await this.Auth.Register(this); },
    async Logout() { await this.Auth.Logout(this); },
    async UpdateStat(f, v) { await this.Auth.UpdateStat(this, f, v); },
    async UpdateCombatScore(s) { await this.Auth.UpdateCombatScore(this, s); },
    previewFile() { this.Auth.previewFile(); },
    
    TogglePass() { Utils.TogglePass(this); },
    getAvatar: (uid, url) => AvatarService.getPublicUrl(supabase, uid, url),
    
    toggleChat() {
        document.getElementById('main-chat-window')?.classList.toggle('minimized');
    },

    async init() {
        if (this.Canvas) {
            this.Canvas.init();
            this.Canvas.loop();
        }
        
        this.UI();
        Utils.startClock();

        const { data: { session } } = await this.sb.auth.getSession();
        
        // Умное определение текущей страницы
        const isSubPage = window.location.pathname.includes('/html/');
        const isStation = window.location.pathname.endsWith('station.html');

        if (!session) {
            if (!isStation) {
                // Если мы в /html/, то станция рядом. Если в корне — она в html/
                const redir = isSubPage ? 'station.html' : 'html/station.html';
                window.location.replace(redir);
            }
            return;
        }

        this.user = session.user;

           // ФИНАЛЬНЫЙ ПИНОК: Запускаем голос прямо здесь!
        if (window.GlobalVoiceInit) {
            window.GlobalVoiceInit();
        }

        if (isStation) {
            // Если залогинены, но попали на страницу входа — уходим на главную
            const home = isSubPage ? '../index.html' : 'index.html';
            window.location.replace(home);
        } else {
            this.loadAppData();
        }

        this.sb.auth.onAuthStateChange(ev => {
            if (ev === 'SIGNED_OUT') {
                const exitPath = isSubPage ? 'station.html' : 'html/station.html';
                window.location.replace(exitPath);
            }
        });
    },

async loadAppData() {
        // Инициализируем панель друзей и вешаем события кликов
        if (window.FriendsModule) {
            window.FriendsModule.init();

            // Обновляем свой статус каждые 45 секунд
setInterval(async () => {
    if (window.Core.user) {
        await window.Core.sb
            .from('profiles')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', window.Core.user.id);
    }
}, 45000);
        }

        Promise.all([
            this.SyncProfile(this.user),
            this.Todo.load(this),
            this.Chat.load(this)
        ]).then(() => {
            if (this.Chat.subscribe) this.Chat.subscribe(this); 
        }).catch(e => console.warn("DATA_LOAD_ERR", e));
    },

    UI() {
        const todoIn = document.getElementById('todo-in');
        const todoDate = document.getElementById('todo-date');
        const chatIn = document.getElementById('chat-in');

        if (todoIn) {
            todoIn.onkeypress = async (e) => {
                if (e.key === 'Enter' && todoIn.value.trim()) {
                    await this.Todo.add(todoIn.value.trim(), todoDate?.value, this);
                    todoIn.value = '';
                    if (todoDate) todoDate.value = '';
                }
            };
        }

        if (chatIn) {
            chatIn.onkeypress = async (e) => { 
                if (e.key === 'Enter' && chatIn.value.trim()) await this.Chat.send(this);
            };
        }
    },

Audio: {
        el: null,
        setup() {
            if (this.el) return; // Если уже создан, ничего не делаем
            
            const isSubPage = window.location.pathname.includes('/html/');
            // Используем относительный путь от корня, это надежнее
            const trackPath = isSubPage ? '../track.mp3' : './track.mp3';
            
            this.el = new Audio(trackPath);
            this.el.preload = 'auto'; // Поменял на auto для стабильности
            this.el.loop = true;
            this.el.volume = 0.1;
        },
        toggle() {
            this.setup();
            const btn = document.getElementById('audio-btn'); 
            if (!this.el) return;
            
            if (this.el.paused) {
                // Маленький хак: сбрасываем src только если он пустой, 
                // чтобы не провоцировать лишние запросы
                if (!this.el.src || this.el.src.endsWith('https')) {
                     const isSubPage = window.location.pathname.includes('/html/');
                     this.el.src = isSubPage ? '../track.mp3' : './track.mp3';
                }
                
                this.el.play().catch(e => console.log("Audio play blocked:", e));
                btn?.classList.add('playing');
            } else {
                this.el.pause();
                btn?.classList.remove('playing');
            }
        }
    }
}

window.addEventListener('click', (e) => {
    const pop = document.getElementById('user-popover');
    // Если поповер открыт И клик был НЕ по поповеру И НЕ по нику в чате
    if (pop && pop.style.display === 'block' && !pop.contains(e.target)) {
        pop.style.display = 'none';
    }
});

// Вместо жесткого window.Core = Core;
// Мы объединяем существующий Core (со звонками) с новым функционалом
window.Core = Object.assign(window.Core || {}, Core);

// Инициализируем
window.Core.init();