/**
 * Модуль для управления камерой, её анимациями и режимами просмотра
 */
import { CAMERA_SETTINGS, TOP_VIEW_SETTINGS } from '../config.js';
import { showNotification } from '../utils.js';
import { createGrid } from './gridManager.js';
import { scene, easeInOutCubic } from './sceneCore.js';
import { initTopViewController, cleanupEventListeners } from './topViewController.js';
import * as THREE from 'three';
import { MOUSE } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ground } from '../playground/playgroundCore.js';

// Экспортируем переменные для доступа из других модулей
export let camera;
export let controls;
export let isTopViewActive = false;
export let previousCameraState = null;
export let renderer;

// Храним ссылку на функцию-обработчик
let cameraChangeHandler = null;

// Переменные для пользовательского управления камерой в режиме вида сверху
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let canvasElement = null;
let mouseMoveHandler = null;
let mouseDownHandler = null;
let mouseUpHandler = null;

/**
 * Создает и настраивает камеру и её элементы управления
 * @param {THREE.WebGLRenderer} rendererInstance - Рендерер
 * @returns {Object} Объект, содержащий камеру и её контролы
 */
export function setupCamera(rendererInstance) {
    // Сохраняем ссылку на renderer
    renderer = rendererInstance;
    // Создание и настройка камеры
    camera = new THREE.PerspectiveCamera(
        CAMERA_SETTINGS.fov,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    
    // Устанавливаем начальную позицию камеры
    camera.position.set(
        CAMERA_SETTINGS.initialPosition.x,
        CAMERA_SETTINGS.initialPosition.y,
        CAMERA_SETTINGS.initialPosition.z
    );
    
    // Камера смотрит на центр сцены
    camera.lookAt(
        CAMERA_SETTINGS.lookAt.x,
        CAMERA_SETTINGS.lookAt.y,
        CAMERA_SETTINGS.lookAt.z
    );
    
    // Настройка OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    
    // Настройки демпфирования для более плавного движения
    controls.enableDamping = CAMERA_SETTINGS.enableDamping;
    controls.dampingFactor = CAMERA_SETTINGS.dampingFactor;
    
    // Настройки зуммирования
    // controls.minDistance = CAMERA_SETTINGS.minDistance;
    // controls.maxDistance = CAMERA_SETTINGS.maxDistance;
    controls.zoomSpeed = CAMERA_SETTINGS.zoomSpeed;
    
    // Настройки углов обзора
    controls.maxPolarAngle = CAMERA_SETTINGS.maxPolarAngle;
    controls.minPolarAngle = CAMERA_SETTINGS.minPolarAngle;
    
    // Установка центральной точки, вокруг которой вращается камера
    controls.target.set(
        CAMERA_SETTINGS.lookAt.x,
        CAMERA_SETTINGS.lookAt.y,
        CAMERA_SETTINGS.lookAt.z
    );
    
    // Отключаем стандартные элементы управления OrbitControls для правой кнопки
    controls.mouseButtons = {
        LEFT: MOUSE.ROTATE,     // Левая кнопка - вращение камеры вокруг цели
        MIDDLE: MOUSE.DOLLY,    // Средняя кнопка - зум
        RIGHT: MOUSE.ROTATE     // Устанавливаем любое значение, чтобы OrbitControls не конфликтовал
    };
    
    // Отключаем панорамирование (движение сцены)
    controls.enablePan = false;
    controls.keyPanSpeed = 0;
    
    // Добавляем кастомное управление камерой с помощью правой кнопки мыши
    // Скорость движения камеры
    const cameraMoveSpeed = 0.05;
    
    // Переменные для отслеживания правой кнопки мыши
    let rightMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    
    // Добавляем обработчики событий мыши на холсте
    renderer.domElement.addEventListener('contextmenu', (event) => {
        // Предотвращаем появление контекстного меню
        event.preventDefault();
    });
    
    renderer.domElement.addEventListener('mousedown', (event) => {
        // Проверяем, что это правая кнопка мыши (2)
        if (event.button === 2) {
            rightMouseDown = true;
            prevMouseX = event.clientX;
            prevMouseY = event.clientY;
        }
    });
    
    renderer.domElement.addEventListener('mouseup', (event) => {
        if (event.button === 2) {
            rightMouseDown = false;
        }
    });
    
    renderer.domElement.addEventListener('mousemove', (event) => {
        if (rightMouseDown) {
            // Вычисляем разницу в позиции мыши
            const deltaX = event.clientX - prevMouseX;
            const deltaY = event.clientY - prevMouseY;
            
            // Получаем текущее направление камеры
            const forward = new THREE.Vector3();
            camera.getWorldDirection(forward);
            
            // Вычисляем вектор вправо относительно камеры (перпендикулярно к направлению взгляда)
            const right = new THREE.Vector3();
            right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
            
            // Вектор вверх (для вертикального движения используем мировую ось Y)
            const up = new THREE.Vector3(0, 1, 0);
            
            // Создаем копии векторов для перемещения
            const rightMove = right.clone().multiplyScalar(-deltaX * cameraMoveSpeed);
            const upMove = up.clone().multiplyScalar(deltaY * cameraMoveSpeed);
            
            // Перемещаем камеру горизонтально относительно ее направления
            camera.position.add(rightMove);
            
            // Перемещаем камеру вертикально по мировой оси Y
            camera.position.add(upMove);
            
            // Перемещаем точку фокуса камеры на то же расстояние
            // создание новых копий векторов для перемещения
            controls.target.add(right.clone().multiplyScalar(-deltaX * cameraMoveSpeed));
            controls.target.add(up.clone().multiplyScalar(deltaY * cameraMoveSpeed));
            
            // Обновляем предыдущие координаты мыши
            prevMouseX = event.clientX;
            prevMouseY = event.clientY;
            
            // Обновляем контролы
            controls.update();
        }
    });
    
    // Обработчик для прекращения перемещения, если мышь покидает окно
    renderer.domElement.addEventListener('mouseout', () => {
        rightMouseDown = false;
    });
    
    // Ограничение: не позволяем камере опускаться ниже верхней поверхности площадки
    controls.addEventListener('update', () => {
        let minY = 0.1;
        if (ground && ground.position && ground.userData && typeof ground.userData.originalHeight === 'number') {
            minY = ground.position.y + (ground.userData.originalHeight * ground.scale.y) + 0.05;
        }
        if (camera.position.y < minY) {
            camera.position.y = minY;
        }
    });
    
    return { camera, controls };
}

/**
 * Сброс вида камеры к исходному положению с анимацией
 * @param {Number} width - Ширина площадки для расчета позиции камеры
 * @param {Number} length - Длина площадки для расчета позиции камеры
 */
export function resetCameraView(width, length) {
    // Восстанавливаем стандартные ограничения камеры
    controls.minDistance = CAMERA_SETTINGS.minDistance;
    controls.maxDistance = CAMERA_SETTINGS.maxDistance;
    controls.minPolarAngle = CAMERA_SETTINGS.minPolarAngle;
    controls.maxPolarAngle = CAMERA_SETTINGS.maxPolarAngle;
    controls.enableRotate = true;
    
    // Параметры для анимации
    const targetDistance = width > length ? width * 1.5 : length * 1.5; // Целевое расстояние
    const targetPosition = {
        x: 0,
        y: targetDistance * 0.8, // Поднимаем камеру вверх
        z: targetDistance        // Отдаляем камеру
    };
    const targetLookAt = { x: 0, y: 0, z: 0 }; // Центр сцены
    
    // Анимируем перемещение камеры к целевой позиции
    animateCameraMove(targetPosition, targetLookAt, () => {
        showNotification("Вид камеры сброшен", false);
    });
}

/**
 * Анимирует перемещение камеры к указанной позиции и цели
 * @param {THREE.Vector3|Object} targetPosition - Конечная позиция камеры
 * @param {THREE.Vector3|Object} targetLookAt - Конечная цель камеры
 * @param {Function} callback - Функция, вызываемая по завершении анимации
 */
export function animateCameraMove(targetPosition, targetLookAt, callback) {
    // Создаем анимацию для плавного перемещения камеры
    const startTime = Date.now();
    const duration = 1000; // 1 секунда для анимации
    
    // Сохраняем начальные значения
    const startPosition = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
    };
    
    const startTarget = {
        x: controls.target.x,
        y: controls.target.y,
        z: controls.target.z
    };
    
    // Функция анимации
    const animateCamera = function() {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Используем функцию плавной анимации
        const easeProgress = easeInOutCubic(progress);
        
        // Обновляем позицию камеры
        camera.position.x = startPosition.x + (targetPosition.x - startPosition.x) * easeProgress;
        camera.position.y = startPosition.y + (targetPosition.y - startPosition.y) * easeProgress;
        camera.position.z = startPosition.z + (targetPosition.z - startPosition.z) * easeProgress;
        
        // Обновляем целевую точку камеры
        controls.target.x = startTarget.x + (targetLookAt.x - startTarget.x) * easeProgress;
        controls.target.y = startTarget.y + (targetLookAt.y - startTarget.y) * easeProgress;
        controls.target.z = startTarget.z + (targetLookAt.z - startTarget.z) * easeProgress;
        
        // Обновляем OrbitControls
        controls.update();
        
        // Продолжаем анимацию, если она не завершена
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        } else if (callback) {
            // Вызываем callback по завершении анимации
            callback();
        }
    };
    
    // Запускаем анимацию
    animateCamera();
}

