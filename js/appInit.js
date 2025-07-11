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
import { setupGlobalErrorHandlers } from './core/errorHandler.js';

// Флаг для предотвращения повторной инициализации
let appInitializationInProgress = false;

/**
 * Инициализирует все компоненты приложения
 */
async function initializeApp() {
    if (appInitializationInProgress) {
        console.log('App initialization already in progress, skipping');
        return;
    }
    
    appInitializationInProgress = true;
    console.log('Initializing application components...');

    // Настраиваем глобальные обработчики ошибок
    setupGlobalErrorHandlers();

    // Инициализируем модальное окно помощи
    initHelpModal();
    
    try {
        // Проверяем sessionId
        const sessionId = getSessionIdFromURL();
        
        if (!sessionId) {
            console.error('No sessionId found in URL - access denied');
            const { hideLoadingScreenSmooth } = await import('./utils/loadingScreen.js');
            await hideLoadingScreenSmooth();
            showTokenError();
            return;
        }
        
        // Получаем данные сессии
        const sessionResult = await getSessionData(sessionId);
        
        if (!sessionResult.isValid) {
            console.error('Session validation failed or session expired');
            const { hideLoadingScreenSmooth } = await import('./utils/loadingScreen.js');
            await hideLoadingScreenSmooth();
            showTokenError();
            return;
        }
        
        // Определяем тип сессии (новая или продолжение)
        const isNewSession = !sessionResult.userData.sessionData || 
                           Object.keys(sessionResult.userData.sessionData).length === 0;
                
        // Извлекаем данные моделей из сессии
        const modelsData = extractModelsDataFromSession(sessionResult.userData);        
        
        // Передаем информацию о типе сессии в данные
        modelsData.isNewSession = isNewSession;
        
        // Инициализируем приложение с данными
        await initializeWithData(modelsData);
        
    } catch (error) {
        console.error('Error initializing application:', error);
        const { hideLoadingScreenSmooth } = await import('./utils/loadingScreen.js');
        await hideLoadingScreenSmooth();
        showTokenError();
    } finally {
        // Сбрасываем флаг инициализации
        appInitializationInProgress = false;
    }
}

/**
 * Инициализирует приложение с полученными данными
 * @param {object} modelsData - данные моделей и пользователя
 */
async function initializeWithData(modelsData) {
    // Скрываем кнопку запуска (если она есть)
    const launchContainer = document.getElementById('launchContainer');
    if (launchContainer) {
        launchContainer.style.display = 'none';
    }

    // Сохраняем данные в sessionStorage
    sessionStorage.setItem('userId', modelsData.project_id);
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