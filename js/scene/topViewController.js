/**
 * Контроллер для управления камерой в режиме вида сверху
 */
import * as THREE from 'three';
import { TOP_VIEW_SETTINGS } from '../config.js';

// Переменные для управления камерой в режиме вида сверху
let isDragging = false;
let startPosition = { x: 0, y: 0 };
let canvasElement = null;
let camera = null;
let zoomLevel = 1.0;
let initialHeight = 0;
let cameraTarget = new THREE.Vector3(0, 0, 0);

// Обработчики событий
let mouseMoveHandler = null;
let mouseDownHandler = null;
let mouseUpHandler = null;
let wheelHandler = null;

/**
 * Инициализирует контроллер вида сверху
 * @param {HTMLElement} canvas - HTML-элемент canvas
 * @param {THREE.Camera} sceneCamera - Камера сцены
 * @param {Number} height - Высота камеры над сценой
 */
export function initTopViewController(canvas, sceneCamera, height) {
    console.log("Инициализация контроллера вида сверху");
    
    // Сохраняем ссылки на canvas и камеру
    canvasElement = canvas;
    camera = sceneCamera;
    initialHeight = height;
    
    // Устанавливаем начальную позицию камеры
    resetCamera(height);
    
    // Удаляем старые обработчики, если они есть
    cleanupEventListeners();
    
    // Создаем новые обработчики
    mouseDownHandler = handleMouseDown;
    mouseMoveHandler = handleMouseMove;
    mouseUpHandler = handleMouseUp;
    wheelHandler = handleWheel;
    
    // Добавляем обработчики
    canvasElement.addEventListener('mousedown', mouseDownHandler);
    canvasElement.addEventListener('mousemove', mouseMoveHandler);
    canvasElement.addEventListener('mouseup', mouseUpHandler);
    canvasElement.addEventListener('mouseleave', mouseUpHandler);
    canvasElement.addEventListener('wheel', wheelHandler, { passive: false });
    
    // Предотвращаем контекстное меню при правом клике для возможности перемещения камеры
    canvasElement.addEventListener('contextmenu', (event) => event.preventDefault());
    
    console.log("Контроллер вида сверху инициализирован");
}

/**
 * Сбрасывает положение камеры
 * @param {Number} height - Высота камеры над сценой
 */
function resetCamera(height) {
    if (!camera) return;
    
    // Устанавливаем камеру точно над центром сцены
    camera.position.set(0, height, 0);
    cameraTarget.set(0, 0, 0);
    camera.lookAt(cameraTarget);
    zoomLevel = 1.0;
    
    // Убедимся, что камера смотрит строго вниз - это важно для фиксации размерной сетки
    camera.up.set(0, 0, -1); // Устанавливаем вектор up для камеры, чтобы она была правильно ориентирована
}

// Флаг, указывающий, что в данный момент перемещается объект
let objectBeingDragged = false;

/**
 * Устанавливает флаг перемещения объекта
 * @param {Boolean} isDragging - Значение флага
 */
export function setObjectDraggingState(isDragging) {
    objectBeingDragged = isDragging;
}

/**
 * Получает текущее состояние перемещения объекта
 * @returns {Boolean} Состояние флага перемещения объекта
 */
export function getObjectDraggingState() {
    return objectBeingDragged;
}

/**
 * Обработчик нажатия кнопки мыши
 * @param {MouseEvent} event - Событие нажатия мыши
 */
function handleMouseDown(event) {
    // В режиме вида сверху левая кнопка мыши полностью доступна для взаимодействия с объектами
    // Мы не блокируем её, чтобы позволить перемещение объектов
    
    // Используем правую кнопку мыши (кнопка 2) для панорамирования, так же как в обычном режиме
    if (event.button === 2 && !objectBeingDragged) {
        isDragging = true;
        startPosition = { x: event.clientX, y: event.clientY };
        canvasElement.style.cursor = 'grabbing';
    }
}

/**
 * Обработчик движения мыши
 * @param {MouseEvent} event - Событие движения мыши
 */
