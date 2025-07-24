/**
 * Основной модуль для управления объектами на площадке
 */
import * as THREE from 'three';
import { scene } from '../scene.js';
import { getLoaderByExtension } from './loaders.js';
import { saveInitialPosition } from './positionHelpers.js';
import { autoConvertUnits } from './objectOperations.js';
import { checkAllObjectsPositions } from './collisionDetection.js';
import { showModelDimensions } from './dimensionDisplay/index.js';
import { updateSafetyZonesVisibility } from '../core/safetyManager.js';
import { API_BASE_URL } from '../api/serverConfig.js'
import { updateModelPlacementCounter } from '../sidebar.js';

// Массив для хранения размещенных объектов
export let placedObjects = [];

// Кэш для хранения загруженных моделей
const modelCache = new Map();
const MAX_CACHE_SIZE = 20;

// Массив для хранения 3D preloader'ов
const scenePreloaders = new Map();

/**
 * Обновляет UI с батчингом для лучшей производительности при множественных операциях
 * @param {string} modelName - Имя модели  
 * @param {number} delta - Изменение количества
 */
async function updateSidebarWithBatching(modelName, delta) {
    try {
        const { batchUIUpdate } = await import('../ui/dragAndDrop.js');
        batchUIUpdate(modelName, delta);
    } catch (error) {
        console.error('Батчинг недоступен, используем мгновенное обновление:', error);
        updateSidebarInstantly(modelName, delta);
    }
}

/**
 * Мгновенно обновляет UI в sidebar без API вызовов (fallback)
 * @param {string} modelName - Имя модели
 * @param {number} delta - Изменение количества (+1 для увеличения, -1 для уменьшения)
 */
function updateSidebarInstantly(modelName, delta) {
    // Прямое обновление без async для мгновенного выполнения
    if (window.updateModelCounterDirectly) {
        window.updateModelCounterDirectly(modelName, delta);
    } else {
        import('../sidebar.js').then(sidebarModule => {
            if (sidebarModule.updateModelCounterDirectly) {
                sidebarModule.updateModelCounterDirectly(modelName, delta);
                // Сохраняем функцию глобально для быстрого доступа
                window.updateModelCounterDirectly = sidebarModule.updateModelCounterDirectly;
            }
        });
    }
}

// Счетчик для ID объектов
let objectIdCounter = 0;

// Конфигурация путей к моделям
const MODEL_PATHS = {
    glb: 'models'
};

// Функция для получения пути к модели в зависимости от типа
function getModelPath(fileName) {
    return `${MODEL_PATHS.glb}/${fileName}`;
}

