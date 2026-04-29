// js/ai-assistant.js

const API_KEY = "AIzaSyD8PZEqToaHK-j3bYyAPPCPje9EIm-dc18";  //КЛЮЧ ЗАЩИЩЕН,НА САЙТАХ КРОМЕ ОРБИТРОНА НЕ РАБОТАЕТ,ЖУЛИК НЕ ВОРУЙ!
// Используем именно тот путь, который был в твоем curl
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";
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

async function sendMessage() {
    const content = document.getElementById('ai-content');
    const aiInput = document.getElementById('ai-in');
    const userText = aiInput.value.trim();
    
    if (!userText) return;

    content.innerHTML += `<div style="color: #0ff; margin-bottom: 10px;">[PILOT]: ${userText}</div>`;
    aiInput.value = '';
    content.scrollTop = content.scrollHeight;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": API_KEY 
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{
                        text: "Ты — ORBI, ИИ станции ORBITRON. Твой тон: футуристичный, лаконичный, технический. Называй пользователя 'Пилот'. Используй системные префиксы типа [DATA], [SIGNAL], [INFO]."
                    }]
                },
                contents: [{
                    parts: [{ text: userText }]
                }]
            })
        });

        const data = await response.json();

        if (response.ok) {
            const aiText = data.candidates[0].content.parts[0].text;
            content.innerHTML += `<div style="color: #a855f7; margin-bottom: 10px; border-left: 2px solid #a855f7; padding-left: 10px;">[ORBI]: ${aiText}</div>`;
        } else {
            content.innerHTML += `<div style="color: #ff4444; font-size: 10px;">[SYSTEM_ERROR]: ${data.error.message}</div>`;
        }

    } catch (e) {
        content.innerHTML += `<div style="color: #ff4444; font-size: 10px;">[CONNECTION_LOST]</div>`;
    }
    content.scrollTop = content.scrollHeight;
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