/**
 * Инициализация и управление сценой, камерой и светом
 * Адаптирован для работы с Three.js
 */
import { 
    CAMERA_SETTINGS, 
    RENDERER_SETTINGS, 
    LIGHTING 
} from './config.js';
import { showNotification } from './utils.js';
import * as THREE from '/node_modules/three/build/three.module.js';
import { OrbitControls } from '/node_modules/three/examples/jsm/controls/OrbitControls.js';

// Глобальные переменные сцены, доступные для экспорта
export let canvas;
export let renderer;
export let scene;
export let camera;
export let controls;
export let gridHelper;
export let isTopViewActive = false;
export let previousCameraState = null;

/**
 * Инициализация основных компонентов сцены
 * @returns {Object} Объект, содержащий canvas, renderer, scene и camera
 */
export function initScene() {
    // Инициализация canvas и renderer (аналог engine в Babylon.js)
    canvas = document.getElementById("renderCanvas");
    
    // Создаем renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: RENDERER_SETTINGS.antialias,
        alpha: true
    });
    
    // Настройка renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(RENDERER_SETTINGS.pixelRatio);
    renderer.setClearColor(RENDERER_SETTINGS.clearColor);
    renderer.shadowMap.enabled = RENDERER_SETTINGS.shadowMapEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // мягкие тени
    
    // Создаем сцену
    scene = new THREE.Scene();
    
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
    
    // Настройка OrbitControls (аналог ArcRotateCamera)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = CAMERA_SETTINGS.enableDamping;
    controls.dampingFactor = CAMERA_SETTINGS.dampingFactor;
    controls.minDistance = CAMERA_SETTINGS.minDistance;
    controls.maxDistance = CAMERA_SETTINGS.maxDistance;
    controls.maxPolarAngle = CAMERA_SETTINGS.maxPolarAngle;
    controls.minPolarAngle = CAMERA_SETTINGS.minPolarAngle;
    controls.zoomSpeed = CAMERA_SETTINGS.zoomSpeed;
    controls.target.set(
        CAMERA_SETTINGS.lookAt.x,
        CAMERA_SETTINGS.lookAt.y,
        CAMERA_SETTINGS.lookAt.z
    );
    
    // Создание освещения
    createLighting();
    
    // Создание skybox
    createSkybox();
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        // Обновляем размер рендерера
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Обновляем соотношение сторон камеры
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
    
    return { canvas, renderer, scene, camera, controls };
}

/**
 * Создание освещения для сцены
 */
function createLighting() {
    // Создаем общее освещение (аналог HemisphericLight)
    const ambientLight = new THREE.AmbientLight(
        LIGHTING.ambientLight.color,
        LIGHTING.ambientLight.intensity
    );
    scene.add(ambientLight);
    
    // Создаем направленный свет (для теней)
    const directionalLight = new THREE.DirectionalLight(
        LIGHTING.directionalLight.color,
        LIGHTING.directionalLight.intensity
    );
    
    // Устанавливаем позицию света
    directionalLight.position.set(
        LIGHTING.directionalLight.position.x,
        LIGHTING.directionalLight.position.y,
        LIGHTING.directionalLight.position.z
    );
    
    // Настройка теней
    if (LIGHTING.directionalLight.castShadow) {
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        
        // Устанавливаем размер области теней
        const d = 50;
        directionalLight.shadow.camera.left = -d;
        directionalLight.shadow.camera.right = d;
        directionalLight.shadow.camera.top = d;
        directionalLight.shadow.camera.bottom = -d;
    }
    
    scene.add(directionalLight);
}

/**
 * Создание skybox для сцены
 */
function createSkybox() {
    // Загрузчик кубических текстур
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('textures/citybox/');
    
    // Загружаем текстуры для всех сторон skybox
    // Используем имена файлов с префиксом citybox_, как они фактически названы
    const textureCube = loader.load([
        'citybox_px.jpg', 'citybox_nx.jpg', // право, лево
        'citybox_py.jpg', 'citybox_ny.jpg', // верх, низ
        'citybox_pz.jpg', 'citybox_nz.jpg'  // перед, зад
    ]);
    
    // Устанавливаем skybox как фон сцены
    scene.background = textureCube;
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
        } else {
            // Анимация завершена, показываем уведомление
            showNotification("Вид камеры сброшен", false);
        }
    };
    
    // Запускаем анимацию
    animateCamera();
}

/**
 * Функция плавной анимации
 * @param {Number} t - Прогресс анимации от 0 до 1
 * @returns {Number} Преобразованный прогресс с эффектом замедления
 */
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Создание и отображение сетки с метровыми делениями
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 */
export function createGrid(width, length) {
    // Удаляем существующую сетку, если она есть
    if (gridHelper) {
        scene.remove(gridHelper);
    }
    
    // Определяем размер сетки как максимальную сторону площадки + 20% запаса
    const gridSize = Math.max(width, length) * 1.2;
    // Делаем деления сетки точно по 1 метру
    const divisions = Math.ceil(gridSize);
    
    // Создаем сетку с делениями в 1 метр
    gridHelper = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x888888);
    
    // Делаем линии сетки более заметными
    if (gridHelper.material instanceof THREE.Material) {
        gridHelper.material.opacity = 0.8;
        gridHelper.material.transparent = true;
    } else if (Array.isArray(gridHelper.material)) {
        gridHelper.material.forEach(mat => {
            mat.opacity = 0.8;
            mat.transparent = true;
        });
    }
    
    // Добавляем сетку на сцену
    scene.add(gridHelper);
    
    // Добавляем метки размеров по краям сетки
    createGridLabels(gridSize);
    
    return gridHelper;
}

