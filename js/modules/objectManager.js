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

// Максимальное количество моделей в кэше
const MAX_CACHE_SIZE = 10;

// Генератор уникальных идентификаторов
let nextObjectId = 1;

/**
 * Обрабатывает загруженную модель
 * @param {Object} container - Контейнер модели
 * @param {String} modelName - Имя файла модели
 * @param {Object} position - Позиция для размещения объекта
 */
function processLoadedModel(container, modelName, position) {
    // Проверяем, есть ли в контейнере хотя бы один дочерний объект
    if (container.children.length === 0) {
        console.error("Ошибка: контейнер пуст, нет дочерних объектов");
        return;
    }
    
    // Добавляем контейнер в сцену
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
}

/**
 * Очищает кэш моделей
 */
export function clearModelCache() {
    modelCache.forEach((cachedModel, modelName) => {
        // Освобождаем ресурсы геометрии и материалов
        if (cachedModel.geometry) {
            cachedModel.geometry.dispose();
        }
        if (cachedModel.material) {
            if (Array.isArray(cachedModel.material)) {
                cachedModel.material.forEach(mat => mat.dispose());
            } else {
                cachedModel.material.dispose();
            }
        }
    });
    modelCache.clear();
}

/**
 * Управляет размером кэша моделей
 */
function manageCacheSize() {
    if (modelCache.size > MAX_CACHE_SIZE) {
        // Удаляем самую старую модель из кэша
        const oldestKey = modelCache.keys().next().value;
        const oldestModel = modelCache.get(oldestKey);
        
        // Освобождаем ресурсы
        if (oldestModel.geometry) {
            oldestModel.geometry.dispose();
        }
        if (oldestModel.material) {
            if (Array.isArray(oldestModel.material)) {
                oldestModel.material.forEach(mat => mat.dispose());
            } else {
                oldestModel.material.dispose();
            }
        }
        
        modelCache.delete(oldestKey);
    }
}

/**
 * Генерирует уникальный ID для объекта
 * @returns {String} Уникальный ID
 */
export function generateObjectId() {
    return `object_${nextObjectId++}`;
}

/**
 * Загружает 3D-модель и размещает ее на площадке
 * @param {String} modelName - Имя файла модели
 * @param {Object} position - Позиция для размещения объекта
 * @param {Boolean} isRestoring - Флаг восстановления объекта из сессии
 */