/**
 * Включение/выключение вида сверху с сеткой
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @returns {Boolean} Новое состояние вида сверху (true - включен, false - выключен)
 */
export function toggleTopView(width, length) {
    try {
        // Проверяем, есть ли уже сетка
        const hasGrid = window.app && window.app.gridHelper;
        
        // Если сетка уже есть, но состояние показывает, что её нет - исправляем состояние
        if (hasGrid && !isTopViewActive) {
            isTopViewActive = true;
        }
        
        // Инвертируем состояние
        isTopViewActive = !isTopViewActive;
        
        if (isTopViewActive) {
            // Включаем вид сверху
            enableTopView(width, length);
        } else {
            // Выключаем вид сверху
            disableTopView();
        }
        
        // Обновляем глобальное состояние
        if (window.app) {
            window.app.isTopViewActive = isTopViewActive;
        }
        
        // Выполняем обновление стиля кнопки после переключения режима
        setTimeout(() => {
            updateTopViewButtonStyle(isTopViewActive);
        }, 0);
        
        return isTopViewActive;
    } catch (error) {
        // В случае ошибки, обеспечиваем безопасность и возвращаем текущее состояние
        return isTopViewActive;
    }
}

/**
 * Обновляет стиль кнопки вида сверху
 * @param {Boolean} isActive - Активен ли режим вида сверху
 */
