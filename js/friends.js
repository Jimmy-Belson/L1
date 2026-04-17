export const FriendsModule = {
    async init() {
        this.bindEvents();
        this.loadFriends();
    },

    

    bindEvents() {
    const toggle = document.getElementById('friends-toggle');
    const panel = document.getElementById('friends-panel');
    const close = document.getElementById('friends-close');

    if (toggle) toggle.onclick = () => {
        panel.classList.toggle('open');
        // Если открыли — сканируем сеть заново
        if (panel.classList.contains('open')) {
            this.loadFriends();
        }
    };
    if (close) close.onclick = () => panel.classList.remove('open');
},

    async loadFriends() {
    const listCont = document.getElementById('friends-list');
    if (!listCont) return;

    const myId = window.Core.user.id;

    // 1. Получаем ВСЕ связи: где я добавил и где меня добавили
    const { data: rels, error: relError } = await window.Core.sb
        .from('friends')
        .select('user_id, friend_id')
        .or(`user_id.eq.${myId},friend_id.eq.${myId}`);

    if (relError) return console.error("RELATION_FETCH_ERR", relError);

    // Собираем уникальные ID всех людей, с которыми у нас есть связь
    const ids = rels ? rels.map(r => r.user_id === myId ? r.friend_id : r.user_id) : [];
    
    // Убираем дубликаты (если оба добавили друг друга)
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
        listCont.innerHTML = '<div class="empty-list">[ NO_ACTIVE_SIGNALS ]</div>';
        return;
    }

    // 2. Получаем профили
    const { data: profiles, error: profError } = await window.Core.sb
        .from('profiles')
        .select('id, nickname, avatar_url, last_seen') 
        .in('id', uniqueIds);

    if (profError || !profiles) {
        listCont.innerHTML = '<div class="empty-list">SYNC_ERROR</div>';
        return;
    }

    listCont.innerHTML = '';
    // Сортировка: сначала те, кто онлайн
    profiles.sort((a, b) => {
        const aOnline = a.last_seen && (Date.now() - new Date(a.last_seen).getTime() < 120000);
        const bOnline = b.last_seen && (Date.now() - new Date(b.last_seen).getTime() < 120000);
        return bOnline - aOnline;
    });

    profiles.forEach(p => this.renderFriend(p));
},

renderFriend(p) {
    const listCont = document.getElementById('friends-list');
    const div = document.createElement('div');
    div.className = 'friend-item';
    
    const avatar = window.Core.getAvatar(p.id, p.avatar_url);
    const isOnline = p.last_seen && (Date.now() - new Date(p.last_seen).getTime() < 90000);
    const statusColor = isOnline ? '#00ffaa' : '#555';
    const statusText = isOnline ? 'LINK_STABLE' : 'OFFLINE';

    div.innerHTML = `
        <div class="friend-avatar-wrapper">
            <img src="${avatar}" class="friend-avatar">
            <span class="status-indicator" style="background: ${statusColor}; box-shadow: 0 0 5px ${statusColor}"></span>
        </div>
        <div class="friend-info">
            <span class="name">${(p.nickname || "PILOT").toUpperCase()}</span>
            <span class="status" style="color: ${statusColor}">${statusText}</span>
        </div>
        <div class="friend-actions">
            <i class="fas fa-phone-alt call-trigger"></i>
        </div>
    `;

    // Клик по всей строке — открывает чат
    div.onclick = () => window.CommModule.openPanel(p.id, p.nickname);
    
    // Клик только по телефону — звонок
    div.querySelector('.call-trigger').onclick = (e) => {
        e.stopPropagation();
        window.CommModule.openPanel(p.id, p.nickname);
        setTimeout(() => window.VoiceModule.startCall(), 500);
    };

    listCont.appendChild(div);
}
};


window.FriendsModule = FriendsModule;