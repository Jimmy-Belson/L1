import { UI } from './ui.js';
import { AvatarService } from './services.js';
import { supabase } from './supabase.js';
import { CustomConfirm } from './confirm.js';
import { Utils } from './utils.js';
import { CanvasSystem } from './canvas.js';
import { TodoModule } from './todo.js';
import { ChatModule } from './chat.js';
import { AuthModule } from './auth.js'; // НЕ ЗАБУДЬ ЭТОТ ИМПОРТ

const Core = {
    sb: supabase,
    user: null,
    userProfile: null,

    // Ссылки на модули
    Chat: ChatModule,
    Todo: TodoModule,
    Canvas: CanvasSystem,
    Auth: AuthModule,
    CustomConfirm,
    SystemNotify: Utils.SystemNotify,
    Msg: UI.Msg,

    // Быстрые методы-прослойки для связи с AuthModule
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
            this.Canvas.loop(); // Обязательно через this.Canvas
        }
        
        this.UI();
        Utils.startClock();


        const { data: { session } } = await this.sb.auth.getSession();
        const isStation = window.location.pathname.includes('station.html');

        if (!session) {
            if (!isStation) window.location.replace('station.html');
            return;
        }

        this.user = session.user;
        isStation ? window.location.replace('../index.html') : this.loadAppData();

        this.sb.auth.onAuthStateChange(ev => ev === 'SIGNED_OUT' && window.location.replace('station.html'));
    },

    async loadAppData() {
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
            if (!this.el) {
                // Проверяем, находимся ли мы в подпапке (например, /html/ или /pages/)
                // Если в адресе есть слэш после домена, нам нужно выйти на уровень выше
                const pathParts = window.location.pathname.split('/');
                const isSubPage = pathParts.length > 2 && pathParts[pathParts.length - 2] !== "";
                
                const trackPath = isSubPage ? '../track.mp3' : 'track.mp3';
                
                this.el = new Audio();
                this.el.preload = 'none'; // ГЛАВНОЕ: не искать файл заранее!
                this.el.src = trackPath;
                this.el.loop = true;
                this.el.volume = 0.1;

                this.el.onerror = () => {
                    console.log("AUDIO_INFO: track.mp3 not found at " + trackPath);
                    this.el = null; 
                };
            }
        },
        toggle() {
            this.setup();
            if (!this.el) return;

            const btn = document.getElementById('audio-btn'); 
            if (this.el.paused) {
                this.el.play().catch(() => console.log("Music blocked by browser policy"));
                btn?.classList.add('playing');
            } else {
                this.el.pause();
                btn?.classList.remove('playing');
            }
        }
    },

        toggle() {
            this.setup();
            const btn = document.getElementById('audio-btn'); 
            if (this.el.paused) {
                this.el.play().catch(() => {});
                btn?.classList.add('playing');
            } else {
                this.el.pause();
                btn?.classList.remove('playing');
            }
        }
    
};

window.addEventListener('click', (e) => {
    const pop = document.getElementById('user-popover');
    if (pop && !pop.contains(e.target)) pop.style.display = 'none';
});

window.Core = Core;
Core.init();