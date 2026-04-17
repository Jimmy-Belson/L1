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

    // 1. Получаем список ID друзей
    const { data: friendRels, error: relError } = await window.Core.sb
        .from('friends')
        .select('friend_id')
        .eq('user_id', window.Core.user.id);

    if (relError) return console.error("RELATION_FETCH_ERR", relError);

    const ids = friendRels ? friendRels.map(r => r.friend_id) : [];

    // Проверка на пустой список
    if (ids.length === 0) {
        listCont.innerHTML = '<div class="empty-list" style="opacity:0.5; padding:20px; text-align:center; font-size:10px;">[ NO_ACTIVE_SIGNALS ]</div>';
        return;
    }

    // 2. Запрашиваем профили С ПОЛЕМ last_seen
    const { data: profiles, error: profError } = await window.Core.sb
        .from('profiles')
        .select('id, nickname, avatar_url, last_seen') 
        .in('id', ids);

    if (profError || !profiles) {
        listCont.innerHTML = '<div class="empty-list">SYNC_ERROR</div>';
        return;
    }

    listCont.innerHTML = '';
    profiles.forEach(p => this.renderFriend(p));
},

renderFriend(p) {
    const listCont = document.getElementById('friends-list');
    const div = document.createElement('div');
    div.className = 'friend-item';
    
    const avatar = window.Core.getAvatar(p.id, p.avatar_url);
    const isOnline = p.last_seen && (Date.now() - new Date(p.last_seen).getTime() < 300000);
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