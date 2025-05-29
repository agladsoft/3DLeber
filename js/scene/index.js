/**
 * Индексный файл для экспорта функций управления сценой
 */

// Импортируем базовые компоненты сцены
export { 
    canvas, 
    renderer, 
    scene, 
    initializeRenderer, 
    createScene,
    setupResizeHandler
} from './sceneCore.js';

// Импортируем компоненты камеры
export { 
    camera, 
    controls, 
    isTopViewActive, 
    setupCamera, 
    resetCameraView, 
    toggleTopView,
    animateCameraMove
} from './cameraManager.js';

// Импортируем компоненты сетки (функции оставлены для совместимости)
export { createGrid } from './gridManager.js';

// Импортируем функции скриншота
export { takeScreenshot } from './screenshotManager.js';

// Импортируем локально, чтобы использовать в функции initScene
import { initializeRenderer, createScene } from './sceneCore.js';
import { setupCamera } from './cameraManager.js';
import { canvas } from './sceneCore.js';

/**
 * Инициализация основных компонентов сцены
 * @returns {Object} Объект, содержащий canvas, renderer, scene, camera и controls
 */
export function initScene() {
    console.log("Инициализация компонентов сцены");
    
    // Инициализируем рендерер
    const renderer = initializeRenderer();
    
    // Создаем сцену
    const scene = createScene();
    
    // Создаем и настраиваем камеру
    const { camera, controls } = setupCamera(renderer);
    
    // Возвращаем компоненты для инициализации приложения
    const appComponents = { 
        canvas, 
        renderer, 
        scene, 
        camera, 
        controls,
        isTopViewActive: false  // Начальное значение - режим отключен
    };
    
    console.log("Инициализация сцены завершена");
    
    return appComponents;
}