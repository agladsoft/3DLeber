/**
 * Стандартизированный модуль для управления загрузкой и переходами
 * Обеспечивает единообразное поведение во всех местах загрузки площадки
 */

/**
 * Безопасно вызывает функции cold start preloader'а
 * @param {string} functionName - Имя функции для вызова
 * @param {...any} args - Аргументы для функции
 */
async function safeColdStartCall(functionName, ...args) {
    try {
        const { [functionName]: fn } = await import('./coldStartPreloader.js');
        if (typeof fn === 'function') {
            return fn(...args);
        }
    } catch (error) {
        console.warn(`Cold start preloader function ${functionName} not available:`, error);
    }
}

/**
 * Показывает loading overlay
 */
function showLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('hidden');
        window.isLoading = true;
    }
}

/**
 * Скрывает loading overlay
 */
function hideLoadingOverlay() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        window.isLoading = false;
    }
}

/**
 * Стандартный процесс начала загрузки с preloader'ом
 * @param {string} loadingText - Текст для отображения в preloader
 * @param {number} initialProgress - Начальный прогресс (по умолчанию 5)
 */
export async function startStandardLoading(loadingText = 'Подготовка к загрузке...', initialProgress = 5) {
    // Показываем cold start preloader
    await safeColdStartCall('showColdStartPreloader');
    await safeColdStartCall('updateColdStartProgress', initialProgress, loadingText);
    
    // Показываем loading overlay
    showLoadingOverlay();
}

/**
 * Обновляет прогресс стандартной загрузки
 * @param {number} progress - Прогресс от 0 до 100
 * @param {string} text - Текст для отображения
 */
export async function updateStandardLoadingProgress(progress, text) {
    await safeColdStartCall('updateColdStartProgress', progress, text);
}

/**
 * Завершает стандартную загрузку и скрывает все индикаторы
 * @param {number} delay - Задержка перед скрытием в миллисекундах (по умолчанию 500)
 */
export async function finishStandardLoading(delay = 500) {
    // Устанавливаем 100% прогресс
    await safeColdStartCall('updateColdStartProgress', 100, 'Готово!');
    
    // Скрываем preloader
    setTimeout(async () => {
        await safeColdStartCall('hideColdStartPreloader');
    }, 300);
    
    // Скрываем loading overlay
    setTimeout(() => {
        hideLoadingOverlay();
    }, delay);
}

/**
 * Стандартный процесс загрузки площадки
 * @param {Function} loadPlaygroundFn - Функция загрузки площадки
 * @param {string} playgroundType - Тип площадки
 * @param {number} width - Ширина площадки
 * @param {number} length - Длина площадки
 * @param {string} color - Цвет площадки
 */
export async function standardPlaygroundLoading(loadPlaygroundFn, playgroundType, width, length, color) {
    try {
        // Начинаем стандартную загрузку
        await startStandardLoading('Инициализация загрузки площадки...', 10);
        
        // Обновляем прогресс - подготовка
        await updateStandardLoadingProgress(20, 'Подготовка параметров площадки...');
        
        // Обновляем прогресс - загрузка
        await updateStandardLoadingProgress(40, 'Загрузка площадки...');
        
        // Выполняем загрузку площадки
        const result = await loadPlaygroundFn(playgroundType, width, length, color);
        
        // Обновляем прогресс - финализация
        await updateStandardLoadingProgress(80, 'Финализация...');
        
        // Завершаем загрузку
        await finishStandardLoading();
        
        return result;
    } catch (error) {
        console.error('Error during standard playground loading:', error);
        
        // В случае ошибки тоже скрываем индикаторы
        await safeColdStartCall('hideColdStartPreloader');
        hideLoadingOverlay();
        
        throw error;
    }
}

/**
 * Стандартный процесс инициализации новой сессии
 */
export async function standardNewSessionInit() {
    try {
        // Начинаем загрузку
        await startStandardLoading('Создание новой сессии...', 5);
        
        // Показываем cold start preloader перед инициализацией Three.js
        await updateStandardLoadingProgress(10, 'Инициализация приложения...');
        await updateStandardLoadingProgress(20, 'Подготовка новой сессии...');
        
        // Возвращаем функции для дальнейшего использования
        return {
            updateProgress: updateStandardLoadingProgress,
            finish: finishStandardLoading
        };
    } catch (error) {
        console.error('Error during standard new session init:', error);
        await safeColdStartCall('hideColdStartPreloader');
        hideLoadingOverlay();
        throw error;
    }
}

/**
 * Стандартный процесс восстановления сессии
 */
export async function standardSessionRestore() {
    try {
        // Начинаем загрузку
        await startStandardLoading('Восстановление сессии...', 5);
        
        await updateStandardLoadingProgress(15, 'Загрузка данных сессии...');
        await updateStandardLoadingProgress(30, 'Восстановление состояния...');
        
        // Возвращаем функции для дальнейшего использования
        return {
            updateProgress: updateStandardLoadingProgress,
            finish: finishStandardLoading
        };
    } catch (error) {
        console.error('Error during standard session restore:', error);
        await safeColdStartCall('hideColdStartPreloader');
        hideLoadingOverlay();
        throw error;
    }
}

/**
 * Быстрое скрытие всех индикаторов загрузки (для экстренных случаев)
 */
export async function forceHideAllLoading() {
    await safeColdStartCall('hideColdStartPreloader');
    hideLoadingOverlay();
}

// Экспортируем также вспомогательные функции для прямого использования
export {
    showLoadingOverlay,
    hideLoadingOverlay,
    safeColdStartCall
};