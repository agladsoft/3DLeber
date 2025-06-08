/**
 *  Скрипт для управления новой панелью инструментов
 */
import { toggleTopView } from './scene.js';

// Описания для инструментов
const TOOL_DESCRIPTIONS = {
    'resetView': 'Сбросить вид',
    'toggleDimensions': 'Показать размеры',
    'toggleSafetyZone': 'Показать зоны безопасности',
    'saveScreenshot': 'Сохранить скриншот',
    'deleteAllModels': 'Удалить все объекты',
    'closeAppButton': 'Закрыть приложение',
    'exportModel': 'Вид сверху',
    'playgroundButton': 'Настройки площадки'
};

// Глобальные переменные для настроек площадки
let selectedColor = '#d9d9d9'; // Цвет по умолчанию - серый

document.addEventListener('DOMContentLoaded', function() {
    console.log('Control Panel v2 loaded');
    
    // Создаем контейнер для информативных блоков
    const tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'tool-tooltip-container';
    tooltipContainer.className = 'tool-tooltip-container';
    // Скрываем подсказку при инициализации
    tooltipContainer.style.display = 'none';
    document.body.appendChild(tooltipContainer);
    
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
    const playgroundButton = document.getElementById('playgroundButton');
    
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
    
    // Добавляем эффект нажатия и информативные блоки для кнопок
    const allButtons = document.querySelectorAll('.tool-button-new');
    allButtons.forEach(button => {
        // Добавляем эффект нажатия
        button.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = 'scale(1)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
        
        // Добавляем обработку наведения для информативных блоков
        // Пропускаем кнопку настроек
        if (button.id !== 'settingsButton') {
            button.addEventListener('mouseenter', function(event) {
                showToolTooltip(event, this.id);
            });
            
            button.addEventListener('mouseleave', function() {
                hideToolTooltip();
            });
        }
    });
    
    // Функция для показа информативного блока при наведении на инструмент
    function showToolTooltip(event, toolId) {
        const tooltipContainer = document.getElementById('tool-tooltip-container');
        if (!tooltipContainer) return;
        
        // Получаем описание инструмента
        const description = TOOL_DESCRIPTIONS[toolId] || 'Инструмент';
        
        // Устанавливаем содержимое
        tooltipContainer.innerHTML = description;
        
        // Позиционируем блок относительно кнопки
        const buttonRect = event.target.closest('button').getBoundingClientRect();
        
        // Показываем блок для измерения его реальных размеров
        tooltipContainer.style.display = 'flex';
        tooltipContainer.style.visibility = 'hidden'; // Скрываем визуально, но можем измерить
        
        // Задержка для вычисления размеров
        setTimeout(() => {
            // Получаем реальные размеры подсказки после рендеринга
            const tooltipRect = tooltipContainer.getBoundingClientRect();
            const tooltipWidth = tooltipRect.width;
            const tooltipHeight = tooltipRect.height;
            const gap = 10; // Отступ между подсказкой и кнопкой
            
            // Позиция по горизонтали: слева от кнопки с отступом
            tooltipContainer.style.left = (buttonRect.left - tooltipWidth - gap) + 'px';
            
            // Позиция по вертикали: центрируем по вертикали относительно кнопки
            tooltipContainer.style.top = (buttonRect.top + (buttonRect.height - tooltipHeight) / 2) + 'px';
            
            // Теперь показываем
            tooltipContainer.style.visibility = 'visible';
        }, 0);
    }
    
    // Функция для скрытия информативного блока
    function hideToolTooltip() {
        const tooltipContainer = document.getElementById('tool-tooltip-container');
        if (tooltipContainer) {
            tooltipContainer.style.display = 'none';
        }
    }
    
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