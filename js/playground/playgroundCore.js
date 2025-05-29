/**
 * Основной модуль для управления 3D-площадкой
 */
import { PLAYGROUND } from '../config.js';
import { scene, createGrid, isTopViewActive } from '../scene.js';
import { checkAllObjectsPositions } from '../objects.js';
import { removeAllYellowElements } from './playgroundSafetyManager.js';
import { updatePlaygroundLabels } from './playgroundUI.js';
import { updateDimensionGrid } from '../scene/gridManager.js';

// Глобальные переменные для площадки
export let playgroundWidth = PLAYGROUND.defaultWidth;
export let playgroundLength = PLAYGROUND.defaultLength;
export let ground = null;
export let groundMesh = null;

// Функция для обновления глобальных переменных ground и groundMesh
export function updateGroundReferences(newGround, newGroundMesh) {
    ground = newGround;
    groundMesh = newGroundMesh;
}

// Функция для обновления размеров площадки
export function updatePlaygroundDimensions(width, length) {
    playgroundWidth = width;
    playgroundLength = length;
}

/**
 * Создание новой площадки с заданными размерами
 * @param {Number} width - Ширина площадки в метрах
 * @param {Number} length - Длина площадки в метрах
 * @returns {Object} Объект площадки
 */
export function createPlayground(width, length) {
    // Обновляем размеры площадки
    playgroundWidth = width;
    playgroundLength = length;
    
    // Обновляем текстовый статус и метки размеров
    updatePlaygroundLabels(playgroundWidth, playgroundLength);
    
    // Не масштабируем ground, если это не простая площадка
    // (масштабирование теперь только для аварийной/простой площадки)
    if (ground && ground.userData.modelName === 'simple_playground' && ground.userData.originalWidth && ground.userData.originalDepth) {
        const scaleX = width / ground.userData.originalWidth;
        const scaleZ = length / ground.userData.originalDepth;
        ground.scale.set(scaleX, 1, scaleZ);
    }
    
    // Удаляем все желтые элементы
    removeAllYellowElements();
    
    // Код обновления сетки удален - вид сверху работает без сетки
    
    // Удаляем все объекты, которые могут относиться к зонам безопасности
    cleanupSafetyObjects();
    
    return ground;
}

/**
 * Удаляет объекты безопасности из сцены и освобождает ресурсы
 */
function cleanupSafetyObjects() {
    scene.traverse((object) => {
        if (object.name && (
            object.name.includes("safe") || object.name.includes("Safety") || 
            object.name.includes("zone") || object.name.includes("Zone") ||
            object.name.includes("inner") || object.name.includes("Inner") ||
            object.name.includes("boundary") || object.name.includes("Boundary") ||
            object.name.includes("Line") || object.name.includes("line")
        ) && object !== ground && object !== groundMesh) {
            // Удаляем объект из родительского объекта
            if (object.parent) {
                object.parent.remove(object);
            } else {
                scene.remove(object);
            }
            
            // Освобождаем ресурсы
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
    });
}

/**
 * Сбрасывает площадку на указанные размеры
 * @param {Number} width - Новая ширина площадки
 * @param {Number} length - Новая длина площадки
 */
export function resetPlayground(width, length) {
    // Обновляем текстовый статус и метки размеров
    playgroundWidth = width;
    playgroundLength = length;
    updatePlaygroundLabels(playgroundWidth, playgroundLength);
    
    // Удаляем все желтые элементы
    removeAllYellowElements();
    
    // Проверяем позиции всех объектов после изменения размеров
    checkAllObjectsPositions();
    
    // Получаем цвет площадки, если доступен
    let groundColor = 'серый';
    if (ground && ground.userData && ground.userData.groundColor) {
        groundColor = ground.userData.groundColor;
    }
    
    // Обновляем размерную сетку
    updateDimensionGrid(width, length, groundColor);
    
    // Обновляем сетку, если активен вид сверху
    // Проверяем как локальную переменную, так и глобальное состояние в window.app
    if (isTopViewActive || (window.app && window.app.isTopViewActive)) {
        const gridHelper = createGrid(width, length);
        
        // Убеждаемся, что сетка фиксирована на площадке
        if (gridHelper) {
            gridHelper.matrixAutoUpdate = false;
            gridHelper.updateMatrix();
            
            // Привязываем сетку к площадке по y-координате
            gridHelper.position.y = 0.01;
        }
    }
}