export async function loadAndPlaceModel(modelName, position, isRestoring = false) {
    console.log("loadAndPlaceModel вызван с:", modelName, position, "isRestoring:", isRestoring);
    
    const modelPath = `models/${modelName}`;
    console.log("Полный путь к модели:", modelPath);
    
    // Определяем формат файла
    const fileExtension = modelName.split('.').pop().toLowerCase();
    console.log("Расширение файла:", fileExtension);
    
    // Создаем контейнер для модели (группа в Three.js)
    const container = new THREE.Group();
    container.name = `modelContainer_${modelName}_${generateObjectId()}`;
    container.userData.id = generateObjectId();
    container.userData.modelName = modelName;
    container.userData.currentSize = 1;
    
    // Устанавливаем позицию контейнера
    if (position) {
        console.log("Устанавливаем позицию из параметра:", position);
        container.position.set(position.x, position.y, position.z);
        
        // Сохраняем координаты в userData
        container.userData.coordinates = {
            x: position.x.toFixed(2),
            y: position.y.toFixed(2),
            z: position.z.toFixed(2)
        };
        
        // Логируем координаты размещения
        console.log(`Модель ${modelName} размещена по координатам:`, {
            x: position.x.toFixed(2),
            y: position.y.toFixed(2),
            z: position.z.toFixed(2)
        });
    } else {
        console.log("Позиция не указана, размещаем в центре (0,0,0)");
        container.position.set(0, 0, 0);
        container.userData.coordinates = { x: "0.00", y: "0.00", z: "0.00" };
    }
    
    try {
        // Проверяем наличие модели в кэше
        if (modelCache.has(modelName)) {
            console.log("Используем модель из кэша:", modelName);
            const cachedModel = modelCache.get(modelName);
            container.add(cachedModel.clone());
            processLoadedModel(container, modelName, position);
            
            // Обновляем сессию в базе данных только если это не восстановление
            if (!isRestoring) {
                try {
                    // Получаем user_id из sessionStorage
                    const userId = sessionStorage.getItem('userId');

                    if (!userId) {
                        console.error('No user ID found');
                        return;
                    }

                    // Получаем текущую сессию
                    const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
                    if (!sessionResponse.ok) {
                        throw new Error('Failed to get session');
                    }

                    const { session } = await sessionResponse.json();
                    const sessionData = session || { quantities: {}, placedObjects: [] };

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

                    // Обновляем количество модели в quantities
                    if (!sessionData.quantities) {
                        sessionData.quantities = {};
                    }
                    const currentQuantity = sessionData.quantities[modelName] || 0;
                    sessionData.quantities[modelName] = Math.max(0, currentQuantity - 1);

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

                    // Обновляем счетчик размещенных объектов в UI
                    const placedCount = sessionData.placedObjects.filter(obj => obj.modelName === modelName).length;
                    updateModelPlacementCounter(modelName, placedCount);
                } catch (error) {
                    console.error('Error updating session for cached model:', error);
                }
            }
            return;
        }

        // Выбираем загрузчик в зависимости от формата файла
        console.log("Получаем загрузчик для формата:", fileExtension);
        const { loader, method } = getLoaderByExtension(fileExtension);
        
        // Загружаем модель с использованием соответствующего загрузчика
        loader.load(
            modelPath,
            async (result) => {
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

                            // Оптимизация материалов
                            if (child.material) {
                                // Если материал в массиве, обрабатываем каждый
                                const materials = Array.isArray(child.material) ? child.material : [child.material];
                                materials.forEach(material => {
                                    // Отключаем отражения и настраиваем материал
                                    material.metalness = 0;
                                    material.roughness = 1;
                                    material.envMapIntensity = 0;
                                    material.needsUpdate = true;
                                    
                                    // Оптимизация текстур
                                    if (material.map) {
                                        material.map.minFilter = THREE.LinearFilter;
                                        material.map.magFilter = THREE.LinearFilter;
                                        material.map.anisotropy = 1;
                                    }
                                });
                            }

                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Если у материала нет прозрачности, устанавливаем прозрачность в 1
                            if (child.material && child.material.transparent) {
                                child.material.opacity = 1.0;
                            }

                            // Если это зона безопасности, меняем цвет на белый
                            if (child.name && child.name.endsWith('safety_zone')) {
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
                    return;
                }
                
                // Добавляем контейнер в сцену
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

                // Обновляем сессию в базе данных только если это не восстановление
                if (!isRestoring) {
                    try {
                        // Получаем user_id из sessionStorage
                        const userId = sessionStorage.getItem('userId');

                        if (!userId) {
                            console.error('No user ID found');
                            return;
                        }

                        // Получаем текущую сессию
                        const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
                        if (!sessionResponse.ok) {
                            throw new Error('Failed to get session');
                        }

                        const { session } = await sessionResponse.json();
                        const sessionData = session || { quantities: {}, placedObjects: [] };

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

                        // Обновляем количество модели в quantities
                        if (!sessionData.quantities) {
                            sessionData.quantities = {};
                        }
                        const currentQuantity = sessionData.quantities[modelName] || 0;
                        sessionData.quantities[modelName] = Math.max(0, currentQuantity - 1);

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

                        // Обновляем счетчик размещенных объектов в UI
                        const placedCount = sessionData.placedObjects.filter(obj => obj.modelName === modelName).length;
                        updateModelPlacementCounter(modelName, placedCount);

                        console.log('Session updated successfully for new object:', objectData);
                        console.log('Updated quantities:', sessionData.quantities);
                    } catch (error) {
                        console.error('Error updating session:', error);
                    }
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
            }
        );
    } catch (error) {
        console.error(error.message);
    }
}

/**
 * Удаляет объект из сцены и обновляет UI
 * @param {Object} container - Контейнер модели для удаления
 * @param {boolean} isMassRemoval - Флаг массового удаления (не увеличивать количество)
 */
export function removeObject(container, isMassRemoval = false) {
    if (!container) return;
    
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

        // Обновляем сессию в базе данных после удаления объекта
        try {
            // Получаем user_id из sessionStorage
            const userId = sessionStorage.getItem('userId');

            if (!userId) {
                console.error('No user ID found');
                return;
            }

            // Получаем текущую сессию
            const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
            if (!sessionResponse.ok) {
                throw new Error('Failed to get session');
            }

            const { session } = await sessionResponse.json();
            const sessionData = session || { quantities: {}, placedObjects: [] };

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

                // Обновляем счетчик размещенных объектов в UI
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

            console.log('Session updated successfully after removing object:', container.userData.id);
            if (!isMassRemoval) {
                console.log('Updated quantities:', sessionData.quantities);
            }
        } catch (error) {
            console.error('Error updating session after object removal:', error);
        }
        
        // Перепроверяем все объекты
        checkAllObjectsPositions();
    }).catch(error => {
        console.error('Ошибка при удалении размеров модели:', error);
        
        // Все равно удаляем объект и обновляем сцену
        scene.remove(container);
        
        const index = placedObjects.indexOf(container);
        if (index > -1) {
            placedObjects.splice(index, 1);
        }
        
        checkAllObjectsPositions();
    });
    
    // Дополнительно ищем и удаляем объекты размеров напрямую из сцены
    // Это резервный механизм, если динамический импорт не сработает
    if (container.uuid) {
        const dimensionsName = 'dimensions_' + container.uuid;
        scene.children.forEach(child => {
            if (child.name === dimensionsName) {
                console.log('Удаляем объект размеров напрямую из сцены:', child.name);
                scene.remove(child);
            }
        });
    }
}