function processLoadedModel(container, modelName, position, isRestoring = false) {
    // Устанавливаем позицию модели
    if (position) {
        container.position.copy(position);
        
        // Сохраняем координаты в userData для отображения в UI
        container.userData.coordinates = {
            x: position.x.toFixed(2),
            y: position.y.toFixed(2),
            z: position.z.toFixed(2)
        };
    }
    
    // Генерируем уникальный ID для объекта
    container.userData.id = generateObjectId();
    
    // Сохраняем имя модели в userData
    container.userData.modelName = modelName;
    
    // Устанавливаем изначальный поворот в 0
    container.rotation.y = 0;
    
    // Добавляем пользовательские данные для отслеживания
    container.userData.isPlacedObject = true;
    container.userData.created = new Date().toISOString();
    
    // Устанавливаем имя контейнера для отладки
    container.name = `${modelName}_${container.userData.id}`;
    
    // ВАЖНО: Добавляем контейнер в сцену (это было пропущено)
    scene.add(container);
    
    // Вычисляем размеры объекта для правильного масштабирования
    const box = new THREE.Box3().setFromObject(container);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Сохраняем реальные размеры модели
    container.userData.realWidth = size.x;
    container.userData.realHeight = size.y;
    container.userData.realDepth = size.z;
    
    // Определяем максимальный размер
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    // Сохраняем исходный размер объекта
    container.userData.originalSize = maxDimension;
    container.userData.currentSize = maxDimension; // Устанавливаем начальный текущий размер
    
    // Инициализируем масштаб объекта в 1.0 (оригинальный размер)
    container.scale.set(1, 1, 1);
    
    console.log(`Модель ${modelName} загружена с размерами: ${container.userData.realWidth.toFixed(2)}×${container.userData.realHeight.toFixed(2)}×${container.userData.realDepth.toFixed(2)}м`);
    
    // Проверяем, требуется ли конвертация размерности из мм в м
    const wasConverted = autoConvertUnits(container);
    if (wasConverted) {
        console.log(`Модель ${modelName}: выполнена конвертация из мм в м. Новые размеры: ${container.userData.realWidth.toFixed(2)}×${container.userData.realHeight.toFixed(2)}×${container.userData.realDepth.toFixed(2)}м`);
    }
    
    // Сохраняем исходную позицию и поворот (для возможного использования клавиши Esc)
    saveInitialPosition(container);
    
    // Добавляем объект в массив размещенных объектов
    placedObjects.push(container);
    
    // Логируем информацию о размещенном объекте
    console.log("Размещенный объект:", {
        id: container.userData.id,
        name: modelName,
        coordinates: container.userData.coordinates,
        dimensions: {
            width: container.userData.realWidth.toFixed(2),
            height: container.userData.realHeight.toFixed(2),
            depth: container.userData.realDepth.toFixed(2)
        }
    });
    
    // Логируем общее количество размещенных объектов
    console.log("Всего размещено объектов:", placedObjects.length);
    
    // Проверяем все объекты на коллизии
    checkAllObjectsPositions();
    
    // Автоматически показываем размеры модели при добавлении на площадку, если пользователь не скрыл размеры
    if (localStorage.getItem('dimensionLabelsHidden') !== 'true') {
        showModelDimensions(container);
    }
    
    // После успешной загрузки модели обновляем видимость безопасных зон
    updateSafetyZonesVisibility();
    
    // Скрываем preloader только если это не восстановление сессии (при восстановлении управляем централизованно)
    if (!isRestoring) {
        import('../sidebar.js').then(({ hideModelPreloader }) => {
            hideModelPreloader(modelName);
            console.log(`Preloader скрыт для модели ${modelName} после завершения processLoadedModel`);
        }).catch(error => {
            console.error('Ошибка при скрытии preloader:', error);
        });
    }
    
    console.log(`Модель ${modelName} обработана и настроена с ID: ${container.userData.id}`);
}

/**
 * Обновляет environment map для всех материалов размещенных объектов
 */
export function updateMaterialsEnvironmentMap() {
    if (!scene.environment) {
        console.log('Environment map ещё не загружен, пропускаем обновление материалов');
        return;
    }
    
    console.log('🔄 Обновляем environment map для всех размещенных объектов');
    
    placedObjects.forEach(container => {        
        container.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                
                materials.forEach((material) => {
                    
                    // Устанавливаем environment map из сцены для отражений
                    material.envMap = scene.environment;
                    material.envMapIntensity = 1.0;
                    
                    // Проверяем, является ли материал деревянным
                    const isWood = material.name.includes('Лиственница');
                    if (isWood) {
                        // Настройки для дерева - делаем значительно ярче
                        material.envMapIntensity = 2.5;
                        material.emissive = new THREE.Color(0x4a2a0a);
                        material.emissiveIntensity = 0.35;
                        material.roughness = Math.max(0.2, material.roughness - 0.3);
                        material.metalness = Math.min(0.15, material.metalness + 0.1);
                        
                        // Значительно осветляем деревянные материалы
                        if (material.color && material.color.getHSL) {
                            const hsl = {};
                            material.color.getHSL(hsl);
                            if (hsl.l < 0.7) {
                                material.color.setHSL(hsl.h, Math.max(0.3, hsl.s), Math.min(0.8, hsl.l + 0.4));
                            }
                        }
                        
                        // Дополнительно увеличиваем общую яркость
                        if (material.color) {
                            material.color.multiplyScalar(1.3);
                        }
                    }
                    
                    // Улучшенное определение стеклянных материалов
                    const isGlass = (
                        (material.transparent && material.opacity < 1.0) ||
                        (material.transmission && material.transmission > 0) ||
                        (material.ior && material.ior !== 1.5) ||
                        (material.clearcoat && material.clearcoat > 0.5) ||
                        (material.name && (
                            material.name.toLowerCase().includes('glass') ||
                            material.name.toLowerCase().includes('crystal') ||
                            material.name.toLowerCase().includes('transparent')
                        ))
                    );
                    
                    // Для стеклянных материалов
                    if (isGlass) {                        
                        if (!material.transmission || material.transmission === 0) {
                            material.transmission = 0.95;
                        }
                        
                        if (material.ior === 1.5) {
                            material.ior = 1.52;
                        }
                        
                        material.refractionRatio = 0.98;
                        material.envMapIntensity = 1.8;
                        material.reflectivity = material.reflectivity || 0.5;
                        
                        if (material.isMeshPhysicalMaterial) {
                            material.transmission = Math.max(material.transmission, 0.9);
                            material.thickness = material.thickness || 0.5;
                        }
                    }
                    // Для металлических материалов
                    else if (material.metalness > 0.5) {
                        material.envMapIntensity = 2.0;
                    }
                    
                    material.needsUpdate = true;
                });
            }
        });
    });
    
    console.log(`✅ Environment map обновлен для ${placedObjects.length} объектов`);
}

