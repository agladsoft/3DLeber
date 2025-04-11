/**
 * Модуль для управления 3D-площадкой
 * Адаптирован для работы с Three.js
 */
import { PLAYGROUND, ANIMATION } from './config.js';
import { scene, createGrid, isTopViewActive } from './scene.js';
import { showNotification } from './utils.js';
import { checkAllObjectsPositions } from './objects.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Глобальные переменные для площадки
export let playgroundWidth = PLAYGROUND.defaultWidth;
export let playgroundLength = PLAYGROUND.defaultLength;
export let ground = null;
export let groundMesh = null;

// Создаем загрузчик GLTF для загрузки модели площадки
const gltfLoader = new GLTFLoader();

/**
 * Загрузка модели площадки
 * @param {String} modelName - Имя файла модели площадки (по умолчанию 'playground.glb')
 * @returns {Promise} Промис, который разрешается, когда площадка загружена
 */
export function loadPlayground(modelName = 'playground.glb') {
    console.log('Начинаем загрузку площадки:', modelName);
    
    // Удаляем ВСЕ предыдущие площадки из сцены
    console.log('Ищем и удаляем все существующие площадки и объекты ground');
    scene.traverse((object) => {
        // Ищем объекты, которые могут быть площадками
        if (object.userData && 
            (object.userData.modelName === 'playground.glb' || 
             object.userData.modelName === 'simple_playground' ||
             (object.userData.modelName && object.userData.modelName.includes('playground')))) {
            console.log('Найдена существующая площадка:', object.userData.modelName);
            scene.remove(object);
        }
    });
    
    // Обнуляем глобальные переменные
    ground = null;
    groundMesh = null;

    return new Promise((resolve) => {
        const modelPath = `models/playgrounds/${modelName}`;
        console.log('Полный путь к модели:', modelPath);
        
        // Загружаем модель площадки из папки playgrounds
        gltfLoader.load(
            modelPath,
            (gltf) => {
                // Получаем модель
                const playgroundModel = gltf.scene;
                
                // Настройка модели площадки
                playgroundModel.position.set(0, 0, 0);
                playgroundModel.rotation.set(0, 0, 0);
                playgroundModel.scale.set(1, 1, 1);

                // Добавляем модель в сцену
                scene.add(playgroundModel);
                
                // Вычисляем реальные размеры модели площадки
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
                
                // Используем реальные размеры площадки вместо значений по умолчанию
                playgroundWidth = size.x;
                playgroundLength = size.z; // В THREE.js глубина (z) соответствует длине в вашей логике
                
                // Настраиваем тени для всех мешей
                playgroundModel.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Сохраняем ссылку на groundMesh для совместимости
                        if (!groundMesh) {
                            groundMesh = child;
                        }
                    }
                });
                
                // Сохраняем ссылку на модель площадки
                ground = playgroundModel;
                ground.userData.modelName = modelName;

                // Обновляем текстовый статус в правой панели и HTML-метки размеров
                updatePlaygroundLabels();
                
                // Удаляем все существующие элементы безопасной зоны (жёлтые)
                removeAllYellowElements();
                
                // Показываем уведомление о смене площадки
                showNotification(`Площадка заменена на ${modelName}`, false);
                
                resolve(ground);
            },
            // Обработчик прогресса загрузки
            (xhr) => {
                console.log(`Загрузка площадки ${modelName}: ${Math.round(xhr.loaded / xhr.total * 100)}%`);
            },
            // Обработчик ошибок
            (error) => {
                console.error(`Ошибка при загрузке площадки ${modelName}:`, error);
                console.log('Пытаемся создать простую площадку вместо модели');
                
                // Перед созданием новой площадки еще раз проверим и удалим существующие
                scene.traverse((object) => {
                    if (object.userData && 
                        (object.userData.modelName === 'playground.glb' || 
                         object.userData.modelName === 'simple_playground' ||
                         (object.userData.modelName && object.userData.modelName.includes('playground')))) {
                        console.log('ПОВТОРНО найдена и удалена площадка:', object.userData.modelName);
                        scene.remove(object);
                    }
                });
                
                try {
                    // Еще раз обнуляем переменные, чтобы убедиться
                    ground = null;
                    groundMesh = null;
                    
                    // Если не удалось загрузить модель, создаем простую площадку из плоскости
                    createSimplePlayground();
                    console.log('Простая площадка успешно создана:', ground);
                    
                    // Показываем уведомление пользователю
                    showNotification(`Не удалось загрузить модель площадки. Создана простая площадка.`, true);
                } catch (e) {
                    console.error('Ошибка при создании простой площадки:', e);
                    showNotification(`Критическая ошибка при создании площадки`, true);
                }
                
                resolve(ground);
            }
        );
    });
}

/**
 * Создает простую площадку в виде плоскости, если не удалось загрузить модель
 */
