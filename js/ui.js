/**
 * Модуль для управления пользовательским интерфейсом
 * Адаптирован для работы с Three.js
 */
import { initUI, selectedObject, isDragging, isRotating } from './ui/index.js';

// Экспортируем основную функцию инициализации UI для внешнего использования
export { initUI };

// Также экспортируем переменные состояния для доступа из других модулей
export { selectedObject, isDragging, isRotating };