function updateTopViewButtonStyle(isActive) {
    try {
        // Повторяем попытку найти кнопку несколько раз, с небольшой задержкой
        let attempts = 0;
        const maxAttempts = 3;
        
        function tryUpdateButton() {
            const topViewButton = document.getElementById("topView");
            
            if (topViewButton) {
                if (isActive) {
                    topViewButton.textContent = "Выйти из вида сверху";
                    topViewButton.classList.add("active");
                } else {
                    topViewButton.textContent = "🔝 Вид сверху (сетка 1×1м)";
                    topViewButton.classList.remove("active");
                }
            } else {
                if (attempts < maxAttempts) {
                    attempts++;
                    // Пробуем еще раз через небольшую задержку
                    setTimeout(tryUpdateButton, 100 * attempts);
                }
            }
        }
        
        // Начинаем попытки обновить кнопку
        tryUpdateButton();
    } catch (error) {
        // В случае ошибки просто продолжаем работу
    }
}

/**
 * Включение режима вида сверху
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 */
function enableTopView(width, length) {
    console.log("Включаем режим вида сверху, размеры площадки:", width, "x", length);
    
    // Сохраняем текущее состояние камеры для возврата
    previousCameraState = {
        position: camera.position.clone(),
        target: controls.target.clone(),
        minDistance: controls.minDistance,
        maxDistance: controls.maxDistance,
        minPolarAngle: controls.minPolarAngle,
        maxPolarAngle: controls.maxPolarAngle,
        enableRotate: controls.enableRotate
    };
    
    // Используем импортированную функцию createGrid напрямую
    console.log("Вызываем createGrid для создания сетки");
    try {
        // Создаем сетку
        const gridHelper = createGrid(width, length);
        
        // Сохраняем ссылку на сетку
        if (window.app) {
            window.app.gridHelper = gridHelper;
            console.log("Сохранена ссылка на сетку в window.app.gridHelper");
        }
    } catch (error) {
        console.error("Ошибка при создании сетки:", error);
    }
    
    // Перемещаем камеру для вида сверху
    const diagonal = Math.sqrt(width * width + length * length);
    // Используем множитель высоты из конфигурации
    const targetHeight = diagonal * TOP_VIEW_SETTINGS.heightMultiplier;
    
    console.log("Анимируем перемещение камеры в позицию сверху");
    
    // Анимируем переход к виду сверху
    animateCameraMove({
        x: 0,
        y: targetHeight,
        z: 0.1 // Небольшое смещение по Z для лучшего обзора
    }, {
        x: 0,
        y: 0,
        z: 0
    }, () => {
        // Полностью ОТКЛЮЧАЕМ стандартные OrbitControls
        controls.enabled = false;
        
        // Инициализируем наш собственный контроллер для вида сверху
        const canvasElement = renderer.domElement;
        
        // Активируем контроллер вида сверху
        initTopViewController(canvasElement, camera, targetHeight);
        
        showNotification("Вид сверху активирован. Используйте мышь для перемещения по площадке и колесико для масштабирования.", false);
    });
}

