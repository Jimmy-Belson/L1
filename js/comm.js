export const CommModule = {
    activeTarget: null, // ID того, с кем общаемся

    // Открыть панель
    openPanel(uid, nickname) {
        this.activeTarget = uid;
        const panel = document.getElementById('private-panel');
        document.getElementById('private-target-name').innerText = `SECURE_LINE: ${nickname.toUpperCase()}`;
        
        panel.classList.remove('private-panel-hidden'); // Показываем
        this.loadPrivateHistory(uid); // (Функцию загрузки напишем следом)
    },

    // Закрыть панель
    closePanel() {
        const panel = document.getElementById('private-panel');
        panel.classList.add('private-panel-hidden'); // Прячем
        this.activeTarget = null;
    },

    // Отправка сообщения
    async sendPrivate() {
        const input = document.getElementById('private-in');
        const val = input.value.trim();
        if (!val || !this.activeTarget) return;

        const { error } = await window.Core.sb.from('comments').insert([{
            message: val,
            nickname: window.Core.userProfile.nickname,
            user_id: window.Core.user.id,
            recipient_id: this.activeTarget // Указываем получателя
        }]);

        if (!error) input.value = '';
    }
};

window.CommModule = CommModule;