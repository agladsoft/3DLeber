/**
 * Модуль для управления манипуляциями с объектами
 */
import { scene, camera, controls } from '../scene.js';
import { ground } from '../playground.js';
import { 
    saveInitialPosition, 
    checkAndHighlightObject, 
    checkAllObjectsPositions 
} from '../objects.js';
import { showNotification } from '../utils.js';
import { 
    canvas, 
    selectedObject, 
    isDragging, 
    isRotating, 
    dragPlane, 
    initialMousePosition, 
    initialObjectPosition, 
    initialRotationY, 
    raycaster, 
    mouse, 
    updateMousePosition, 
    updateRaycaster, 
    resetObjectSelection,
    setSelectedObject,
    setDraggingState,
    setRotatingState,
    updateInitialMousePosition,
    updateInitialObjectPosition,
    updateInitialRotationY
} from './uiCore.js';
import * as THREE from 'three';
import { showModelDimensions, updateModelDimensions } from '../modules/dimensionDisplay/index.js';

/**
 * Инициализирует обработчики для манипуляции объектами
 */
export function initObjectManipulation() {
    // Отключаем стандартное контекстное меню (правый клик)
    canvas.addEventListener("contextmenu", event => event.preventDefault());

    // Добавляем основные обработчики событий мыши
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);
}

/**
 * Обрабатывает нажатие кнопки мыши
 * @param {MouseEvent} event - Событие нажатия мыши
 */
function handleMouseDown(event) {
    // Если уже начато перетаскивание или вращение, игнорируем
    if (isDragging || isRotating) return;
    
    // Обновляем позицию мыши
    updateMousePosition(event);
    
    // Обновляем raycaster
    updateRaycaster();
    
    // Получаем объекты, с которыми пересекается луч
    const intersectedObject = getIntersectedObject();
    
    // Если нашли объект
    if (intersectedObject) {
        // Подготавливаем объект к манипуляциям
        prepareObjectForManipulation(intersectedObject, event);
    } else {
        // Если клик по пустому месту
        resetObjectSelection();
    }
}

/**
 * Обрабатывает движение мыши
 * @param {MouseEvent} event - Событие движения мыши
 */
function handleMouseMove(event) {
    // Перемещение объекта
    if (isDragging && selectedObject) {
        handleObjectDragging(event);
    } 
    // Вращение объекта
    else if (isRotating && selectedObject) {
        handleObjectRotation(event);
    }
}

/**
 * Обрабатывает отпускание кнопки мыши
 * @param {MouseEvent} event - Событие отпускания мыши
 */
function handleMouseUp(event) {
    // Завершаем перемещение/вращение
    if (isDragging || isRotating) {
        finishObjectManipulation();
    }
}

/**
 * Обрабатывает выход курсора за пределы canvas
 */
function handleMouseLeave() {
    if (isDragging || isRotating) {
        finishObjectManipulation();
    }
}

/**
 * Получает объект, с которым пересекается луч
 * @returns {THREE.Object3D|null} Пересеченный объект или null
 */
function getIntersectedObject() {
    // Фильтруем объекты, чтобы исключить сетку, грид и площадку
    const objects = scene.children.filter(obj => {
        // Исключаем объекты с пометкой isFixedGrid (сетка)
        if (obj.userData && obj.userData.isFixedGrid) return false;
        
        // Исключаем объекты, помеченные как неинтерактивные
        if (obj.userData && obj.userData.nonInteractive) return false;
        
        // Исключаем объекты размеров (дополнительная проверка)
        if (obj.name && obj.name.includes('dimensions_')) return false;
        
        // Исключаем площадку по имени или метке в userData
        if (obj.name && obj.name.includes('playground')) return false;
        if (obj.userData && obj.userData.isPlayground) return false;
        if (obj.userData && obj.userData.modelName && 
            (obj.userData.modelName.includes('playground') || 
             obj.userData.modelName === 'simple_playground')) return false;
        
        return true;
    });
    
    const intersects = raycaster.intersectObjects(objects, true);
    
    // Если нашли пересечения
    if (intersects.length > 0) {
        // Проверяем, не является ли выбранный объект или его родители площадкой
        let currentObj = intersects[0].object;
        while (currentObj) {
            // Проверяем, не является ли объект или его предки неинтерактивными
            if (currentObj.userData && currentObj.userData.nonInteractive) {
                return null;
            }
            
            // Проверяем, не является ли объект или его предки размерами
            if (currentObj.name && (
                currentObj.name.includes('dimensions_') || 
                currentObj.name === 'dimension_text'
            )) {
                return null;
            }
            
            // Проверяем, не является ли объект или его предки площадкой
            if ((currentObj.userData && currentObj.userData.isPlayground) ||
                (currentObj.name && currentObj.name.includes('playground')) ||
                (currentObj.userData && currentObj.userData.modelName && 
                 (currentObj.userData.modelName.includes('playground') || 
                  currentObj.userData.modelName === 'simple_playground'))) {
                return null;
            }
            
            // Проверяем, не является ли объект частью ground
            if (ground && ground === currentObj) {
                return null;
            }
            
            // Переходим к родителю
            currentObj = currentObj.parent;
        }
        
        // Ищем родительский объект (контейнер модели) для выбранного меша
        let parent = intersects[0].object;
        while (parent.parent && parent.parent !== scene) {
            parent = parent.parent;
        }
        
        return parent;
    }
    
    return null;
}

import { setObjectDraggingState } from '../scene/topViewController.js';

