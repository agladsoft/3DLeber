/**
 *  Скрипт для управления новой панелью инструментов
 */
import { toggleTopView } from './scene.js';

// Глобальные переменные для настроек площадки
let selectedColor = '#d9d9d9'; // Цвет по умолчанию - серый

document.addEventListener('DOMContentLoaded', function() {
    console.log('Control Panel v2 loaded');
    
    // Инициализация обработчиков для модального окна настройки площадки
    initPlaygroundSettingsHandlers();
    
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
    
    // Обрабатываем кнопку Галерея как "Площадка"
    if (viewGalleryButton) {
        viewGalleryButton.addEventListener('click', function() {
            try {
                // Добавляем класс активности для кнопки
                this.classList.toggle('active');
                
                // Получаем модальное окно настройки площадки
                const playgroundSettings = document.getElementById('playgroundSettings');
                
                if (playgroundSettings) {
                    // Если модальное окно существует, переключаем его видимость
                    if (playgroundSettings.classList.contains('hidden')) {
                        // Получаем текущие размеры и цвет площадки
                        updatePlaygroundModalValues();
                        // Показываем модальное окно
                        playgroundSettings.classList.remove('hidden');
                    } else {
                        // Скрываем модальное окно
                        playgroundSettings.classList.add('hidden');
                    }
                } else {
                    showNotification('Модальное окно настройки площадки не найдено');
                }
            } catch (error) {
                console.error('Ошибка при работе с настройками площадки:', error);
                showNotification('Произошла ошибка при открытии настроек площадки');
            }
        });
    }
    
    // Обрабатываем кнопку Экспорт как "Вид сверху"
    if (exportModelButton) {
        exportModelButton.addEventListener('click', function() {
            try {
                // Получаем текущие размеры площадки
                let width = 40;
                let length = 30;
                
                if (window.app && window.app.playgroundWidth && window.app.playgroundLength) {
                    width = window.app.playgroundWidth;
                    length = window.app.playgroundLength;
                }
                
                // Вызываем функцию toggleTopView напрямую из импорта
                toggleTopView(width, length);
                
                // Визуальная обратная связь на кнопке
                this.classList.toggle('active');
            } catch (error) {
                console.error('Ошибка при включении режима вид сверху:', error);
                showNotification('Произошла ошибка при включении режима "Вид сверху"');
            }
        });
    }
});