/**
 * Выключение режима вида сверху
 */
function disableTopView() {
    console.log("Выключение режима вида сверху");
    
    // Удаляем сетку и очищаем ресурсы
    cleanupGridHelper();
    
    // Обновляем стиль кнопки
    updateTopViewButtonStyle(false);
    
    // Очищаем обработчики нашего контроллера вида сверху
    cleanupEventListeners();
    
    // Возвращаемся к предыдущему виду
    if (previousCameraState) {
        console.log("Возвращаемся к предыдущему виду камеры");
        
        // Анимируем возврат к предыдущему виду
        animateCameraMove(
            previousCameraState.position,
            previousCameraState.target,
            () => {
                // Восстанавливаем настройки камеры
                controls.minDistance = previousCameraState.minDistance;
                controls.maxDistance = previousCameraState.maxDistance;
                controls.minPolarAngle = previousCameraState.minPolarAngle;
                controls.maxPolarAngle = previousCameraState.maxPolarAngle;
                
                // Включаем OrbitControls
                controls.enabled = true;
                controls.enableRotate = true;
                controls.enablePan = true;
                controls.enableDamping = CAMERA_SETTINGS.enableDamping;
                
                // Стандартные настройки кнопок мыши
                controls.mouseButtons = {
                    LEFT: MOUSE.ROTATE,
                    MIDDLE: MOUSE.DOLLY,
                    RIGHT: MOUSE.PAN
                };
                
                console.log("Восстановлены настройки камеры");
                showNotification("Вид сверху деактивирован.", false);
            }
        );
    } else {
        console.log("Предыдущее состояние камеры не найдено");
    }
}



/**
 * Очищает сетку и связанные с ней ресурсы
 */
function cleanupGridHelper() {
    console.log("Начинаем очистку сетки...");
    
    if (window.app && window.app.gridHelper) {
        console.log("Сетка найдена в window.app.gridHelper:", window.app.gridHelper);
        
        // Удаляем центральную ось, если она существует
        if (window.app.gridHelper.userData && window.app.gridHelper.userData.centerAxis) {
            console.log("Удаляем центральную ось");
            scene.remove(window.app.gridHelper.userData.centerAxis);
            window.app.gridHelper.userData.centerAxis = null;
        }
        
        // Удаляем саму сетку
        console.log("Удаляем сетку из сцены");
        scene.remove(window.app.gridHelper);
        
        // Освобождаем ресурсы
        if (window.app.gridHelper.geometry) {
            window.app.gridHelper.geometry.dispose();
        }
        
        if (window.app.gridHelper.material) {
            if (Array.isArray(window.app.gridHelper.material)) {
                window.app.gridHelper.material.forEach(mat => {
                    if (mat) mat.dispose();
                });
            } else {
                window.app.gridHelper.material.dispose();
            }
        }
        
        // Очищаем ссылку
        window.app.gridHelper = null;
        console.log("Сетка успешно удалена");
        
        // Проверяем, не осталось ли сеток на сцене
        let remainingGrids = 0;
        scene.traverse(obj => {
            if (obj.userData && obj.userData.isGridHelper) {
                remainingGrids++;
                console.log("Найдена оставшаяся сетка:", obj);
                // Удаляем найденные сетки
                scene.remove(obj);
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            }
        });
        
        if (remainingGrids > 0) {
            console.log(`Удалено еще ${remainingGrids} оставшихся сеток`);
        }
    } else {
        console.log("Сетка не найдена в window.app.gridHelper");
    }
}