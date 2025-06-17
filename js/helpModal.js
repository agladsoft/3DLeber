/**
 * Модуль управления модальным окном помощи
 * Простая версия для локальных видео файлов
 */

/**
 * Инициализация модального окна помощи
 */
export function initHelpModal() {
    const helpButton = document.getElementById('helpButton');
    const helpModal = document.getElementById('helpModal');
    const helpCloseButton = document.getElementById('helpCloseButton');
    const helpVideo = document.getElementById('helpVideo');

    if (!helpButton || !helpModal || !helpCloseButton || !helpVideo) {
        console.error('Help modal elements not found');
        return;
    }

    // Обработчик открытия модального окна помощи
    helpButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Opening help modal');
        showHelpModal();
    });

    // Обработчик закрытия модального окна по кнопке
    helpCloseButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        hideHelpModal();
    });

    // Обработчик закрытия модального окна по клику на фон
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            hideHelpModal();
        }
    });

    // Обработчик закрытия по клавише Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && helpModal.style.display === 'block') {
            hideHelpModal();
        }
    });

    console.log('Help modal initialized');
}

/**
 * Показать модальное окно помощи
 */
export function showHelpModal() {
    const helpModal = document.getElementById('helpModal');
    const helpVideo = document.getElementById('helpVideo');
    
    if (helpModal) {
        helpModal.style.display = 'block';
        
        // Сбрасываем видео к началу при открытии
        if (helpVideo) {
            helpVideo.currentTime = 0;
        }
        
        console.log('Help modal opened');
    }
}

/**
 * Скрыть модальное окно помощи
 */
export function hideHelpModal() {
    const helpModal = document.getElementById('helpModal');
    const helpVideo = document.getElementById('helpVideo');
    
    if (helpModal) {
        helpModal.style.display = 'none';
        
        // Останавливаем видео при закрытии
        if (helpVideo) {
            helpVideo.pause();
        }
        
        console.log('Help modal closed');
    }
}
