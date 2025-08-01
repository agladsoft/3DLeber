/**
 * Основные функции ядра приложения
 */
import { updateSafetyZonesVisibility } from './safetyManager.js';
import { initScene } from '../scene.js';
import { loadPlayground } from '../playground.js';
import { initUI } from '../ui.js';
import { checkAllObjectsPositions } from '../objects.js';
import { initDimensionUpdates } from '../modules/dimensionDisplay/index.js';
import * as THREE from 'three';

/**
 * Функция для безопасного скрытия индикатора загрузки с проверками
 * @param {Number} timeout - Задержка перед скрытием в миллисекундах
 */
function ensureLoadingOverlayHidden(timeout = 5000) {    
    // Устанавливаем таймер для принудительного скрытия индикатора загрузки
    setTimeout(() => {
        // Проверяем, что не показывается модальное окно
        const platformSelectModal = document.getElementById('platformSelectModal');
        const appModal = document.getElementById('appModal');
        
        // Если показывается модальное окно выбора площадки, не скрываем loading overlay
        if (platformSelectModal && platformSelectModal.style.display === 'block') {
            console.log('Modal window is open, keeping loading overlay as is');
            return;
        }
        
        // Если показывается приложение, скрываем loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay && !loadingOverlay.classList.contains('hidden')) {
            console.log('Принудительное скрытие индикатора загрузки по таймауту');
            loadingOverlay.classList.add('hidden');
            window.isLoading = false;
        }
    }, timeout);
}

/**
 * Инициализация приложения
 * @returns {Promise<void>}
 */