/**
 * Функция для очистки кэша моделей
 */
export function clearModelCache() {
    console.log(`Очистка кэша моделей. Количество моделей в кэше: ${modelCache.size}`);
    
    // Освобождаем память, связанную с каждой моделью в кэше
    modelCache.forEach((model, modelName) => {
        if (model && model.traverse) {
            model.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }
    });
    
    modelCache.clear();
    console.log("Кэш моделей очищен");
}

/**
 * Управляет размером кэша, удаляя старые модели при превышении лимита
 */
function manageCacheSize() {
    if (modelCache.size > MAX_CACHE_SIZE) {
        // Удаляем самую первую (старую) модель из кэша
        const firstKey = modelCache.keys().next().value;
        const modelToRemove = modelCache.get(firstKey);
        
        // Освобождаем память
        if (modelToRemove && modelToRemove.traverse) {
            modelToRemove.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
        }
        
        modelCache.delete(firstKey);
        console.log(`Удалена модель из кэша: ${firstKey}. Размер кэша: ${modelCache.size}`);
    }
}

/**
 * Генерирует уникальный ID для объекта
 * @returns {string} Уникальный ID
 */
export function generateObjectId() {
    return `obj_${Date.now()}_${++objectIdCounter}`;
}

/**
 * Создает 3D preloader на сцене в указанной позиции
 * @param {string} objectId - Уникальный ID объекта
 * @param {THREE.Vector3} position - Позиция для размещения preloader'а
 * @param {string} modelName - Имя модели (для отладки)
 * @returns {THREE.Group} Группа с preloader'ом
 */
export function createScenePreloader(objectId, position, modelName = '') {
    // Создаем группу для preloader'а
    const preloaderGroup = new THREE.Group();
    preloaderGroup.name = `preloader_${objectId}`;
    
    // Устанавливаем позицию и поднимаем на высоту половины куба, чтобы он стоял на поверхности
    const cubeHeight = 1.5;
    preloaderGroup.position.set(
        position.x, 
        position.y + cubeHeight / 2, // Поднимаем на половину высоты
        position.z
    );
    
    // Создаем wireframe куб (уменьшенный размер)
    const geometry = new THREE.BoxGeometry(1.5, cubeHeight, 1.5);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF, // Оранжевый цвет как в CSS
        wireframe: true,
        transparent: true,
        opacity: 0.8
    });
    
    const wireframeCube = new THREE.Mesh(geometry, wireframeMaterial);
    preloaderGroup.add(wireframeCube);
    
    // Создаем внутренний solid куб для дополнительного эффекта
    const solidGeometry = new THREE.BoxGeometry(1.2, cubeHeight * 0.8, 1.2);
    const solidMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.2
    });
    
    const solidCube = new THREE.Mesh(solidGeometry, solidMaterial);
    preloaderGroup.add(solidCube);
    
    // Добавляем метаданные
    preloaderGroup.userData.isPreloader = true;
    preloaderGroup.userData.objectId = objectId;
    preloaderGroup.userData.modelName = modelName;
    preloaderGroup.userData.created = Date.now();
    preloaderGroup.userData.animationActive = true;
    
    // Добавляем на сцену
    scene.add(preloaderGroup);
    
    // Сохраняем в коллекции
    scenePreloaders.set(objectId, preloaderGroup);
    
    console.log(`3D Preloader создан для объекта ${objectId} (${modelName}) в позиции:`, preloaderGroup.position);
    
    return preloaderGroup;
}

