/**
 * Основной модуль пользовательского интерфейса
 */
import { canvas, scene, camera, renderer } from '../scene.js';
import { initDragAndDrop } from './dragAndDrop.js';
import { initObjectManipulation } from './objectManipulation.js';
import { initControlHandlers } from './controlHandlers.js';
import * as THREE from 'three';

// Глобальные переменные для управления манипуляциями с объектами
export let selectedObject = null;
export let isDragging = false;
export let isRotating = false;
export let dragPlane = null;
export let initialMousePosition = new THREE.Vector2();
export let initialObjectPosition = new THREE.Vector3();
export let initialRotationY = 0;
export let raycaster = new THREE.Raycaster();
export let mouse = new THREE.Vector2();

// Реэкспортируем canvas и другие элементы сцены для использования в других модулях
export { canvas, scene, camera, renderer };

/**
 * Инициализирует обработчики событий пользовательского интерфейса
 */
export function initUI() {
    console.log('Инициализация UI...');
    
    // Проверяем, что основные компоненты сцены доступны
    if (!canvas || !scene || !camera || !renderer) {
        console.error('Ошибка: компоненты сцены не инициализированы');
        return;
    }
    
    // Создаем инструменты для выбора объектов
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Создаем плоскость для перетаскивания объектов
    dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    // Добавляем обработчики для drag and drop элементов из каталога
    initDragAndDrop();
    
    // Добавляем обработчики для управления объектами (перемещение, вращение)
    initObjectManipulation();
    
    // Добавляем обработчики для кнопок и элементов управления
    initControlHandlers();
    
    // Инициализируем обработчики клавиатуры
    initKeyboardHandlers();
    
    console.log('UI инициализирован успешно');
}

/**
 * Инициализирует обработчики клавиатуры
 */
function initKeyboardHandlers() {
    // Обработчик нажатия клавиш
    document.addEventListener('keydown', (event) => {
        // Если нажата клавиша Escape и есть выбранный объект
        if (selectedObject && event.key === 'Escape') {
            // Импортируем функцию resetToInitialPosition динамически,
            // чтобы избежать циклических зависимостей
            import('../objects.js').then(module => {
                module.resetToInitialPosition(selectedObject);
            });
            event.preventDefault();
        }
        
        // Обработка стрелок для передвижения выбранного объекта
        if (selectedObject && (event.key.startsWith('Arrow') || event.code.startsWith('Arrow'))) {
            handleArrowKeyMovement(event);
            event.preventDefault();
        }
    });
    
    // Обработчик отпускания клавиш (если понадобится в будущем)
    document.addEventListener('keyup', (event) => {
        // Пока пусто, но можно добавить функциональность при необходимости
    });
}

/**
 * Обрабатывает передвижение объекта стрелками клавиатуры
 * @param {KeyboardEvent} event - Событие клавиатуры
 */
async function handleArrowKeyMovement(event) {
    if (!selectedObject) return;
    
    // Определяем шаг перемещения (в метрах)
    // Если зажат Shift - увеличиваем шаг в 5 раз
    // Если зажат Ctrl - уменьшаем шаг в 10 раз для точного позиционирования
    let step = 0.1; // Базовый шаг 10 см
    
    if (event.shiftKey) {
        step = 0.5; // Быстрое перемещение на 50 см
    } else if (event.ctrlKey) {
        step = 0.01; // Точное позиционирование на 1 см
    }
    
    // Сохраняем текущую позицию для возможного отката
    const oldPosition = selectedObject.position.clone();
    
    // Определяем направление движения
    switch (event.key) {
        case 'ArrowUp':
            selectedObject.position.z -= step; // Движение вперед (вглубь сцены)
            break;
        case 'ArrowDown':
            selectedObject.position.z += step; // Движение назад (к камере)
            break;
        case 'ArrowLeft':
            selectedObject.position.x -= step; // Движение влево
            break;
        case 'ArrowRight':
            selectedObject.position.x += step; // Движение вправо
            break;
        default:
            return; // Неизвестная клавиша
    }
    
    // Обновляем координаты в userData
    selectedObject.userData.coordinates = {
        x: selectedObject.position.x.toFixed(2),
        y: selectedObject.position.y.toFixed(2),
        z: selectedObject.position.z.toFixed(2)
    };
    
    // Проверяем коллизии с другими объектами
    const { checkAndHighlightObject, checkAllObjectsPositions } = await import('../objects.js');
    checkAndHighlightObject(selectedObject);
    
    // Обновляем размеры если они показаны
    if (localStorage.getItem('dimensionLabelsHidden') !== 'true') {
        const { updateModelDimensions } = await import('../modules/dimensionDisplay/index.js');
        updateModelDimensions(selectedObject);
    }
    
    // Показываем кнопку удаления для объекта при движении стрелками
    showDeleteButtonForSelectedObject(selectedObject);
    
    // Обновляем сессию в базе данных
    updateSessionInDatabase(selectedObject);
    
    // Логируем перемещение
    console.log(`Объект ${selectedObject.userData.modelName} перемещен стрелкой ${event.key} на ${step}м. Новые координаты:`, {
        x: selectedObject.position.x.toFixed(2),
        y: selectedObject.position.y.toFixed(2),
        z: selectedObject.position.z.toFixed(2)
    });
}

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

        // Получаем API_BASE_URL
        const { API_BASE_URL } = await import('../api/serverConfig.js');

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

        console.log('Session updated successfully for keyboard movement:', objectData);
    } catch (error) {
        console.error('Error updating session from keyboard movement:', error);
    }
}

