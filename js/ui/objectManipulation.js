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
import { 
    canvas, 
    selectedObject, 
    isDragging, 
    isRotating, 
    dragPlane, 
    initialMousePosition, 
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
import { API_BASE_URL } from '../api/serverConfig.js'

/**
 * Обновляет сессию в базе данных
 * @param {Object} object - Объект, который был изменен
 */
async function updateSessionInDatabase(object) {
    try {
        // Получаем user_id из sessionStorage
        const userId = sessionStorage.getItem('userId');

        if (!userId) {
            console.error('No user ID found');
            return;
        }

        // Получаем текущую сессию
        const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
        if (!sessionResponse.ok) {
            throw new Error('Failed to get session');
        }

        const { session } = await sessionResponse.json();
        const sessionData = session || { quantities: {}, placedObjects: [] };

        // Обновляем или добавляем информацию об объекте
        const objectIndex = sessionData.placedObjects.findIndex(obj => obj.id === object.userData.id);
        const objectData = {
            id: object.userData.id,
            modelName: object.userData.modelName,
            coordinates: object.userData.coordinates,
            rotation: object.rotation.y.toFixed(2),
            dimensions: {
                width: object.userData.realWidth.toFixed(2),
                height: object.userData.realHeight.toFixed(2),
                depth: object.userData.realDepth.toFixed(2)
            }
        };

        if (objectIndex !== -1) {
            sessionData.placedObjects[objectIndex] = objectData;
        } else {
            sessionData.placedObjects.push(objectData);
        }

        // Сохраняем обновленную сессию
        const saveResponse = await fetch(`${API_BASE_URL}/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, sessionData }),
        });

        if (!saveResponse.ok) {
            throw new Error('Failed to save session');
        }
    } catch (error) {
        console.error('Error updating session:', error);
    }
}

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

    // Добавляем обработчик двойного клика для показа кнопки удаления
    canvas.addEventListener("click", handleDoubleClickOnCanvas);
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
    
    // Показываем размеры выбранного объекта ТОЛЬКО если не скрыты глобально
    if (localStorage.getItem('dimensionLabelsHidden') !== 'true') {
        showModelDimensions(object);
    }
    
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
        
        // Показываем кнопку удаления при начале перетаскивания
        showDeleteButtonForObject(object, event);
        
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
        let intersects = [];
        if (ground) {
            intersects = raycaster.intersectObject(ground, true);
        }
        if (intersects.length > 0) {
            intersectionPoint = intersects[0].point;
        } else if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
            intersectionPoint = planeIntersect;
        }
    }
    
    // Если найдена точка пересечения с плоскостью
    if (intersectionPoint) {
        // Устанавливаем новую позицию объекта
        selectedObject.position.x = intersectionPoint.x;
        selectedObject.position.z = intersectionPoint.z;
        
        // Обновляем координаты в userData
        selectedObject.userData.coordinates = {
            x: intersectionPoint.x.toFixed(2),
            y: intersectionPoint.y.toFixed(2),
            z: intersectionPoint.z.toFixed(2)
        };

        // Обновляем сессию в базе данных
        updateSessionInDatabase(selectedObject);

        // Проверяем на коллизии с другими объектами
        checkAndHighlightObject(selectedObject);
        
        // Обновляем положение размеров ТОЛЬКО если не скрыты
        if (localStorage.getItem('dimensionLabelsHidden') !== 'true') {
            updateModelDimensions(selectedObject);
        }
    }

    // --- Обновляем позицию крестика (кнопки удаления) во время перетаскивания ---
    if (selectedObject) {
        // Обновляем позицию крестика, но не пересоздаем его постоянно
        updateDeleteButtonPosition(selectedObject);
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
    
    // Обновляем координаты в userData (даже при вращении, так как они могут измениться)
    selectedObject.userData.coordinates = {
        x: selectedObject.position.x.toFixed(2),
        y: selectedObject.position.y.toFixed(2),
        z: selectedObject.position.z.toFixed(2)
    };
    
    // Обновляем сессию в базе данных
    updateSessionInDatabase(selectedObject);
    
    // Проверяем на коллизии после вращения
    checkAndHighlightObject(selectedObject);
    
    // Обновляем положение размеров при вращении ТОЛЬКО если не скрыты
    if (localStorage.getItem('dimensionLabelsHidden') !== 'true') {
        updateModelDimensions(selectedObject);
    }
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
    
    // Логируем финальные координаты после завершения манипуляций
    if (selectedObject) {
        // Обновляем сессию в базе данных с финальными координатами
        updateSessionInDatabase(selectedObject);
        
        console.log(`Завершение манипуляций с моделью ${selectedObject.userData.modelName}:`, {
            id: selectedObject.userData.id,
            finalCoordinates: selectedObject.userData.coordinates,
            rotation: selectedObject.rotation.y.toFixed(2)
        });
    }
    
    // Сообщаем контроллеру вида сверху, что закончили перемещать объект
    setObjectDraggingState(false);
    
    // Сбрасываем флаги
    setDraggingState(false);
    setRotatingState(false);
    
    // Не скрываем размеры при завершении манипуляций
    // --- Убираем крестик при завершении манипуляции ---
    removeDeleteButton();
}

// Вспомогательная функция для преобразования 3D координат в 2D экранные
function toScreenPosition(obj, camera) {
    const vector = new THREE.Vector3();
    obj.updateMatrixWorld();
    vector.setFromMatrixPosition(obj.matrixWorld);
    vector.project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (1 - (vector.y * 0.5 + 0.5)) * window.innerHeight;
    return { x, y };
}

// Удаляем старую кнопку, если она есть
function removeDeleteButton() {
    const oldBtn = document.getElementById('modelDeleteButton');
    if (oldBtn) oldBtn.remove();
}

// Обновляет позицию кнопки удаления без её пересоздания
function updateDeleteButtonPosition(object) {
    const btn = document.getElementById('modelDeleteButton');
    if (!btn) return;
    
    // Получаем 2D позицию центра объекта
    const { x, y } = toScreenPosition(object, camera);
    
    // Обновляем позицию кнопки
    btn.style.left = `${x + 20}px`;
    btn.style.top = `${y - 45}px`;
}

// Обработчик двойного клика по canvas
function handleDoubleClickOnCanvas(event) {
    // Обновляем позицию мыши и raycaster
    updateMousePosition(event);
    updateRaycaster();
    // Получаем объект под курсором
    const intersectedObject = getIntersectedObject();
    removeDeleteButton();
    if (intersectedObject) {
        // Показываем кнопку удаления над моделью
        showDeleteButtonForObject(intersectedObject, event);
    }
}

function showDeleteButtonForObject(object, event) {
    // Проверяем, является ли объект размерной сеткой в режиме вида сверху
    if (object.name === "dimensionGrid" || 
        (object.userData && object.userData.isTopViewGrid) || 
        (object.parent && object.parent.name === "dimensionGrid") ||
        (object.parent && object.parent.userData && object.parent.userData.isTopViewGrid)) {
        console.log('Попытка удаления размерной сетки заблокирована');
        return; // Не показываем кнопку удаления для размерной сетки
    }
    
    // Если кнопка уже существует, обновляем её позицию и объект
    const existingBtn = document.getElementById('modelDeleteButton');
    if (existingBtn) {
        updateDeleteButtonPosition(object);
        // Сохраняем ссылку на новый объект в кнопке
        existingBtn._targetObject = object;
        return;
    }
    
    // Перед созданием новой кнопки всегда удаляем старую
    removeDeleteButton();
    // Получаем 2D позицию центра объекта
    const { x, y } = toScreenPosition(object, camera);
    // Создаем кнопку удаления с улучшенным дизайном
    const btn = document.createElement('button');
    btn.id = 'modelDeleteButton';
    btn.className = 'delete-button';
    btn.innerHTML = '×'; // Используем более изящный символ умножения
    btn.style.position = 'fixed';
    // Позиционируем кнопку выше и правее центра модели
    btn.style.left = `${x + 20}px`;
    btn.style.top = `${y - 45}px`;
    btn.style.zIndex = 2000;
    btn.title = 'Удалить объект';
    // Стилизация кнопки
    btn.style.background = 'linear-gradient(145deg, #ff4d4d, #ff1a1a)';
    btn.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '50%';
    btn.style.width = '28px';
    btn.style.height = '28px';
    btn.style.display = 'flex';
    btn.style.alignItems = 'center';
    btn.style.justifyContent = 'center';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)';
    btn.style.transition = 'all 0.3s cubic-bezier(.25,.8,.25,1)';
    btn.style.fontSize = '18px';
    btn.style.fontWeight = 'bold';
    btn.style.lineHeight = '1';
    
    // Сохраняем ссылку на объект в кнопке
    btn._targetObject = object;
    
    // Эффекты при наведении
    btn.onmouseover = function() {
        this.style.transform = 'scale(1.15) rotate(90deg)';
        this.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2), 0 6px 12px rgba(0,0,0,0.19)';
        this.style.background = 'linear-gradient(145deg, #ff3333, #e60000)';
    };
    btn.onmouseout = function() {
        this.style.transform = 'scale(1) rotate(0)';
        this.style.boxShadow = '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)';
        this.style.background = 'linear-gradient(145deg, #ff4d4d, #ff1a1a)';
    };
    
    // Обработчик клика с использованием сохраненной ссылки на объект
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (this._targetObject) {
            handleObjectDeletion(this._targetObject);
        }
        removeDeleteButton();
    });
    
    document.body.appendChild(btn);
}

/**
 * Обрабатывает удаление объекта
 * @param {THREE.Object3D} object - Объект для удаления
 */
function handleObjectDeletion(object) {
    console.log('handleObjectDeletion called with object:', object); // Для отладки
    
    if (!object) {
        console.log('No object to delete');
        return;
    }
    
    // Сохраняем имя модели перед удалением
    const modelName = object.userData.modelName;
    console.log('Deleting model:', modelName); // Для отладки
    
    // Удаляем объект
    import('../objects.js').then(module => {
        console.log('Objects module loaded, calling removeObject'); // Для отладки
        module.removeObject(object);
    }).catch(error => {
        console.error('Ошибка при удалении объекта:', error);
    });
    
    // Обновляем количество в сайдбаре
    if (modelName) {
        // Динамически импортируем функцию обновления количества
        import('./dragAndDrop.js').then(module => {
            if (typeof module.updateModelQuantityOnRemove === 'function') {
                module.updateModelQuantityOnRemove(modelName);
            }
        }).catch(error => {
            console.error('Ошибка при обновлении количества модели:', error);
        });
    }
}
