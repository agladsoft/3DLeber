/**
 * Модуль для управления камерой, её анимациями и режимами просмотра
 */
import { CAMERA_SETTINGS, TOP_VIEW_SETTINGS } from '../config.js';
import { showNotification } from '../utils.js';
import { easeInOutCubic } from './sceneCore.js';
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
    controls.minDistance = CAMERA_SETTINGS.minDistance; // Минимальное расстояние камеры от цели
    controls.maxDistance = CAMERA_SETTINGS.maxDistance; // Максимальное расстояние камеры от цели
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
    
    // Настраиваем элементы управления OrbitControls для мыши
    controls.mouseButtons = {
        LEFT: MOUSE.ROTATE,     // Левая кнопка - вращение камеры вокруг цели
        MIDDLE: MOUSE.DOLLY,    // Средняя кнопка - зум
        RIGHT: MOUSE.PAN        // Правая кнопка - панорамирование (перемещение камеры)
    };
    
    // Настраиваем панорамирование (движение камеры)
    controls.enablePan = true;
    controls.keyPanSpeed = 0.3; // Скорость панорамирования с клавиатуры
    
    // Настраиваем параметры панорамирования камеры
    controls.panSpeed = 1.0;     // Скорость панорамирования камеры (стандартное значение)
    controls.screenSpacePanning = true; // Если true, панорамирование происходит в плоскости экрана
    
    // Дополнительные ограничения на панорамирование
    // Рассчитываем максимальные границы панорамирования в зависимости от размера площадки
    let maxPanBounds = 50; // Значение по умолчанию, если нет размеров площадки
    
    // Добавляем только обработчик для отключения контекстного меню
    renderer.domElement.addEventListener('contextmenu', (event) => {
        // Предотвращаем появление контекстного меню
        event.preventDefault();
    });
    
    // Добавляем ограничения на перемещение камеры и зум
    controls.addEventListener('change', () => {
        // Определяем минимальную допустимую высоту камеры
        let minY = 1.0;
        if (ground && ground.position && ground.userData && typeof ground.userData.originalHeight === 'number') {
            minY = ground.position.y + (ground.userData.originalHeight * ground.scale.y) + 0.5;
        }
        
        // Ограничение минимальной высоты камеры
        if (camera.position.y < minY) {
            camera.position.y = minY;
        }
        
        // Динамическое обновление максимального расстояния от центра сцены
        if (window.app && window.app.playgroundWidth && window.app.playgroundLength) {
            // Рассчитываем максимальное расстояние на основе размеров площадки
            const diagonal = Math.sqrt(Math.pow(window.app.playgroundWidth, 2) + Math.pow(window.app.playgroundLength, 2));
            // Устанавливаем максимальное расстояние камеры от центра - увеличено для большего отдаления
            controls.maxDistance = diagonal * 6;
            
            // Ограничиваем перемещение точки фокуса камеры - также увеличено
            const maxOffset = diagonal * 3; // Максимальное смещение от центра
            
            // Проверяем расстояние от центра до цели камеры в горизонтальной плоскости
            const targetDistFromCenter = Math.sqrt(Math.pow(controls.target.x, 2) + Math.pow(controls.target.z, 2));
            if (targetDistFromCenter > maxOffset) {
                // Если точка слишком далеко от центра, нормализуем вектор и умножаем на максимальное расстояние
                const ratio = maxOffset / targetDistFromCenter;
                controls.target.x *= ratio;
                controls.target.z *= ratio;
            }
        } else {
            // Если нет данных о размере площадки, устанавливаем большое значение по умолчанию
            controls.maxDistance = 200;
        }
        
        // Ограничение на высоту точки фокуса камеры
        if (controls.target.y < 0) {
            controls.target.y = 0;
        }
    });
    // Добавляем визуальную обратную связь при панорамировании
    renderer.domElement.addEventListener('mousedown', (event) => {
        if (event.button === 2) { // Правая кнопка мыши
            renderer.domElement.style.cursor = 'move';
        }
    });
    
    renderer.domElement.addEventListener('mouseup', (event) => {
        if (event.button === 2) {
            renderer.domElement.style.cursor = 'auto';
        }
    });
    
    // Сброс курсора при выходе за пределы окна
    renderer.domElement.addEventListener('mouseleave', () => {
        renderer.domElement.style.cursor = 'auto';
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
    // Всегда скрываем размерную сетку при сбросе вида, независимо от режима
    import('../scene/gridManager.js').then(gridManagerModule => {
        gridManagerModule.toggleDimensionGridVisibility(false);
    });
    
    // Если активен режим вида сверху, но мы не вызываем disableTopView()
    // для избежания двойной анимации
    if (isTopViewActive) {
        console.log('Сброс вида из режима вида сверху напрямую');
        
        // Очищаем обработчики вручную без запуска анимации
        if (window.topViewLeftClickHandler) {
            document.removeEventListener('mousedown', window.topViewLeftClickHandler, true);
            window.topViewLeftClickHandler = null;
        }
        
        // Очищаем обработчики вида сверху
        cleanupEventListeners();
        
        // Обновляем состояние и уведомляем другие модули
        isTopViewActive = false;
        if (window.app) {
            window.app.isTopViewActive = false;
        }
        
        // Обновляем стиль кнопки вида сверху
        updateTopViewButtonStyle(false);
    }
    
    // Восстанавливаем стандартные ограничения камеры
    controls.minDistance = CAMERA_SETTINGS.minDistance;
    controls.maxDistance = CAMERA_SETTINGS.maxDistance;
    controls.minPolarAngle = CAMERA_SETTINGS.minPolarAngle;
    controls.maxPolarAngle = CAMERA_SETTINGS.maxPolarAngle;
    controls.enableRotate = true;
    
    // Восстанавливаем стандартный вектор up для камеры
    camera.up.set(0, 1, 0);
    
    // Включаем стандартные элементы управления
    controls.enabled = true;
    
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
            
            // Вызываем resetCameraView для перемещения к стандартному виду,
            // точно так же, как при нажатии кнопки "Сбросить вид"
            resetCameraView(width, length);
        }
        
        // Обновляем глобальное состояние
        if (window.app) {
            window.app.isTopViewActive = isTopViewActive;
        }
        
        // Управляем отображением размерной сетки
        import('../scene/gridManager.js').then(gridManagerModule => {
            // Получаем цвет площадки, если доступен
            let groundColor = 'серый';
            if (window.app && window.app.ground && window.app.ground.userData && window.app.ground.userData.groundColor) {
                groundColor = window.app.ground.userData.groundColor;
            } else if (ground && ground.userData && ground.userData.groundColor) {
                groundColor = ground.userData.groundColor;
            }
            
            gridManagerModule.handleTopViewToggle(isTopViewActive, width, length, groundColor);
        });
        
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
    
    // Код создания сетки удален - теперь вид сверху работает без сетки
    console.log("Вид сверху активирован без сетки");
    
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
        // Добавляем обработчик для левой кнопки мыши, чтобы блокировать стандартное поведение
        const leftClickHandler = (event) => {
            if (event.button === 0) {
                // Предотвращаем стандартные действия при нажатии левой кнопки мыши
                // Но разрешаем выделение объектов
                if (!window.objectBeingDragged) {
                    event.stopPropagation();
                }
            }
        };
        
        // Добавляем обработчик на документ
        document.addEventListener('mousedown', leftClickHandler, true);
        
        // Сохраняем ссылку на обработчик для последующего удаления
        window.topViewLeftClickHandler = leftClickHandler;
        
        // Полностью ОТКЛЮЧАЕМ стандартные OrbitControls
        controls.enabled = false;
        
        // Инициализируем наш собственный контроллер для вида сверху
        const canvasElement = renderer.domElement;
        
        // Активируем контроллер вида сверху
        initTopViewController(canvasElement, camera, targetHeight);
        
        // Добавляем создание увеличенной размерной сетки
        import('../scene/gridManager.js').then(gridManagerModule => {
            // Получаем цвет площадки, если доступен
            let groundColor = 'серый';
            if (window.app && window.app.ground && window.app.ground.userData && window.app.ground.userData.groundColor) {
                groundColor = window.app.ground.userData.groundColor;
            } else if (ground && ground.userData && ground.userData.groundColor) {
                groundColor = ground.userData.groundColor;
            }
            
            // Создаем размерную сетку, увеличенную на 10%
            gridManagerModule.createDimensionGrid(width, length, groundColor, true);
            
            // Дополнительно устанавливаем свойства для предотвращения исчезновения сетки
            if (gridManagerModule.dimensionGrid) {
                // Устанавливаем дополнительные свойства для сетки
                gridManagerModule.dimensionGrid.userData.isTopViewGrid = true; // Добавляем пометку
                gridManagerModule.dimensionGrid.layers.set(1); // Устанавливаем в особый слой
                
                // Добавляем фиксацию размерной сетки, чтобы она не вращалась
                gridManagerModule.dimensionGrid.matrixAutoUpdate = false; // Отключаем автоматическое обновление матрицы
                
                // Информируем в консоли, что сетка зафиксирована
                console.log(`[GRID] Размерная сетка зафиксирована для режима вида сверху`);
            }
        });
        
        showNotification("Вид сверху активирован. Используйте правую кнопку мыши для перемещения по площадке и колесико для масштабирования.", false);
    });
}