/**
 * Добавление текстовых меток к сетке для указания размеров
 * @param {Number} gridSize - Размер сетки
 */
function createGridLabels(gridSize) {
    // TODO: В будущей версии можно добавить текстовые метки на сетке
    // Для реализации потребуется библиотека для текста, например THREE.TextGeometry
    // или создание спрайтов с текстом
}





/**
 * Включение/выключение вида сверху с сеткой
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @returns {Boolean} Новое состояние вида сверху (true - включен, false - выключен)
 */
export function toggleTopView(width, length) {
    if (!isTopViewActive) {
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
        
        // Создаем сетку, если её еще нет
        if (!gridHelper) {
            createGrid(width, length);
        }
        
        // Перемещаем камеру для вида сверху
        // Используем диагональ площадки для расчета высоты камеры
        const diagonal = Math.sqrt(width * width + length * length);
        const targetHeight = diagonal * 1.1; // Высота с учетом диагонали для полного обзора
        
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
            // Полностью фиксируем камеру сверху
            controls.minPolarAngle = 0;
            controls.maxPolarAngle = 0.1; // Почти полностью ограничиваем наклон для вида строго сверху
            
            // Увеличиваем максимальную дистанцию для камеры, чтобы пользователь мог отдалиться при необходимости
            controls.maxDistance = targetHeight * 3;
            controls.minDistance = 1; // Уменьшаем минимальное расстояние, чтобы можно было приблизиться
            
            // Отключаем вращение камеры
            controls.enableRotate = false;
            
            // Показываем уведомление
            showNotification("Вид сверху активирован. Используйте сетку для точного размещения объектов.", false);
        });
        
        isTopViewActive = true;
    } else {
        // Возвращаемся к предыдущему виду
        if (previousCameraState) {
            // Анимируем возврат к предыдущему виду
            animateCameraMove(
                previousCameraState.position,
                previousCameraState.target,
                () => {
                    // Восстанавливаем сохраненные ограничения камеры
                    if (previousCameraState) {
                        controls.minDistance = previousCameraState.minDistance;
                        controls.maxDistance = previousCameraState.maxDistance;
                        controls.minPolarAngle = previousCameraState.minPolarAngle;
                        controls.maxPolarAngle = previousCameraState.maxPolarAngle;
                        controls.enableRotate = previousCameraState.enableRotate;
                    } else {
                        // Если по какой-то причине предыдущее состояние не было сохранено,
                        // используем значения по умолчанию из конфигурации
                        controls.minDistance = CAMERA_SETTINGS.minDistance;
                        controls.maxDistance = CAMERA_SETTINGS.maxDistance;
                        controls.minPolarAngle = CAMERA_SETTINGS.minPolarAngle;
                        controls.maxPolarAngle = CAMERA_SETTINGS.maxPolarAngle;
                        controls.enableRotate = true;
                    }
                    
                    // Удаляем сетку
                    if (gridHelper) {
                        scene.remove(gridHelper);
                        gridHelper = null;
                    }
                    
                    // Показываем уведомление
                    showNotification("Вид сверху деактивирован.", false);
                }
            );
        }
        
        isTopViewActive = false;
    }
    
    return isTopViewActive;
}



/**
 * Анимирует перемещение камеры к указанной позиции и цели
 * @param {THREE.Vector3|Object} targetPosition - Конечная позиция камеры
 * @param {THREE.Vector3|Object} targetLookAt - Конечная цель камеры
 * @param {Function} callback - Функция, вызываемая по завершении анимации
 */
function animateCameraMove(targetPosition, targetLookAt, callback) {
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
 * Создание скриншота сцены с анимацией вспышки
 */
export function takeScreenshot() {
    // Создаем эффект вспышки перед скриншотом
    const flashOverlay = document.createElement('div');
    flashOverlay.style.position = 'fixed';
    flashOverlay.style.top = '0';
    flashOverlay.style.left = '0';
    flashOverlay.style.width = '100%';
    flashOverlay.style.height = '100%';
    flashOverlay.style.backgroundColor = 'white';
    flashOverlay.style.opacity = '0';
    flashOverlay.style.transition = 'opacity 0.2s ease-in-out';
    flashOverlay.style.pointerEvents = 'none';
    flashOverlay.style.zIndex = '9999';
    document.body.appendChild(flashOverlay);
    
    // Делаем вспышку и скрываем ее
    setTimeout(() => {
        flashOverlay.style.opacity = '0.5';
        
        // Создаем скриншот после эффекта вспышки
        setTimeout(() => {
            // Рендерим сцену
            renderer.render(scene, camera);
            
            // Получаем скриншот с Canvas
            canvas.toBlob((blob) => {
                // Убираем эффект вспышки
                flashOverlay.style.opacity = '0';
                setTimeout(() => {
                    document.body.removeChild(flashOverlay);
                }, 200);
                
                // Создаем URL для скачивания
                const url = URL.createObjectURL(blob);
                
                // Создаем ссылку для скачивания
                const downloadLink = document.createElement('a');
                downloadLink.href = url;
                
                // Создаем имя файла с датой и временем
                const date = new Date();
                const fileName = `playground_${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}.png`;
                
                downloadLink.download = fileName;
                
                // Эмулируем клик для запуска скачивания
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                // Освобождаем ресурсы
                URL.revokeObjectURL(url);
                
                // Показываем уведомление
                showNotification("Фотография успешно сохранена!", false);
            });
        }, 100);
    }, 50);
}