/**
 * Удаляет 3D preloader с сцены
 * @param {string} objectId - ID объекта
 */
export function removeScenePreloader(objectId) {
    const preloader = scenePreloaders.get(objectId);
    if (preloader) {
        // Останавливаем анимацию
        preloader.userData.animationActive = false;
        
        // Удаляем с сцены
        scene.remove(preloader);
        
        // Освобождаем ресурсы
        preloader.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        
        // Удаляем из коллекции
        scenePreloaders.delete(objectId);
        
        console.log(`3D Preloader удален для объекта ${objectId}`);
    }
}

/**
 * Удаляет все 3D preloader'ы с сцены
 */
export function removeAllScenePreloaders() {
    console.log(`Удаляем все 3D preloader'ы (${scenePreloaders.size} штук)`);
    
    scenePreloaders.forEach((preloader, objectId) => {
        removeScenePreloader(objectId);
    });
    
    scenePreloaders.clear();
    console.log('Все 3D preloader\'ы удалены');
}

/**
 * Загружает и размещает модель на сцене
 * @param {string} modelName - Имя файла модели
 * @param {THREE.Vector3} position - Позиция для размещения
 * @param {boolean} isRestoring - Флаг восстановления (не обновлять БД)
 * @returns {Promise} Promise, который разрешается после успешной загрузки
 */
