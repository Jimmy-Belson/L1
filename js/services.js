// services.js
export const AvatarService = {
    getPublicUrl(sb, user_id, avatar_url) {
        // Убираем пробелы и проверяем на реальное наличие данных
        const cleanUrl = String(avatar_url || "").trim();

        // 1. Если в базе пусто, null или undefined — возвращаем робота DiceBear
        if (!cleanUrl || cleanUrl === "" || cleanUrl === "null" || cleanUrl === "undefined") {
            const seed = user_id || "guest";
            return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=001a2d`;
        }

        // 2. Если в базе уже лежит полная ссылка (http...) — возвращаем её как есть
        if (cleanUrl.startsWith('http')) {
            return cleanUrl;
        }
        
        // 3. Если в базе только имя файла (например, "photo.png") — формируем Public URL из бакета
        try {
            const { data } = sb.storage.from('avatars').getPublicUrl(cleanUrl);
            
            if (!data || !data.publicUrl) throw new Error("URL_GEN_FAILED");
            
            return data.publicUrl;
        } catch (e) {
            console.warn("AvatarService: Fallback to DiceBear due to error", e);
            const seed = user_id || "guest";
            return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=001a2d`;
        }
    }
};