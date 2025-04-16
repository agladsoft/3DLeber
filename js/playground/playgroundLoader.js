/**
 * Модуль для загрузки моделей площадки
 */
import { scene } from '../scene.js';
import { showNotification } from '../utils.js';
import { ground, groundMesh, playgroundWidth, playgroundLength, updateGroundReferences, updatePlaygroundDimensions } from './playgroundCore.js';
import { removeAllYellowElements } from './playgroundSafetyManager.js';
import { updatePlaygroundLabels } from './playgroundUI.js';
import { createSimplePlayground } from './playgroundCreator.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Создаем загрузчик GLTF для загрузки модели площадки
let gltfLoader;
try {
    gltfLoader = new GLTFLoader();
    console.log('GLTFLoader успешно создан');
} catch (error) {
    console.error('Ошибка при создании GLTFLoader:', error);
    // Создаем заглушку для loader, чтобы избежать ошибок
    gltfLoader = {
        load: function(url, onLoad, onProgress, onError) {
            console.error('GLTFLoader не доступен, не могу загрузить:', url);
            if (onError) onError(new Error('GLTFLoader не доступен'));
        }
    };
}

/**
 * Загрузка модели площадки
 * @param {String} modelName - Имя файла модели площадки (по умолчанию 'playground.glb')
 * @returns {Promise} Промис, который разрешается, когда площадка загружена
 */
export function loadPlayground(modelName = 'playground.glb') {
    console.log('Начинаем загрузку площадки:', modelName);
    console.log('Текущее состояние ground:', ground);
    
    // Проверка на корректность scene
    if (!scene) {
        console.error('Scene is undefined, cannot load playground');
        return Promise.resolve(null);
    }
    
    try {
        // Очищаем сцену от предыдущих площадок
        removeExistingPlaygrounds();
    } catch (error) {
        console.error('Ошибка при очистке сцены:', error);
    }
    
    // Обнуляем глобальные переменные через функцию обновления
    console.log('Сбрасываем ground и groundMesh в null');
    updateGroundReferences(null, null);
    console.log('После сброса, ground:', ground);

    return new Promise((resolve) => {
        try {
            // Формируем правильный путь к модели
            const modelPath = `models/playgrounds/${modelName}`;
            console.log('Полный путь к модели:', modelPath);
            
            // Проверяем наличие загрузчика
            if (!gltfLoader || typeof gltfLoader.load !== 'function') {
                console.error('GLTFLoader не инициализирован или неверного типа');
                // Создаем простую площадку вместо загрузки модели
                console.log('Создаем простую площадку из-за отсутствия загрузчика');
                const simplePlane = createSimplePlayground();
                resolve(simplePlane);
                return;
            }
            
            // Загружаем модель площадки из папки playgrounds
            gltfLoader.load(
                modelPath,
                // Обработчик успешной загрузки
                (gltf) => {
                    try {
                        console.log('Модель площадки успешно загружена через GLTFLoader:', modelName);
                        processLoadedModel(gltf, modelName, resolve);
                    } catch (error) {
                        console.error('Ошибка при обработке загруженной модели:', error);
                        handleLoadError(error, modelName, resolve);
                    }
                },
                // Обработчик прогресса загрузки
                (xhr) => {
                    if (xhr && xhr.total) {
                        console.log(`Загрузка площадки ${modelName}: ${Math.round(xhr.loaded / xhr.total * 100)}%`);
                    } else {
                        console.log(`Загрузка площадки ${modelName}: progress event без total`);
                    }
                },
                // Обработчик ошибок
                (error) => {
                    console.error('Ошибка при загрузке модели через GLTFLoader:', error);
                    handleLoadError(error, modelName, resolve);
                }
            );
        } catch (error) {
            console.error('Критическая ошибка при попытке загрузки модели:', error);
            handleLoadError(error, modelName, resolve);
        }
    });
}

/**
 * Удаляет все существующие площадки из сцены
 */
function removeExistingPlaygrounds() {
    console.log('Ищем и удаляем все существующие площадки и объекты ground');
    
    // Проверяем, что scene определена и доступна
    if (!scene) {
        console.warn('Scene is undefined, cannot remove existing playgrounds');
        return;
    }
    
    try {
        // Создаем массив для объектов, которые нужно удалить
        // (нельзя удалять объекты прямо во время traverse)
        const objectsToRemove = [];
        
        scene.traverse((object) => {
            // Ищем объекты, которые могут быть площадками
            if (object && object.userData && 
                (object.userData.modelName === 'playground.glb' || 
                 object.userData.modelName === 'simple_playground' ||
                 (object.userData.modelName && object.userData.modelName.includes('playground')) ||
                 (object.name && object.name.includes('ground')) ||
                 (object.name && object.name.includes('playground')))) {
                
                console.log('Найдена существующая площадка:', object.userData.modelName || object.name);
                objectsToRemove.push(object);
            }
        });
        
        // Удаляем все найденные объекты
        objectsToRemove.forEach(object => {
            console.log('Удаляем объект из сцены:', object.userData.modelName || object.name);
            scene.remove(object);
        });
        
        console.log(`Удалено ${objectsToRemove.length} объектов площадки`);
    } catch (error) {
        console.error('Ошибка при удалении существующих площадок:', error);
    }
}

/**
 * Обрабатывает загруженную модель площадки
 * @param {Object} gltf - Загруженная модель GLTF
 * @param {String} modelName - Имя файла модели
 * @param {Function} resolve - Функция resolve для промиса
 */
