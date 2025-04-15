/**
 * Модуль для работы с объектами на площадке
 * Адаптирован для работы с Three.js
 */

// Реэкспорт функций из модулей для внешнего использования
export { placedObjects, generateObjectId, loadAndPlaceModel, removeObject } from './modules/objectManager.js';
export { scaleModelToSize, autoConvertUnits } from './modules/objectOperations.js';
export { addObjectToUI, updateSizeInUI } from './modules/uiInteraction.js';
export { getObjectBounds, isWithinPlayground, highlightPlaygroundBoundary, checkObjectsIntersection, highlightObjectCollision, checkAndHighlightObject, checkAllObjectsPositions } from './modules/collisionDetection.js';
export { alignObjectToGround, saveInitialPosition, resetToInitialPosition } from './modules/positionHelpers.js';

// Экспорт функций для работы с размерами моделей
export { 
    addDimensionsToModel,
    showModelDimensions, 
    hideModelDimensions, 
    toggleModelDimensions,
    updateModelDimensions
} from './modules/dimensionDisplay/index.js';

