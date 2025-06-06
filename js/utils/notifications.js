/**
 * Модуль для управления уведомлениями пользователя
 */

/**
 * Показывает всплывающее уведомление пользователю
 * @param {string} message - Текст уведомления
 * @param {number} duration - Продолжительность показа в миллисекундах (по умолчанию 3000)
 */
export function showNotification(message, duration = 3000) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.querySelector('.notification-message');
    
    if (notification && notificationMessage) {
        notificationMessage.textContent = message;
        notification.classList.remove('hidden');
        
        // Автоматически скрываем уведомление через указанное время
        setTimeout(function() {
            notification.classList.add('hidden');
        }, duration);
    } else {
        // Fallback: используем console.log, если элементы уведомлений не найдены
        console.log('Notification:', message);
    }
}

/**
 * Скрывает текущее уведомление
 */
export function hideNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.add('hidden');
    }
} 