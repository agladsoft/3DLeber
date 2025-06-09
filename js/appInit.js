/**
 * Модуль для инициализации всех компонентов приложения
 */

/**
 * Инициализирует все компоненты приложения
 */
function initializeApp() {
    console.log('Initializing application components...');
    
    // Сайдбар теперь инициализируется из modal.js
    // чтобы избежать дублирования моделей
    
    console.log('Application components initialized successfully');
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