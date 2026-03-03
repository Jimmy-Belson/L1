/**
 * ЛОГИКА ПРОФИЛЯ ORBITRON
 */

// 1. Предпросмотр фото сразу после выбора в галерее/папке
function previewFile() {
    const file = document.getElementById('avatar-file').files[0];
    const preview = document.getElementById('avatar-img');
    const reader = new FileReader();

    reader.onloadend = () => {
        preview.src = reader.result;
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
    
    // Визуальный отклик: меняем текст на кнопке
    const originalBtnText = btn.innerText;
    btn.innerText = ">> SYNCING...";
    btn.disabled = true;

    try {
        let avatarUrl = document.getElementById('avatar-img').src;

        // А) Если выбран новый файл — загружаем его в Storage Supabase
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data: uploadData, error: uploadError } = await Core.sb.storage
                .from('avatars') // Убедись, что бакет в Supabase называется именно так
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Получаем постоянную публичную ссылку на файл
            const { data: { publicUrl } } = Core.sb.storage
                .from('avatars')
                .getPublicUrl(filePath);
            
            avatarUrl = publicUrl;
        }

        // Б) Обновляем ник и ссылку на фото в профиле пользователя (auth)
        const { error: updateError } = await Core.sb.auth.updateUser({
            data: { 
                nickname: nickInput.value, 
                avatar_url: avatarUrl 
            }
        });

        if (updateError) throw updateError;

        // В) Сообщение об успехе
        if (window.Core && Core.Msg) {
            Core.Msg("SYSTEM: DATA_SYNC_COMPLETE");
        } else {
            alert("ПРОФИЛЬ ОБНОВЛЕН!");
        }

    } catch (err) {
        console.error("Ошибка профиля:", err);
        alert("CRITICAL_ERROR: " + err.message);
    } finally {
        // Возвращаем кнопку в исходное состояние
        btn.innerText = originalBtnText;
        btn.disabled = false;
    }
}

// 3. Авто-загрузка данных при входе на страницу
window.addEventListener('DOMContentLoaded', async () => {
    // Ждем секунду, чтобы Core.sb успел инициализироваться из script.js
    setTimeout(async () => {
        const { data: { user } } = await Core.sb.auth.getUser();
        
        if (user && user.user_metadata) {
            const meta = user.user_metadata;
            if (meta.nickname) {
                document.getElementById('nick-input').value = meta.nickname;
            }
            if (meta.avatar_url) {
                document.getElementById('avatar-img').src = meta.avatar_url;
            }
        }
    }, 500);
});