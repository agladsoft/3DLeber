/**
 * Индексный файл для экспорта функций пользовательского интерфейса
 */
// Из uiCore
export { 
    initUI, 
    selectedObject, 
    isDragging, 
    isRotating, 
    updateMousePosition, 
    updateRaycaster, 
    resetObjectSelection 
} from './uiCore.js';

// Из dragAndDrop
export { initDragAndDrop } from './dragAndDrop.js';

// Из objectManipulation
export { initObjectManipulation } from './objectManipulation.js';

// Из controlHandlers
export { initControlHandlers } from './controlHandlers.js';
