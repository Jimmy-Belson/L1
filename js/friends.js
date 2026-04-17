export const FriendsModule = {
    async init() {
        this.bindEvents();
        this.loadFriends();
    },

    bindEvents() {
        const toggle = document.getElementById('friends-toggle');
        const panel = document.getElementById('friends-panel');
        const close = document.getElementById('friends-close');

        if (toggle) toggle.onclick = () => panel.classList.toggle('open');
        if (close) close.onclick = () => panel.classList.remove('open');
    },

    async loadFriends() {
        const listCont = document.getElementById('friends-list');
        if (!listCont) return;

        // Загружаем список ID друзей
        const { data: friendRels, error } = await window.Core.sb
            .from('friends')
            .select('friend_id')
            .eq('user_id', window.Core.user.id);

        if (error || !friendRels.length) {
            listCont.innerHTML = '<div class="empty-list">NO_ACTIVE_SIGNALS</div>';
            return;
        }

        const ids = friendRels.map(r => r.friend_id);

        // Получаем данные их профилей
        const { data: profiles } = await window.Core.sb
            .from('profiles')
            .select('id, nickname, avatar_url, last_seen') // last_seen для онлайна
            .in('id', ids);

        listCont.innerHTML = '';
        profiles.forEach(p => this.renderFriend(p));
    },

    renderFriend(p) {
        const listCont = document.getElementById('friends-list');
        const div = document.createElement('div');
        div.className = 'friend-item';
        
        const avatar = window.Core.getAvatar(p.id, p.avatar_url);
        
        div.innerHTML = `
            <img src="${avatar}" class="friend-avatar">
            <div class="friend-info">
                <span class="name">${(p.nickname || "PILOT").toUpperCase()}</span>
                <span class="status">SIGNAL_STABLE</span>
            </div>
            <div class="friend-actions">
                <i class="fas fa-comment-dots" title="Message"></i>
                <i class="fas fa-phone" title="Call"></i>
            </div>
        `;

        // Клик по другу открывает ЛС
        div.onclick = () => {
            window.CommModule.openPanel(p.id, p.nickname);
            document.getElementById('friends-panel').classList.remove('open');
        };

        // Клик по иконке звонка (остановка всплытия события)
        div.querySelector('.fa-phone').onclick = (e) => {
            e.stopPropagation();
            window.CommModule.openPanel(p.id, p.nickname);
            setTimeout(() => window.VoiceModule.startCall(), 500);
        };

        listCont.appendChild(div);
    }
};

window.FriendsModule = FriendsModule;