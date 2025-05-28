/**
 * Модуль для изменения размеров площадки
 */
import { PLAYGROUND, ANIMATION } from '../config.js';
import { createGrid, isTopViewActive } from '../scene.js';
import { showNotification } from '../utils.js';
import { checkAllObjectsPositions } from '../objects.js';
import { ground, playgroundWidth, playgroundLength, createPlayground, resetPlayground } from './playgroundCore.js';
import { removeAllYellowElements } from './playgroundSafetyManager.js';
import { updateLabelsDuringAnimation } from './playgroundUI.js';

/**
 * Изменение размеров площадки с анимацией
 * @param {Number} newWidth - Новая ширина площадки в метрах
 * @param {Number} newLength - Новая длина площадки в метрах
 */
export function resizePlaygroundWithAnimation(newWidth, newLength) {
    // Если площадка — не simple_playground, запрещаем изменение размеров
    if (ground && ground.userData.modelName !== 'simple_playground') {
        showNotification("Изменение размеров доступно только для стандартной (плоской) площадки", true);
        return;
    }
    // Проверяем, что размеры в допустимых пределах
    if (!areValidDimensions(newWidth, newLength)) {
        showNotification("Размеры должны быть в диапазоне от 5 до 50 метров", true);
        return;
    }

    // Сохраняем текущие размеры для анимации
    const oldWidth = playgroundWidth;
    const oldLength = playgroundLength;
    
    // Удаляем все желтые элементы перед началом анимации
    removeAllYellowElements();
    
    // Запускаем анимацию изменения размеров
    animateResize(oldWidth, oldLength, newWidth, newLength);
}

/**
 * Проверяет, что размеры находятся в допустимых пределах
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @returns {Boolean} true, если размеры допустимы
 */
function areValidDimensions(width, length) {
    return width >= PLAYGROUND.minSize && width <= PLAYGROUND.maxSize && 
           length >= PLAYGROUND.minSize && length <= PLAYGROUND.maxSize;
}

/**
 * Анимирует изменение размеров площадки
 * @param {Number} oldWidth - Текущая ширина
 * @param {Number} oldLength - Текущая длина
 * @param {Number} newWidth - Целевая ширина
 * @param {Number} newLength - Целевая длина
 */
function animateResize(oldWidth, oldLength, newWidth, newLength) {
    // Параметры для анимации
    const startTime = Date.now();
    const duration = ANIMATION.duration; // 1 секунда для анимации
    
    // Функция анимации, вызывается на каждом кадре
    const animateResize = function() {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Используем функцию плавной анимации
        const easeProgress = easeInOutCubic(progress);
        
        // Вычисляем текущие размеры на основе прогресса анимации
        const currentWidth = oldWidth + (newWidth - oldWidth) * easeProgress;
        const currentLength = oldLength + (newLength - oldLength) * easeProgress;
        
        // Обновляем площадку на текущем шаге анимации
        if (progress < 1) {
            // Если анимация не завершена
            updateDuringAnimation(currentWidth, currentLength);
            
            // Продолжаем анимацию на следующем кадре
            requestAnimationFrame(animateResize);
        } else {
            // Анимация завершена, применяем окончательные размеры
            finalizeResize(newWidth, newLength);
        }
    };
    
    // Запускаем анимацию
    animateResize();
}

/**
 * Обновляет размеры площадки во время анимации
 * @param {Number} width - Текущая ширина в процессе анимации
 * @param {Number} length - Текущая длина в процессе анимации
 */
function updateDuringAnimation(width, length) {
    // Если ground существует и имеет оригинальные размеры, масштабируем его
    if (ground && ground.userData.originalWidth && ground.userData.originalDepth) {
        const scaleX = width / ground.userData.originalWidth;
        const scaleZ = length / ground.userData.originalDepth;
        ground.scale.set(scaleX, 1, scaleZ);
    }
    
    // Обновляем метки размеров
    updateLabelsDuringAnimation(width, length);
}

/**
 * Финализирует изменение размеров после завершения анимации
 * @param {Number} newWidth - Новая ширина площадки
 * @param {Number} newLength - Новая длина площадки
 */
function finalizeResize(newWidth, newLength) {
    // Обновляем площадку с новыми размерами
    createPlayground(newWidth, newLength);
    
    // Проверяем позиции всех объектов после изменения размеров
    checkAllObjectsPositions();
    
    // Удаляем все желтые элементы после обновления
    removeAllYellowElements();
    
    // Код обновления сетки удален - вид сверху работает без сетки
    
    // Показываем уведомление
    showNotification("Размеры площадки успешно обновлены", false);
}

/**
 * Функция для плавной анимации
 * @param {Number} t - Прогресс анимации от 0 до 1
 * @returns {Number} Преобразованный прогресс с эффектом замедления
 */
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
