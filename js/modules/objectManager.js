/**
 * Основной модуль для управления объектами на площадке
 */
import * as THREE from 'three';
import { MODEL_ROTATIONS, ELEMENT_INFO } from '../config.js';
import { scene } from '../scene.js';
import { showNotification } from '../utils.js';
import { getLoaderByExtension } from './loaders.js';
import { saveInitialPosition } from './positionHelpers.js';
import { scaleModelToSize, changeModelSize, autoConvertUnits } from './objectOperations.js';
import { checkAndHighlightObject, checkAllObjectsPositions } from './collisionDetection.js';
import { showModelDimensions } from './dimensionDisplay/index.js';
import { updateSafetyZonesVisibility } from '../core/safetyManager.js';

// Массив для хранения размещенных объектов
export let placedObjects = [];

// Генератор уникальных идентификаторов
let nextObjectId = 1;

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
 */
export function loadAndPlaceModel(modelName, position) {
    console.log("loadAndPlaceModel вызван с:", modelName, position);
    
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
    container.userData.currentSize = 1; // Устанавливаем временный размер по умолчанию
    
    // Устанавливаем позицию контейнера
    if (position) {
        console.log("Устанавливаем позицию из параметра:", position);
        container.position.set(position.x, position.y, position.z);
    } else {
        console.log("Позиция не указана, размещаем в центре (0,0,0)");
        container.position.set(0, 0, 0);
        showNotification("Объект помещен в центр площадки", false);
    }
    
    try {
        // Выбираем загрузчик в зависимости от формата файла
        console.log("Получаем загрузчик для формата:", fileExtension);
        const { loader, method } = getLoaderByExtension(fileExtension);
        console.log("Выбран загрузчик:", method);
        
        // Загружаем модель с использованием соответствующего загрузчика
        console.log("Начинаем загрузку модели:", modelPath);
        loader.load(
            modelPath,
            (result) => {
                console.log("Модель успешно загружена:", modelPath);
                console.log("Тип результата:", typeof result);
                
                let modelObject;
                
                // Обработка результата загрузки в зависимости от формата
                if (method === 'gltf') {
                    console.log("Обрабатываем GLTF/GLB модель");
                    modelObject = result.scene;
                    
                    // Для GLTF включаем отбрасывание теней для всех дочерних объектов
                    modelObject.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                            
                            // Если у материала нет прозрачности, устанавливаем прозрачность в 1
                            if (child.material && child.material.transparent) {
                                child.material.opacity = 1.0;
                            }

                            // Если это зона безопасности, меняем цвет на белый
                            if (child.name && child.name.endsWith('safety_zone')) {
                                if (child.material) {
                                    // Создаем новый материал с нужными параметрами
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
                                }
                            }
                        }
                    });
                    
                    container.add(modelObject);
                    console.log("GLTF модель добавлена в контейнер");
                } 
                else if (method === 'stl') {
                    console.log("Обрабатываем STL модель");
                    // Для STL создаем новый меш с загруженной геометрией
                    const material = new THREE.MeshStandardMaterial({ 
                        color: 0x7F7F7F,
                        metalness: 0.2,
                        roughness: 0.8
                    });
                    const mesh = new THREE.Mesh(result, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;

                    // Если это зона безопасности, меняем цвет на белый
                    if (mesh.name && mesh.name.endsWith('safety_zone')) {
                        const newMaterial = new THREE.MeshStandardMaterial({
                            color: 0xFFFFFF,
                            transparent: false,
                            opacity: 1.0,
                            metalness: 0,
                            roughness: 0.5,
                            emissive: 0xFFFFFF,
                            emissiveIntensity: 0.2
                        });
                        mesh.material = newMaterial;
                    }

                    container.add(mesh);
                    console.log("STL модель добавлена в контейнер");
                }
                else if (method === 'fbx') {
                    console.log("Обрабатываем FBX модель");
                    // Для FBX добавляем загруженный объект напрямую
                    result.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;

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
                                }
                            }
                        }
                    });
                    container.add(result);
                    console.log("FBX модель добавлена в контейнер");
                }
                
                // Проверяем, есть ли в контейнере хотя бы один дочерний объект
                if (container.children.length === 0) {
                    console.error("Ошибка: контейнер пуст, нет дочерних объектов");
                    showNotification(`Ошибка загрузки модели ${modelName}: контейнер пуст`, true);
                    return;
                }
                
                // Добавляем контейнер в сцену
                scene.add(container);
                console.log("Контейнер добавлен в сцену, scene.children.length:", scene.children.length);
                console.log("Дочерних объектов в контейнере:", container.children.length);
                
                // Применяем особые повороты для определенных моделей
                if (MODEL_ROTATIONS[modelName]) {
                    const rotation = MODEL_ROTATIONS[modelName];
                    container.rotation.x = rotation.x;
                    container.rotation.y = rotation.y;
                    container.rotation.z = rotation.z;
                }
                
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
                
                // Проверяем все объекты на коллизии
                checkAllObjectsPositions();
                
                // Показываем уведомление, если есть коллизия
                if (container.userData.hasCollision) {
                    showNotification("Внимание! Обнаружено пересечение с другим объектом.", true);
                }
                
                // Автоматически показываем размеры модели при добавлении на площадку, если пользователь не скрыл размеры
                if (localStorage.getItem('dimensionLabelsHidden') !== 'true') {
                    showModelDimensions(container);
                }
                
                // После успешной загрузки модели обновляем видимость безопасных зон
                updateSafetyZonesVisibility();
            },
            // Обработчик загрузки (прогресс)
            (xhr) => {
                const percentComplete = (xhr.loaded / xhr.total) * 100;
                console.log(`Загрузка модели ${modelName}: ${percentComplete.toFixed(2)}%`);
            },
            // Обработчик ошибок
            (error) => {
                console.error(`Ошибка при загрузке модели ${modelName}:`, error);
                showNotification(`Ошибка загрузки модели ${modelName}`, true);
            }
        );
    } catch (error) {
        console.error(error.message);
        showNotification(error.message, true);
    }
}

/**
 * Удаляет объект из сцены и обновляет UI
 * @param {Object} container - Контейнер модели для удаления
 */
export function removeObject(container) {
    if (!container) return;
    
    // Импортируем функцию удаления размеров динамически
    import('./dimensionDisplay/index.js').then(module => {
        // Удаляем размеры модели перед удалением самой модели
        if (typeof module.removeModelDimensions === 'function') {
            console.log('Удаляем размеры модели:', container.name || container.uuid);
            module.removeModelDimensions(container);
        }
        
        // Удаляем объект из сцены
        scene.remove(container);
        
        // Удаляем объект из массива размещенных объектов
        const index = placedObjects.indexOf(container);
        if (index > -1) {
            placedObjects.splice(index, 1);
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