export async function initializeApp() {
    try {        
        // Устанавливаем таймер для принудительного скрытия индикатора загрузки через 6 секунд
        ensureLoadingOverlayHidden(6000);
        
        // Инициализируем Three.js сцену, камеру и освещение
        const sceneComponents = await initScene();
        console.log('Сцена инициализирована, компоненты:', sceneComponents);
        
        // Удаляем все объекты отображения размеров из сцены
        if (sceneComponents && sceneComponents.scene) {
            // Находим все объекты с именем, содержащим 'dimensions_'
            const dimensionObjects = sceneComponents.scene.children
                .filter(obj => obj.name && obj.name.includes('dimensions_'));
                
            // Удаляем их из сцены
            if (dimensionObjects.length > 0) {
                console.log('Удаление объектов отображения размеров:', dimensionObjects.length);
                dimensionObjects.forEach(obj => sceneComponents.scene.remove(obj));
            }
        }
        
        // Экспортируем глобальные объекты в window для отладки и доступа из других модулей
        window.app = {
            ...sceneComponents,
            // Добавляем дополнительные экспортируемые переменные из scene.js
            isTopViewActive: sceneComponents.isTopViewActive,
            // Флаг для отслеживания состояния рендер loop
            renderLoopRunning: false
        };
        
        // Получаем тип площадки из глобальных переменных, установленных в модальном окне
        let playgroundType = 'rubber'; // По умолчанию
        let userWidth = 40; // По умолчанию
        let userLength = 30; // По умолчанию
        let userColor = 'серый'; // Цвет по умолчанию
        
        // Если есть выбранный тип площадки из модального окна, используем его
        if (window.selectedPlaygroundType) {
            playgroundType = window.selectedPlaygroundType;
            console.log('Используем тип площадки из модального окна:', playgroundType);
        }
        
        // Если есть выбранные размеры площадки из модального окна, используем их
        if (window.selectedPlaygroundWidth) {
            userWidth = window.selectedPlaygroundWidth;
            console.log('Используем ширину площадки из модального окна:', userWidth);
        }
        
        if (window.selectedPlaygroundLength) {
            userLength = window.selectedPlaygroundLength;
            console.log('Используем длину площадки из модального окна:', userLength);
        }

        // Если есть выбранный цвет площадки из модального окна, используем его
        if (window.selectedPlaygroundColor) {
            userColor = window.selectedPlaygroundColor;
            console.log('Используем цвет площадки из модального окна:', userColor);
        }
        
        // Если есть выбранный цвет площадки из модального окна, используем его
        if (window.selectedPlaygroundColor) {
            userColor = window.selectedPlaygroundColor;
            console.log('Используем цвет площадки из модального окна:', userColor);
        }
        
        // Устанавливаем значения в контрольной панели, если она существует
        const playgroundTypeSelect = document.getElementById('playgroundType');
        const playgroundWidthInput = document.getElementById('playgroundWidth');
        const playgroundLengthInput = document.getElementById('playgroundLength');
        
        if (playgroundTypeSelect) playgroundTypeSelect.value = playgroundType;
        if (playgroundWidthInput) playgroundWidthInput.value = userWidth;
        if (playgroundLengthInput) playgroundLengthInput.value = userLength;
        
        try {
            // Попытка загрузить площадку с указанными размерами и цветом
            console.log('Начинаем загрузку площадки:', playgroundType, 'с размерами:', userWidth, 'x', userLength, 'цвет:', userColor);
            const result = await loadPlayground(playgroundType, userWidth, userLength, userColor);
            console.log('Площадка загружена, результат:', result);
            
            // Обновляем информационную панель со статусом площадки
            const playgroundStatus = document.getElementById('playgroundStatus');
            if (playgroundStatus) {
                // playgroundStatus.textContent = `Площадка: ${playgroundType} (${userWidth}м × ${userLength}м)`;
            }
        } catch (playgroundError) {
            console.error('Ошибка при загрузке площадки:', playgroundError);
            // Если не удалось загрузить площадку - продолжаем без неё
            // Приложение все равно должно запуститься
        }
        
        // Инициализируем UI и обработчики событий
        try {
            initUI();
        } catch (uiError) {
            console.error('Ошибка при инициализации UI:', uiError);
        }
        
        try {
            // Проверяем позиции всех объектов после инициализации
            checkAllObjectsPositions();
        } catch (positionError) {
            console.error('Ошибка при проверке позиций объектов:', positionError);
        }
        
        try {
            // Инициализируем модуль отображения размеров объектов
            initDimensionUpdates();
        } catch (dimensionError) {
            console.error('Ошибка при инициализации модуля отображения размеров:', dimensionError);
        }
        
        try {
            // Инициализируем менеджер фона
            const { initBackgroundManager } = await import('../playground/backgroundManager.js');
            await initBackgroundManager();
        } catch (backgroundError) {
            console.error('Ошибка при инициализации менеджера фона:', backgroundError);
        }
        
        try {
            // Обновляем видимость safety zones в соответствии с настройками пользователя
            updateSafetyZonesVisibility();
        } catch (safetyError) {
            console.error('Ошибка при обновлении safety zones:', safetyError);
        }
        
        // Запускаем цикл рендеринга Three.js
        startRenderLoop();
        
    } catch (error) {
        console.error('Критическая ошибка при инициализации приложения:', error);
        
        // Скрываем индикатор загрузки только в случае критической ошибки
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            window.isLoading = false;
        }
        
        throw error;
    }
}

/**
 * Запускает цикл рендеринга Three.js
 */
