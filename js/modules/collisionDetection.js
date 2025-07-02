/**
 * Модуль для проверки коллизий между объектами и с границами площадки
 */
import * as THREE from 'three';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { placedObjects } from './objectManager.js';
import { PLAYGROUND_GROUND_PREFIXES, PLAYGROUND_ELEMENTS, PEOPLE_KEYWORDS } from '../config.js';

// Расширяем THREE.BufferGeometry с методами BVH
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

// Кэш для оптимизации проверки коллизий при активном перемещении
let lastCheckedObject = null;
let lastCheckTime = 0;
const CHECK_THROTTLE = 50; // мс между проверками

/**
 * Быстрая проверка коллизий только для движущегося объекта (оптимизированная)
 * @param {Object} object - Объект для проверки
 * @returns {Boolean} Результат проверки (true - коллизий нет, false - есть коллизии)
 */
export function checkAndHighlightObjectFast(object) {
    if (!object) return true;
    
    // Throttling для производительности при активном перемещении
    const now = Date.now();
    if (object === lastCheckedObject && now - lastCheckTime < CHECK_THROTTLE) {
        return true; // Возвращаем последний результат
    }
    
    lastCheckedObject = object;
    lastCheckTime = now;
    
    // Проверяем только близлежащие объекты (в радиусе 8 метров)
    const objectBounds = getObjectBounds(object);
    let hasCollision = false;
    
    for (let otherObject of placedObjects) {
        if (otherObject === object) continue;
        
        const otherBounds = getObjectBounds(otherObject);
        const distance = objectBounds.center.distanceTo(otherBounds.center);
        
        // Проверяем только близкие объекты для производительности
        if (distance < 8) {
            if (checkObjectsIntersection(object, otherObject)) {
                hasCollision = true;
                highlightObjectCollision(object, true);
                highlightObjectCollision(otherObject, true);
                break; // Прерываем при первой коллизии
            }
        }
    }
    
    if (!hasCollision) {
        highlightObjectCollision(object, false);
    }
    
    // Проверяем границы площадки
    highlightPlaygroundBoundary(object, true);
    
    return !hasCollision;
}

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
    
    // Исключаем объекты площадки (земля, трава и т.д.) из проверки границ
    if (object.name && PLAYGROUND_GROUND_PREFIXES.some(prefix => object.name.startsWith(prefix))) {
        return true;
    }
    
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
    
    // Применяем единую подсветку для объекта
    applyObjectHighlight(object);
}

/**
 * Получает все safety_zone мэши из объекта
 * @param {Object} object - Объект для поиска safety_zone мэшей
 * @returns {Array} Массив safety_zone мэшей
 */
function getSafetyZoneMeshes(object) {
    const safetyZones = [];
    
    object.traverse((child) => {
        if (child.isMesh && child.name && child.name.endsWith('safety_zone')) {
            safetyZones.push(child);
        }
    });
    
    return safetyZones;
}


/**
 * Проверяет пересечение bounding box с учетом полного вложения
 * @param {THREE.Box3} box1 - Первый bounding box
 * @param {THREE.Box3} box2 - Второй bounding box
 * @returns {Boolean} true, если боксы пересекаются или один содержится в другом
 */
function checkBoundingBoxIntersection(box1, box2) {
    // Стандартная проверка пересечения
    if (box1.intersectsBox(box2)) {
        return true;
    }
    
    // Проверяем, содержится ли один бокс полностью в другом
    if (box1.containsBox(box2) || box2.containsBox(box1)) {
        return true;
    }
    
    // Дополнительная проверка на случай, если объекты касаются или очень близко
    const epsilon = 0.001; // Небольшая погрешность
    const expandedBox1 = box1.clone().expandByScalar(epsilon);
    const expandedBox2 = box2.clone().expandByScalar(epsilon);
    
    return expandedBox1.intersectsBox(box2) || expandedBox2.intersectsBox(box1);
}

/**
 * Проверяет пересечение между двумя мэшами используя BVH
 * @param {THREE.Mesh} mesh1 - Первый мэш
 * @param {THREE.Mesh} mesh2 - Второй мэш
 * @returns {Boolean} true, если мэши пересекаются
 */
