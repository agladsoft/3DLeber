/**
 * Модуль для управления камерой, её анимациями и режимами просмотра
 */
import { CAMERA_SETTINGS, TOP_VIEW_SETTINGS } from '../config.js';
import { easeInOutCubic } from '../utils.js';
import { initTopViewController, cleanupEventListeners } from './topViewController.js';
import * as THREE from 'three';
import { MOUSE } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ground } from '../playground/playgroundCore.js';

// Экспортируем переменные для доступа из других модулей
export let camera;
export let controls;
export let isTopViewActive = false;
export let renderer;

// Переменная для защиты от повторных вызовов
let isToggling = false;

/**
 * Создает и настраивает камеру и её элементы управления
 * @param {THREE.WebGLRenderer} rendererInstance - Рендерер
 * @returns {Promise<Object>} Объект, содержащий камеру и её контролы
 */
export async function setupCamera(rendererInstance) {
    // Сохраняем ссылку на renderer
    renderer = rendererInstance;
    
    // Получаем настройки камеры из БД
    let cameraSettings = {
        fov: CAMERA_SETTINGS.fov,
        near: 0.1,
        far: 1000
    };
    
    try {
        const climateZone = localStorage.getItem('selectedClimateZone') || 'russia_cis';
        const hdriPath = localStorage.getItem('selectedHdriPath') || 'textures/hdri/autumn_park_4k.exr';
        const surfaceName = localStorage.getItem('selectedSurfaceName') || 'Трава';
        
        const { getCameraSettings } = await import('../api/climate.js');
        const dbSettings = await getCameraSettings(climateZone, hdriPath, surfaceName);
        
        if (dbSettings) {
            cameraSettings = dbSettings;
            console.log('📷 Настройки камеры загружены из БД:', {
                fov: cameraSettings.fov,
                near: cameraSettings.near,
                far: cameraSettings.far,
                climateZone,
                hdri: hdriPath,
                surface: surfaceName
            });
        }
    } catch (error) {
        console.warn('Не удалось загрузить настройки камеры из БД, используем дефолтные:', error);
    }
    
    // Создание и настройка камеры с настройками из БД
    camera = new THREE.PerspectiveCamera(
        cameraSettings.fov,
        window.innerWidth / window.innerHeight,
        cameraSettings.near,
        cameraSettings.far
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
 * @param {Boolean} fromToggleTopView - Флаг, указывающий что функция вызвана из toggleTopView
 */
export function resetCameraView(width, length, fromToggleTopView = false) {
    // Всегда скрываем размерную сетку при сбросе вида, независимо от режима
    import('../scene/gridManager.js').then(gridManagerModule => {
        gridManagerModule.toggleDimensionGridVisibility(false);
    });
    
    // Если активен режим вида сверху, но мы не вызываем disableTopView()
    // для избежания двойной анимации (только если не вызвано из toggleTopView)
    if (isTopViewActive && !fromToggleTopView) {
        console.log('Сброс вида из режима вида сверху напрямую');
        
        // В новой реализации мы не блокируем левую кнопку мыши
        // поэтому нет необходимости удалять обработчики
        
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
        console.log("Вид камеры сброшен")
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
    console.log('=== TOGGLE TOP VIEW CALLED ===');
    console.log('isToggling:', isToggling);
    console.log('isTopViewActive:', isTopViewActive);
    console.log('Stack trace:', new Error().stack);
    
    // Защита от повторных вызовов
    if (isToggling) {
        console.log('toggleTopView уже выполняется, игнорируем повторный вызов');
        return isTopViewActive;
    }
    
    isToggling = true;
    
    try {
        // Проверяем, есть ли уже сетка
        const hasGrid = window.app && window.app.gridHelper;
        
        // Если сетка уже есть, но состояние показывает, что её нет - исправляем состояние
        if (hasGrid && !isTopViewActive) {
            isTopViewActive = true;
        }
        
        console.log('Текущее состояние перед переключением:', isTopViewActive);
        
        // Инвертируем состояние
        isTopViewActive = !isTopViewActive;
                
        if (isTopViewActive) {
            console.log('Включаем вид сверху...');
            // Включаем вид сверху
            enableTopView(width, length);
        } else {
            console.log('Выключаем вид сверху...');
            // Выключаем вид сверху
            disableTopView();
            
            // Всегда используем resetCameraView для выхода из вида сверху
            resetCameraView(width, length, true);
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
        
        console.log('=== TOGGLE TOP VIEW COMPLETED ===');
        console.log('Final state:', isTopViewActive);
        
        return isTopViewActive;
    } catch (error) {
        // В случае ошибки, обеспечиваем безопасность и возвращаем текущее состояние
        console.error('Ошибка в toggleTopView:', error);
        return isTopViewActive;
    } finally {
        // Всегда снимаем блокировку
        setTimeout(() => {
            isToggling = false;
        }, 100);
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
            // Теперь ищем кнопку exportModel вместо topView
            const exportButton = document.getElementById("exportModel");
            
            if (exportButton) {
                if (isActive) {
                    exportButton.classList.add("active");
                } else {
                    exportButton.classList.remove("active");
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
        console.log('Ошибка при обновлении стиля кнопки:', error);
    }
}

/**
 * Включение режима вида сверху
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 */
function enableTopView(width, length) {
    console.log("Включаем режим вида сверху, размеры площадки:", width, "x", length);
    
    // Перемещаем камеру для вида сверху
    const diagonal = Math.sqrt(width * width + length * length);
    // Используем множитель высоты из конфигурации
    const targetHeight = diagonal * TOP_VIEW_SETTINGS.heightMultiplier;
        
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
        // В режиме вида сверху левая кнопка мыши используется для взаимодействия с объектами
        // Мы не блокируем её, позволяя объектам перемещаться
        // Панорамирование камеры выполняется правой кнопкой мыши в topViewController
        
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
            }
        });
        
    });
}

/**
 * Выключение режима вида сверху (без анимации)
 */
function disableTopView() {
    console.log("Выключение режима вида сверху");
    
    // В новой реализации мы не блокируем левую кнопку мыши
    // поэтому нет необходимости удалять обработчики
    
    // Удаляем размерную сетку через gridManager
    import('../scene/gridManager.js').then(gridManagerModule => {
        gridManagerModule.toggleDimensionGridVisibility(false);
        console.log("Размерная сетка скрыта");
    });
    
    // Удаляем сетку и очищаем ресурсы
    cleanupGridHelper();
    
    // Очищаем обработчики нашего контроллера вида сверху
    cleanupEventListeners();
    
    // Восстанавливаем настройки камеры
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
    
    // Восстанавливаем стандартные ограничения камеры
    controls.minDistance = CAMERA_SETTINGS.minDistance;
    controls.maxDistance = CAMERA_SETTINGS.maxDistance;
    controls.minPolarAngle = CAMERA_SETTINGS.minPolarAngle;
    controls.maxPolarAngle = CAMERA_SETTINGS.maxPolarAngle;
    
    console.log("Режим вида сверху выключен");
}

/**
 * Очищает сетку и связанные с ней ресурсы
 */
function cleanupGridHelper() {
    // Функция оставлена для совместимости, но больше не удаляет сетку
    console.log("cleanupGridHelper вызвана, но сетка не удаляется (функционал отключен)");
}

/**
 * Обновляет настройки камеры из базы данных
 * @param {string} climateZone - Климатическая зона
 * @param {string} [hdriPath] - Путь к HDRI файлу (опционально)
 * @param {string} [surfaceName] - Название поверхности (опционально)
 * @returns {Promise<boolean>} true если настройки были применены, false если нет
 */
export async function updateCameraSettings(climateZone, hdriPath = null, surfaceName = null) {
    if (!camera) {
        console.warn('Камера не инициализирована, невозможно обновить настройки');
        return false;
    }
    
    try {
        // Используем переданные параметры или берем из localStorage
        const actualHdriPath = hdriPath || localStorage.getItem('selectedHdriPath') || 'textures/hdri/autumn_park_4k.exr';
        const actualSurfaceName = surfaceName || localStorage.getItem('selectedSurfaceName') || 'Трава';
        
        const { getCameraSettings } = await import('../api/climate.js');
        const settings = await getCameraSettings(climateZone, actualHdriPath, actualSurfaceName);
        
        if (settings) {
            // Обновляем FOV камеры
            camera.fov = settings.fov;
            camera.near = settings.near;
            camera.far = settings.far;
            
            // Обновляем проекционную матрицу для применения изменений
            camera.updateProjectionMatrix();
            
            console.log('📷 Обновлены настройки камеры:', {
                fov: settings.fov,
                near: settings.near,
                far: settings.far,
                climateZone,
                hdri: actualHdriPath,
                surface: actualSurfaceName
            });
            return true;
        }
        
        return false;
    } catch (error) {
        console.warn('Не удалось обновить настройки камеры:', error);
        return false;
    }
}