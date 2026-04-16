// services.js
export const AvatarService = {
    getPublicUrl(sb, user_id, avatar_url) {
        let cleanUrl = String(avatar_url || "").trim();
        
        // 1. Очистка входных данных (ТОЛЬКО если это не полная ссылка)
        if (!cleanUrl.startsWith('http') && cleanUrl.includes(':')) {
            cleanUrl = cleanUrl.split(':')[0];
        }

        // 2. Если в базе пусто — возвращаем робота
        if (!cleanUrl || cleanUrl === "" || cleanUrl === "null" || cleanUrl === "undefined" || cleanUrl === "https") {
            const seed = user_id || "guest";
            return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=001a2d`;
        }

       // 3. Если это уже полная ссылка
if (cleanUrl.startsWith('http')) {
    // БЛОКИРОВКА СТАРЫХ ПЛЕЙСХОЛДЕРОВ
    if (cleanUrl.includes('placeholder.com') || cleanUrl.includes('via.placeholder')) {
        return `https://api.dicebear.com/7.x/bottts/svg?seed=${user_id}&backgroundColor=001a2d`;
    }

    // Исправляем отсутствие /public/ в ссылках Supabase
    if (cleanUrl.includes('supabase.co') && !cleanUrl.includes('/public/')) {
        return cleanUrl.replace('/object/avatars/', '/object/public/avatars/');
    }
    return cleanUrl;
}
        
        // 4. Генерация ссылки через SDK
        try {
            const { data } = sb.storage.from('avatars').getPublicUrl(cleanUrl);
            let finalUrl = data.publicUrl;

            // Насильно вставляем /public/, если SDK его не добавил
            if (finalUrl.includes('/object/avatars/') && !finalUrl.includes('/public/')) {
                finalUrl = finalUrl.replace('/object/avatars/', '/object/public/avatars/');
            }
            
            return finalUrl;
        } catch (e) {
            console.warn("AvatarService Error:", e);
            return `https://api.dicebear.com/7.x/bottts/svg?seed=${user_id}&backgroundColor=001a2d`;
        }
    }
};