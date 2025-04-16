/**
 * Модуль для обработки событий приложения
 */
import { ensureSingleInit, updateRendererSize } from './appCore.js';
import { removeAllSafetyZones } from './safetyManager.js';
import { handleAppError } from './errorHandler.js';

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
