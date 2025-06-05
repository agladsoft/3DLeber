/**
 *  Скрипт для управления новой панелью инструментов
 */
import { toggleTopView } from './scene.js';

// Глобальные переменные для настроек площадки
let selectedColor = '#d9d9d9'; // Цвет по умолчанию - серый

document.addEventListener('DOMContentLoaded', function() {
    console.log('Control Panel v2 loaded');
    
    // Функционал настройки площадки инициализируется отдельно
    
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
        console.log('Контейнер с кнопками инструментов найден при загрузке');
        // Восстановление состояния из localStorage
        const isHidden = localStorage.getItem('toolButtonsContainerHidden') === 'true';
        console.log('Состояние в localStorage (скрыт):', isHidden);
        
        if (isHidden) {
            // Применяем напрямую стиль вместо класса для надежности
            toolButtonsContainer.style.display = 'none';
            console.log('Скрыли панель инструментов при загрузке');
        } else {
            toolButtonsContainer.style.display = '';
            console.log('Отобразили панель инструментов при загрузке');
        }
    } else {
        console.error('Контейнер кнопок не найден при загрузке!');
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
        console.log('Кнопка настроек найдена:', settingsButton);
        
        settingsButton.addEventListener('click', function() {
            console.log('Клик по кнопке настроек');
            
            // Найти контейнер с кнопками (без точки в селекторе)
            const toolButtonsContainer = document.querySelector('.tool-buttons-container');
            console.log('Найден контейнер с кнопками:', toolButtonsContainer);
            
            // Проверяем текущее состояние видимости через вычисляемые стили
            if (toolButtonsContainer) {
                const computedStyle = window.getComputedStyle(toolButtonsContainer);
                const isCurrentlyVisible = computedStyle.display !== 'none';
                console.log('Текущее состояние видимости (вычисляемые стили):', 
                            {display: computedStyle.display, isVisible: isCurrentlyVisible});
                
                // Переключаем видимость
                if (isCurrentlyVisible) {
                    // Если видим - скрываем
                    console.log('Скрываем кнопки (был виден)');
                    // Сначала пробуем через класс
                    toolButtonsContainer.classList.add('hidden');
                    
                    // Затем дополнительно через прямой стиль для надежности
                    if (window.getComputedStyle(toolButtonsContainer).display !== 'none') {
                        console.log('Класс hidden не сработал, применяем inline стиль');
                        toolButtonsContainer.style.display = 'none';
                    }
                    
                    localStorage.setItem('toolButtonsContainerHidden', 'true');
                } else {
                    // Если скрыт - показываем
                    console.log('Показываем кнопки (был скрыт)');
                    toolButtonsContainer.classList.remove('hidden');
                    toolButtonsContainer.style.display = '';
                    localStorage.setItem('toolButtonsContainerHidden', 'false');
                }
                
                // Проверяем, сработало ли переключение
                setTimeout(() => {
                    const newComputedStyle = window.getComputedStyle(toolButtonsContainer);
                    console.log('Состояние после переключения:', 
                              {display: newComputedStyle.display, 
                               visible: newComputedStyle.display !== 'none'});
                }, 50);
                
                // Добавляем эффект нажатия для визуальной обратной связи
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 200);
            } else {
                console.error('Контейнер с кнопками не найден!');
            }
        });
    } else {
        console.error('Кнопка настроек не найдена!');
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