function processLoadedModel(gltf, modelName, resolve) {
    console.log('processLoadedModel для', modelName);
    
    // Получаем модель
    const playgroundModel = gltf.scene;
    console.log('Получена GLTF сцена:', playgroundModel);
    
    // Настройка модели площадки
    playgroundModel.position.set(0, 0, 0);
    playgroundModel.rotation.set(0, 0, 0);
    playgroundModel.scale.set(1, 1, 1);
    
    // Добавляем явное имя объекту для лучшей идентификации
    playgroundModel.name = "playground_" + modelName;
    
    // Помечаем, что это площадка (для предотвращения выбора)
    playgroundModel.userData.isPlayground = true;
    
    // Добавляем модель в сцену
    scene.add(playgroundModel);
    console.log('Модель площадки добавлена в сцену, scene.children.length:', scene.children.length);
    
    // Вычисляем и сохраняем оригинальные размеры модели
    const boundingBox = new THREE.Box3().setFromObject(playgroundModel);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    console.log("Оригинальные размеры модели площадки:", {
        width: size.x,
        height: size.y,
        depth: size.z
    });

    // Сохраняем оригинальные размеры в userData
    playgroundModel.userData.originalWidth = size.x;
    playgroundModel.userData.originalHeight = size.y;
    playgroundModel.userData.originalDepth = size.z;
    
    // Проверяем, есть ли пользовательские размеры в полях ввода
    const widthInput = document.getElementById("playgroundWidth");
    const lengthInput = document.getElementById("playgroundLength");
    let userWidth = 10;
    let userLength = 10;
    
    if (widthInput && lengthInput) {
        userWidth = parseFloat(widthInput.value) || 10;
        userLength = parseFloat(lengthInput.value) || 10;
        console.log("Используем пользовательские размеры:", userWidth, userLength);
    }
    
    // Обновляем размеры площадки с учетом пользовательских настроек
    updatePlaygroundDimensions(userWidth, userLength);
    
    // Масштабируем модель до заданных пользователем размеров
    if (size.x > 0 && size.z > 0) {
        const scaleX = userWidth / size.x;
        const scaleZ = userLength / size.z;
        playgroundModel.scale.set(scaleX, 1, scaleZ);
        console.log(`Масштабирование модели: scaleX=${scaleX}, scaleZ=${scaleZ}`);
    }
    
    console.log('После updatePlaygroundDimensions:', playgroundWidth, playgroundLength);
    
    // Настраиваем тени и получаем ссылку на первый найденный меш
    const localGroundMesh = setupModelMeshes(playgroundModel);
    console.log('Найденный меш площадки:', localGroundMesh);
    
    // Сохраняем ссылки на модель площадки и её основной меш через функцию обновления
    console.log('Сохраняем ссылки на ground и groundMesh');
    updateGroundReferences(playgroundModel, localGroundMesh);
    console.log('После обновления ссылок ground:', ground);
    
    playgroundModel.userData.modelName = modelName;

    // Обновляем UI
    updatePlaygroundLabels(userWidth, userLength);
    
    // Удаляем все элементы безопасной зоны
    removeAllYellowElements();
    
    // Показываем уведомление о смене площадки
    showNotification(`Площадка загружена: ${modelName} (${userWidth}м × ${userLength}м)`, false);
    
    console.log('Завершение processLoadedModel, возвращаем ground:', ground);
    resolve(ground);
}

/**
 * Настраивает меши модели для работы с тенями
 * @param {Object} model - Модель площадки
 */
function setupModelMeshes(model) {
    // Используем локальную переменную вместо прямого изменения импортированной переменной
    let localGroundMesh = null;
    
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Сохраняем ссылку на первый найденный меш в локальную переменную
            if (!localGroundMesh) {
                localGroundMesh = child;
            }
        }
    });
    
    // Возвращаем найденный меш для дальнейшего использования
    return localGroundMesh;
}

/**
 * Обрабатывает ошибку загрузки модели
 * @param {Error} error - Объект ошибки
 * @param {String} modelName - Имя файла модели
 * @param {Function} resolve - Функция resolve для промиса
 */
function handleLoadError(error, modelName, resolve) {
    console.error(`Ошибка при загрузке площадки ${modelName}:`, error);
    console.log('Пытаемся создать простую площадку вместо модели');
    
    try {
        // Обнуляем переменные через функцию обновления
        console.log('Сбрасываем ссылки ground и groundMesh из-за ошибки');
        updateGroundReferences(null, null);
        console.log('После сброса из-за ошибки ground:', ground);
        
        // Если не удалось загрузить модель, создаем простую площадку из плоскости
        console.log('Вызываем createSimplePlayground');
        const simplePlane = createSimplePlayground();
        console.log('Простая площадка успешно создана:', simplePlane);
        console.log('После создания простой площадки ground:', ground);
        
        // Показываем уведомление пользователю
        showNotification(`Не удалось загрузить модель площадки. Создана простая площадка.`, true);
        
        // Разрешаем промис с новой площадкой
        console.log('Возвращаем simplePlane в resolve:', simplePlane);
        resolve(simplePlane);
    } catch (e) {
        console.error('Ошибка при создании простой площадки:', e);
        showNotification(`Критическая ошибка при создании площадки`, true);
        
        // Разрешаем промис с null в случае ошибки
        console.log('Возвращаем null в resolve из-за критической ошибки');
        resolve(null);
    }
}