export async function loadAndPlaceModel(modelName, position, isRestoring = false) {
    console.log("Попытка загрузки модели:", modelName, "в позицию:", position);
    
    // Убираем optimistic update для добавления модели - обновление происходит через refreshAllModelCounters
    // после успешного размещения, что исключает рассинхронизацию с БД
    
    return new Promise((resolve, reject) => {
        try {
            // Определяем расширение файла
            const fileExtension = modelName.substring(modelName.lastIndexOf('.')).toLowerCase();
            
            // Получаем путь к модели
            const modelPath = getModelPath(modelName);
            
            console.log("Путь к модели:", modelPath);
            
            // Создаем контейнер для модели
            const container = new THREE.Group();
            
            // Устанавливаем начальную позицию контейнера
            if (position) {
                container.position.copy(position);
                container.userData.coordinates = {
                    x: position.x.toFixed(2),
                    y: position.y.toFixed(2),
                    z: position.z.toFixed(2)
                };
            } else {
                // Если позиция не указана, устанавливаем в центр сцены
                container.position.set(0, 0, 0);
                container.userData.coordinates = { x: "0.00", y: "0.00", z: "0.00" };
            }
            
            // Проверяем наличие модели в кэше
            if (modelCache.has(modelName)) {
                console.log("Используем модель из кэша:", modelName);
                const cachedModel = modelCache.get(modelName);
                container.add(cachedModel.clone());
                processLoadedModel(container, modelName, position, isRestoring);
                
                // Обновляем сессию в базе данных только если это не восстановление
                if (!isRestoring) {
                    updateSessionForNewObject(container, modelName)
                        .then(async () => {
                            // Обновляем счетчики в sidebar после успешного размещения кэшированной модели
                            try {
                                const { refreshAllModelCounters } = await import('../sidebar.js');
                                await refreshAllModelCounters();
                            } catch (error) {
                                console.error('Error updating sidebar counters for cached model:', error);
                            }
                            resolve(container);
                        })
                        .catch(reject);
                } else {
                    resolve(container);
                }
                return;
            }

            // Выбираем загрузчик в зависимости от формата файла
            console.log("Получаем загрузчик для формата:", fileExtension);
            const { loader, method } = getLoaderByExtension(fileExtension);
            
            // Загружаем модель с использованием соответствующего загрузчика
            loader.load(
                modelPath,
                (result) => {
                    try {
                        let modelObject;
                        
                        // Обработка результата загрузки в зависимости от формата
                        if (method === 'gltf') {
                            modelObject = result.scene;
                            
                            // Оптимизация модели
                            modelObject.traverse((child) => {
                                if (child.isMesh) {
                                    // Оптимизация геометрии
                                    if (child.geometry) {
                                        child.geometry.computeBoundingSphere();
                                        child.geometry.computeBoundingBox();
                                        
                                        // Оптимизация геометрии с использованием BufferGeometry
                                        if (child.geometry.isBufferGeometry) {
                                            // Удаляем дублирующиеся вершины
                                            child.geometry = child.geometry.clone();
                                            child.geometry.attributes.position.needsUpdate = true;
                                            
                                            // Оптимизируем индексы
                                            if (child.geometry.index) {
                                                child.geometry.setDrawRange(0, child.geometry.index.count);
                                            }
                                            
                                            // Обновляем атрибуты
                                            child.geometry.computeVertexNormals();
                                        }
                                    }

                                    child.castShadow = true;
                                    child.receiveShadow = true;
                                    
                                    // Настройка материалов для правильного отображения металла и стекла
                                    if (child.material) {
                                        // Если это массив материалов
                                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                                        
                                        materials.forEach((material) => {
                                            
                                            // Устанавливаем environment map из сцены для отражений
                                            if (scene.environment) {
                                                material.envMap = scene.environment;
                                                material.envMapIntensity = 1.0;
                                            }

                                            const isWood = material.name.includes('Лиственница');
                                            if (isWood) {
                                                // Делаем дерево значительно ярче
                                                material.envMapIntensity = 2.5; // Сильно увеличиваем отражения
                                                material.emissive = new THREE.Color(0x4a2a0a); // Более яркий теплый коричневый
                                                material.emissiveIntensity = 0.35; // Заметное свечение
                                                material.roughness = Math.max(0.2, material.roughness - 0.3); // Менее шероховатый
                                                material.metalness = Math.min(0.15, material.metalness + 0.1); // Больше металлического блеска
                                                
                                                // Значительно осветляем материал
                                                if (material.color && material.color.getHSL) {
                                                    const hsl = {};
                                                    material.color.getHSL(hsl);
                                                    // Увеличиваем яркость более агрессивно
                                                    if (hsl.l < 0.7) {
                                                        material.color.setHSL(hsl.h, Math.max(0.3, hsl.s), Math.min(0.8, hsl.l + 0.4));
                                                    }
                                                }
                                                
                                                // Дополнительно увеличиваем общую яркость через множитель
                                                if (material.color) {
                                                    material.color.multiplyScalar(1.3);
                                                }
                                            }
                                            
                                            // Улучшенное определение стеклянных материалов
                                            const isGlass = (
                                                (material.transparent && material.opacity < 1.0) ||
                                                (material.transmission && material.transmission > 0) ||
                                                (material.ior && material.ior !== 1.5) ||
                                                (material.clearcoat && material.clearcoat > 0.5) ||
                                                (material.name && (
                                                    material.name.toLowerCase().includes('glass') ||
                                                    material.name.toLowerCase().includes('crystal') ||
                                                    material.name.toLowerCase().includes('transparent')
                                                ))
                                            );
                                            
                                            // Для стеклянных материалов
                                            if (isGlass) {                                                
                                                // Настройки для стекла
                                                if (!material.transmission || material.transmission === 0) {
                                                    material.transmission = 0.95; // Включаем transmission если его нет
                                                }
                                                
                                                if (material.ior === 1.5) {
                                                    material.ior = 1.52; // Стандартный индекс преломления стекла
                                                }
                                                
                                                material.refractionRatio = 0.98;
                                                material.envMapIntensity = 1.8; // Усиливаем отражения для стекла
                                                material.reflectivity = material.reflectivity || 0.5;
                                                
                                                // Если это MeshPhysicalMaterial, используем transmission
                                                if (material.isMeshPhysicalMaterial) {
                                                    material.transmission = Math.max(material.transmission, 0.9);
                                                    material.thickness = material.thickness || 0.5;
                                                }
                                            }
                                            // Для металлических материалов
                                            else if (material.metalness > 0.5) {
                                                material.envMapIntensity = 2.0; // Усиливаем отражения для металла
                                            }
                                            
                                            // Обновляем материал
                                            material.needsUpdate = true;
                                        });
                                    }

                                    // Если это зона безопасности, меняем цвет на белый
                                    if (child.name && child.name.includes('safety_zone')) {
                                        if (child.material) {
                                            const newMaterial = new THREE.MeshStandardMaterial({
                                                color: 0xFFFFFF,
                                                transparent: false,
                                                opacity: 1.0,
                                                metalness: 0,
                                                roughness: 0.5,
                                                emissive: 0xFFFFFF,
                                                emissiveIntensity: 0.2
                                            });
                                            child.material = newMaterial;
                                            // Проверяем состояние из localStorage и устанавливаем видимость
                                            child.visible = localStorage.getItem('safetyZoneHidden') !== 'true';
                                        }
                                    }
                                }
                            });
                            
                            // Сохраняем оптимизированную модель в кэш
                            modelCache.set(modelName, modelObject.clone());
                            manageCacheSize();
                            
                            container.add(modelObject);
                            console.log("GLTF модель добавлена в контейнер");
                        }
                        
                        // Проверяем, есть ли в контейнере хотя бы один дочерний объект
                        if (container.children.length === 0) {
                            console.error("Ошибка: контейнер пуст, нет дочерних объектов");
                            reject(new Error("Container is empty, no child objects"));
                            return;
                        }
                        
                        // Обрабатываем загруженную модель (включает добавление в сцену)
                        processLoadedModel(container, modelName, position, isRestoring);

                        // Обновляем сессию в базе данных только если это не восстановление
                        if (!isRestoring) {
                            updateSessionForNewObject(container, modelName)
                                .then(async () => {
                                    // Обновляем счетчики в sidebar после успешного размещения
                                    try {
                                        const { refreshAllModelCounters } = await import('../sidebar.js');
                                        await refreshAllModelCounters();
                                    } catch (error) {
                                        console.error('Error updating sidebar counters:', error);
                                    }
                                    resolve(container);
                                })
                                .catch(error => {
                                    console.error('Ошибка при обновлении сессии:', error);
                                    reject(error);
                                });
                        } else {
                            resolve(container);
                        }
                        
                    } catch (processingError) {
                        console.error("Error processing loaded model:", processingError);
                        reject(processingError);
                    }
                },
                // Обработчик загрузки (прогресс)
                (xhr) => {
                    const percentComplete = (xhr.loaded / xhr.total) * 100;
                    console.log(`Загрузка модели ${modelName}: ${percentComplete.toFixed(2)}%`);
                },
                // Обработчик ошибок
                (error) => {
                    console.error(`Ошибка при загрузке модели ${modelName}:`, error);
                    reject(error);
                }
            );
        } catch (error) {
            console.error("Error in loadAndPlaceModel:", error);
            reject(error);
        }
    });
}

