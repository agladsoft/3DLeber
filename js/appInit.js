/**
 * Модуль для инициализации всех компонентов приложения
 */
import { initSidebar } from './sidebar.js';

/**
 * Инициализирует все компоненты приложения
 */
function initializeApp() {
    console.log('Initializing application components...');
    
    // Инициализируем сайдбар
    initSidebar();
    
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