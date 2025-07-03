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
import { hideColdStartPreloader, updateColdStartProgress } from './coldStartPreloader.js';

/**
 * Инициализирует все компоненты приложения
 */
async function initializeApp() {
    console.log('Initializing application components...');
    
    const loadingScreen = document.getElementById('loadingScreen');

    // Инициализируем модальное окно помощиAdd commentMore actions
    initHelpModal();
    
    try {
        // Проверяем sessionId
        const sessionId = getSessionIdFromURL();
        
        if (!sessionId) {
            console.error('No sessionId found in URL - access denied');
            if (loadingScreen) loadingScreen.classList.add('hidden');
            showTokenError();
            return;
        }
                
        // Получаем данные сессии
        const sessionResult = await getSessionData(sessionId);
        
        if (!sessionResult.isValid) {
            console.error('Session validation failed or session expired');
            if (loadingScreen) loadingScreen.classList.add('hidden');
            showTokenError();
            return;
        }
                
        // Извлекаем данные моделей из сессии
        const modelsData = extractModelsDataFromSession(sessionResult.userData);        
        // Инициализируем приложение с данными
        await initializeWithData(modelsData, loadingScreen);
        
    } catch (error) {
        console.error('Error initializing application:', error);
        if (loadingScreen) loadingScreen.classList.add('hidden');
        showTokenError();
    }
}

/**
 * Инициализирует приложение с полученными данными
 * @param {object} modelsData - данные моделей и пользователя
 * @param {HTMLElement} loadingScreen - элемент загрузочного экрана
 */
async function initializeWithData(modelsData, loadingScreen) {
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
    
    // Обновляем прогресс cold start preloader - приложение инициализировано
    updateColdStartProgress(85, 'Инициализация компонентов...');
    
    // Автоматически открываем модальное окно выбора площадки
    await showPlatformSelectModal();
    
    // Завершаем cold start preloader после инициализации UI
    updateColdStartProgress(100, 'Готово!');
    
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