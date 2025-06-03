/**
 * Обертка для API запросов с поддержкой режима без сервера
 */
import { API_BASE_URL } from './serverConfig.js';
import { mockSessionData, mockModels } from './mockData.js';

// Флаг для отслеживания доступности сервера
let isServerAvailable = true;
let serverCheckInProgress = false;

/**
 * Проверяет доступность сервера
 * @returns {Promise<boolean>}
 */
export async function checkServerAvailability() {
    if (serverCheckInProgress) {
        return isServerAvailable;
    }

    serverCheckInProgress = true;
    try {
        // Попытка выполнить простой запрос для проверки доступности
        const response = await fetch(`${API_BASE_URL}/health`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            // Таймаут 3 секунды для быстрой проверки
            signal: AbortSignal.timeout(3000)
        });
        isServerAvailable = response.ok;
    } catch (error) {
        console.warn('API сервер недоступен, переключаемся в режим без сервера', error);
        isServerAvailable = false;
    } finally {
        serverCheckInProgress = false;
    }
    
    return isServerAvailable;
}

/**
 * Получает сессию пользователя
 * @param {string} userId ID пользователя
 * @returns {Promise<Object>} Данные сессии
 */
export async function getUserSession(userId) {
    if (!await checkServerAvailability()) {
        console.log('Используем моковые данные для сессии');
        return { ...mockSessionData, userId };
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/session/${userId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to get session: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.warn('Ошибка получения сессии, используем моковые данные', error);
        return { ...mockSessionData, userId };
    }
}

/**
 * Создает новую сессию
 * @param {string} userId ID пользователя
 * @param {Array} models Список моделей
 * @returns {Promise<Object>} Данные новой сессии
 */
export async function createNewSession(userId, models) {
    if (!await checkServerAvailability()) {
        console.log('Используем моковые данные для создания сессии');
        const sessionData = { ...mockSessionData, userId };
        sessionData.session.models = models || mockModels;
        return sessionData;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify({ userId, models: models || [] })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to create session: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.warn('Ошибка создания сессии, используем моковые данные', error);
        const sessionData = { ...mockSessionData, userId };
        sessionData.session.models = models || mockModels;
        return sessionData;
    }
}

/**
 * Сохраняет параметры площадки
 * @param {string} userId ID пользователя
 * @param {Object} params Параметры площадки
 * @returns {Promise<Object>} Обновленные данные сессии
 */
export async function savePlaygroundParams(userId, params) {
    if (!await checkServerAvailability()) {
        console.log('Используем моковые данные для сохранения параметров площадки');
        const sessionData = { ...mockSessionData, userId };
        sessionData.session.playground = { ...params };
        return sessionData;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/session/${userId}/playground`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            body: JSON.stringify(params)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to save playground params: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.warn('Ошибка сохранения параметров площадки, используем моковые данные', error);
        const sessionData = { ...mockSessionData, userId };
        sessionData.session.playground = { ...params };
        return sessionData;
    }
}

/**
 * Получает список моделей
 * @returns {Promise<Array>} Список моделей
 */
export async function getModels() {
    if (!await checkServerAvailability()) {
        console.log('Используем моковые данные для моделей');
        return mockModels;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/models`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to get models: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.warn('Ошибка получения моделей, используем моковые данные', error);
        return mockModels;
    }
}
