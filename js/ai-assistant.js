// js/ai-assistant.js

const API_KEY = "AIzaSyBwf7yp9kXfcuIhI5n93RgPMbJ6bw7HbZw"; 
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + API_KEY;

function initAI() {
    console.log("[ORBI_LOG]: Инициализация ИИ запущена...");

    const aiWindow = document.getElementById('ai-window');
    const toggleBtn = document.getElementById('ai-toggle-btn');
    const sendBtn = document.getElementById('ai-send-btn');
    const aiInput = document.getElementById('ai-in');
    const dragHandle = document.getElementById('ai-drag-handle');

    if (!toggleBtn || !aiWindow) {
        console.error("[ORBI_LOG]: Элементы ИИ не найдены в HTML!");
        return;
    }

    // Обработка клика
    toggleBtn.addEventListener('click', (e) => {
        console.log("[ORBI_LOG]: Клик по кнопке зафиксирован.");
        if (aiWindow.style.display === 'none' || aiWindow.style.display === '') {
            aiWindow.style.display = 'flex';
            console.log("[ORBI_LOG]: Окно открыто.");
        } else {
            aiWindow.style.display = 'none';
            console.log("[ORBI_LOG]: Окно закрыто.");
        }
    });

    // Логика отправки
    async function sendMessage() {
        const content = document.getElementById('ai-content');
        const text = aiInput.value.trim();
        if (!text) return;

        content.innerHTML += <div style="color: #0ff; margin-bottom: 5px;">[PILOT]: ${text}</div>;
        aiInput.value = '';

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: text }] }] })
            });
            const data = await res.json();
            const aiText = data.candidates[0].content.parts[0].text;
            content.innerHTML += <div style="color: #a855f7; margin-bottom: 10px;">[ORBI]: ${aiText}</div>;
            content.scrollTop = content.scrollHeight;
        } catch (err) {
            content.innerHTML += <div style="color: red;">[SYSTEM_ERROR]</div>;
        }
    }

    sendBtn.onclick = sendMessage;
    aiInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

    // Перетаскивание (упрощенное)
    let isDragging = false;
    dragHandle.onmousedown = (e) => { isDragging = true; };
    document.onmousemove = (e) => {
        if (isDragging) {
            aiWindow.style.left = e.clientX - 150 + 'px';
            aiWindow.style.top = e.clientY - 20 + 'px';
        }
    };
    document.onmouseup = () => { isDragging = false; };
}

// Принудительный запуск
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAI);
} else {
    initAI();
}