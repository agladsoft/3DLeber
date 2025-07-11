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
 * Проверяет, находится ли объект в пределах площадки (улучшенная версия)
 * @param {Object} object - Объект для проверки
 * @returns {Boolean} Результат проверки (true - в пределах, false - за пределами)
 */
export function isWithinPlayground(object) {
    if (!object) return true;
    
    // Исключаем объекты площадки (земля, трава и т.д.) из проверки границ
    if (object.name && PLAYGROUND_GROUND_PREFIXES.some(prefix => object.name.includes(prefix))) {
        return true;
    }
    
    // Получаем текущие размеры площадки из глобальных переменных
    const playgroundWidth = window.selectedPlaygroundWidth || 40;
    const playgroundLength = window.selectedPlaygroundLength || 30;
    
    // Вычисляем границы площадки
    const halfWidth = playgroundWidth / 2;
    const halfLength = playgroundLength / 2;
    
    // Используем улучшенную проверку границ с учетом поворота
    return isObjectFullyWithinBounds(object, halfWidth, halfLength);
}

/**
 * Проверяет, находится ли объект полностью в пределах заданных границ
 * с учетом поворота и сложной геометрии
 * @param {Object} object - Объект для проверки
 * @param {number} halfWidth - Половина ширины площадки
 * @param {number} halfLength - Половина длины площадки
 * @returns {Boolean} true если объект полностью внутри границ
 */
function isObjectFullyWithinBounds(object, halfWidth, halfLength) {
    // Обновляем матрицы мира для точного расчета
    object.updateMatrixWorld(true);
    
    // Получаем ограничивающий бокс с учетом текущего состояния объекта
    const box = new THREE.Box3().setFromObject(object);
    
    // Проверяем, что все углы bounding box находятся внутри площадки
    const min = box.min;
    const max = box.max;
    
    // Проверяем все 4 угла проекции объекта на плоскость XZ
    const corners = [
        { x: min.x, z: min.z }, // левый передний
        { x: max.x, z: min.z }, // правый передний  
        { x: min.x, z: max.z }, // левый задний
        { x: max.x, z: max.z }  // правый задний
    ];
    
    // Объект внутри площадки только если ВСЕ углы внутри границ
    return corners.every(corner => 
        corner.x >= -halfWidth && 
        corner.x <= halfWidth && 
        corner.z >= -halfLength && 
        corner.z <= halfLength
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
        if (child.isMesh && child.name && child.name.includes('safety_zone')) {
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
            !child.name.includes('safety_zone')) {
            meshes.push(child);
        }
    });
    
    return meshes;
}


function containsBoxWithTolerance(containerBox, containedBox, tolerance = 0.01) {
    return (
        containerBox.min.x <= containedBox.min.x + tolerance &&
        containerBox.min.y <= containedBox.min.y + tolerance &&
        containerBox.min.z <= containedBox.min.z + tolerance &&
        containerBox.max.x >= containedBox.max.x - tolerance &&
        containerBox.max.y >= containedBox.max.y - tolerance &&
        containerBox.max.z >= containedBox.max.z - tolerance
    );
}


/**
 * Проверяет значительное перекрытие между двумя боксами
 * @param {THREE.Box3} box1 - Первый бокс
 * @param {THREE.Box3} box2 - Второй бокс
 * @param {number} overlapThreshold - Пороговое значение перекрытия (0.99 - 99%)
 * @returns {Boolean} true, если перекрытие превышает пороговое значение
 */
function hasSignificantOverlap(box1, box2, overlapThreshold = 0.99) {
    const intersection = box1.clone().intersect(box2);
    
    if (intersection.isEmpty()) {
        return false;
    }
    
    const box1Volume = box1.getSize(new THREE.Vector3()).length();
    const box2Volume = box2.getSize(new THREE.Vector3()).length();
    const intersectionVolume = intersection.getSize(new THREE.Vector3()).length();
    
    const smallerVolume = Math.min(box1Volume, box2Volume);
    const overlapRatio = intersectionVolume / smallerVolume;
    
    return overlapRatio >= overlapThreshold;
}

/**
 * Проверяет полное вложение или значительное перекрытие между двумя боксами
 * @param {THREE.Box3} box1 - Первый бокс
 * @param {THREE.Box3} box2 - Второй бокс
 * @returns {Boolean} true, если один бокс полностью содержит другой или перекрывает его
 */
function checkBoxContainment(box1, box2) {
    // Проверяем валидность боксов
    if (box1.isEmpty() || box2.isEmpty()) {
        return false;
    }
    
    // 1. Стандартная проверка containsBox
    if (box1.containsBox(box2) || box2.containsBox(box1)) {
        return true;
    }
    
    // 2. Проверка с толерантностью
    if (containsBoxWithTolerance(box1, box2) || containsBoxWithTolerance(box2, box1)) {
        return true;
    }
    
    // 3. Проверка значительного перекрытия
    if (hasSignificantOverlap(box1, box2)) {
        return true;
    }
    
    // 4. Проверка центров
    const center1 = box1.getCenter(new THREE.Vector3());
    const center2 = box2.getCenter(new THREE.Vector3());
    
    if (box1.containsPoint(center2) || box2.containsPoint(center1)) {
        return true;
    }
    
    return false;
}


