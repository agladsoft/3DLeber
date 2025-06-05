/**
 * Скрипт для управления новой панелью инструментов
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Control Panel v2 loaded');
    
    // Получаем ссылки на кнопки
    const settingsButton = document.getElementById('settingsButton');
    const resetViewButton = document.getElementById('resetView');
    const toggleDimensionsButton = document.getElementById('toggleDimensions');
    const toggleSafetyZoneButton = document.getElementById('toggleSafetyZone');
    const saveScreenshotButton = document.getElementById('saveScreenshot');
    const deleteAllModelsButton = document.getElementById('deleteAllModels');
    const closeAppButton = document.getElementById('closeAppButton');
    const exportModelButton = document.getElementById('exportModel');
    const viewGalleryButton = document.getElementById('viewGallery');
    
    // Восстановление состояния контейнера с кнопками инструментов
    const toolButtonsContainer = document.querySelector('.tool-buttons-container');
    if (toolButtonsContainer) {
        // Восстановление состояния из localStorage
        const isHidden = localStorage.getItem('toolButtonsContainerHidden') === 'true';
        if (isHidden) {
            toolButtonsContainer.classList.add('hidden');
        }
    }
    
    // Добавляем эффект нажатия для кнопок
    const allButtons = document.querySelectorAll('.tool-button-new');
    allButtons.forEach(button => {
        button.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = 'scale(1)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // Функция для показа всплывающего уведомления
    function showNotification(message) {
        const notification = document.getElementById('notification');
        const notificationMessage = document.querySelector('.notification-message');
        
        if (notification && notificationMessage) {
            notificationMessage.textContent = message;
            notification.classList.remove('hidden');
            
            // Автоматически скрываем уведомление через 3 секунды
            setTimeout(function() {
                notification.classList.add('hidden');
            }, 3000);
        }
    }
    
    // Обрабатываем функциональность кнопки настроек
    if (settingsButton) {
        settingsButton.addEventListener('click', function() {
            // Найти контейнер с кнопками
            const toolButtonsContainer = document.querySelector('.tool-buttons-container');
            
            // Переключить видимость только контейнера с кнопками
            if (toolButtonsContainer) {
                toolButtonsContainer.classList.toggle('hidden');
                
                // Сохраняем состояние в localStorage
                const isHidden = toolButtonsContainer.classList.contains('hidden');
                localStorage.setItem('toolButtonsContainerHidden', isHidden);
                
                // Добавляем эффект нажатия для визуальной обратной связи
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 200);
            }
        });
    }
    
    // Обрабатываем функциональность кнопки галереи
    if (viewGalleryButton) {
        viewGalleryButton.addEventListener('click', function() {
            showNotification('Галерея скриншотов будет доступна в следующем обновлении');
        });
    }
    
    // Обрабатываем новую функциональность кнопки экспорта
    if (exportModelButton) {
        exportModelButton.addEventListener('click', function() {
            showNotification('Функция экспорта будет доступна в следующем обновлении');
        });
    }
});