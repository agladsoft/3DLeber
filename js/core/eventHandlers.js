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
    
    // Настраиваем кнопку запуска приложения
    setupLaunchButton();
}

/**
 * Настраивает кнопку запуска приложения
 */
function setupLaunchButton() {
    const launchButton = document.getElementById('launchApp');
    if (launchButton) {
        console.log('Кнопка запуска найдена, добавляем обработчик');
        // Добавляем только один обработчик для кнопки запуска
        launchButton.addEventListener('click', handleLaunchButtonClick);
    } else {
        console.log('Кнопка запуска не найдена!');
    }
}

/**
 * Обработчик клика по кнопке запуска
 */
function handleLaunchButtonClick() {
    console.log('Кнопка запуска нажата');
    const modal = document.getElementById('appModal');
    console.log('Модальное окно найдено:', modal !== null);
    if (modal) {
        console.log('Отображаем модальное окно');
        modal.style.display = 'block';
        document.getElementById('launchContainer').style.display = 'none';
        console.log('Запускаем инициализацию приложения');
        ensureSingleInit();
    } else {
        console.error('Модальное окно не найдено!');
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
