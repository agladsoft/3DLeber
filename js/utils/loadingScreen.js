/**
 * Централизованный модуль для управления загрузочным экраном
 * Предоставляет асинхронные функции показа и скрытия loading screen
 */

/**
 * Асинхронно показывает loadingScreen
 * @returns {Promise<void>}
 */
export async function showLoadingScreen() {
    return new Promise((resolve) => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            console.log('🔄 Показываем loadingScreen');
            loadingScreen.classList.remove('hidden', 'fade-out');
            
            // Небольшая задержка для обеспечения видимости
            setTimeout(() => {
                resolve();
            }, 50);
        } else {
            console.warn('LoadingScreen element not found');
            resolve();
        }
    });
}

/**
 * Асинхронно плавно скрывает loadingScreen
 * @returns {Promise<void>}
 */
export async function hideLoadingScreenSmooth() {
    return new Promise((resolve) => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen && !loadingScreen.classList.contains('fade-out')) {
            console.log('🌅 Начинаем плавное скрытие loadingScreen');
            
            // Начинаем плавное исчезновение
            loadingScreen.classList.add('fade-out');
            
            // Полностью скрываем после завершения анимации
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                console.log('✅ LoadingScreen полностью скрыт');
                resolve();
            }, 800); // Время анимации из CSS (0.8s)
        } else {
            console.log('LoadingScreen уже скрыт или скрывается');
            resolve();
        }
    });
}

/**
 * Мгновенно скрывает loadingScreen (для случаев ошибок)
 * @returns {Promise<void>}
 */
export async function hideLoadingScreenInstant() {
    return new Promise((resolve) => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            console.log('⚡ Мгновенно скрываем loadingScreen');
            loadingScreen.classList.add('hidden', 'fade-out');
            resolve();
        } else {
            resolve();
        }
    });
}

/**
 * Проверяет, виден ли сейчас loadingScreen
 * @returns {boolean}
 */
export function isLoadingScreenVisible() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) return false;
    
    return !loadingScreen.classList.contains('hidden') && 
           !loadingScreen.classList.contains('fade-out');
}

/**
 * Устанавливает текст загрузки (если есть соответствующий элемент)
 * @param {string} text - Текст для отображения
 * @returns {Promise<void>}
 */
export async function setLoadingText(text) {
    return new Promise((resolve) => {
        const loadingText = document.querySelector('#loadingScreen .loading-text');
        if (loadingText) {
            loadingText.textContent = text;
            console.log(`📝 Установлен текст загрузки: ${text}`);
        }
        resolve();
    });
} 