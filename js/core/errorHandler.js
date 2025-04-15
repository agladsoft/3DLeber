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