/**
 * Обновляет сессию в БД при добавлении нового объекта (оптимизированная версия)
 * @param {Object} container - Контейнер объекта
 * @param {string} modelName - Имя модели
 */
async function updateSessionForNewObject(container, modelName) {
    try {
        const userId = sessionStorage.getItem('userId');
        if (!userId) {
            console.error('No user ID found');
            return;
        }

        // Получаем свежие данные сессии напрямую из API для надежности
        let sessionData = null;
        const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
        if (!sessionResponse.ok) {
            throw new Error('Failed to get session');
        }
        const { session } = await sessionResponse.json();
        sessionData = session || { quantities: {}, placedObjects: [] };

        // Добавляем информацию о новом объекте
        const objectData = {
            id: container.userData.id,
            modelName: modelName,
            coordinates: container.userData.coordinates,
            rotation: container.rotation.y.toFixed(2),
            dimensions: {
                width: container.userData.realWidth.toFixed(2),
                height: container.userData.realHeight.toFixed(2),
                depth: container.userData.realDepth.toFixed(2)
            }
        };

        sessionData.placedObjects.push(objectData);

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

        // Кэширование убрано - данные всегда актуальные

        console.log('Session updated successfully for new object:', objectData);
    } catch (error) {
        console.error('Error updating session:', error);
        throw error; // Пробрасываем ошибку для обработки в loadAndPlaceModel
    }
}

