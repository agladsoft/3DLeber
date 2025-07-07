/**
 * Стандартизированный модуль для управления загрузкой и переходами
 * Обеспечивает единообразное поведение во всех местах загрузки площадки
 */

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
 * Стандартный процесс начала загрузки
 * @param {string} loadingText - Текст для отображения
 */
export async function startStandardLoading(loadingText = 'Подготовка к загрузке...') {
    // Показываем loading overlay
    showLoadingOverlay();
}

/**
 * Обновляет прогресс стандартной загрузки
 * @param {number} progress - Прогресс от 0 до 100
 * @param {string} text - Текст для отображения
 */
export async function updateStandardLoadingProgress(progress, text) {
    // В данной реализации только показываем/скрываем overlay
    // При необходимости можно добавить текст в overlay
}

/**
 * Завершает стандартную загрузку и скрывает все индикаторы
 * @param {number} delay - Задержка перед скрытием в миллисекундах (по умолчанию 500)
 */
export async function finishStandardLoading(delay = 500) {
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
        await startStandardLoading('Загрузка площадки...');
        
        // Выполняем загрузку площадки
        const result = await loadPlaygroundFn(playgroundType, width, length, color);
        
        // Завершаем загрузку
        await finishStandardLoading();
        
        return result;
    } catch (error) {
        console.error('Error during standard playground loading:', error);
        
        // В случае ошибки тоже скрываем индикаторы
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
        await startStandardLoading('Создание новой сессии...');
        
        // Возвращаем функции для дальнейшего использования
        return {
            updateProgress: updateStandardLoadingProgress,
            finish: finishStandardLoading
        };
    } catch (error) {
        console.error('Error during standard new session init:', error);
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
        await startStandardLoading('Восстановление сессии...');
        
        // Возвращаем функции для дальнейшего использования
        return {
            updateProgress: updateStandardLoadingProgress,
            finish: finishStandardLoading
        };
    } catch (error) {
        console.error('Error during standard session restore:', error);
        hideLoadingOverlay();
        throw error;
    }
}

/**
 * Быстрое скрытие всех индикаторов загрузки (для экстренных случаев)
 */
export async function forceHideAllLoading() {
    hideLoadingOverlay();
}

// Экспортируем также вспомогательные функции для прямого использования
export {
    showLoadingOverlay,
    hideLoadingOverlay
};