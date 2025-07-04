/**
 * Вспомогательные функции для позиционирования и перемещения объектов
 */
import { highlightPlaygroundBoundary } from './collisionDetection.js';

/**
 * Сохраняет исходную позицию объекта
 * @param {Object} object - Объект для сохранения позиции
 */
export function saveInitialPosition(object) {
    if (!object) return;
    
    // Сохраняем начальную позицию и поворот в userData
    object.userData.initialPosition = {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
    };
    
    object.userData.initialRotation = {
        x: object.rotation.x,
        y: object.rotation.y,
        z: object.rotation.z
    };
}

/**
 * Возвращает объект на исходную позицию
 * @param {Object} object - Объект для возврата
 */
export function resetToInitialPosition(object) {
    if (!object || !object.userData.initialPosition) return;
    
    // Создаем анимацию для плавного возврата на исходную позицию
    const startTime = Date.now();
    const duration = 500; // 500 мс для анимации
    
    // Сохраняем текущую позицию и поворот
    const startPosition = {
        x: object.position.x,
        y: object.position.y,
        z: object.position.z
    };
    
    const startRotation = {
        x: object.rotation.x,
        y: object.rotation.y,
        z: object.rotation.z
    };
    
    // Функция анимации
    const animateReset = function() {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Используем функцию плавной анимации
        const easeProgress = easeInOutQuad(progress);
        
        // Обновляем позицию
        object.position.x = startPosition.x + (object.userData.initialPosition.x - startPosition.x) * easeProgress;
        object.position.y = startPosition.y + (object.userData.initialPosition.y - startPosition.y) * easeProgress;
        object.position.z = startPosition.z + (object.userData.initialPosition.z - startPosition.z) * easeProgress;
        
        // Обновляем поворот
        object.rotation.x = startRotation.x + (object.userData.initialRotation.x - startRotation.x) * easeProgress;
        object.rotation.y = startRotation.y + (object.userData.initialRotation.y - startRotation.y) * easeProgress;
        object.rotation.z = startRotation.z + (object.userData.initialRotation.z - startRotation.z) * easeProgress;
        
        // Продолжаем анимацию, если она не завершена
        if (progress < 1) {
            requestAnimationFrame(animateReset);
        } else {
            // Снимаем подсветку ошибки после возврата на исходную позицию
            highlightPlaygroundBoundary(object, false);
        }
    };
    
    // Запускаем анимацию
    animateReset();
}

/**
 * Функция для плавной анимации
 * @param {Number} t - Прогресс анимации от 0 до 1
 * @returns {Number} Преобразованный прогресс с эффектом замедления
 */
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
