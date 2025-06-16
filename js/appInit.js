/**
 * Модуль для инициализации всех компонентов приложения
 */

import { 
    getTokenFromURL, 
    getSessionIdFromURL, 
    validateToken, 
    getSessionData, 
    showTokenError, 
    extractModelsData, 
    extractModelsDataFromSession 
} from './tokenHandler.js';
import { showPlatformSelectModal } from './modal.js';

/**
 * Инициализирует все компоненты приложения
 */
async function initializeApp() {
    console.log('Initializing application components...');
    
    const loadingScreen = document.getElementById('loadingScreen');
    
    try {
        // Сначала проверяем новый метод с sessionId
        const sessionId = getSessionIdFromURL();
        
        if (sessionId) {
            console.log('SessionId found, retrieving session data...');
            
            // Получаем данные сессии
            const sessionResult = await getSessionData(sessionId);
            
            if (!sessionResult.isValid) {
                console.error('Session validation failed or session expired');
                if (loadingScreen) loadingScreen.classList.add('hidden');
                showTokenError();
                return;
            }
            
            console.log('Session validated successfully, extracting data...');
            
            // Извлекаем данные моделей из сессии
            const modelsData = extractModelsDataFromSession(sessionResult.userData);
            
            console.log('Extracted models data from session:', modelsData);
            
            // Инициализируем приложение с данными
            await initializeWithData(modelsData, loadingScreen);
            return;
        }
        
        // Если sessionId нет, пробуем старый метод с токеном (для совместимости)
        const token = getTokenFromURL();
        
        if (!token) {
            console.error('No sessionId or token found in URL - access denied');
            if (loadingScreen) loadingScreen.classList.add('hidden');
            showTokenError();
            return;
        }
        
        console.log('Token found, validating...');
        
        // Валидируем токен и получаем данные пользователя
        const validationResult = await validateToken(token);
        
        if (!validationResult.isValid) {
            console.error('Token validation failed');
            if (loadingScreen) loadingScreen.classList.add('hidden');
            showTokenError();
            return;
        }
        
        console.log('Token validated successfully, extracting user data...');
        
        // Извлекаем данные моделей из ответа API
        const modelsData = extractModelsData(validationResult.userData);
        
        console.log('Extracted models data from token:', modelsData);
        
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
    sessionStorage.setItem('userId', modelsData.user_id);
    sessionStorage.setItem('models', JSON.stringify(modelsData.models));
    
    // Автоматически открываем модальное окно выбора площадки
    await showPlatformSelectModal();
    
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