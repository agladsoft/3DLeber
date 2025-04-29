/**
 * Модуль для проверки коллизий между объектами и с границами площадки
 */
import * as THREE from 'three';
import { placedObjects } from './objectManager.js';

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
 * @returns {Boolean} Результат проверки (всегда возвращает true)
 */
export function isWithinPlayground(object) {
    // Всегда возвращаем true, независимо от положения объекта
    return true;
}

/**
 * Подсвечивает границы площадки и объекта при выходе за пределы
 * @param {Object} object - Объект для проверки
 * @param {Boolean} show - Флаг, показывать ли подсветку
 */
export function highlightPlaygroundBoundary(object, show) {
    // Функция отключена - не подсвечиваем объекты при выходе за границы
    // Никаких ограничений и визуальных индикаторов ошибок
    
    // Если у объекта остались маркеры ошибок с предыдущих вызовов, убираем их
    if (object) {
        object.userData.hasPositionError = false;
        
        // Восстанавливаем оригинальные материалы для всех мешей
        object.traverse((child) => {
            if (child.isMesh && child.userData.originalMaterial) {
                child.material = child.userData.originalMaterial;
                child.userData.originalMaterial = null;
            }
        });
    }
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
    // Просто сбрасываем флаг коллизии, не меняем материал
    object.userData.hasCollision = !!highlight;
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
    
    for (let otherObject of placedObjects) {
        // Пропускаем проверку с самим собой
        if (otherObject === object) continue;
        
        // Проверяем пересечение с другим объектом
        if (checkObjectsIntersection(object, otherObject)) {
            hasCollision = true;
            break;
        }
    }
    
    // Подсвечиваем объект красным, если есть коллизия
    highlightObjectCollision(object, hasCollision);
    
    // Не подсвечиваем границы площадки (эта функция отключена)
    highlightPlaygroundBoundary(object, false);
    
    // Возвращаем результат проверки (true - коллизий нет, false - есть коллизии)
    return !hasCollision;
}

/**
 * Проверяет позиции всех размещенных объектов
 */
export function checkAllObjectsPositions() {
    // Сначала сбрасываем подсветку для всех объектов
    for (let object of placedObjects) {
        highlightObjectCollision(object, false);
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
        
        // Подсвечиваем объект красным, если есть коллизия
        highlightObjectCollision(object, hasCollision);
    }
}