function createSimplePlayground() {
    console.log('Запущена функция createSimplePlayground');
    
    // Если размеры не установлены, используем значения по умолчанию из конфигурации
    if (!playgroundWidth || !playgroundLength) {
        console.log('Используем размеры по умолчанию');
        playgroundWidth = PLAYGROUND.defaultWidth;
        playgroundLength = PLAYGROUND.defaultLength;
    }
    
    console.log('Создаем простую площадку с размерами:', playgroundWidth, 'x', playgroundLength);
    
    try {
        // Создаем геометрию плоскости с установленными размерами
        const planeGeometry = new THREE.PlaneGeometry(
            playgroundWidth, 
            playgroundLength
        );
        
        // Создаем материал для плоскости (зеленый для имитации травы)
        const planeMaterial = new THREE.MeshStandardMaterial({
            color: 0x4CAF50,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        
        // Создаем меш плоскости
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        
        // Поворачиваем плоскость так, чтобы она была горизонтальной
        plane.rotation.x = -Math.PI / 2;
        
        // Разрешаем плоскости принимать тени
        plane.receiveShadow = true;
        
        // Добавляем плоскость в сцену
        scene.add(plane);
        
        // Сохраняем ссылки на плоскость и данные для масштабирования
        ground = plane;
        groundMesh = plane;
        
        // Добавляем данные для будущего масштабирования
        ground.userData = {
            originalWidth: playgroundWidth,
            originalHeight: 0.1,
            originalDepth: playgroundLength,
            modelName: 'simple_playground'
        };
        
        // Обновляем текстовый статус и метки
        updatePlaygroundLabels();
        
        console.log('Простая площадка успешно создана и добавлена в сцену');
    } catch (error) {
        console.error('Ошибка при создании простой площадки:', error);
        throw error; // Пробрасываем ошибку дальше для обработки
    }
}

/**
 * Удаляет все элементы желтого цвета из сцены
 */
function removeAllYellowElements() {
    // Проходим по всем объектам в сцене
    scene.traverse((object) => {
        // Проверяем объекты по имени
        if (object.name && (
            object.name.includes("safe") || 
            object.name.includes("Safe") || 
            object.name.includes("zone") || 
            object.name.includes("Zone") ||
            object.name.includes("border") ||
            object.name.includes("Border") ||
            object.name.includes("square") || 
            object.name.includes("Square") ||
            object.name.includes("yellow") || 
            object.name.includes("Yellow") ||
            object.name.includes("inner") || 
            object.name.includes("Inner")
        )) {
            // Делаем объект невидимым
            object.visible = false;
        }
        
        // Проверяем меши по материалу
        if (object.isMesh && object.material) {
            // Проверяем, является ли материал массивом
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            
            // Проверяем каждый материал
            materials.forEach(material => {
                // Если у материала есть жёлтый или оранжевый цвет
                if (material.color && (
                    (material.color.r > 0.8 && material.color.g > 0.4 && material.color.b < 0.3) ||
                    (material.emissive && material.emissive.r > 0.8 && material.emissive.g > 0.4 && material.emissive.b < 0.3)
                )) {
                    // Если это не границы площадки (основные линии), скрываем их
                    if (!object.name.includes("Line")) {
                        object.visible = false;
                        
                        // Если материал поддерживает прозрачность, делаем его полностью прозрачным
                        if (material.transparent) {
                            material.opacity = 0;
                        }
                    }
                }
            });
        }
    });
    
    // Также проверяем HTML-элементы с желтым цветом и скрываем их
    document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.backgroundColor === 'rgb(255, 255, 0)' || 
            style.backgroundColor === '#ffff00' || 
            style.backgroundColor === 'yellow' ||
            style.borderColor === 'rgb(255, 255, 0)' || 
            style.borderColor === '#ffff00' ||
            style.borderColor === 'yellow') {
            
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
        }
    });
}

/**
 * Обновление HTML-меток с размерами площадки
 */
function updatePlaygroundLabels() {
    // Обновляем текстовый статус в правой панели с точностью до 2 знаков после запятой
    const statusElement = document.getElementById("playgroundStatus");
    if (statusElement) {
        statusElement.textContent = `Площадка: ${playgroundWidth.toFixed(2)}м × ${playgroundLength.toFixed(2)}м`;
    }
    
    // Обновляем HTML-метки размеров с точностью до 2 знаков после запятой
    document.getElementById("widthLabel").textContent = `${playgroundWidth.toFixed(2)}м`;
    document.getElementById("lengthLabel").textContent = `${playgroundLength.toFixed(2)}м`;
    
    // Также обновляем значения в полях ввода, если они существуют
    const widthInput = document.getElementById("playgroundWidth");
    const lengthInput = document.getElementById("playgroundLength");
    
    if (widthInput) {
        widthInput.value = playgroundWidth.toFixed(2);
    }
    
    if (lengthInput) {
        lengthInput.value = playgroundLength.toFixed(2);
    }
}

