/**
 * Модуль для операций с 3D-объектами (масштабирование, вращение)
 */
import * as THREE from 'three';
import { showNotification } from '../utils.js';
import { checkAndHighlightObject } from './collisionDetection.js';
import { SIZE_CONVERSION } from '../config.js';


/**
 * Автоматически определяет и конвертирует единицы измерения модели
 * @param {Object} container - Контейнер модели (Three.js Group)
 * @param {Number} thresholdSize - Опциональное пороговое значение для определения, что модель в миллиметрах
 * @return {Boolean} - true, если была выполнена конвертация
 */
export function autoConvertUnits(container, thresholdSize) {
    if (!container || !container.userData.originalSize) return false;
    
    // Используем значение из конфигурации, если не указано другое
    const threshold = thresholdSize || SIZE_CONVERSION.thresholdForCmToM;
    
    // Если размер превышает пороговое значение, считаем, что модель в миллиметрах
    if (container.userData.originalSize > threshold) {
        console.log(`Модель ${container.userData.modelName} имеет большой размер (${container.userData.originalSize.toFixed(2)}), выполняем конвертацию из мм в м`);
        
        // Сохраняем оригинальные размеры для отображения в UI
        container.userData.displayWidth = container.userData.realWidth;
        container.userData.displayHeight = container.userData.realHeight; 
        container.userData.displayDepth = container.userData.realDepth;
        container.userData.displaySize = container.userData.originalSize;
        container.userData.wasConverted = true;
        
        // Конвертируем из мм в м (делим на 1000)
        const conversionFactor = 0.001; // 1мм = 0.001м
        
        // Применяем масштабирование
        container.scale.multiplyScalar(conversionFactor);
        
        // Обновляем сохраненные размеры для внутренних расчетов
        if (container.userData.realWidth) container.userData.realWidth *= conversionFactor;
        if (container.userData.realHeight) container.userData.realHeight *= conversionFactor;
        if (container.userData.realDepth) container.userData.realDepth *= conversionFactor;
        
        // Обновляем текущий и оригинальный размер
        container.userData.originalSize *= conversionFactor;
        container.userData.currentSize = container.userData.originalSize;
        
        // Выравниваем нижнюю грань по Y=0 после изменения размера
        alignObjectToGround(container);
        
        return true;
    }
    
    return false;
}

/**
 * Масштабирует модель до указанного размера с сохранением пропорций
 * @param {Object} container - Контейнер модели (Three.js Group)
 * @param {Number} targetSize - Целевой размер модели
 */
export function scaleModelToSize(container, targetSize) {
    if (!container || !container.userData.originalSize) return;
    
    // Сначала проверяем, нужно ли конвертировать единицы измерения
    autoConvertUnits(container);
    
    // Вычисляем коэффициент масштабирования
    const scaleFactor = targetSize / container.userData.originalSize;
    
    // Применяем масштабирование с сохранением пропорций
    container.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    // Сохраняем текущий размер
    container.userData.currentSize = targetSize;
}

/**
 * Масштабирует модель с учетом реальных размеров по каждой оси
 * @param {Object} container - Контейнер модели
 * @param {Number} targetWidth - Целевая ширина модели
 * @param {Number} targetHeight - Целевая высота модели
 * @param {Number} targetDepth - Целевая глубина модели
 */
export function scaleModelToRealDimensions(container, targetWidth, targetHeight, targetDepth) {
    if (!container) return;
    
    // Если реальные размеры не были сохранены, используем ограничивающий бокс
    if (!container.userData.realWidth || !container.userData.realHeight || !container.userData.realDepth) {
        const box = new THREE.Box3().setFromObject(container);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        container.userData.realWidth = size.x;
        container.userData.realHeight = size.y;
        container.userData.realDepth = size.z;
    }
    
    // Вычисляем коэффициенты масштабирования для каждой оси
    const scaleX = targetWidth / container.userData.realWidth;
    const scaleY = targetHeight / container.userData.realHeight;
    const scaleZ = targetDepth / container.userData.realDepth;
    
    // Применяем масштабирование по отдельным осям
    container.scale.set(scaleX, scaleY, scaleZ);
    
    // Обновляем текущий размер (максимальное значение для совместимости)
    container.userData.currentSize = Math.max(targetWidth, targetHeight, targetDepth);
    
    // Выравниваем нижнюю грань по Y=0
    alignObjectToGround(container);
}

/**
 * Изменяет размер модели с заданным шагом (увеличение или уменьшение)
 * @param {Object} container - Контейнер модели
 * @param {Number} step - Шаг изменения размера (положительное или отрицательное число)
 * @returns {Number} Новый размер объекта
 */
export function changeModelSize(container, step) {
    if (!container || !container.userData.currentSize) return;
    
    // Вычисляем новый размер
    const newSize = Math.max(0.1, container.userData.currentSize + step); // Минимальный размер 0.1
    
    // Вычисляем коэффициент изменения размера
    const sizeFactor = newSize / container.userData.currentSize;
    
    // Если у контейнера есть реальные размеры, масштабируем пропорционально по каждой оси
    if (container.userData.realWidth && container.userData.realHeight && container.userData.realDepth) {
        // Вычисляем текущие реальные размеры (с учетом текущего масштаба)
        const currentWidth = container.userData.realWidth * container.scale.x;
        const currentHeight = container.userData.realHeight * container.scale.y;
        const currentDepth = container.userData.realDepth * container.scale.z;
        
        // Применяем масштабирование с сохранением реальных пропорций
        scaleModelToRealDimensions(
            container, 
            currentWidth * sizeFactor, 
            currentHeight * sizeFactor, 
            currentDepth * sizeFactor
        );
    } else {
        // Если реальные размеры не доступны, используем обычное масштабирование
        scaleModelToSize(container, newSize);
    }
    
    // Проверяем на коллизии после изменения размера
    checkAndHighlightObject(container);
    
    // Если после изменения размера появилась коллизия, показываем уведомление
    if (container.userData.hasCollision) {
        showNotification("Внимание! После изменения размера обнаружено пересечение с другим объектом.", true);
    }
    
    // Здесь мы просто возвращаем новый размер, а обновление UI произойдет в вызывающем коде
    
    return newSize;
}