/**
 * Подготавливает объект к манипуляциям (перемещение или вращение)
 * @param {THREE.Object3D} object - Объект для манипуляций
 * @param {MouseEvent} event - Событие нажатия мыши
 */
function prepareObjectForManipulation(object, event) {
    // Устанавливаем выбранный объект
    setSelectedObject(object);
    
    // Показываем размеры выбранного объекта
    showModelDimensions(object);
    
    // Сохраняем первоначальную позицию объекта
    saveInitialPosition(object);
    
    // Сохраняем начальную позицию мыши
    updateInitialMousePosition(event.clientX, event.clientY);
    
    // Сохраняем начальную позицию объекта
    updateInitialObjectPosition(object.position);
    
    // Проверяем, активен ли режим вида сверху
    const isTopViewMode = window.app && window.app.isTopViewActive;
    
    // Если левая кнопка мыши - начинаем перетаскивание
    if (event.button === 0) {
        setDraggingState(true);
        
        // Сообщаем контроллеру вида сверху, что перемещаем объект
        setObjectDraggingState(true);
        
        // Отключаем управление камерой во время перетаскивания только если не в режиме вида сверху
        // В режиме вида сверху controls уже отключены, и мы не хотим их сбрасывать
        if (controls && !isTopViewMode) {
            controls.enabled = false;
        }
    } 
    // Если правая кнопка мыши - начинаем вращение
    else if (event.button === 2) {
        setRotatingState(true);
        updateInitialRotationY(object.rotation.y);
        
        // Сообщаем контроллеру вида сверху, что перемещаем объект
        setObjectDraggingState(true);
        
        // Отключаем управление камерой во время вращения только если не в режиме вида сверху
        if (controls && !isTopViewMode) {
            controls.enabled = false;
        }
    }
}

/**
 * Обрабатывает перетаскивание объекта
 * @param {MouseEvent} event - Событие движения мыши
 */
function handleObjectDragging(event) {
    // Обновляем позицию мыши
    updateMousePosition(event);
    
    // Проверяем, активен ли режим вида сверху
    const isTopViewMode = window.app && window.app.isTopViewActive;
    
    let intersectionPoint = null;
    
    if (isTopViewMode) {
        // В режиме вида сверху используем специальный расчет для определения точки
        // Создаем временный рейкастер
        const tempRaycaster = new THREE.Raycaster();
        
        // Устанавливаем рейкастер от камеры через точку курсора
        tempRaycaster.setFromCamera(mouse, camera);
        
        // Плоскость Y=0 для определения точки пересечения
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        
        // Находим точку пересечения с плоскостью
        intersectionPoint = new THREE.Vector3();
        if (tempRaycaster.ray.intersectPlane(groundPlane, intersectionPoint)) {
            // Нашли точку пересечения
        } else {
            // Если не нашли пересечение, используем текущую позицию объекта
            intersectionPoint = new THREE.Vector3(
                selectedObject.position.x,
                0,
                selectedObject.position.z
            );
        }
    } else {
        // В обычном режиме используем стандартный raycaster
        updateRaycaster();
        
        // Стандартный метод для обычного режима
        const planeIntersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
            intersectionPoint = planeIntersect;
        }
    }
    
    // Если найдена точка пересечения с плоскостью
    if (intersectionPoint) {
        // Устанавливаем новую позицию объекта
        selectedObject.position.x = intersectionPoint.x;
        selectedObject.position.z = intersectionPoint.z;
        
        // Выравниваем нижнюю грань объекта по Y=0
        const box = new THREE.Box3().setFromObject(selectedObject);
        selectedObject.position.y -= box.min.y;
        
        // Проверяем на коллизии с другими объектами
        checkAndHighlightObject(selectedObject);
        
        // Обновляем положение размеров
        updateModelDimensions(selectedObject);
    }
}

/**
 * Обрабатывает вращение объекта
 * @param {MouseEvent} event - Событие движения мыши
 */
function handleObjectRotation(event) {
    // Вычисляем изменение позиции мыши по X
    const deltaX = event.clientX - initialMousePosition.x;
    
    // Применяем новый угол поворота (0.01 - чувствительность вращения)
    selectedObject.rotation.y = initialRotationY + deltaX * 0.01;
    
    // Проверяем на коллизии после вращения
    checkAndHighlightObject(selectedObject);
    
    // Обновляем положение размеров при вращении
    updateModelDimensions(selectedObject);
}

/**
 * Завершает манипуляции с объектом
 */
function finishObjectManipulation() {
    // Проверяем, активен ли режим вида сверху
    const isTopViewMode = window.app && window.app.isTopViewActive;
    
    // Включаем управление камерой обратно только если не в режиме вида сверху
    // В режиме вида сверху controls должны оставаться отключенными
    if (controls && !isTopViewMode) {
        controls.enabled = true;
    }
    
    // Проверяем все объекты на коллизии
    checkAllObjectsPositions();
    
    // Если у выбранного объекта обнаружена коллизия, показываем уведомление
    if (selectedObject && selectedObject.userData && selectedObject.userData.hasCollision) {
        showNotification("Внимание! Обнаружено пересечение с другим объектом.", true);
    }
    
    // Сообщаем контроллеру вида сверху, что закончили перемещать объект
    setObjectDraggingState(false);
    
    // Сбрасываем флаги
    setDraggingState(false);
    setRotatingState(false);
    
    // Не скрываем размеры при завершении манипуляций
}