/**
 * Создание новой площадки с заданными размерами
 * @param {Number} width - Ширина площадки в метрах
 * @param {Number} length - Длина площадки в метрах
 * @returns {Object} Объект площадки
 */
export function createPlayground(width, length) {
    // Обновляем текстовый статус и метки размеров
    playgroundWidth = width;
    playgroundLength = length;
    updatePlaygroundLabels();
    
    // Если есть ground, масштабируем его с учетом оригинальных размеров
    if (ground && ground.userData.originalWidth && ground.userData.originalDepth) {
        const scaleX = width / ground.userData.originalWidth;
        const scaleZ = length / ground.userData.originalDepth;
        ground.scale.set(scaleX, 1, scaleZ);
    }
    
    // Удаляем все желтые элементы
    removeAllYellowElements();
    
    // Обновляем сетку, если активен вид сверху
    if (isTopViewActive) {
        createGrid(width, length);
    }
    
    // Удаляем все объекты, которые могут относиться к зонам безопасности
    scene.traverse((object) => {
        if (object.name && (
            object.name.includes("safe") || object.name.includes("Safety") || 
            object.name.includes("zone") || object.name.includes("Zone") ||
            object.name.includes("inner") || object.name.includes("Inner") ||
            object.name.includes("boundary") || object.name.includes("Boundary") ||
            object.name.includes("Line") || object.name.includes("line")
        ) && object !== ground && object !== groundMesh) {
            // Удаляем объект из родительского объекта
            if (object.parent) {
                object.parent.remove(object);
            } else {
                scene.remove(object);
            }
            
            // Освобождаем ресурсы
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }
    });
    
    return ground;
}

// Удалены дополнительные функции для работы с границами площадки

/**
 * Изменение размеров площадки с анимацией
 * @param {Number} newWidth - Новая ширина площадки в метрах
 * @param {Number} newLength - Новая длина площадки в метрах
 */
export function resizePlaygroundWithAnimation(newWidth, newLength) {
    if (newWidth < PLAYGROUND.minSize || newWidth > PLAYGROUND.maxSize || 
        newLength < PLAYGROUND.minSize || newLength > PLAYGROUND.maxSize) {
        showNotification("Размеры должны быть в диапазоне от 5 до 50 метров", true);
        return;
    }

    const oldWidth = playgroundWidth;
    const oldLength = playgroundLength;
    
    // Удаляем все желтые элементы перед началом анимации
    removeAllYellowElements();
    
    // Применяем анимацию плавного изменения размеров
    const startTime = Date.now();
    const duration = ANIMATION.duration; // 1 секунда для анимации
    
    const animateResize = function() {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        
        // Используем функцию плавной анимации
        const easeProgress = easeInOutCubic(progress);
        
        // Вычисляем текущие размеры на основе прогресса анимации
        const currentWidth = oldWidth + (newWidth - oldWidth) * easeProgress;
        const currentLength = oldLength + (newLength - oldLength) * easeProgress;
        
        // Устанавливаем новые размеры площадки
        if (progress < 1) {
            // Если анимация не завершена, обновляем масштаб с учетом оригинальных размеров
            if (ground && ground.userData.originalWidth && ground.userData.originalDepth) {
                const scaleX = currentWidth / ground.userData.originalWidth;
                const scaleZ = currentLength / ground.userData.originalDepth;
                ground.scale.set(scaleX, 1, scaleZ);
            }
            
            // Обновляем метки
            document.getElementById("widthLabel").textContent = `${currentWidth.toFixed(1)}м`;
            document.getElementById("lengthLabel").textContent = `${currentLength.toFixed(1)}м`;
            
            // Продолжаем анимацию
            requestAnimationFrame(animateResize);
        } else {
            // Анимация завершена, устанавливаем точные значения
            playgroundWidth = newWidth;
            playgroundLength = newLength;
            
            // Обновляем площадку без создания желтого квадрата
            createPlayground(playgroundWidth, playgroundLength);
            
            // Проверяем позиции всех объектов после изменения размеров
            checkAllObjectsPositions();
            
            // Снова удаляем все желтые элементы после обновления
            removeAllYellowElements();
            
            // Обновляем сетку, если активен вид сверху
            if (isTopViewActive) {
                createGrid(playgroundWidth, playgroundLength);
            }
            
            // Показываем уведомление
            showNotification("Размеры площадки успешно обновлены", false);
        }
    };
    
    // Запускаем анимацию
    animateResize();
}

/**
 * Функция для плавной анимации
 * @param {Number} t - Прогресс анимации от 0 до 1
 * @returns {Number} Преобразованный прогресс с эффектом замедления
 */
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}