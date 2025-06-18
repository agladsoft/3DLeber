/**
 * Модуль для работы с токенами и сессиями
 * Обрабатывает sessionId из URL и получает данные сессии
 */

const DEVELOPMENT_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Определяем базовый URL для API
const getApiBaseUrl = () => {
    if (DEVELOPMENT_MODE) {
        // В режиме разработки API может быть на другом порту
        return window.location.port === '5173' ? 'http://localhost:3000' : '';
    }
    // В продакшене API на том же домене
    return '';
};

const API_BASE_URL = getApiBaseUrl();
const SESSION_API_URL = `${API_BASE_URL}/api/session-data`;

/**
 * Получает sessionId из URL параметров
 * @returns {string|null} sessionId или null если не найден
 */
export function getSessionIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('sessionId');
}



/**
 * Получает данные сессии по sessionId
 * @param {string} sessionId - ID сессии
 * @returns {Promise<{isValid: boolean, userData?: object}>} данные сессии
 */
export async function getSessionData(sessionId) {
    // Всегда пытаемся получить данные сессии, даже в режиме разработки
    console.log('Attempting to get session data for sessionId:', sessionId);
    console.log('API Base URL:', API_BASE_URL);
    console.log('Session API URL:', SESSION_API_URL);

    // Проверяем, что sessionId существует и не пустой
    if (!sessionId || sessionId.trim() === '') {
        console.error('SessionId is empty or undefined');
        return { isValid: false };
    }

    try {
        const response = await fetch(`${SESSION_API_URL}/${sessionId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Session data retrieved:', data);
            
            if (data.validated) {
                return {
                    isValid: true,
                    userData: data
                };
            }
        } else if (response.status === 404) {
            console.error('Session not found or expired:', sessionId);
        } else {
            console.error('Session data retrieval failed:', response.status, response.statusText);
        }
        
        return { isValid: false };
    } catch (error) {
        console.error('Error retrieving session data:', error);
        return { isValid: false };
    }
}



/**
 * Извлекает модели из данных сессии
 * @param {object} sessionData - данные сессии
 * @returns {object} объект с project_id и моделями
 */
export function extractModelsDataFromSession(sessionData) {
    return {
        "project_id": sessionData?.project_id || "id_12345678",
        "models": sessionData?.models || []
    };
}



/**
 * Показывает ошибку валидации токена или доступа
 */
export function showTokenError() {
    // Создаем элемент ошибки
    const errorDiv = document.createElement('div');
    errorDiv.id = 'tokenError';
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: #f8f8f8;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: 'Inter Tight', sans-serif;
    `;
    
    errorDiv.innerHTML = `
        <div style="text-align: center; max-width: 400px; padding: 40px;">
            <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
            <h2 style="color: #333; margin-bottom: 16px;">Ошибка доступа</h2>
            <p style="color: #666; margin-bottom: 24px;">
                Недействительная или истекшая сессия доступа. 
                Пожалуйста, перейдите по правильной ссылке или обратитесь к администратору.
            </p>
            <button onclick="window.location.reload()" style="
                background-color: #007bff;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 16px;
                cursor: pointer;
                font-family: inherit;
            ">
                Обновить страницу
            </button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
} 