/**
 * Выключение режима вида сверху (без анимации)
 */
function disableTopView() {
    console.log("Выключение режима вида сверху (без анимации)");
    
    // Удаляем обработчик левой кнопки мыши, если он был добавлен
    if (window.topViewLeftClickHandler) {
        document.removeEventListener('mousedown', window.topViewLeftClickHandler, true);
        window.topViewLeftClickHandler = null;
        console.log("Обработчик левой кнопки мыши удален");
    }
    
    // Удаляем сетку и очищаем ресурсы
    cleanupGridHelper();
    
    // Обновляем стиль кнопки
    updateTopViewButtonStyle(false);
    
    // Очищаем обработчики нашего контроллера вида сверху
    cleanupEventListeners();
    
    // Восстанавливаем настройки камеры без анимации
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
    
    // Восстанавливаем стандартный вектор up для камеры
    camera.up.set(0, 1, 0);
    
    // Восстанавливаем ограничения камеры из сохраненного состояния
    if (previousCameraState) {
        controls.minDistance = previousCameraState.minDistance;
        controls.maxDistance = previousCameraState.maxDistance;
        controls.minPolarAngle = previousCameraState.minPolarAngle;
        controls.maxPolarAngle = previousCameraState.maxPolarAngle;
    } else {
        // Если нет сохраненного состояния, используем стандартные настройки
        controls.minDistance = CAMERA_SETTINGS.minDistance;
        controls.maxDistance = CAMERA_SETTINGS.maxDistance;
        controls.minPolarAngle = CAMERA_SETTINGS.minPolarAngle;
        controls.maxPolarAngle = CAMERA_SETTINGS.maxPolarAngle;
    }
}



/**
 * Очищает сетку и связанные с ней ресурсы
 */
function cleanupGridHelper() {
    // Функция оставлена для совместимости, но больше не удаляет сетку
    console.log("cleanupGridHelper вызвана, но сетка не удаляется (функционал отключен)");
}