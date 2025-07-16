/**
 * Модуль для централизованной обработки ошибок приложения
 */

/**
 * Обрабатывает ошибки инициализации приложения
 * @param {Error} error - объект ошибки
 */
export function handleAppError(error) {
    console.error('Ошибка при инициализации приложения:', error);
    console.error('Стек вызовов:', error.stack);
    
    // Отправляем ошибку на сервер для логирования
    sendErrorToServer(error, {
        type: 'app_initialization',
        url: window.location.href,
        userAgent: navigator.userAgent
    });
    
    // Вывод ошибки в DOM
    displayErrorInDOM(error, 'Ошибка при инициализации:');
}

/**
 * Обрабатывает критические ошибки загрузки модулей
 * @param {Error} error - объект ошибки
 */
export function handleCriticalError(error) {
    console.error('Критическая ошибка при загрузке модулей:', error);
    console.error('Стек вызовов:', error.stack);
    
    // Отправляем ошибку на сервер для логирования
    sendErrorToServer(error, {
        type: 'critical_module_loading',
        url: window.location.href,
        userAgent: navigator.userAgent
    });
    
    // Добавляем обработчик загрузки DOM для отображения ошибки
    document.addEventListener('DOMContentLoaded', () => {
        displayErrorInDOM(error, 'Критическая ошибка при загрузке:');
    });
}

/**
 * Отображает сообщение об ошибке в DOM
 * @param {Error} error - объект ошибки
 * @param {string} title - заголовок ошибки
 */
function displayErrorInDOM(error, title) {
    const errorElement = document.createElement('div');
    
    // Стилизуем элемент ошибки
    errorElement.style.position = 'fixed';
    errorElement.style.top = '0';
    errorElement.style.left = '0';
    errorElement.style.width = '100%';
    errorElement.style.padding = '20px';
    errorElement.style.backgroundColor = 'rgba(255,0,0,0.8)';
    errorElement.style.color = 'white';
    errorElement.style.zIndex = '9999';
    
    // Наполняем содержимым
    errorElement.innerHTML = `<h2>${title}</h2>
                             <p>${error.message}</p>
                             <pre>${error.stack}</pre>`;
    
    // Добавляем в DOM
    document.body.appendChild(errorElement);
}

/**
 * Отправляет ошибку на сервер для логирования
 * @param {Error} error - объект ошибки
 * @param {object} metadata - дополнительная информация
 */
async function sendErrorToServer(error, metadata = {}) {
    try {
        const errorData = {
            message: error.message,
            stack: error.stack,
            name: error.name,
            ...metadata
        };
        
        await fetch('/api/log-error', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                error: errorData,
                metadata: {
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    ...metadata
                }
            })
        });
    } catch (fetchError) {
        console.error('Не удалось отправить ошибку на сервер:', fetchError);
    }
}

/**
 * Настраивает глобальные обработчики ошибок
 */
export function setupGlobalErrorHandlers() {
    // Обработчик для необработанных ошибок JavaScript
    window.addEventListener('error', (event) => {
        const error = event.error || new Error(event.message);
        sendErrorToServer(error, {
            type: 'javascript_error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            url: window.location.href
        });
    });
    
    // Обработчик для необработанных промисов
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
        sendErrorToServer(error, {
            type: 'unhandled_promise_rejection',
            url: window.location.href
        });
    });
    
    // Обработчик для ошибок загрузки ресурсов
    window.addEventListener('error', (event) => {
        if (event.target !== window) {
            const error = new Error(`Resource loading error: ${event.target.src || event.target.href}`);
            sendErrorToServer(error, {
                type: 'resource_loading_error',
                resource: event.target.src || event.target.href,
                tagName: event.target.tagName,
                url: window.location.href
            });
        }
    }, true);
}