/**
 * ОПТИМИЗИРОВАННАЯ: Проверяет пересечение (коллизию) между двумя объектами
 * Оптимизированная логика проверки:
 * 1. Быстрая предварительная bounding box проверка
 * 2. Если пересечение найдено - делаем точную проверку моделей
 * 3. Дополнительно проверяем safety zones, если они есть
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
        // БЫСТРАЯ ПРЕДВАРИТЕЛЬНАЯ ПРОВЕРКА: сначала проверяем bounding boxes
        const box1 = new THREE.Box3().setFromObject(object1);
        const box2 = new THREE.Box3().setFromObject(object2);
        
        // Если bounding boxes не пересекаются - объекты точно не пересекаются
        const hasBasicIntersection = checkBoundingBoxIntersection(box1, box2);
        if (!hasBasicIntersection) {
            return false;
        }
        
        // Получаем safety zones для дальнейших проверок
        const safetyZones1 = getSafetyZoneMeshes(object1);
        const safetyZones2 = getSafetyZoneMeshes(object2);
        
        // СЛУЧАЙ 1: Оба объекта имеют safety zones - проверяем их пересечения и вложения
        if (safetyZones1.length > 0 && safetyZones2.length > 0) {
            for (const zone1 of safetyZones1) {
                for (const zone2 of safetyZones2) {
                    // Проверяем классическое пересечение
                    if (checkMeshIntersection(zone1, zone2)) {
                        return true;
                    }
                    
                    // Проверяем полное вложение safety zones друг в друга
                    const box1 = new THREE.Box3().setFromObject(zone1);
                    const box2 = new THREE.Box3().setFromObject(zone2);
                    
                    // Если одна зона полностью содержится в другой - это тоже коллизия
                    if (checkBoxContainment(box1, box2)) {
                        return true;
                    }
                }
            }
            return false;
        }
        
        // СЛУЧАЙ 2: Один объект имеет safety zone, другой - нет
        if (safetyZones1.length > 0) {
            const meshes2 = getRegularMeshes(object2);
            for (const zone1 of safetyZones1) {
                const zoneBox = new THREE.Box3().setFromObject(zone1);
                
                // Проверяем пересечение safety zone с каждым мешом объекта
                for (const mesh2 of meshes2) {
                    const meshBox = new THREE.Box3().setFromObject(mesh2);
                    if (zoneBox.intersectsBox(meshBox)) {
                        return true;
                    }
                }
            }
            return false;
        }
        
        if (safetyZones2.length > 0) {
            const meshes1 = getRegularMeshes(object1);
            for (const zone2 of safetyZones2) {
                const zoneBox = new THREE.Box3().setFromObject(zone2);
                
                // Проверяем пересечение safety zone с каждым мешом объекта
                for (const mesh1 of meshes1) {
                    const meshBox = new THREE.Box3().setFromObject(mesh1);
                    if (zoneBox.intersectsBox(meshBox)) {
                        return true;
                    }
                }
            }
            return false;
        }
        
        // СЛУЧАЙ 3: Ни у одного объекта нет safety zones
        // Используем улучшенную bounding box проверку (которая уже была выполнена выше)
        // Точная проверка мешей нужна только если простая bounding box проверка неточна
        const simpleIntersection = box1.intersectsBox(box2);
        if (simpleIntersection && hasBasicIntersection) {
            // Если есть простое пересечение И улучшенная проверка тоже показала пересечение,
            // то скорее всего объекты действительно пересекаются
            return true;
        }
        
        // Если улучшенная проверка показала пересечение, но простая нет,
        // значит возможно полное вложение - делаем точную проверку
        if (hasBasicIntersection && !simpleIntersection) {
            const meshes1 = getRegularMeshes(object1);
            const meshes2 = getRegularMeshes(object2);
            
            // Ограничиваем количество точных проверок для производительности
            const maxChecks = 4; // Проверяем максимум 4 пары мешей
            let checksPerformed = 0;
            
            for (const mesh1 of meshes1) {
                for (const mesh2 of meshes2) {
                    if (checksPerformed >= maxChecks) break;
                    if (checkMeshIntersection(mesh1, mesh2)) {
                        return true;
                    }
                    checksPerformed++;
                }
                if (checksPerformed >= maxChecks) break;
            }
        }
        
        return hasBasicIntersection;
        
    } catch (error) {
        console.warn('Ошибка при проверке коллизий, используем bounding box fallback:', error);
        
        // В случае любой ошибки используем простую bounding box проверку
        const box1 = new THREE.Box3().setFromObject(object1);
        const box2 = new THREE.Box3().setFromObject(object2);
        
        return box1.intersectsBox(box2);
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
                // Проверяем, является ли это safety zone
                if (child.name && child.name.includes('safety_zone')) {
                    // Для safety zone всегда используем белый материал
                    const safetyZoneMaterial = new THREE.MeshStandardMaterial({
                        color: 0xffffff,        // Белый цвет
                        emissive: 0x000000,     // Без свечения
                        metalness: 0.1,
                        roughness: 0.9,
                        transparent: true,
                        opacity: 0.3
                    });
                    child.material = safetyZoneMaterial;
                } else {
                    // Для обычных мешей используем красный материал для подсветки
                    const errorMaterial = new THREE.MeshStandardMaterial({
                        color: 0xff0000,        // Красный цвет
                        emissive: 0x500000,     // Легкое свечение
                        metalness: 0.3,
                        roughness: 0.7,
                        transparent: false,
                        opacity: 1.0
                    });
                    child.material = errorMaterial;
                }
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