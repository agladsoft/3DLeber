/**
 * Индексный файл для экспорта функций управления площадкой
 */
// Из playgroundCore
export { 
    playgroundWidth,
    playgroundLength,
    ground,
    groundMesh,
    createPlayground,
    resetPlayground
} from './playgroundCore.js';

// Из playgroundLoader
export { loadPlayground } from './playgroundLoader.js';

// Из playgroundResizer
export { resizePlaygroundWithAnimation } from './playgroundResizer.js';

// Из playgroundSafetyManager
export { removeAllYellowElements } from './playgroundSafetyManager.js';

// Из playgroundUI
export { updatePlaygroundLabels, updateLabelsDuringAnimation } from './playgroundUI.js';

// Из playgroundCreator
export { createSimplePlayground } from './playgroundCreator.js';
