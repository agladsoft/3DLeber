/**
 * Основные функции ядра приложения
 */
import { removeAllSafetyZones } from './safetyManager.js';
import { initScene } from '../scene.js';
import { loadPlayground } from '../playground.js';
import { initUI } from '../ui.js';
import { checkAllObjectsPositions } from '../objects.js';
import { initDimensionUpdates } from '../modules/dimensionDisplay/index.js';

/**
 * Инициализация приложения
 * @returns {Promise<void>}
 */
export async function initializeApp() {
    try {
        console.log('Инициализация приложения...');
        
        // Инициализируем Three.js сцену, камеру и освещение
        const sceneComponents = initScene();
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
            gridHelper: sceneComponents.gridHelper
        };
        console.log('Window.app инициализирован:', window.app);
        
        // Получаем тип площадки из выпадающего списка (если он уже создан)
        let playgroundType = 'playground.glb'; // По умолчанию
        const playgroundTypeSelect = document.getElementById('playgroundType');
        if (playgroundTypeSelect) {
            playgroundType = playgroundTypeSelect.value;
            console.log('Выбран тип площадки из select:', playgroundType);
        } else {
            console.log('Select playgroundType не найден, используем тип по умолчанию');
        }
        
        try {
            // Попытка загрузить площадку (ждем, пока она загрузится)
            console.log('Начинаем загрузку площадки:', playgroundType);
            const result = await loadPlayground(playgroundType);
            console.log('Площадка загружена, результат:', result);
            console.log('После загрузки площадки ground =', ground);
        } catch (playgroundError) {
            console.error('Ошибка при загрузке площадки:', playgroundError);
            // Если не удалось загрузить площадку - продолжаем без неё
            // Приложение все равно должно запуститься
        }
        
        // Инициализируем UI и обработчики событий
        try {
            console.log('Инициализация UI');
            initUI();
            console.log('UI инициализирован');
        } catch (uiError) {
            console.error('Ошибка при инициализации UI:', uiError);
        }
        
        try {
            // Проверяем позиции всех объектов после инициализации
            console.log('Проверка позиций объектов');
            checkAllObjectsPositions();
        } catch (positionError) {
            console.error('Ошибка при проверке позиций объектов:', positionError);
        }
        
        try {
            // Инициализируем модуль отображения размеров объектов
            console.log('Инициализация модуля отображения размеров');
            initDimensionUpdates();
            console.log('Модуль отображения размеров инициализирован');
        } catch (dimensionError) {
            console.error('Ошибка при инициализации модуля отображения размеров:', dimensionError);
        }
        
        try {
            // Удаляем все элементы с классом safety-zone
            console.log('Удаление safety zones');
            removeAllSafetyZones();
        } catch (safetyError) {
            console.error('Ошибка при удалении safety zones:', safetyError);
        }
        
        // Запускаем цикл рендеринга Three.js
        console.log('Запуск цикла рендеринга');
        startRenderLoop();
        
        console.log('Приложение успешно инициализировано');
    } catch (error) {
        console.error('Критическая ошибка при инициализации приложения:', error);
        throw error;
    }
}

/**
 * Запускает цикл рендеринга Three.js
 */
export function startRenderLoop() {
    console.log("Запуск цикла рендеринга");
    
    // Счетчик кадров для дебага
    let frameCount = 0;
    const FPS_REPORT_INTERVAL = 600; // Логировать FPS каждые 10 секунд (при 60 fps)
    
    function animate() {
        requestAnimationFrame(animate);
        
        // Инкрементируем счетчик кадров
        frameCount++;
        
        // Периодически выводим отладочную информацию
        if (frameCount % FPS_REPORT_INTERVAL === 0) {
            console.log("Render loop active, frame:", frameCount);
            // Проверяем состояние сцены
            if (window.app && window.app.scene) {
                console.log("Scene children count:", window.app.scene.children.length);
                
                // Проверим наличие ground в сцене
                const groundExists = window.app.scene.children.some(child => 
                    (child.userData && child.userData.isPlayground) || 
                    (child.name && (child.name.includes('playground') || child.name === 'simple_playground'))
                );
                console.log("Ground exists in scene:", groundExists);
                
                // Проверим количество объектов моделей
                const modelCount = window.app.scene.children.filter(child => 
                    child.name && child.name.includes('modelContainer_')
                ).length;
                console.log("Model containers in scene:", modelCount);
            }
        }
        
        try {
            // Проверяем наличие необходимых компонентов
            if (window.app && window.app.renderer && window.app.scene && window.app.camera) {
                // Обновляем OrbitControls, если они существуют и активны
                if (window.app.controls && window.app.controls.update && window.app.controls.enabled) {
                    window.app.controls.update();
                }
                
                // Фиксируем элементы сцены в режиме вида сверху
                if (window.app.isTopViewActive) {
                    // Убедимся, что сетка и площадка не двигаются
                    if (window.app.gridHelper) {
                        // Проверяем, что сетка на месте
                        if (window.app.gridHelper.position.y !== 0.01) {
                            window.app.gridHelper.position.set(0, 0.01, 0);
                        }
                        
                        // Обновляем матрицу только если нужно
                        if (window.app.gridHelper.matrixAutoUpdate) {
                            window.app.gridHelper.matrixAutoUpdate = false;
                            window.app.gridHelper.updateMatrix();
                        }
                    }
                    
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
                
                // Рендерим сцену
                window.app.renderer.render(window.app.scene, window.app.camera);
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
        console.log('Первая инициализация приложения');
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
            
            // Если активен вид сверху, убедимся, что сетка фиксирована
            if (window.app.isTopViewActive && window.app.gridHelper) {
                window.app.gridHelper.matrixAutoUpdate = false;
                window.app.gridHelper.updateMatrix();
            }
        }
    }
}
