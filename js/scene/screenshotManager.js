/**
 * Модуль для создания и сохранения скриншотов сцены
 */
import { showNotification } from '../utils.js';

/**
 * Создание скриншота сцены с анимацией вспышки
 */
export function takeScreenshot() {
    // Создаем эффект вспышки перед скриншотом
    const flashOverlay = createFlashOverlay();
    document.body.appendChild(flashOverlay);
    
    // Последовательность для создания скриншота
    setTimeout(() => {
        // Показываем вспышку
        flashOverlay.style.opacity = '0.5';
        
        // Создаем скриншот после эффекта вспышки
        setTimeout(() => {
            // Убеждаемся, что все компоненты доступны
            if (!window.app || !window.app.renderer || !window.app.scene || !window.app.camera || !window.app.canvas) {
                console.error('Не удалось создать скриншот: компоненты сцены недоступны');
                showNotification("Ошибка при создании скриншота", true);
                return;
            }
            
            // Рендерим сцену
            window.app.renderer.render(window.app.scene, window.app.camera);
            
            // Получаем скриншот с Canvas
            window.app.canvas.toBlob((blob) => {
                // Убираем эффект вспышки
                removeFlashOverlay(flashOverlay);
                
                // Сохраняем скриншот
                saveScreenshot(blob);
                
                // Показываем уведомление
                showNotification("Фотография успешно сохранена!", false);
            });
        }, 100);
    }, 50);
}

/**
 * Создает элемент для эффекта вспышки
 * @returns {HTMLElement} Элемент вспышки
 */
function createFlashOverlay() {
    const flashOverlay = document.createElement('div');
    flashOverlay.style.position = 'fixed';
    flashOverlay.style.top = '0';
    flashOverlay.style.left = '0';
    flashOverlay.style.width = '100%';
    flashOverlay.style.height = '100%';
    flashOverlay.style.backgroundColor = 'white';
    flashOverlay.style.opacity = '0';
    flashOverlay.style.transition = 'opacity 0.2s ease-in-out';
    flashOverlay.style.pointerEvents = 'none';
    flashOverlay.style.zIndex = '9999';
    return flashOverlay;
}

/**
 * Удаляет элемент вспышки из DOM
 * @param {HTMLElement} flashOverlay - Элемент вспышки
 */
function removeFlashOverlay(flashOverlay) {
    flashOverlay.style.opacity = '0';
    setTimeout(() => {
        document.body.removeChild(flashOverlay);
    }, 200);
}

/**
 * Сохраняет скриншот как файл
 * @param {Blob} blob - Изображение в формате blob
 */
function saveScreenshot(blob) {
    // Создаем URL для скачивания
    const url = URL.createObjectURL(blob);
    
    // Создаем ссылку для скачивания
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    
    // Создаем имя файла с датой и временем
    const fileName = generateFileName();
    downloadLink.download = fileName;
    
    // Эмулируем клик для запуска скачивания
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    // Освобождаем ресурсы
    URL.revokeObjectURL(url);
}

/**
 * Генерирует имя файла на основе текущей даты и времени
 * @returns {string} Имя файла
 */
function generateFileName() {
    const date = new Date();
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `playground_${year}-${month}-${day}_${hours}-${minutes}.png`;
}
