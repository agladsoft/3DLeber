/**
 * Модуль для обработки событий приложения
 */
import { updateRendererSize } from './appCore.js';
import { updateSafetyZonesVisibility, toggleSafetyZones, showAllSafetyZones } from './safetyManager.js';
import { hideAllDimensions, placedObjects, showModelDimensions } from '../objects.js';

/**
 * Устанавливает обработчики событий DOM
 */
export function setupDOMEventListeners() {
    // Установка обработчика загрузки DOM
    window.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    
    // Установка обработчика полной загрузки страницы
    window.addEventListener('load', handleWindowLoad);
}

/**
 * Обработчик события загрузки DOM
 */
function handleDOMContentLoaded() {
    console.log('DOM загружен, ожидаем нажатия кнопки запуска');
    
    // Обработчик кнопки "Запустить" в модальном окне выбора площадки
    setupStartButton();
    
    // Инициализация кнопки переключения панели управления
    setupTogglePanelButton();
    
    // Инициализация кнопки переключения сайдбара
    setupToggleSidebarButton();
}

/**
 * Настраивает кнопку запуска приложения из модального окна
 */
function setupStartButton() {
    const startButton = document.getElementById('startAppButton');
    if (startButton) {
        console.log('Кнопка запуска в модальном окне найдена');
        // Обработчик будет добавлен в modal.js для лучшей организации кода
    } else {
        console.log('Кнопка запуска в модальном окне не найдена!');
    }
}

/**
 * Настраивает кнопку переключения панели управления
 */
function setupTogglePanelButton() {
    const toggleButton = document.getElementById('toggleControlPanel');
    const controlPanel = document.getElementById('controlPanel');
    
    if (toggleButton && controlPanel) {
        console.log('Инициализация кнопки переключения панели управления');
        
        // Восстанавливаем состояние из localStorage (если есть)
        const isPanelExpanded = localStorage.getItem('controlPanelExpanded') === 'true';
        if (isPanelExpanded) {
            controlPanel.classList.add('expanded');
        }
        
        toggleButton.addEventListener('click', function() {
            // Переключаем класс для панели
            controlPanel.classList.toggle('expanded');
            
            // Сохраняем состояние в localStorage
            const isNowExpanded = controlPanel.classList.contains('expanded');
            localStorage.setItem('controlPanelExpanded', isNowExpanded);
        });
    } else {
        console.log('Кнопка переключения панели управления или сама панель не найдена');
    }
}

/**
 * Настраивает кнопку переключения сайдбара
 */
function setupToggleSidebarButton() {
    const toggleButton = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    
    if (toggleButton && sidebar) {
        console.log('Инициализация кнопки переключения сайдбара');
        
        // Восстанавливаем состояние из localStorage (если есть)
        const isSidebarHidden = localStorage.getItem('sidebarHidden') === 'true';
        if (isSidebarHidden) {
            sidebar.classList.add('hidden');
            toggleButton.classList.add('sidebar-hidden');
        }
        
        toggleButton.addEventListener('click', function() {
            // Переключаем класс для сайдбара
            sidebar.classList.toggle('hidden');
            
            // Переключаем класс для кнопки
            toggleButton.classList.toggle('sidebar-hidden');
            
            // Сохраняем состояние в localStorage
            const isNowHidden = sidebar.classList.contains('hidden');
            localStorage.setItem('sidebarHidden', isNowHidden);
        });
    } else {
        console.log('Кнопка переключения сайдбара или сам сайдбар не найден');
    }
}

/**
 * Обработчик полной загрузки окна
 */
function handleWindowLoad() {
    // Обновляем видимость зон безопасности в соответствии с настройками
    updateSafetyZonesVisibility();
    
    // Добавляем обработчик изменения размеров окна
    window.addEventListener('resize', handleWindowResize);
}

/**
 * Обработчик изменения размера окна
 */
function handleWindowResize() {
    // Обновляем видимость зон безопасности в соответствии с настройками
    updateSafetyZonesVisibility();
    
    // Обновляем размер рендерера
    updateRendererSize();
}
