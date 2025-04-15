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
    });
    
    // Обработчик отпускания клавиш (если понадобится в будущем)
    document.addEventListener('keyup', (event) => {
        // Пока пусто, но можно добавить функциональность при необходимости
    });
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
 * Сбрасывает состояние выбранного объекта
 */
export function resetObjectSelection() {
    selectedObject = null;
    isDragging = false;
    isRotating = false;
}

/**
 * Функция для установки текущего выбранного объекта
 * @param {THREE.Object3D} object - Выбранный объект
 */
export function setSelectedObject(object) {
    selectedObject = object;
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
