/**
 * Модуль для управления 3D-площадкой
 * Адаптирован для работы с Three.js
 */

// Импорт всех компонентов из индексного файла
import {
    playgroundWidth,
    playgroundLength,
    ground,
    groundMesh,
    createPlayground,
    loadPlayground,
    resizePlaygroundWithAnimation
} from './playground/index.js';

// Реэкспорт всех переменных и функций для внешнего интерфейса
export {
    playgroundWidth,
    playgroundLength,
    ground,
    groundMesh,
    loadPlayground,
    createPlayground,
    resizePlaygroundWithAnimation
};
