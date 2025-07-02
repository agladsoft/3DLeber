/**
 * Модуль для управления прелоадером при загрузке моделей (оптимизированный)
 */

// Глобальный прелоадер для переиспользования
let globalPreloader = null;
let currentPreloaderParent = null;

// Кэш DOM элементов для быстрого доступа
const imageContainerCache = new Map();

/**
 * Создает элемент прелоадера
 * @returns {HTMLElement} Элемент прелоадера
 */
function createPreloaderElement() {
    const preloader = document.createElement('div');
    preloader.className = 'model-preloader';
    
    const spinner = document.createElement('div');
    spinner.className = 'model-preloader-spinner';
    
    preloader.appendChild(spinner);
    
    return preloader;
}

/**
 * Создает или возвращает глобальный прелоадер
 */
function getGlobalPreloader() {
    if (!globalPreloader) {
        globalPreloader = createPreloaderElement();
        globalPreloader.style.display = 'none';
        document.body.appendChild(globalPreloader);
    }
    return globalPreloader;
}

/**
 * Показывает прелоадер на изображении модели в сайдбаре (оптимизированная версия)
 * @param {string} modelName - Имя модели
 * @returns {HTMLElement|null} Элемент прелоадера или null если не найден
 */
export function showModelPreloader(modelName) {
    // Используем кэшированный элемент если доступен
    let imageContainer = imageContainerCache.get(modelName);
    
    if (!imageContainer) {
        // Ищем элемент модели только если нет в кэше
        const targetElement = document.querySelector(`[data-model="${modelName}"]`);
        
        if (!targetElement) {
            console.warn('Model element not found for preloader:', modelName);
            return null;
        }
        
        // Ищем контейнер изображения
        imageContainer = targetElement.querySelector('.model-image-container');
        
        // Если контейнера нет, создаем его для изображения
        if (!imageContainer) {
            const imageElement = targetElement.querySelector('img');
            if (imageElement) {
                // Создаем обертку для изображения
                imageContainer = document.createElement('div');
                imageContainer.className = 'model-image-container';
                
                // Перемещаем изображение в контейнер
                imageElement.parentNode.insertBefore(imageContainer, imageElement);
                imageContainer.appendChild(imageElement);
            }
        }
        
        if (!imageContainer) {
            console.warn('Image container not found for model:', modelName);
            return null;
        }
        
        // Кэшируем для быстрого доступа
        imageContainerCache.set(modelName, imageContainer);
    }
    
    // Используем глобальный прелоадер
    const preloader = getGlobalPreloader();
    
    // Скрываем предыдущий прелоадер если есть
    if (currentPreloaderParent && currentPreloaderParent !== imageContainer) {
        preloader.style.display = 'none';
        if (currentPreloaderParent.contains(preloader)) {
            currentPreloaderParent.removeChild(preloader);
        }
    }
    
    // Показываем прелоадер для текущей модели
    if (!imageContainer.contains(preloader)) {
        imageContainer.appendChild(preloader);
    }
    preloader.style.display = 'flex';
    currentPreloaderParent = imageContainer;
    
    return preloader;
}

/**
 * Скрывает прелоадер с изображения модели (оптимизированная версия)
 * @param {string} modelName - Имя модели
 */
export function hideModelPreloader(modelName) {
    console.log('Hiding preloader for model:', modelName);
    
    // Используем глобальный прелоадер для скрытия
    if (globalPreloader && currentPreloaderParent) {
        globalPreloader.style.display = 'none';
        
        // Проверяем, что прелоадер принадлежит нужной модели
        const imageContainer = imageContainerCache.get(modelName);
        if (imageContainer && imageContainer === currentPreloaderParent) {
            if (imageContainer.contains(globalPreloader)) {
                imageContainer.removeChild(globalPreloader);
            }
            currentPreloaderParent = null;
            console.log('Global preloader hidden for model:', modelName);
        }
    }
}

/**
 * Скрывает все прелоадеры (оптимизированная версия)
 */
export function hideAllPreloaders() {
    // Скрываем глобальный прелоадер
    if (globalPreloader) {
        globalPreloader.style.display = 'none';
        if (currentPreloaderParent && currentPreloaderParent.contains(globalPreloader)) {
            currentPreloaderParent.removeChild(globalPreloader);
        }
        currentPreloaderParent = null;
    }
    
    // Очищаем кэш контейнеров
    imageContainerCache.clear();
    
    console.log('All preloaders hidden (global approach)');
}

/**
 * Проверяет, показан ли прелоадер для модели (оптимизированная версия)
 * @param {string} modelName - Имя модели
 * @returns {boolean} true если прелоадер показан
 */
export function isPreloaderVisible(modelName) {
    // Проверяем через глобальный прелоадер и кэш
    if (!globalPreloader || globalPreloader.style.display === 'none') {
        return false;
    }
    
    const imageContainer = imageContainerCache.get(modelName);
    return imageContainer && imageContainer === currentPreloaderParent && imageContainer.contains(globalPreloader);
}