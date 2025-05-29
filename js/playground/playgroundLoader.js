/**
 * Модуль для загрузки моделей площадки
 */
import { scene } from '../scene.js';
import { showNotification } from '../utils.js';
import { ground, updateGroundReferences, updatePlaygroundDimensions } from './playgroundCore.js';
import { removeAllYellowElements } from './playgroundSafetyManager.js';
import { updatePlaygroundLabels } from './playgroundUI.js';
import { createSimplePlayground } from './playgroundCreator.js';
import * as THREE from 'three';


/**
 * Загрузка модели площадки
 * @param {String} modelName - Имя файла модели площадки (по умолчанию 'playground.glb')
 * @param {Number} width - Ширина площадки (опционально)
 * @param {Number} length - Длина площадки (опционально)
 * @param {String} color - Цвет площадки (серый, черный, зеленый, коричневый)
 * @returns {Promise} Промис, который разрешается, когда площадка загружена
 */
export function loadPlayground(modelName = 'playground.glb', width = null, length = null, color = null) {
    let userWidth = 40;
    let userLength = 30;
    let userColor = 'серый'; // Добавляем переменную с цветом по умолчанию
    
    // Получаем размеры площадки
    if (width && length) {
        userWidth = width;
        userLength = length;
    } else if (window.selectedPlaygroundWidth && window.selectedPlaygroundLength) {
        userWidth = window.selectedPlaygroundWidth;
        userLength = window.selectedPlaygroundLength;
    } else {
        const widthInput = document.getElementById("playgroundWidth");
        const lengthInput = document.getElementById("playgroundLength");
        if (widthInput && lengthInput) {
            userWidth = parseFloat(widthInput.value) || 40;
            userLength = parseFloat(lengthInput.value) || 30;
        }
    }
    
    // Получаем цвет площадки
    if (color) {
        userColor = color;
    } else if (window.selectedPlaygroundColor) {
        userColor = window.selectedPlaygroundColor;
    }
    try { removeExistingPlaygrounds(); } catch (error) {}
    updateGroundReferences(null, null);
    const simplePlane = createSimplePlayground(userWidth, userLength, userColor);
    // Устанавливаем позицию площадки на Y=0
    if (simplePlane && simplePlane.position) simplePlane.position.y = 0;
    updatePlaygroundDimensions(userWidth, userLength);
    
    // Сохраняем цвет площадки в userData
    if (simplePlane && simplePlane.userData) {
        simplePlane.userData.groundColor = userColor;
    }
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            window.isLoading = false;
        }
    }, 500);
    return Promise.resolve(simplePlane);
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
 * @param {Number} width - Ширина площадки (опционально)
 * @param {Number} length - Длина площадки (опционально)
 * @param {String} color - Цвет площадки (опционально)
 */