function handleMouseMove(event) {
    // Если не в режиме перетаскивания камеры или перемещается объект, игнорируем
    if (!isDragging || !camera || objectBeingDragged) return;
    
    // Вычисляем смещение мыши по обеим осям для перемещения в горизонтальной плоскости
    const deltaX = event.clientX - startPosition.x;
    const deltaY = event.clientY - startPosition.y;
    
    // Настраиваем перемещение идентично обычному режиму
    // В обычном режиме используется panSpeed = 1.0 и screenSpacePanning = true
    // Имитируем это поведение с учетом высоты камеры
    
    // Используем фиксированную скорость панорамирования как в основном режиме
    // Интенсивность движения должна быть одинаковой в обоих режимах
    
    // Вместо TOP_VIEW_SETTINGS.panSpeed используем фиксированное значение 1.0
    const panSpeed = 1.0;
    
    // Рассчитываем масштаб движения аналогично OrbitControls
    // Формула взята из реализации панорамирования в OrbitControls
    const moveScale = (panSpeed * 0.3) / camera.position.y;
    
    // Перемещаем камеру в горизонтальной плоскости (X и Z координаты)
    // Направление движения имитирует screenSpacePanning = true из OrbitControls
    camera.position.x -= deltaX * moveScale;
    camera.position.z -= deltaY * moveScale;
    
    // Перемещаем точку, на которую смотрит камера, соответственно
    cameraTarget.x -= deltaX * moveScale;
    cameraTarget.z -= deltaY * moveScale;
    
    // Важно: Сохраняем Y-координату цели камеры равной 0, чтобы всегда смотреть сверху вниз
    cameraTarget.y = 0;
    
    // Обновляем направление камеры - камера всегда смотрит вертикально вниз
    camera.lookAt(cameraTarget);
    
    // Обновляем начальную позицию
    startPosition = { x: event.clientX, y: event.clientY };
}

/**
 * Обработчик отпускания кнопки мыши
 */
function handleMouseUp() {
    isDragging = false;
    canvasElement.style.cursor = 'default';
}

/**
 * Обработчик прокрутки колесика мыши
 * @param {WheelEvent} event - Событие прокрутки колесика
 */
function handleWheel(event) {
    event.preventDefault();
    
    if (!camera) return;
    
    // Определяем направление и величину зума
    const zoomDirection = Math.sign(event.deltaY);
    
    // Используем настройку zoomSpeed из конфигурации
    const zoomAmount = 0.05 * zoomDirection * TOP_VIEW_SETTINGS.zoomSpeed;
    
    // Обновляем уровень зума с ограничениями из конфигурации
    zoomLevel = Math.max(
        TOP_VIEW_SETTINGS.minZoom, 
        Math.min(TOP_VIEW_SETTINGS.maxZoom, zoomLevel + zoomAmount)
    );
    
    // Применяем новую высоту камеры
    camera.position.y = initialHeight * zoomLevel;
    
    // Сохраняем точку, на которую смотрит камера
    camera.lookAt(cameraTarget);
}

/**
 * Очищает обработчики событий
 */
export function cleanupEventListeners() {
    console.log("Очистка обработчиков событий контроллера вида сверху");
    
    if (!canvasElement) return;
    
    // Удаляем старые обработчики, если они есть
    if (mouseDownHandler) {
        canvasElement.removeEventListener('mousedown', mouseDownHandler);
    }
    
    if (mouseMoveHandler) {
        canvasElement.removeEventListener('mousemove', mouseMoveHandler);
    }
    
    if (mouseUpHandler) {
        canvasElement.removeEventListener('mouseup', mouseUpHandler);
        canvasElement.removeEventListener('mouseleave', mouseUpHandler);
    }
    
    if (wheelHandler) {
        canvasElement.removeEventListener('wheel', wheelHandler);
    }
    
    // Сбрасываем обработчики
    mouseDownHandler = null;
    mouseMoveHandler = null;
    mouseUpHandler = null;
    wheelHandler = null;
    
    // Сбрасываем стиль курсора
    if (canvasElement) {
        canvasElement.style.cursor = 'default';
    }
    
    console.log("Обработчики событий контроллера вида сверху очищены");
}