/**
 * Обновляет позицию мыши в нормализованных координатах
 * @param {MouseEvent} event - Событие мыши
 */
export function updateMousePosition(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

/**
 * Обновляет луч для определения пересечений
 */
export function updateRaycaster() {
    raycaster.setFromCamera(mouse, camera);
}

/**
 * Функция для установки текущего выбранного объекта
 * @param {THREE.Object3D} object - Выбранный объект
 */
export function setSelectedObject(object) {
    selectedObject = object;
}

/**
 * Сбрасывает состояние выбранного объекта
 */
export function resetObjectSelection() {
    selectedObject = null;
    isDragging = false;
    isRotating = false;
}

/**
 * Функция для установки состояния перетаскивания
 * @param {Boolean} state - Новое состояние
 */
export function setDraggingState(state) {
    isDragging = state;
}

/**
 * Функция для установки состояния вращения
 * @param {Boolean} state - Новое состояние
 */
export function setRotatingState(state) {
    isRotating = state;
}

/**
 * Функция для обновления начальной позиции мыши
 * @param {Number} x - Координата X
 * @param {Number} y - Координата Y
 */
export function updateInitialMousePosition(x, y) {
    initialMousePosition.x = x;
    initialMousePosition.y = y;
}

/**
 * Функция для обновления начальной позиции объекта
 * @param {THREE.Vector3} position - Новая позиция
 */
export function updateInitialObjectPosition(position) {
    initialObjectPosition.copy(position);
}

/**
 * Функция для обновления начального угла вращения по Y
 * @param {Number} rotation - Угол вращения
 */
export function updateInitialRotationY(rotation) {
    initialRotationY = rotation;
}

/**
 * Показывает кнопку удаления для выбранного объекта (для клавиатуры)
 * @param {THREE.Object3D} object - Объект для которого показать кнопку удаления
 */
function showDeleteButtonForSelectedObject(object) {
    if (!object) return;
    
    // Проверяем, является ли объект размерной сеткой в режиме вида сверху
    if (object.name === "dimensionGrid" || 
        (object.userData && object.userData.isTopViewGrid) || 
        (object.parent && object.parent.name === "dimensionGrid") ||
        (object.parent && object.parent.userData && object.parent.userData.isTopViewGrid)) {
        console.log('Попытка удаления размерной сетки заблокирована');
        return; // Не показываем кнопку удаления для размерной сетки
    }
    
    // Удаляем старую кнопку, если она есть
    const oldBtn = document.getElementById('modelDeleteButton');
    if (oldBtn) oldBtn.remove();
    
    // Получаем 2D позицию центра объекта
    const vector = new THREE.Vector3();
    object.updateMatrixWorld();
    vector.setFromMatrixPosition(object.matrixWorld);
    vector.project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (1 - (vector.y * 0.5 + 0.5)) * window.innerHeight;
    
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
    btn.style.color = 'black';
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
    btn.onclick = function(e) {
        e.stopPropagation();
        handleObjectDeletionFromKeyboard(object);
        const deleteBtn = document.getElementById('modelDeleteButton');
        if (deleteBtn) deleteBtn.remove();
    };
    
    // Удаляем кнопку при клике вне её
    setTimeout(() => {
        document.addEventListener('mousedown', onOutsideClick, { once: true });
    }, 0);
    function onOutsideClick(e) {
        const deleteBtn = document.getElementById('modelDeleteButton');
        if (deleteBtn && !deleteBtn.contains(e.target)) deleteBtn.remove();
    }
    
    document.body.appendChild(btn);
}

/**
 * Обрабатывает удаление объекта при использовании клавиатуры
 * @param {THREE.Object3D} object - Объект для удаления
 */
async function handleObjectDeletionFromKeyboard(object) {
    if (!object) return;
    
    // Сохраняем имя модели перед удалением
    const modelName = object.userData.modelName;
    
    // Удаляем объект
    const { removeObject } = await import('../objects.js');
    removeObject(object);
    
    // Обновляем количество в сайдбаре
    if (modelName) {
        try {
            const { updateModelQuantityOnRemove } = await import('./dragAndDrop.js');
            updateModelQuantityOnRemove(modelName);
        } catch (error) {
            console.error('Ошибка при обновлении количества модели:', error);
        }
    }
    
    // Сбрасываем выбранный объект
    selectedObject = null;
}