function processLoadedModel(gltf, modelName, resolve, width = null, length = null, color = null) {
    console.log('processLoadedModel для', modelName);
    
    // Получаем модель
    const playgroundModel = gltf.scene;
    console.log('Получена GLTF сцена:', playgroundModel);
    
    // Настройка модели площадки
    playgroundModel.position.set(0, 0, 0); // всегда Y=0
    playgroundModel.rotation.set(0, 0, 0);
    playgroundModel.scale.set(1, 1, 1);
    
    // Добавляем явное имя объекту для лучшей идентификации
    playgroundModel.name = "playground_" + modelName;
    
    // Помечаем, что это площадка (для предотвращения выбора)
    playgroundModel.userData.isPlayground = true;
    
    // Добавляем модель в сцену
    scene.add(playgroundModel);
    console.log('Модель площадки добавлена в сцену, scene.children.length:', scene.children.length);
    
    // --- Новый блок: ищем основной меш и масштабируем по форме ---
    // Определяем нужные размеры
    let userWidth = 40;
    let userLength = 30;
    if (width && length) {
        userWidth = width;
        userLength = length;
    } else if (window.selectedPlaygroundWidth && window.selectedPlaygroundLength) {
        userWidth = window.selectedPlaygroundWidth;
        userLength = window.selectedPlaygroundLength;
    } else {
        const widthInput = document.getElementById("playgroundWidth");
        const lengthInput = document.getElementById("playgroundLength");
        if (widthInput && lengthInput) {
            userWidth = parseFloat(widthInput.value) || 40;
            userLength = parseFloat(lengthInput.value) || 30;
        }
    }

    // Ищем основной меш с максимальной площадью
    let mainMesh = null;
    let maxArea = 0;
    playgroundModel.traverse((child) => {
        if (child.isMesh) {
            const bbox = new THREE.Box3().setFromObject(child);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            const area = size.x * size.z;
            if (area > maxArea) {
                maxArea = area;
                mainMesh = child;
            }
        }
    });
    if (mainMesh) {
        // Вычисляем текущий размер меша
        const bbox = new THREE.Box3().setFromObject(mainMesh);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        // Вычисляем масштаб для достижения нужных размеров
        const scaleX = userWidth / size.x;
        const scaleZ = userLength / size.z;
        playgroundModel.scale.set(scaleX, 1, scaleZ);
        console.log(`Применён точный масштаб: scaleX=${scaleX}, scaleZ=${scaleZ}`);
    }
    // --- Конец нового блока ---

    // Вычисляем и сохраняем оригинальные размеры модели
    const boundingBox = new THREE.Box3().setFromObject(playgroundModel);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    playgroundModel.userData.originalWidth = size.x;
    playgroundModel.userData.originalHeight = size.y;
    playgroundModel.userData.originalDepth = size.z;
    
    updatePlaygroundDimensions(userWidth, userLength);
    
    // Настраиваем тени и получаем ссылку на первый найденный меш
    const localGroundMesh = setupModelMeshes(playgroundModel);
    updateGroundReferences(playgroundModel, localGroundMesh);
    playgroundModel.userData.modelName = modelName;
    updatePlaygroundLabels(userWidth, userLength);
    removeAllYellowElements();
    showNotification(`Площадка загружена: ${modelName} (${userWidth}м × ${userLength}м)`, false);
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            const loadingText = document.querySelector('.loading-text');
            if (loadingText) {
                loadingText.textContent = 'Площадка готова!';
            }
            loadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                loadingOverlay.classList.add('hidden');
                loadingOverlay.classList.remove('fade-out');
                window.isLoading = false;
            }, 500);
        }
    }, 1000);
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
        
        // Скрываем индикатор загрузки с задержкой и анимацией
        setTimeout(() => {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                // Обновляем текст перед скрытием
                const loadingText = document.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = 'Загружена базовая площадка';
                }
                
                // Добавляем класс для анимации скрытия
                loadingOverlay.classList.add('fade-out');
                
                // Через 500ms полностью скрываем элемент
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                    loadingOverlay.classList.remove('fade-out');
                    window.isLoading = false;
                }, 500);
            }
        }, 1000);
        
        // Разрешаем промис с новой площадкой
        console.log('Возвращаем simplePlane в resolve:', simplePlane);
        resolve(simplePlane);
    } catch (e) {
        console.error('Ошибка при создании простой площадки:', e);
        showNotification(`Критическая ошибка при создании площадки`, true);
        
        // Скрываем индикатор загрузки в случае критической ошибки с анимацией
        setTimeout(() => {
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                // Обновляем текст перед скрытием
                const loadingText = document.querySelector('.loading-text');
                if (loadingText) {
                    loadingText.textContent = 'Произошла ошибка загрузки';
                }
                
                // Добавляем класс для анимации скрытия
                loadingOverlay.classList.add('fade-out');
                
                // Через 500ms полностью скрываем элемент
                setTimeout(() => {
                    loadingOverlay.classList.add('hidden');
                    loadingOverlay.classList.remove('fade-out');
                    window.isLoading = false;
                }, 500);
            }
        }, 1000);
        
        // Разрешаем промис с null в случае ошибки
        console.log('Возвращаем null в resolve из-за критической ошибки');
        resolve(null);
    }
}
