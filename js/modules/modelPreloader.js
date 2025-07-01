/**
 * Модуль для управления прелоадером при загрузке моделей
 */

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
 * Показывает прелоадер на изображении модели в сайдбаре
 * @param {string} modelName - Имя модели
 * @returns {HTMLElement|null} Элемент прелоадера или null если не найден
 */
export function showModelPreloader(modelName) {
    console.log('Showing preloader for model:', modelName);
    
    // Ищем элемент модели в новой структуре сайдбара
    const modelElements = document.querySelectorAll('.model');
    let targetElement = null;
    
    for (const element of modelElements) {
        const modelData = element.getAttribute('data-model');
        if (modelData === modelName) {
            targetElement = element;
            break;
        }
    }
    
    // Если не найден в новой структуре, ищем в старой
    if (!targetElement) {
        const itemElements = document.querySelectorAll('.item');
        for (const element of itemElements) {
            const modelData = element.getAttribute('data-model');
            if (modelData === modelName) {
                targetElement = element;
                break;
            }
        }
    }
    
    if (!targetElement) {
        console.warn('Model element not found for preloader:', modelName);
        return null;
    }
    
    // Ищем контейнер изображения
    let imageContainer = targetElement.querySelector('.model-image-container');
    
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
    
    // Проверяем, нет ли уже прелоадера
    const existingPreloader = imageContainer.querySelector('.model-preloader');
    if (existingPreloader) {
        return existingPreloader;
    }
    
    // Создаем и добавляем прелоадер
    const preloader = createPreloaderElement();
    imageContainer.appendChild(preloader);
    
    console.log('Preloader added for model:', modelName);
    return preloader;
}

/**
 * Скрывает прелоадер с изображения модели
 * @param {string} modelName - Имя модели
 */
export function hideModelPreloader(modelName) {
    console.log('Hiding preloader for model:', modelName);
    
    // Ищем все элементы прелоадера для данной модели
    const modelElements = document.querySelectorAll('.model, .item');
    
    for (const element of modelElements) {
        const modelData = element.getAttribute('data-model');
        if (modelData === modelName) {
            const preloader = element.querySelector('.model-preloader');
            if (preloader) {
                preloader.remove();
                console.log('Preloader removed for model:', modelName);
            }
        }
    }
}

/**
 * Скрывает все прелоадеры
 */
export function hideAllPreloaders() {
    const preloaders = document.querySelectorAll('.model-preloader');
    preloaders.forEach(preloader => preloader.remove());
    console.log('All preloaders removed');
}

/**
 * Проверяет, показан ли прелоадер для модели
 * @param {string} modelName - Имя модели
 * @returns {boolean} true если прелоадер показан
 */
export function isPreloaderVisible(modelName) {
    const modelElements = document.querySelectorAll('.model, .item');
    
    for (const element of modelElements) {
        const modelData = element.getAttribute('data-model');
        if (modelData === modelName) {
            const preloader = element.querySelector('.model-preloader');
            if (preloader) {
                return true;
            }
        }
    }
    
    return false;
}