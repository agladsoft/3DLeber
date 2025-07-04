/**
 * Модуль для инициализации всех компонентов приложения
 */

import { 
    getSessionIdFromURL, 
    getSessionData, 
    showTokenError, 
    extractModelsDataFromSession 
} from './tokenHandler.js';
import { showPlatformSelectModal } from './modal.js';
import { initHelpModal } from './helpModal.js';
// Функции cold start preloader будут импортированы динамически при необходимости

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
 * Инициализирует все компоненты приложения
 */
async function initializeApp() {
    console.log('Initializing application components...');
    
    const loadingScreen = document.getElementById('loadingScreen');

    // Показываем cold start preloader в начале инициализации
    await safeColdStartCall('showColdStartPreloader');
    await safeColdStartCall('updateColdStartProgress', 5, 'Инициализация приложения...');

    // Инициализируем модальное окно помощи
    initHelpModal();
    
    try {
        // Обновляем прогресс - проверка сессии
        await safeColdStartCall('updateColdStartProgress', 10, 'Проверка сессии...');
        
        // Проверяем sessionId
        const sessionId = getSessionIdFromURL();
        
        if (!sessionId) {
            console.error('No sessionId found in URL - access denied');
            if (loadingScreen) loadingScreen.classList.add('hidden');
            await safeColdStartCall('hideColdStartPreloader');
            showTokenError();
            return;
        }
        
        // Обновляем прогресс - получение данных сессии
        await safeColdStartCall('updateColdStartProgress', 20, 'Получение данных сессии...');
                
        // Получаем данные сессии
        const sessionResult = await getSessionData(sessionId);
        
        if (!sessionResult.isValid) {
            console.error('Session validation failed or session expired');
            if (loadingScreen) loadingScreen.classList.add('hidden');
            await safeColdStartCall('hideColdStartPreloader');
            showTokenError();
            return;
        }
        
        // Определяем тип сессии (новая или продолжение)
        const isNewSession = !sessionResult.userData.sessionData || 
                           Object.keys(sessionResult.userData.sessionData).length === 0;
        
        // Обновляем прогресс в зависимости от типа сессии
        if (isNewSession) {
            await safeColdStartCall('updateColdStartProgress', 30, 'Подготовка новой сессии...');
        } else {
            await safeColdStartCall('updateColdStartProgress', 30, 'Восстановление сессии...');
        }
                
        // Извлекаем данные моделей из сессии
        const modelsData = extractModelsDataFromSession(sessionResult.userData);        
        
        // Передаем информацию о типе сессии в данные
        modelsData.isNewSession = isNewSession;
        
        // Инициализируем приложение с данными
        await initializeWithData(modelsData, loadingScreen);
        
    } catch (error) {
        console.error('Error initializing application:', error);
        if (loadingScreen) loadingScreen.classList.add('hidden');
        await safeColdStartCall('hideColdStartPreloader');
        showTokenError();
    }
}

/**
 * Инициализирует приложение с полученными данными
 * @param {object} modelsData - данные моделей и пользователя
 * @param {HTMLElement} loadingScreen - элемент загрузочного экрана
 */
async function initializeWithData(modelsData, loadingScreen) {
    // Обновляем прогресс - подготовка данных
    if (modelsData.isNewSession) {
        await safeColdStartCall('updateColdStartProgress', 40, 'Подготовка новой сессии...');
    } else {
        await safeColdStartCall('updateColdStartProgress', 40, 'Загрузка сохраненных данных...');
    }
    
    // Скрываем загрузочный экран
    if (loadingScreen) loadingScreen.classList.add('hidden');
    
    // Скрываем кнопку запуска (если она есть)
    const launchContainer = document.getElementById('launchContainer');
    if (launchContainer) {
        launchContainer.style.display = 'none';
    }

    // Сохраняем данные в sessionStorage
    sessionStorage.setItem('userId', modelsData.project_id);
    sessionStorage.setItem('models', JSON.stringify(modelsData.models));
    
    // Обновляем прогресс - инициализация компонентов
    if (modelsData.isNewSession) {
        await safeColdStartCall('updateColdStartProgress', 50, 'Создание новой сессии...');
    } else {
        await safeColdStartCall('updateColdStartProgress', 50, 'Восстановление сессии...');
    }
    
    // Автоматически открываем модальное окно выбора площадки
    await showPlatformSelectModal();
    
    // Обновляем прогресс перед завершением
    await safeColdStartCall('updateColdStartProgress', 60, 'Подготовка к запуску...');
    
    console.log('Application components initialized successfully');
}

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    // Даем время для полной загрузки DOM
    setTimeout(() => {
        initializeApp();
    }, 100);
});

// Экспортируем функции для использования в других модулях
export { initializeApp, initializeWithData }; 