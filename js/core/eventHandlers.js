/**
 * Модуль для обработки событий приложения
 */
import { updateRendererSize } from './appCore.js';
import { removeAllSafetyZones, toggleSafetyZones, showAllSafetyZones } from './safetyManager.js';
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
    
    // Инициализация кнопки скрытия размеров
    setupToggleDimensionsButton();

    // Инициализация кнопки скрытия размеров
    setupToggleSafetyZoneButton();
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
 * Настраивает кнопку скрытия/показа размеров модели
 */
function setupToggleDimensionsButton() {
    const toggleButton = document.getElementById('toggleDimensions');
    const dimensionLabels = document.getElementById('dimensionLabels');
    if (toggleButton && dimensionLabels) {
        // Восстанавливаем состояние из localStorage (если есть)
        const isHidden = localStorage.getItem('dimensionLabelsHidden') === 'true';
        if (isHidden) {
            dimensionLabels.style.display = 'none';
            toggleButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="#000000" stroke-width="2"/>
                    <line x1="3" y1="12" x2="21" y2="12" stroke="#000000" stroke-width="2"/>
                    <line x1="12" y1="3" x2="12" y2="21" stroke="#000000" stroke-width="2"/>
                </svg>
            `;
            hideAllDimensions();
        } else {
            dimensionLabels.style.display = '';
            toggleButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="#000000" stroke-width="2"/>
                    <line x1="3" y1="12" x2="21" y2="12" stroke="#000000" stroke-width="2"/>
                    <line x1="12" y1="3" x2="12" y2="21" stroke="#000000" stroke-width="2"/>
                </svg>
            `;
            // Показываем размеры для всех объектов
            if (Array.isArray(placedObjects)) {
                placedObjects.forEach(obj => showModelDimensions(obj));
            }
        }

        toggleButton.addEventListener('click', function() {
            const isCurrentlyHidden = dimensionLabels.style.display === 'none';
            if (isCurrentlyHidden) {
                dimensionLabels.style.display = '';
                toggleButton.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#000000" stroke-width="2"/>
                        <line x1="3" y1="12" x2="21" y2="12" stroke="#000000" stroke-width="2"/>
                        <line x1="12" y1="3" x2="12" y2="21" stroke="#000000" stroke-width="2"/>
                    </svg>
                `;
                // Показываем размеры для всех объектов
                if (Array.isArray(placedObjects)) {
                    placedObjects.forEach(obj => showModelDimensions(obj));
                }
            } else {
                dimensionLabels.style.display = 'none';
                toggleButton.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#000000" stroke-width="2"/>
                        <line x1="3" y1="12" x2="21" y2="12" stroke="#000000" stroke-width="2"/>
                        <line x1="12" y1="3" x2="12" y2="21" stroke="#000000" stroke-width="2"/>
                    </svg>
                `;
                hideAllDimensions();
            }
            localStorage.setItem('dimensionLabelsHidden', !isCurrentlyHidden);
        });
    }
}

/**
 * Настраивает кнопку скрытия/показа зоны безопасности
 */
function setupToggleSafetyZoneButton() {
    const toggleButton = document.getElementById('toggleSafetyZone');
    if (toggleButton) {
        // Восстанавливаем состояние из localStorage
        const isHidden = localStorage.getItem('safetyZoneHidden') === 'true';
        
        // Устанавливаем начальное состояние
        if (isHidden) {
            toggleButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            removeAllSafetyZones();
        } else {
            toggleButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            showAllSafetyZones();
        }
        
        toggleButton.addEventListener('click', function() {
            const isVisible = toggleSafetyZones();
            toggleButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            `;
            localStorage.setItem('safetyZoneHidden', !isVisible);
        });
    }
}

/**
 * Обработчик полной загрузки окна
 */
function handleWindowLoad() {
    // Удаляем все элементы безопасной зоны после полной загрузки
    removeAllSafetyZones();
    
    // Добавляем обработчик изменения размеров окна
    window.addEventListener('resize', handleWindowResize);
}

/**
 * Обработчик изменения размера окна
 */
function handleWindowResize() {
    // Удаляем все элементы безопасной зоны при изменении размера
    removeAllSafetyZones();
    
    // Обновляем размер рендерера
    updateRendererSize();
}
