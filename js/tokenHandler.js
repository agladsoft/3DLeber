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
 * Получает токен из URL параметров (старый метод для совместимости)
 * @returns {string|null} токен или null если не найден
 */
export function getTokenFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
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
 * Валидирует токен через API и получает данные пользователя (старый метод для совместимости)
 * @param {string} token - токен для валидации
 * @returns {Promise<{isValid: boolean, userData?: object}>} результат валидации и данные пользователя
 */
export async function validateToken(token) {
    const VALIDATION_API_URL = `${API_BASE_URL}/api/validate-token`;
    
    if (DEVELOPMENT_MODE) {
        console.warn('Development mode: skipping token validation');
        return {
            isValid: true,
            userData: {
                user: { id: "id_12345678" },
                project: { models: [
                    {"article": "ЛГД-19", "quantity": 2},
                    {"article": "ЛГК-24.7","quantity": 1},
                    {"article": "ЛГИК-7.26", "quantity": 1},
                    {"article": "ЛГИК-7.03", "quantity": 1},
                    {"article": "ЛГИК-7.01", "quantity": 1},
                    {"article": "ЛГД-29", "quantity": 1},
                    {"article": "ЛГД-25", "quantity": 1},
                    {"article": "ЛГД-23", "quantity": 1},
                    {"article": "ЛГД-14", "quantity": 1},
                    {"article": "ЛГВО-421", "quantity": 1},
                    {"article": "ЛГИК-02.01", "quantity": 2},
                    {"article": "ЛГИК-02.18", "quantity": 2},
                    {"article": "ЛГИК-02.17-1", "quantity": 2},
                    {"article": "ЛГИК-02.17", "quantity": 1},
                    {"article": "ЛГИК-02.16", "quantity": 1},
                    {"article": "ЛГИК-02.14", "quantity": 1},
                    {"article": "ЛГИК-02.13", "quantity": 1},
                    {"article": "ЛГИК-02.12", "quantity": 1},
                    {"article": "ЛГИК-02.11", "quantity": 1},
                    {"article": "ЛГИК-02.10", "quantity": 1},
                    {"article": "ЛГИК-02.08", "quantity": 1},
                    {"article": "ЛГИК-02.07", "quantity": 1},
                    {"article": "ЛГИК-02.06", "quantity": 1},
                    {"article": "ЛГИК-02.05", "quantity": 1},
                    {"article": "ЛГИК-02.04", "quantity": 1},
                    {"article": "ЛГИК-02.03", "quantity": 1},
                    {"article": "ЛГИК-02.02", "quantity": 1},
                    {"article": "ЛГИК-16.06", "quantity": 1},
                    {"article": "ЛГИК-16.07", "quantity": 1},
                    {"article": "ЛГИК-16.08", "quantity": 1},
                    {"article": "ЛГИК-16.09", "quantity": 1},
                    {"article": "ЛГИК-16.10", "quantity": 1},
                    {"article": "ЛГИК-16.11", "quantity": 1},
                    {"article": "ЛГИК-16.12", "quantity": 1},
                    {"article": "ЛГИК-16.13", "quantity": 1},
                    {"article": "ЛГИК-16.14", "quantity": 1},
                    {"article": "ЛГИК-16.15", "quantity": 1}
                ]}
            }
        };
    }

    try {
        const response = await fetch(`${VALIDATION_API_URL}?token=${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            try {
                const data = await response.json();
                console.log('Token validation response:', data);
                
                // Если сервер вернул структуру с isValid
                if (data.hasOwnProperty('isValid')) {
                    return {
                        isValid: data.isValid,
                        userData: data.userData || null
                    };
                }
                
                // Иначе считаем, что токен валиден, если статус 200
                return {
                    isValid: true,
                    userData: data
                };
            } catch (parseError) {
                // Если не удалось распарсить JSON, но статус 200 - токен валиден
                console.log('Token validation successful (no JSON response)');
                return {
                    isValid: true,
                    userData: null
                };
            }
        } else {
            console.error('Token validation failed:', response.status, response.statusText);
            return { isValid: false };
        }
    } catch (error) {
        console.error('Error validating token:', error);
        return { isValid: false };
    }
}

/**
 * Извлекает модели из данных сессии
 * @param {object} sessionData - данные сессии
 * @returns {object} объект с user_id и моделями
 */
export function extractModelsDataFromSession(sessionData) {
    return {
        "user_id": sessionData?.user_id || "id_12345678",
        "models": sessionData?.models || []
    };
}

/**
 * Извлекает модели из данных API (старый метод для совместимости)
 * @param {object} userData - данные пользователя от API
 * @returns {object} объект с user_id и моделями
 */
export function extractModelsData(userData) {
    // Это нужно будет адаптировать под фактическую структуру ответа API
    // Пока используем заглушку
    return {
        "user_id": userData?.user?.id || "id_12345678",
        "models": userData?.project?.models || []
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