/**
 * Главный модуль приложения, собирающий все компоненты
 * Адаптирован для работы с Three.js
 */
import { initializeApp, setupDOMEventListeners, handleAppError, handleCriticalError } from './core/index.js';
import { applyAllFixes } from './fixes.js';
import { startSceneChecks } from './sceneCheck.js';

// Оборачиваем выполнение кода в try-catch для отлова критических ошибок
try {
    // Определяем глобальную функцию инициализации приложения
    window.initApp = async function() {
        try {
            await initializeApp();
            
            // Применяем дополнительные исправления после основной инициализации только один раз
            if (!window.fixesApplied) {
                setTimeout(() => {
                    applyAllFixes();
                    
                    // Запускаем периодическую проверку сцены
                    startSceneChecks();
                    
                    // Устанавливаем флаг, что исправления применены
                    window.fixesApplied = true;
                }, 1000); // Задержка для завершения основной инициализации
            } else {
                // Все равно запускаем периодическую проверку сцены (на всякий случай)
                startSceneChecks();
            }
            
        } catch (error) {
            handleAppError(error);
            
            // Пытаемся восстановить приложение, применив исправления даже в случае ошибки
            if (!window.fixesApplied) {
                setTimeout(() => {
                    applyAllFixes();
                    
                    // Устанавливаем флаг, что исправления применены
                    window.fixesApplied = true;
                }, 2000);
            }
        }
    };
    
    // Инициализируем флаг для отслеживания состояния приложения
    window.appInitialized = false;
    
    // Устанавливаем обработчики событий DOM
    setupDOMEventListeners();
    
} catch (error) {
    handleCriticalError(error);
}
