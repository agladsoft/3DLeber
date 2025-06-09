/**
 * Модуль для проверки коллизий между объектами и с границами площадки
 */
import * as THREE from 'three';
import { placedObjects } from './objectManager.js';
import { PLAYGROUND_GROUND_PREFIXES } from '../config.js';

/**
 * Получает границы объекта для проверки позиционирования
 * @param {Object} object - Объект для проверки границ
 * @returns {Object} Объект с центром и радиусом границ
 */
export function getObjectBounds(object) {
    // Вычисляем ограничивающий бокс объекта
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    
    // Получаем размер и центр бокса
    box.getSize(size);
    box.getCenter(center);
    
    // Устанавливаем Y-координату центра на 0 (на уровне земли)
    center.y = 0;
    
    // Вычисляем радиус (половина максимального размера)
    const radius = Math.max(size.x, size.z) / 2;
    
    return { center, radius };
}

/**
 * Проверяет, находится ли объект в пределах площадки
 * @param {Object} object - Объект для проверки
 * @returns {Boolean} Результат проверки (true - в пределах, false - за пределами)
 */
export function isWithinPlayground(object) {
    if (!object) return true;
    
    // Получаем текущие размеры площадки из глобальных переменных
    const playgroundWidth = window.selectedPlaygroundWidth || 40;
    const playgroundLength = window.selectedPlaygroundLength || 30;
    
    // Вычисляем границы площадки
    const halfWidth = playgroundWidth / 2;
    const halfLength = playgroundLength / 2;
    
    // Получаем ограничивающий бокс объекта
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Получаем центр объекта
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // Проверяем, находится ли объект полностью в пределах площадки
    // Учитываем размер объекта (радиус)
    const radius = Math.max(size.x, size.z) / 2;
    
    // Отладка - вывод информации в консоль
    // console.log(`Объект: центр X=${center.x.toFixed(2)}, радиус=${radius.toFixed(2)}, границы площадки: левая=${(-halfWidth + leftBoundaryOffset).toFixed(2)}, правая=${(halfWidth + rightBoundaryOffset).toFixed(2)}`);
    
    // Объект внутри площадки, если его крайние точки находятся внутри границы
    // Применяем различные смещения для левой и правой границ
    return (
        center.x - radius >= -halfWidth && // Сдвигаем левую границу вправо
        center.x + radius <= halfWidth &&  // Сдвигаем правую границу вправо
        center.z - radius >= -halfLength &&
        center.z + radius <= halfLength
    );
}

/**
 * Подсвечивает границы площадки и объекта при выходе за пределы
 * @param {Object} object - Объект для проверки
 * @param {Boolean} show - Флаг, показывать ли подсветку
 */
export function highlightPlaygroundBoundary(object, show) {
    if (!object) return;
    
    // Проверяем, находится ли объект в пределах площадки
    const isWithin = isWithinPlayground(object);
    
    // Применяем подсветку или снимаем её в зависимости от того,
    // находится ли объект в пределах площадки
    const shouldHighlight = show && !isWithin;
    
    // Устанавливаем флаг ошибки позиционирования
    object.userData.hasPositionError = shouldHighlight;
    
    // Проходим по всем мешам объекта
    object.traverse((child) => {
        if (child.isMesh && child.material) {
            // Сохраняем оригинальный материал при первой подсветке
            if (shouldHighlight && !child.userData.originalBoundaryMaterial) {
                // Клонируем материал, чтобы не влиять на другие объекты
                child.userData.originalBoundaryMaterial = child.material.clone();
            }
            
            if (shouldHighlight) {
                // Создаем новый красный материал для подсветки
                const errorMaterial = new THREE.MeshStandardMaterial({
                    color: 0xff0000,        // Красный цвет
                    emissive: 0x500000,     // Легкое свечение
                    metalness: 0.3,
                    roughness: 0.7,
                    transparent: false,
                    opacity: 1.0
                });
                
                // Применяем материал к мешу
                child.material = errorMaterial;
            } 
            else if (child.userData.originalBoundaryMaterial) {
                // Восстанавливаем оригинальный материал
                child.material = child.userData.originalBoundaryMaterial;
                child.userData.originalBoundaryMaterial = null;
            }
        }
    });
}

/**
 * Проверяет пересечение (коллизию) между двумя объектами
 * @param {Object} object1 - Первый объект для проверки
 * @param {Object} object2 - Второй объект для проверки
 * @returns {Boolean} true, если объекты пересекаются, иначе false
 */
export function checkObjectsIntersection(object1, object2) {
    if (!object1 || !object2) return false;
    
    // Создаем ограничивающие боксы для обоих объектов
    const box1 = new THREE.Box3().setFromObject(object1);
    const box2 = new THREE.Box3().setFromObject(object2);
    
    // Проверяем пересечение
    return box1.intersectsBox(box2);
}

/**
 * Подсвечивает объект красным цветом при коллизии
 * @param {Object} object - Объект для подсветки
 * @param {Boolean} highlight - Флаг, нужно ли подсвечивать
 */
