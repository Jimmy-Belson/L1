/**
 * ЛОГИКА ПРОФИЛЯ ORBITRON (v2.0 - Синхронизированная)
 */

// 1. Предпросмотр фото
function previewFile() {
    const file = document.getElementById('avatar-file').files[0];
    const preview = document.getElementById('avatar-img');
    const reader = new FileReader();

    reader.onloadend = () => {
        preview.src = reader.result;
        if (window.Core && Core.Msg) {
            Core.Msg("IMAGE_STAGED: READY_FOR_SYNC", "info", "fa-image");
        }
    }

    if (file) { reader.readAsDataURL(file); }
}

// 2. Основная функция сохранения данных
async function updateProfile() {
    const btn = document.getElementById('save-btn');
    const fileInput = document.getElementById('avatar-file');
    // Используем ID 'edit-nick' как в твоем последнем HTML
    const nickInput = document.getElementById('edit-nick'); 
    
    if (!Core.user) return;

    const originalBtnText = btn.innerText;
    btn.innerText = ">> SYNCING...";
    btn.disabled = true;

    try {
        let avatarUrl = document.getElementById('avatar-img').src;

        // А) Загрузка аватара в Storage (если файл выбран)
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${Core.user.id}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await Core.sb.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = Core.sb.storage.from('avatars').getPublicUrl(filePath);
            avatarUrl = data.publicUrl;
        }

        // Б) Обновление ТАБЛИЦЫ profiles (чтобы чат видел изменения)
        const { error: tableError } = await Core.sb
            .from('profiles')
            .update({ 
                nickname: nickInput.value, 
                avatar_url: avatarUrl 
            })
            .eq('id', Core.user.id);

        if (tableError) throw tableError;

        // В) Обновление МЕТАДАННЫХ (для текущей сессии)
        await Core.sb.auth.updateUser({
            data: { nickname: nickInput.value, avatar_url: avatarUrl }
        });

        Core.Msg("IDENTITY_STABILIZED: DATA_SYNCED", "info", "fa-user-shield");
        
        // Возврат на палубу
        setTimeout(() => window.location.href = 'index.html', 1500);

    } catch (err) {
        console.error("Ошибка:", err);
        Core.Msg("SYNC_FAILED: " + err.message, "error", "fa-radiation");
    } finally {
        btn.innerText = originalBtnText;
        btn.disabled = false;
    }
}

// 3. Авто-загрузка данных при входе
window.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        if (!window.Core || !Core.sb) return;
        
        // Берем данные напрямую из таблицы для точности
        const { data: p } = await Core.sb.from('profiles').select('*').eq('id', Core.user.id).single();
        
        if (p) {
            const nickEl = document.getElementById('edit-nick');
            const imgEl = document.getElementById('avatar-img');
            
            if (nickEl) nickEl.value = p.nickname || "";
            if (imgEl && p.avatar_url) imgEl.src = p.avatar_url;
            
            Core.Msg("BIOMETRICS_RECOGNIZED: WELCOME", "info", "fa-id-badge");
        }
    }, 500);
});