function checkMeshIntersection(mesh1, mesh2) {
    try {
        // Убеждаемся, что у мэшей есть BVH
        if (!mesh1.geometry.boundsTree) {
            mesh1.geometry.computeBoundsTree();
        }
        if (!mesh2.geometry.boundsTree) {
            mesh2.geometry.computeBoundsTree();
        }

        // Получаем мировые матрицы трансформации
        mesh1.updateMatrixWorld(true);
        mesh2.updateMatrixWorld(true);

        // Создаем временную матрицу для правильного преобразования координат
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.copy(mesh1.matrixWorld).invert().multiply(mesh2.matrixWorld);

        return mesh1.geometry.boundsTree.intersectsGeometry(
            mesh2.geometry,
            tempMatrix
        );
    } catch (error) {
        console.warn('Ошибка при точной проверке пересечения, используем bounding box:', error);
        
        // Fallback на улучшенную bounding box проверку
        const box1 = new THREE.Box3().setFromObject(mesh1);
        const box2 = new THREE.Box3().setFromObject(mesh2);
        
        return checkBoundingBoxIntersection(box1, box2);
    }
}

/**
 * Получает все обычные мэши из объекта (исключая safety zones)
 * @param {Object} object - Объект для поиска мэшей
 * @returns {Array} Массив обычных мэшей
 */
function getRegularMeshes(object) {
    const meshes = [];
    
    object.traverse((child) => {
        if (child.isMesh && 
            child.geometry && 
            child.visible &&
            !child.name.endsWith('safety_zone')) {
            meshes.push(child);
        }
    });
    
    return meshes;
}


/**
 * ИСПРАВЛЕННАЯ: Проверяет пересечение (коллизию) между двумя объектами
 * Новая логика проверки:
 * 1. Всегда проверяем пересечение самих моделей (основная проверка)
 * 2. Дополнительно проверяем safety zones, если они есть
 * 3. Объекты считаются пересекающимися, если пересекаются модели ИЛИ safety zones
 * 4. Специальные правила для объектов площадки (деревья, кусты, люди)
 * @param {Object} object1 - Первый объект для проверки
 * @param {Object} object2 - Второй объект для проверки
 * @returns {Boolean} true, если объекты пересекаются, иначе false
 */
export function checkObjectsIntersection(object1, object2) {
    if (!object1 || !object2) return false;
    
    const obj1Name = object1.userData?.modelName || object1.name || 'unknown';
    const obj2Name = object2.userData?.modelName || object2.name || 'unknown';
    
    // Проверяем, являются ли объекты элементами площадки (деревья, кусты)
    const isObj1PlaygroundElement = PLAYGROUND_ELEMENTS.some(keyword => obj1Name.includes(keyword));
    const isObj2PlaygroundElement = PLAYGROUND_ELEMENTS.some(keyword => obj2Name.includes(keyword));
    
    // Проверяем, являются ли объекты людьми
    const isObj1People = PEOPLE_KEYWORDS.some(keyword => obj1Name.includes(keyword));
    const isObj2People = PEOPLE_KEYWORDS.some(keyword => obj2Name.includes(keyword));
    
    // Специальные правила пересечений:
    // 1. Деревья, кусты и люди могут пересекаться между собой
    if (isObj1PlaygroundElement && isObj2PlaygroundElement) {
        return false;
    }
    
    // 2. Люди могут пересекаться с любыми объектами площадки
    if (isObj1People || isObj2People) {
        return false;
    }
    
    try {
        let hasIntersection = false;
        
        // ОСНОВНАЯ ПРОВЕРКА: всегда проверяем пересечение самих моделей
        const meshes1 = getRegularMeshes(object1);
        const meshes2 = getRegularMeshes(object2);
        
        if (meshes1.length > 0 && meshes2.length > 0) {
            // Проверяем точные пересечения между мешами моделей
            for (const mesh1 of meshes1) {
                for (const mesh2 of meshes2) {
                    if (checkMeshIntersection(mesh1, mesh2)) {
                        hasIntersection = true;
                        break;
                    }
                }
                if (hasIntersection) break;
            }
            
            // Если точная проверка не дала результата, используем bounding box
            if (!hasIntersection) {
                const box1 = new THREE.Box3().setFromObject(object1);
                const box2 = new THREE.Box3().setFromObject(object2);
                hasIntersection = checkBoundingBoxIntersection(box1, box2);
            }
        }
        
        // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: проверяем safety zones, если они есть
        const safetyZones1 = getSafetyZoneMeshes(object1);
        const safetyZones2 = getSafetyZoneMeshes(object2);
        
        // Проверяем пересечения safety zones между собой
        if (safetyZones1.length > 0 && safetyZones2.length > 0) {
            for (const zone1 of safetyZones1) {
                for (const zone2 of safetyZones2) {
                    if (checkMeshIntersection(zone1, zone2)) {
                        hasIntersection = true;
                        break;
                    }
                }
                if (hasIntersection) break;
            }
        }
        
        // Проверяем safety zones первого объекта против моделей второго
        if (safetyZones1.length > 0 && meshes2.length > 0) {
            for (const zone1 of safetyZones1) {
                for (const mesh2 of meshes2) {
                    if (checkMeshIntersection(zone1, mesh2)) {
                        hasIntersection = true;
                        break;
                    }
                }
                if (hasIntersection) break;
            }
        }
        
        // Проверяем safety zones второго объекта против моделей первого
        if (safetyZones2.length > 0 && meshes1.length > 0) {
            for (const zone2 of safetyZones2) {
                for (const mesh1 of meshes1) {
                    if (checkMeshIntersection(zone2, mesh1)) {
                        hasIntersection = true;
                        break;
                    }
                }
                if (hasIntersection) break;
            }
        }
        
        return hasIntersection;
        
    } catch (error) {
        console.warn('Ошибка при проверке коллизий, используем bounding box fallback:', error);
        
        // В случае любой ошибки используем улучшенную bounding box проверку
        const box1 = new THREE.Box3().setFromObject(object1);
        const box2 = new THREE.Box3().setFromObject(object2);
        
        return checkBoundingBoxIntersection(box1, box2);
    }
}

