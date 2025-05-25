/**
 * Инициализация и управление сценой, камерой и светом
 * Адаптирован для работы с Three.js
 */
// Импорт из сцены
import { 
    canvas, 
    renderer, 
    scene, 
    camera, 
    controls, 
    isTopViewActive, 
    resetCameraView, 
    toggleTopView, 
    takeScreenshot, 
    createGrid,
    initScene as _initScene
} from './scene/index.js';

// Реэкспорт всех переменных и функций для внешнего интерфейса
export { 
    canvas, 
    renderer, 
    scene, 
    camera, 
    controls, 
    isTopViewActive, 
    resetCameraView, 
    toggleTopView, 
    takeScreenshot, 
    createGrid 
};

/**
 * Инициализация основных компонентов сцены
 * @returns {Object} Объект, содержащий canvas, renderer, scene, camera и controls
 */
export function initScene() {
    return _initScene();
}
