// Как только страница загрузится, убираем черный оверлей
window.addEventListener('load', () => {
    document.getElementById('fade-overlay').style.opacity = '0';
});