/**
 * Удаляет объект из сцены и обновляет UI
 * @param {Object} container - Контейнер модели для удаления
 * @param {boolean} isMassRemoval - Флаг массового удаления (не увеличивать количество)
 */
export function removeObject(container, isMassRemoval = false) {
    if (!container) return;
    
    const modelName = container.userData.modelName;
    
    // Убираем optimistic update для удаления - обновление происходит через refreshAllModelCounters
    // после успешного удаления, что исключает рассинхронизацию с БД
    
    // Импортируем функцию удаления размеров динамически
    import('./dimensionDisplay/index.js').then(async module => {
        // Удаляем размеры модели перед удалением самой модели
        if (typeof module.removeModelDimensions === 'function') {
            console.log('Удаляем размеры модели:', container.name || container.uuid);
            module.removeModelDimensions(container);
        }
        
        // Освобождаем ресурсы геометрии и материалов
        container.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            if (material.map) material.map.dispose();
                            material.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            }
        });
        
        // Удаляем объект из сцены
        scene.remove(container);
        
        // Удаляем объект из массива размещенных объектов
        const index = placedObjects.indexOf(container);
        if (index > -1) {
            placedObjects.splice(index, 1);
        }

        // Обновляем состояния коллизий для всех оставшихся объектов (только для одиночного удаления)
        if (!isMassRemoval && placedObjects.length > 0) {
            try {
                const { checkAllObjectsPositions } = await import('./collisionDetection.js');
                checkAllObjectsPositions();
                console.log('Обновлены состояния коллизий после удаления объекта:', container.userData.id);
            } catch (error) {
                console.warn('Не удалось обновить состояния коллизий:', error);
            }
        }

        // 2. СИНХРОНИЗАЦИЯ С БД - обновляем базу данных (только для одиночного удаления)
        if (!isMassRemoval) {
            try {
                await updateSessionForRemovedObject(container, isMassRemoval);
            } catch (error) {
                console.error('Ошибка при синхронизации с БД:', error);
            }
        } else {
            console.log('Массовое удаление: пропускаем API синхронизацию для объекта', container.userData.id);
        }
    });
}

/**
 * Оптимизированная функция для массового удаления объектов
 * @param {Array} containers - Массив контейнеров для удаления
 * @param {string} modelName - Имя модели (для объектов одного типа)
 */
export async function removeObjectsBatch(containers, modelName = null) {
    if (!containers || containers.length === 0) return;
    
    console.log(`Начинаем массовое удаление ${containers.length} объектов`);
    
    // 1. Быстрое удаление из сцены и массива без API вызовов
    const removedObjectIds = [];
    
    for (const container of containers) {
        if (!container) continue;
        
        const objectId = container.userData.id;
        const objectModelName = container.userData.modelName || modelName;
        
        // Удаляем размеры модели (если модуль доступен)
        try {
            const dimensionModule = await import('./dimensionDisplay/index.js');
            if (typeof dimensionModule.removeModelDimensions === 'function') {
                dimensionModule.removeModelDimensions(container);
            }
        } catch (error) {
            console.warn('Dimension module not available:', error);
        }
        
        // Освобождаем ресурсы
        container.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            if (material.map) material.map.dispose();
                            material.dispose();
                        });
                    } else {
                        if (child.material.map) child.material.map.dispose();
                        child.material.dispose();
                    }
                }
            }
        });
        
        // Удаляем из сцены и массива
        scene.remove(container);
        const index = placedObjects.indexOf(container);
        if (index > -1) {
            placedObjects.splice(index, 1);
        }
        
        removedObjectIds.push(objectId);
    }
    
    // 2. Единократное обновление базы данных для всех объектов
    try {
        await updateSessionForBatchRemoval(removedObjectIds);
        console.log(`Успешно удалено ${removedObjectIds.length} объектов из БД`);
    } catch (error) {
        console.error('Ошибка при массовом обновлении БД:', error);
    }
    
    // 3. Единократное обновление UI
    try {
        const { refreshAllModelCounters } = await import('../sidebar.js');
        await refreshAllModelCounters();
        console.log('Sidebar обновлен после массового удаления');
    } catch (error) {
        console.error('Ошибка при обновлении sidebar:', error);
    }

    // 4. Обновляем состояния коллизий для всех оставшихся объектов (если они есть)
    if (placedObjects.length > 0) {
        try {
            const { checkAllObjectsPositions } = await import('./collisionDetection.js');
            checkAllObjectsPositions();
            console.log('Обновлены состояния коллизий после массового удаления');
        } catch (error) {
            console.warn('Не удалось обновить состояния коллизий после массового удаления:', error);
        }
    }
}

