
// Как только страница загрузится, убираем черный оверлей

window.addEventListener('load', () => {
    document.getElementById('fade-overlay').style.opacity = '0';
});
// 1. Находим кран
const tap = document.getElementById('beer-tap');

// 2. Наши идеальные ручные координаты!
const frameOffsets = [0, -476, -918, -1408]; 
const totalFrames = 4;
let currentFrame = 0;
let animationInterval = null;

// Функция для смены кадров
function playTapAnimation() {
    currentFrame++;
    if (currentFrame >= totalFrames) {
        currentFrame = 1; 
    }
    // Берем точный пиксель из нашего массива
    tap.style.backgroundPosition = `${frameOffsets[currentFrame]}px 0`;
}

// Когда зажали мышку на кране
tap.addEventListener('mousedown', () => {
    if (animationInterval) return;
    
    currentFrame = 1; 
    tap.style.backgroundPosition = `${frameOffsets[currentFrame]}px 0`;
    animationInterval = setInterval(playTapAnimation, 150);
});

// Когда отпустили мышку
window.addEventListener('mouseup', () => {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
        
        currentFrame = 0;
        tap.style.backgroundPosition = `${frameOffsets[0]}px 0`;
    }
});

// Запрет выделения, чтобы картинка не "тащилась" мышкой
tap.ondragstart = () => false;