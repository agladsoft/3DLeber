/**
 * Индексный файл для экспорта функций ядра приложения
 */
export { initializeApp, startRenderLoop, ensureSingleInit, updateRendererSize } from './appCore.js';
export { removeAllSafetyZones } from './safetyManager.js';
export { setupDOMEventListeners } from './eventHandlers.js';
export { handleAppError, handleCriticalError } from './errorHandler.js';