export function startRenderLoop() {
    console.log("Запуск цикла рендеринга");
    
    // Устанавливаем флаг что рендер loop запущен
    if (window.app) {
        window.app.renderLoopRunning = true;
    }
    
    // Счетчик кадров для дебага
    let frameCount = 0;
    const FPS_REPORT_INTERVAL = 600; // Логировать FPS каждые 10 секунд (при 60 fps)
    
    function animate() {
        requestAnimationFrame(animate);
        
        // Инкрементируем счетчик кадров
        frameCount++;
        
        try {
            // Проверяем наличие необходимых компонентов
            if (window.app && window.app.renderer && window.app.scene && window.app.camera) {
                // Обновляем OrbitControls, если они существуют и активны
                if (window.app.controls && window.app.controls.update && window.app.controls.enabled) {
                    window.app.controls.update();
                }
                
                // Обновляем позицию крестика удаления при движении камеры
                updateDeleteButtonPositionInRenderLoop();
                
                // Код проверки сетки удален - вид сверху работает без сетки
                
                // Фиксируем элементы сцены в режиме вида сверху
                if (window.app.isTopViewActive) {
                    
                    // Фиксируем высоту камеры, если включен вид сверху
                    if (window.app.camera && window.app.camera.position.y < 1) {
                        // Восстанавливаем высоту камеры, если она слишком низкая
                        const diagonal = Math.sqrt(
                            window.app.playgroundWidth * window.app.playgroundWidth + 
                            window.app.playgroundLength * window.app.playgroundLength
                        );
                        window.app.camera.position.y = diagonal * 1.1;
                    }
                }
                
                // Перед рендером временно подавляем ошибку NaN boundingSphere
                const originalConsoleError = console.error;
                console.error = function (...args) {
                    if (
                        typeof args[0] === 'string' &&
                        args[0].includes('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN')
                    ) {
                        // подавляем только это сообщение
                        return;
                    }
                    originalConsoleError.apply(console, args);
                };

                // Рендерим сцену
                window.app.renderer.render(window.app.scene, window.app.camera);

                // Восстанавливаем console.error
                console.error = originalConsoleError;
            } else {
                if (frameCount % FPS_REPORT_INTERVAL === 0) {
                    console.warn("Не все компоненты доступны для рендеринга:", {
                        app: !!window.app,
                        renderer: !!(window.app && window.app.renderer),
                        scene: !!(window.app && window.app.scene),
                        camera: !!(window.app && window.app.camera)
                    });
                }
            }
        } catch (error) {
            console.error("Ошибка в цикле рендеринга:", error);
        }
    }
    
    // Запускаем анимацию
    animate();
}

/**
 * Обеспечивает однократную инициализацию приложения
 */
export function ensureSingleInit() {
    console.log('Проверка инициализации приложения. Текущий статус:', window.appInitialized);
    if (!window.appInitialized) {
        window.appInitialized = true;
        console.log('initApp существует:', typeof window.initApp === 'function');
        window.initApp();
    } else {
        console.log('Приложение уже инициализировано, повторный запуск пропущен');
    }
}

/**
 * Обновляет размеры рендерера при изменении размера окна
 */
export function updateRendererSize() {
    if (window.app && window.app.renderer && window.app.camera) {
        const renderer = window.app.renderer;
        const camera = window.app.camera;
        
        // Обновляем размеры рендерера
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Если используется перспективная камера, обновляем её аспект
        if (camera.isPerspectiveCamera) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        }
        
        // Проверяем, есть ли сетка в сцене и нужно ли её зафиксировать
        if (window.app && window.app.scene) {
            window.app.scene.traverse((object) => {
                if (object.isObject3D && object.userData && object.userData.isFixedGrid) {
                    // Повторно фиксируем сетку после изменения размера окна
                    object.matrixAutoUpdate = false;
                    object.updateMatrix();
                }
            });
            
            // Код проверки сетки удален - вид сверху работает без сетки
        }
    }
}

/**
 * Обновляет позицию крестика удаления в цикле рендеринга
 */
function updateDeleteButtonPositionInRenderLoop() {
    const deleteButton = document.getElementById('modelDeleteButton');
    if (!deleteButton || !deleteButton._targetObject) return;
    
    const object = deleteButton._targetObject;
    
    // Проверяем, что объект еще существует в сцене
    if (!object.parent) {
        // Если объект был удален из сцены, удаляем крестик
        deleteButton.remove();
        return;
    }
    
    // Получаем новую 2D позицию объекта
    const vector = new THREE.Vector3();
    object.updateMatrixWorld();
    vector.setFromMatrixPosition(object.matrixWorld);
    vector.project(window.app.camera);
    
    // Преобразуем в экранные координаты
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (1 - (vector.y * 0.5 + 0.5)) * window.innerHeight;
    
    // Обновляем позицию крестика со смещением
    deleteButton.style.left = `${x + 20}px`;
    deleteButton.style.top = `${y - 45}px`;
}