/**
 * Модуль для отображения загрузки моделей в сайдбаре
 * Адаптированный под локальные preloader'ы для каждой модели
 */

// Map для отслеживания активных preloader'ов
const activePreloaders = new Map();

/**
 * Создает CSS стили для preloader'а (выполняется один раз)
 */
function ensurePreloaderStyles() {
    if (!document.querySelector('#model-preloader-styles')) {
        const style = document.createElement('style');
        style.id = 'model-preloader-styles';
        style.textContent = `
            .model-preloader {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background: rgba(0, 0, 0, 0.75) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                flex-direction: column !important;
                z-index: 1000 !important;
                border-radius: 8px !important;
                backdrop-filter: blur(2px) !important;
            }
            
            .model-preloader-spinner {
                width: 28px !important;
                height: 28px !important;
                border: 3px solid rgba(255, 255, 255, 0.3) !important;
                border-top: 3px solid #007bff !important;
                border-radius: 50% !important;
                animation: modelSpinAnimation 1s linear infinite !important;
                margin-bottom: 8px !important;
            }
            
            .model-preloader-text {
                color: white !important;
                font-size: 11px !important;
                font-weight: 500 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                text-align: center !important;
                line-height: 1.2 !important;
            }
            
            @keyframes modelSpinAnimation {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Делаем модель неинтерактивной во время загрузки */
            .model-loading {
                pointer-events: none !important;
                user-select: none !important;
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Создает элемент preloader'а для конкретной модели
 * @param {string} text - Текст для отображения
 * @returns {HTMLElement} Элемент preloader'а
 */
function createModelPreloaderElement(text = 'Загрузка...') {
    const preloader = document.createElement('div');
    preloader.className = 'model-preloader';
    
    // Спиннер
    const spinner = document.createElement('div');
    spinner.className = 'model-preloader-spinner';
    
    // Текст
    const textElement = document.createElement('div');
    textElement.className = 'model-preloader-text';
    textElement.textContent = text;
    
    preloader.appendChild(spinner);
    preloader.appendChild(textElement);
    
    return preloader;
}

/**
 * Показывает preloader для конкретной модели в сайдбаре
 * @param {string} modelName - Имя модели
 * @param {string} text - Текст для отображения (по умолчанию "Загрузка...")
 */
export function showModelPreloader(modelName, text = 'Загрузка...') {
    console.log(`Showing preloader for model: ${modelName}`);
    
    // Убираем предыдущий preloader для этой модели
    hideModelPreloader(modelName);
    
    // Инициализируем стили
    ensurePreloaderStyles();
    
    // Находим элемент модели в сайдбаре
    const modelElement = document.querySelector(`[data-model="${modelName}"]`);
    if (!modelElement) {
        console.warn(`Model element not found for: ${modelName}`);
        return;
    }
    
    // Делаем элемент модели относительно позиционированным
    const originalPosition = modelElement.style.position;
    if (!originalPosition || originalPosition === 'static') {
        modelElement.style.position = 'relative';
    }
    
    // Создаем preloader
    const preloader = createModelPreloaderElement(text);
    
    // Добавляем класс для блокировки взаимодействия
    modelElement.classList.add('model-loading');
    
    // Добавляем preloader к элементу модели
    modelElement.appendChild(preloader);
    
    // Сохраняем ссылку для возможности удаления
    activePreloaders.set(modelName, {
        element: preloader,
        modelElement: modelElement,
        originalPosition: originalPosition
    });
    
    console.log(`Preloader shown for model: ${modelName}`);
}

/**
 * Скрывает preloader для конкретной модели
 * @param {string} modelName - Имя модели
 */
export function hideModelPreloader(modelName) {
    console.log(`Hiding preloader for model: ${modelName}`);
    
    const preloaderInfo = activePreloaders.get(modelName);
    if (!preloaderInfo) {
        return; // Preloader для этой модели не активен
    }
    
    const { element: preloader, modelElement, originalPosition } = preloaderInfo;
    
    // Удаляем preloader из DOM
    if (preloader && preloader.parentNode) {
        preloader.parentNode.removeChild(preloader);
    }
    
    // Убираем класс блокировки взаимодействия
    if (modelElement) {
        modelElement.classList.remove('model-loading');
        
        // Восстанавливаем оригинальное позиционирование
        if (originalPosition) {
            modelElement.style.position = originalPosition;
        } else {
            modelElement.style.position = '';
        }
    }
    
    // Удаляем из активных preloader'ов
    activePreloaders.delete(modelName);
    
    console.log(`Preloader hidden for model: ${modelName}`);
}

/**
 * Обновляет текст preloader'а для конкретной модели
 * @param {string} modelName - Имя модели
 * @param {string} text - Новый текст
 */
export function updateModelPreloaderText(modelName, text) {
    const preloaderInfo = activePreloaders.get(modelName);
    if (!preloaderInfo) {
        return;
    }
    
    const textElement = preloaderInfo.element.querySelector('.model-preloader-text');
    if (textElement) {
        textElement.textContent = text;
    }
}

/**
 * Скрывает все активные preloader'ы (для очистки)
 */
export function hideAllPreloaders() {
    console.log('Hiding all model preloaders');
    
    for (const [modelName] of activePreloaders) {
        hideModelPreloader(modelName);
    }
}

/**
 * Проверяет, активен ли preloader для модели
 * @param {string} modelName - Имя модели
 * @returns {boolean} true если preloader активен
 */
export function isPreloaderActive(modelName) {
    return activePreloaders.has(modelName);
}

/**
 * Получает список всех активных preloader'ов
 * @returns {string[]} Массив имен моделей с активными preloader'ами
 */
export function getActivePreloaders() {
    return Array.from(activePreloaders.keys());
}