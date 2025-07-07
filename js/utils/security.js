/**
 * Модуль безопасности для защиты от XSS и других атак
 */

/**
 * Экранирует HTML символы для предотвращения XSS атак
 * @param {string} str - Строка для экранирования
 * @returns {string} Экранированная строка
 */
export function escapeHtml(str) {
    if (typeof str !== 'string') {
        return '';
    }
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Удаляет HTML теги из строки
 * @param {string} str - Строка для очистки
 * @returns {string} Строка без HTML тегов
 */
export function stripHtml(str) {
    if (typeof str !== 'string') {
        return '';
    }
    
    const div = document.createElement('div');
    div.innerHTML = str;
    return div.textContent || div.innerText || '';
}

/**
 * Безопасное создание DOM элемента с текстовым содержимым
 * @param {string} tagName - Имя тега
 * @param {string} textContent - Текстовое содержимое
 * @param {Object} attributes - Атрибуты элемента
 * @returns {HTMLElement} Созданный элемент
 */
export function createSafeElement(tagName, textContent = '', attributes = {}) {
    const element = document.createElement(tagName);
    
    if (textContent) {
        element.textContent = textContent;
    }
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (typeof value === 'string') {
            element.setAttribute(key, escapeHtml(value));
        }
    });
    
    return element;
}

/**
 * Безопасная установка innerHTML с предварительной санитизацией
 * @param {HTMLElement} element - DOM элемент
 * @param {string} html - HTML содержимое
 */
export function setSafeInnerHTML(element, html) {
    if (!element || typeof html !== 'string') {
        return;
    }
    
    // Простая санитизация - удаляем script теги и on* атрибуты
    let sanitized = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '');
    
    element.innerHTML = sanitized;
}

/**
 * Валидирует email адрес
 * @param {string} email - Email для валидации
 * @returns {boolean} true если email валиден
 */
export function validateEmail(email) {
    if (typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Валидирует строку на отсутствие потенциально опасных символов
 * @param {string} str - Строка для валидации
 * @returns {boolean} true если строка безопасна
 */
export function validateSafeString(str) {
    if (typeof str !== 'string') {
        return false;
    }
    
    // Проверяем на наличие HTML тегов и JavaScript
    const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(str));
}

/**
 * Безопасное отображение уведомлений
 * @param {HTMLElement} container - Контейнер для уведомления
 * @param {string} message - Сообщение
 * @param {string} type - Тип уведомления
 */
export function showSafeNotification(container, message, type = 'info') {
    if (!container) {
        console.warn('Notification container not found');
        return;
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Создаем безопасную структуру
    const notificationContent = createSafeElement('div', '', { class: 'notification-content' });
    const messageElement = createSafeElement('span', stripHtml(message), { class: 'notification-message' });
    const closeElement = createSafeElement('span', '×', { class: 'notification-close' });
    
    // Добавляем обработчик закрытия
    closeElement.addEventListener('click', () => {
        container.classList.add('hidden');
    });
    
    notificationContent.appendChild(messageElement);
    notificationContent.appendChild(closeElement);
    container.appendChild(notificationContent);
    
    // Устанавливаем класс типа уведомления
    container.className = `notification ${type}`;
    container.classList.remove('hidden');
}

/**
 * Генерирует случайный токен для CSRF защиты
 * @returns {string} CSRF токен
 */
export function generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Получает CSRF токен из мета тега или генерирует новый
 * @returns {string} CSRF токен
 */
export function getCSRFToken() {
    let token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    
    if (!token) {
        token = generateCSRFToken();
        // Сохраняем токен в sessionStorage для последующего использования
        sessionStorage.setItem('csrf-token', token);
    }
    
    return token;
}

/**
 * Добавляет CSRF токен к fetch запросам
 * @param {RequestInit} options - Опции fetch запроса
 * @returns {RequestInit} Опции с добавленным CSRF токеном
 */
export function addCSRFToken(options = {}) {
    const token = getCSRFToken();
    
    if (!options.headers) {
        options.headers = {};
    }
    
    options.headers['X-CSRF-Token'] = token;
    
    return options;
}

/**
 * Безопасный fetch с автоматическим добавлением CSRF токена
 * @param {string} url - URL для запроса
 * @param {RequestInit} options - Опции fetch
 * @returns {Promise<Response>} Промис с ответом
 */
export function safeFetch(url, options = {}) {
    // Добавляем CSRF токен только для небезопасных методов
    const unsafeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    const method = (options.method || 'GET').toUpperCase();
    
    if (unsafeMethods.includes(method)) {
        options = addCSRFToken(options);
    }
    
    return fetch(url, options);
}

/**
 * Валидирует Origin заголовок
 * @param {string} origin - Origin для проверки
 * @param {string[]} allowedOrigins - Массив разрешенных origins
 * @returns {boolean} true если origin разрешен
 */
export function validateOrigin(origin, allowedOrigins) {
    if (!origin || !Array.isArray(allowedOrigins)) {
        return false;
    }
    
    return allowedOrigins.some(allowed => {
        if (allowed === '*') return true;
        if (allowed.startsWith('*.')) {
            const domain = allowed.slice(2);
            return origin.endsWith(domain);
        }
        return origin === allowed;
    });
}

/**
 * Создает безопасный обработчик событий с защитой от XSS
 * @param {Function} handler - Исходный обработчик
 * @returns {Function} Безопасный обработчик
 */
export function createSafeEventHandler(handler) {
    return function(event) {
        try {
            // Проверяем, что событие не было модифицировано злонамеренным кодом
            if (event && typeof event === 'object' && event.isTrusted !== false) {
                return handler.call(this, event);
            }
        } catch (error) {
            console.error('Error in safe event handler:', error);
        }
    };
}