/**
 * Обновляет сессию в БД при массовом удалении объектов
 * @param {Array} objectIds - Массив ID удаленных объектов
 */
async function updateSessionForBatchRemoval(objectIds) {
    try {
        const userId = sessionStorage.getItem('userId');
        if (!userId) {
            console.error('No user ID found');
            return;
        }

        // Получаем актуальные данные сессии
        const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
        if (!sessionResponse.ok) {
            throw new Error('Failed to get session');
        }
        const { session } = await sessionResponse.json();
        const sessionData = session || { quantities: {}, placedObjects: [] };

        // Удаляем все объекты из массива placedObjects одним проходом
        sessionData.placedObjects = sessionData.placedObjects.filter(obj => !objectIds.includes(obj.id));

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

        console.log(`Массовое удаление: обновлена сессия для ${objectIds.length} объектов`);
    } catch (error) {
        console.error('Error in batch session update:', error);
        throw error;
    }
}

/**
 * Обновляет сессию в БД при удалении объекта (оптимизированная версия)
 * @param {Object} container - Контейнер объекта
 * @param {boolean} isMassRemoval - Флаг массового удаления
 */
async function updateSessionForRemovedObject(container, isMassRemoval) {
    try {
        const userId = sessionStorage.getItem('userId');
        if (!userId) {
            console.error('No user ID found');
            return;
        }

        // Получаем актуальные данные сессии
        let sessionData = null;
        try {
            const { getSessionData } = await import('../ui/dragAndDrop.js');
            sessionData = await getSessionData();
        } catch (error) {
            console.error('Error getting session data:', error);
            throw new Error('Failed to get session data');
        }

        // Удаляем объект из массива placedObjects в сессии
        const objectIndex = sessionData.placedObjects.findIndex(obj => obj.id === container.userData.id);
        if (objectIndex !== -1) {
            sessionData.placedObjects.splice(objectIndex, 1);
        }

        // Обновляем количество модели в quantities только если это не массовое удаление
        if (!isMassRemoval) {
            if (!sessionData.quantities) {
                sessionData.quantities = {};
            }
            const modelName = container.userData.modelName;
            const currentQuantity = sessionData.quantities[modelName] || 0;
            sessionData.quantities[modelName] = currentQuantity + 1;
            console.log(`Increased quantity for ${modelName} to ${currentQuantity + 1}`);

            // Обновляем счетчик размещенных объектов в UI с передачей актуального количества
            const placedCount = sessionData.placedObjects.filter(obj => obj.modelName === modelName).length;
            updateModelPlacementCounter(modelName, placedCount);
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

        // Обновляем счетчики в sidebar после успешного удаления (только если не массовое удаление)
        if (!isMassRemoval) {
            try {
                const { refreshAllModelCounters } = await import('../sidebar.js');
                await refreshAllModelCounters();
            } catch (error) {
                console.error('Error updating sidebar counters after removal:', error);
            }
        } else {
            console.log('Массовое удаление: пропускаем обновление sidebar для объекта', container.userData.id);
        }

        console.log('Session updated successfully after removing object:', container.userData.id);
    } catch (error) {
        console.error('Error updating session after object removal:', error);
    }
}