export function highlightObjectCollision(object, highlight) {
    if (!object) return;
    
    // Применяем или снимаем подсветку для всех дочерних мешей
    object.traverse((child) => {
        if (child.isMesh && child.material) {
            // Сохраняем оригинальный материал при первой подсветке
            if (highlight && !child.userData.originalMaterial) {
                // Клонируем материал, чтобы не влиять на другие объекты
                child.userData.originalMaterial = child.material.clone();
            }
            
            if (highlight) {
                // Создаем новый красный материал для подсветки
                const collisionMaterial = new THREE.MeshStandardMaterial({
                    color: 0xff0000,        // Красный цвет
                    emissive: 0x500000,     // Легкое свечение
                    metalness: 0.3,
                    roughness: 0.7,
                    transparent: false,
                    opacity: 1.0
                });
                
                // Применяем материал к мешу
                child.material = collisionMaterial;
                
                // Устанавливаем флаг наличия коллизии
                object.userData.hasCollision = true;
            } 
            else if (child.userData.originalMaterial) {
                // Восстанавливаем оригинальный материал
                child.material = child.userData.originalMaterial;
                child.userData.originalMaterial = null;
                
                // Сбрасываем флаг коллизии
                object.userData.hasCollision = false;
            }
        }
    });
}

/**
 * Проверяет объект на коллизии с другими объектами
 * @param {Object} object - Объект для проверки
 * @returns {Boolean} Результат проверки (true - коллизий нет, false - есть коллизии)
 */
export function checkAndHighlightObject(object) {
    if (!object) return true;
    
    // Проверяем коллизии с другими объектами
    let hasCollision = false;
    let collidingObjects = [];
    
    for (let otherObject of placedObjects) {
        // Пропускаем проверку с самим собой
        if (otherObject === object) continue;
        
        // Проверяем пересечение с другим объектом
        if (checkObjectsIntersection(object, otherObject)) {
            hasCollision = true;
            collidingObjects.push(otherObject);
        }
    }
    
    // Сначала снимаем подсветку коллизий со всех объектов, кроме тех, которые сейчас пересекаются
    for (let otherObject of placedObjects) {
        if (otherObject === object) continue;
        
        // Снимаем подсветку с объектов, которые не пересекаются с текущим
        if (!collidingObjects.includes(otherObject)) {
            // Проверяем, не пересекается ли этот объект с другими объектами
            let hasOtherCollisions = false;
            for (let thirdObject of placedObjects) {
                if (thirdObject === otherObject || thirdObject === object) continue;
                if (checkObjectsIntersection(otherObject, thirdObject)) {
                    hasOtherCollisions = true;
                    break;
                }
            }
            // Если нет других коллизий, снимаем подсветку
            if (!hasOtherCollisions) {
                highlightObjectCollision(otherObject, false);
            }
        }
    }
    
    // Подсвечиваем все пересекающиеся объекты
    for (let collidingObject of collidingObjects) {
        highlightObjectCollision(collidingObject, true);
    }
    
    // Проверяем, находится ли объект в пределах площадки
    const isWithinBoundary = isWithinPlayground(object);
    
    // Подсвечиваем объект красным, если есть коллизия
    highlightObjectCollision(object, hasCollision);
    
    // Подсвечиваем объект красным, если он выходит за пределы площадки
    highlightPlaygroundBoundary(object, !isWithinBoundary);
    
    // Возвращаем результат проверки (true - всё в порядке, false - есть проблемы)
    return !hasCollision && isWithinBoundary;
}

/**
 * Проверяет позиции всех размещенных объектов
 */
export function checkAllObjectsPositions() {
    // Сначала сбрасываем подсветку для всех объектов
    for (let object of placedObjects) {
        highlightObjectCollision(object, false);
    }

    // Сброс подсветки для деревьев и скамеек playground
    if (window.playgroundSpecialObjects) {
        for (let obj of window.playgroundSpecialObjects) {
            highlightObjectCollision(obj, false);
        }
    }

    // Затем проверяем каждый объект на коллизии с другими объектами
    for (let i = 0; i < placedObjects.length; i++) {
        let object = placedObjects[i];
        let hasCollision = false;

        // Проверяем коллизии с другими объектами
        for (let j = 0; j < placedObjects.length; j++) {
            if (i === j) continue; // Пропускаем проверку с самим собой
            if (checkObjectsIntersection(object, placedObjects[j])) {
                hasCollision = true;
                break;
            }
        }

        // === ИЗМЕНЕНО: Проверка пересечений с деревьями и скамейками playground ===
        if (!hasCollision && window.playgroundSpecialObjects) {
            for (let specialObj of window.playgroundSpecialObjects) {
                if (checkObjectsIntersection(object, specialObj)) {
                    hasCollision = true;
                    break;
                }
            }
        }
        // === КОНЕЦ ИЗМЕНЕНИЯ ===

        // Проверяем, находится ли объект в пределах площадки
        const isWithinBoundary = isWithinPlayground(object);
        
        // Подсвечиваем объект красным, если есть коллизия
        highlightObjectCollision(object, hasCollision);
        
        // Подсвечиваем объект красным, если он выходит за пределы площадки
        highlightPlaygroundBoundary(object, !isWithinBoundary);
    }

    // === ИЗМЕНЕНО: Проверка пересечений с деревьями и скамейками playground ===
    if (window.playgroundSpecialObjects) {
        for (let specialObj of window.playgroundSpecialObjects) {
            let hasCollision = false;
            for (let placed of placedObjects) {
                // Исключаем объекты, у которых имя начинается с одним из PLAYGROUND_GROUND_PREFIXES
                if (placed.name && PLAYGROUND_GROUND_PREFIXES.some(prefix => placed.name.startsWith(prefix))) continue;
                // Исключаем другие specialObjects (деревья/скамейки)
                if (placed.userData && placed.userData.isPlaygroundTreeOrBench) continue;
                if (checkObjectsIntersection(specialObj, placed)) {
                    hasCollision = true;
                    break;
                }
            }
            highlightObjectCollision(specialObj, hasCollision);
        }
    }
    // === КОНЕЦ ИЗМЕНЕНИЯ ===
}