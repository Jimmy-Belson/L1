/**
 * ЛОГИКА ПРОФИЛЯ ORBITRON (v2.0 - Neon Icons)
 */

// 1. Предпросмотр фото с уведомлением
function previewFile() {
    const file = document.getElementById('avatar-file').files[0];
    const preview = document.getElementById('avatar-img');
    const reader = new FileReader();

    reader.onloadend = () => {
        preview.src = reader.result;
        // КРАСИВОЕ УВЕДОМЛЕНИЕ: Файл готов
        if (window.Core && Core.Msg) {
            Core.Msg("IMAGE_STAGED: READY_FOR_SYNC", "info", "fa-image");
        }
    }

    if (file) {
        reader.readAsDataURL(file);
    }
}

// 2. Основная функция сохранения данных
async function updateProfile() {
    const btn = document.getElementById('save-btn');
    const fileInput = document.getElementById('avatar-file');
    const nickInput = document.getElementById('nick-input');
    
    const originalBtnText = btn.innerText;
    btn.innerText = ">> SYNCING...";
    btn.classList.add('loading'); // Можно добавить анимацию в CSS
    btn.disabled = true;

    try {
        let avatarUrl = document.getElementById('avatar-img').src;

        // А) Загрузка аватара
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${Math.random()}.${fileExt}`;

            const { data: uploadData, error: uploadError } = await Core.sb.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = Core.sb.storage.from('avatars').getPublicUrl(filePath);
            avatarUrl = data.publicUrl;
        }

        // Б) Обновление метаданных пользователя
        const { error: updateError } = await Core.sb.auth.updateUser({
            data: { 
                nickname: nickInput.value, 
                avatar_url: avatarUrl 
            }
        });

        if (updateError) throw updateError;

        // В) УСПЕХ: Космическая иконка щита или галочки
        if (window.Core && Core.Msg) {
            Core.Msg("IDENTITY_STABILIZED: DATA_SYNCED", "info", "fa-user-shield");
        }

    } catch (err) {
        console.error("Ошибка профиля:", err);
        // ОШИБКА: Иконка предупреждения
        if (window.Core && Core.Msg) {
            Core.Msg("SYNC_FAILED: " + err.message, "error", "fa-radiation");
        }
    } finally {
        btn.innerText = originalBtnText;
        btn.disabled = false;
        btn.classList.remove('loading');
    }
}

// 3. Авто-загрузка данных
window.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        if (!Core.sb) return;
        const { data: { user } } = await Core.sb.auth.getUser();
        
        if (user && user.user_metadata) {
            const meta = user.user_metadata;
            if (meta.nickname) document.getElementById('nick-input').value = meta.nickname;
            if (meta.avatar_url) document.getElementById('avatar-img').src = meta.avatar_url;
            
            // Уведомление о входе в систему
            Core.Msg("BIOMETRICS_RECOGNIZED: WELCOME", "info", "fa-id-badge");
        }
    }, 500);
});