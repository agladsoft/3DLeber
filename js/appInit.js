/**
 * Модуль для инициализации всех компонентов приложения
 */

import { getTokenFromURL, validateToken, showTokenError, extractModelsData } from './tokenHandler.js';
import { showPlatformSelectModal } from './modal.js';

/**
 * Инициализирует все компоненты приложения
 */
async function initializeApp() {
    console.log('Initializing application components...');
    
    const loadingScreen = document.getElementById('loadingScreen');
    
    try {
        // Получаем токен из URL
        const token = getTokenFromURL();
        
        if (!token) {
            console.error('No token found in URL');
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
        
        console.log('Extracted models data:', modelsData);
        
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
    } catch (error) {
        console.error('Error initializing application:', error);
        if (loadingScreen) loadingScreen.classList.add('hidden');
        showTokenError();
    }
}

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    // Даем время для полной загрузки DOM
    setTimeout(() => {
        initializeApp();
    }, 100);
});

// Экспортируем функцию для использования в других модулях
export { initializeApp }; 