class ProfileManager {
    async UpdateProfile() {
        if (!this.user) return;

        const btn = document.getElementById('save-btn');
        const nickInput = document.getElementById('edit-nick');
        const fileInput = document.getElementById('avatar-file'); 
        const previewImg = document.getElementById('avatar-img');
        
        if (!nickInput || !btn) return;

        const originalText = btn.innerText;
        btn.innerText = ">> SYNCING...";
        btn.disabled = true;

        try {
            let finalAvatarUrl = previewImg.src;

            // 1. ЗАГРУЗКА В STORAGE (если выбран новый файл)
            if (fileInput && fileInput.files.length > 0) {
                const file = fileInput.files[0];
                const fileExt = file.name.split('.').pop();
                // Генерируем уникальное имя, чтобы избежать кеширования
                const filePath = `${this.user.id}/avatar_${Date.now()}.${fileExt}`;

                const { error: uploadError } = await this.sb.storage
                    .from('avatars')
                    .upload(filePath, file, { upsert: true });

                if (uploadError) throw uploadError;

                const { data } = this.sb.storage.from('avatars').getPublicUrl(filePath);
                finalAvatarUrl = data.publicUrl;
            }

            // 2. ОБНОВЛЕНИЕ ТАБЛИЦЫ PROFILES
            const { error: dbError } = await this.sb
                .from('profiles')
                .update({ 
                    nickname: nickInput.value.trim(), 
                    avatar_url: finalAvatarUrl 
                })
                .eq('id', this.user.id);

            if (dbError) throw dbError;

            // 3. ОБНОВЛЕНИЕ AUTH METADATA (для моментального обновления в чате)
            const { data: { user }, error: authError } = await this.sb.auth.updateUser({
                data: { 
                    nickname: nickInput.value.trim(), 
                    avatar_url: finalAvatarUrl 
                }
            });

            if (authError) throw authError;

            this.user = user; // Синхронизируем локальный объект
            this.Msg("IDENTITY_STABILIZED: DATA_SYNCED", "info");
            
            // Уходим на главную через паузу
            setTimeout(() => window.location.href = 'index.html', 1500);

        } catch (e) {
            console.error(e);
            this.Msg("SYNC_FAILED: " + e.message, "error");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}