/**
 * Подсвечивает объект красным цветом при коллизии или ошибке позиционирования
 * @param {Object} object - Объект для подсветки
 * @param {Boolean} highlight - Флаг, нужно ли подсвечивать
 */
export function highlightObjectCollision(object, highlight) {
    if (!object) return;
    
    // Устанавливаем/сбрасываем флаг коллизии
    object.userData.hasCollision = highlight;
    
    // Применяем единую подсветку для объекта
    applyObjectHighlight(object);
}

/**
 * Применяет единую подсветку для объекта (коллизии + границы)
 * @param {Object} object - Объект для подсветки
 */
function applyObjectHighlight(object) {
    if (!object) return;
    
    const hasCollision = object.userData.hasCollision || false;
    const hasPositionError = object.userData.hasPositionError || false;
    const shouldHighlight = hasCollision || hasPositionError;
        
    // Применяем или снимаем подсветку для всех дочерних мешей
    object.traverse((child) => {
        if (child.isMesh && child.material) {
            // Сохраняем оригинальный материал при первой подсветке
            if (shouldHighlight && !child.userData.originalMaterial) {
                // Клонируем материал, чтобы не влиять на другие объекты
                child.userData.originalMaterial = child.material.clone();
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
            else if (child.userData.originalMaterial) {
                // Восстанавливаем оригинальный материал
                child.material = child.userData.originalMaterial;
                child.userData.originalMaterial = null;
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
    
    // Используем быструю проверку во время активного перемещения
    if (object.userData && object.userData.isBeingMoved) {
        return checkAndHighlightObjectFast(object);
    }
    
    // Полная проверка коллизий для статичных объектов
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
 * Принудительно сбрасывает все подсветки для объекта
 * @param {Object} object - Объект для сброса подсветки
 */
export function resetObjectHighlight(object) {
    if (!object) return;
        
    // Сбрасываем все флаги
    object.userData.hasCollision = false;
    object.userData.hasPositionError = false;
    
    // Восстанавливаем оригинальные материалы для всех мешей
    object.traverse((child) => {
        if (child.isMesh && child.material && child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial;
            child.userData.originalMaterial = null;
        }
    });
}

/**
 * Проверяет позиции всех размещенных объектов
 */
export function checkAllObjectsPositions() {    
    // Сначала принудительно сбрасываем все подсветки
    for (let object of placedObjects) {
        resetObjectHighlight(object);
    }

    // Сброс подсветки для деревьев и скамеек playground
    if (window.playgroundSpecialObjects) {
        for (let obj of window.playgroundSpecialObjects) {
            resetObjectHighlight(obj);
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