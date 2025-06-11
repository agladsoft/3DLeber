/**
 * Модуль для работы с токенами
 * Обрабатывает токен из URL и валидирует его
 */

const VALIDATION_API_URL = 'http://inertia.leber.click/api/v2/project/builder/validate';
const DEVELOPMENT_MODE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

/**
 * Получает токен из URL параметров
 * @returns {string|null} токен или null если не найден
 */
export function getTokenFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('token');
}

/**
 * Валидирует токен через API и получает данные пользователя
 * @param {string} token - токен для валидации
 * @returns {Promise<{isValid: boolean, userData?: object}>} результат валидации и данные пользователя
 */
export async function validateToken(token) {
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
        // Создаем базовую аутентификацию
        const credentials = btoa('leber:leber');
        
        const response = await fetch(`${VALIDATION_API_URL}?token=${encodeURIComponent(token)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${credentials}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Token validation response:', data);
            
            // Возвращаем как результат валидации, так и данные пользователя
            return {
                isValid: true,
                userData: data
            };
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
 * Извлекает модели из данных API
 * @param {object} userData - данные пользователя от API
 * @returns {object} объект с user_id и моделями
 */
export function extractModelsData(userData) {
    // Это нужно будет адаптировать под фактическую структуру ответа API
    // Пока используем заглушку
    return {
        "user_id": userData?.user?.id || "id_12345678",
        "models": userData?.project?.models || [
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
        ]
    };
}

/**
 * Показывает ошибку валидации токена
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
                Недействительный или отсутствующий токен доступа. 
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