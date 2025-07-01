/**
 * Модуль с исправлениями для решения проблем с перемещением объектов
 */

import * as THREE from 'three';
import { API_BASE_URL } from './api/serverConfig.js'

/**
 * Проверяет целостность сцены и объектов
 * @returns {Boolean} Результат проверки
 */
export function validateSceneIntegrity() {
    
    // Проверяем наличие основных компонентов
    if (!window.app?.scene || !window.app?.camera || !window.app?.renderer) {
        console.error("Основные компоненты сцены не инициализированы");
        return false;
    }
    
    // Проверяем наличие ground
    let groundFound = false;
    let groundObject = null;
    
    window.app.scene.traverse((object) => {
        if (object.userData?.isPlayground) {
            groundFound = true;
            groundObject = object;
        }
    });
    
    // Если площадка не найдена, создаем аварийную
    if (!groundFound) {
        console.log("Площадка не найдена, создаем аварийную");
        const emergencyGround = createEmergencyGround();
        groundFound = !!emergencyGround;
    }
    
    return groundFound;
}

/**
 * Создает аварийную площадку, если основная не загрузилась
 * @returns {Object|null} Созданная площадка или null в случае ошибки
 */
export function createEmergencyGround() {    
    // Проверяем наличие необходимых компонентов
    if (!window.app || !window.app.scene) {
        console.error("Невозможно создать аварийную площадку: window.app или scene не инициализированы");
        return null;
    }
    
    // Проверяем, нет ли уже площадки в сцене
    let existingGround = null;
    
    window.app.scene.traverse((child) => {
        if (child.userData && child.userData.isPlayground) {
            existingGround = child;
        }
    });
    
    if (existingGround) {        
        // Принудительно обновляем ссылки на ground
        try {
            import('./playground.js').then(module => {
                if (module.updateGroundReferences) {
                    module.updateGroundReferences(existingGround, existingGround);
                }
            });
        } catch (error) {
            console.error("Ошибка при обновлении ссылок на существующую площадку:", error);
        }
        
        return existingGround;
    }
    
    try {
        // Создаем геометрию плоскости
        const planeGeometry = new THREE.PlaneGeometry(40, 30);

        // Определяем цвет площадки в зависимости от выбранного пользователем
        let groundColor = 0xAAAAAA; // Серый по умолчанию
        
        // Если есть выбранный цвет пользователем, используем его
        if (window.selectedPlaygroundColor) {
            switch(window.selectedPlaygroundColor.toLowerCase()) {
                case 'черный':
                    groundColor = 0x222222; // Чёрный
                    break;
                case 'зеленый':
                    groundColor = 0x2E7D32; // Зелёный
                    break;
                case 'коричневый':
                    groundColor = 0x5D4037; // Коричневый
                    break;
                case 'синий':
                    groundColor = 0x1976D2; // Синий
                    break;
                case 'красный':
                    groundColor = 0xD32F2F; // Красный
                    break;
                case 'фиолетовый':
                    groundColor = 0x7B1FA2; // Фиолетовый
                    break;
                case 'оранжевый':
                    groundColor = 0xF57C00; // Оранжевый
                    break;
                case 'желтый':
                    groundColor = 0xFBC02D; // Желтый
                    break;
                case 'розовый':
                    groundColor = 0xC2185B; // Розовый
                    break;
                case 'бирюзовый':
                    groundColor = 0x00ACC1; // Бирюзовый
                    break;
                case 'лайм':
                    groundColor = 0x689F38; // Лайм
                    break;
                case 'серый':
                    groundColor = 0xAAAAAA; // Серый
                    break;
                default:
                    groundColor = 0xAAAAAA; // Серый по умолчанию
            }
        }
        
        // Создаем материал для плоскости
        const planeMaterial = new THREE.MeshStandardMaterial({
            color: groundColor,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        
        // Создаем меш плоскости
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        
        // Поворачиваем плоскость так, чтобы она была горизонтальной
        plane.rotation.x = -Math.PI / 2;
        
        // Размещаем плоскость немного ниже, чтобы избежать Z-fighting
        plane.position.y = -0.01;
        
        // Разрешаем плоскости принимать тени
        plane.receiveShadow = true;
        
        // Добавляем имя и флаг для идентификации как площадки
        plane.name = "emergency_playground";
        
        // Добавляем данные для идентификации
        plane.userData = {
            originalWidth: 40,
            originalHeight: 0.1,
            originalDepth: 30,
            modelName: 'emergency_playground',
            isPlayground: true,  // Маркер, что это площадка
            groundColor: window.selectedPlaygroundColor || 'серый' // Сохраняем информацию о цвете
        };
        
        // Обязательно помечаем, что это меш, для корректной работы raycasting
        plane.isMesh = true;
        
        // Добавляем плоскость в сцену
        window.app.scene.add(plane);
        console.log("Аварийная площадка добавлена в сцену");
        
        // Сохраняем размеры площадки в приложении
        if (window.app) {
            window.app.playgroundWidth = 40;
            window.app.playgroundLength = 30;
        }
        
        // Обновляем глобальный ground через модуль playground
        try {
            // Сначала пробуем получить ссылку на updateGroundReferences
            import('./playground.js').then(module => {
                if (module.updateGroundReferences) {
                    module.updateGroundReferences(plane, plane);
                } else {
                    // Если не получилось, пробуем через playground/playgroundCore.js
                    import('./playground/playgroundCore.js').then(coreModule => {
                        if (coreModule.updateGroundReferences) {
                            coreModule.updateGroundReferences(plane, plane);
                        }
                    }).catch(coreError => {
                        console.error("Ошибка при импорте playgroundCore:", coreError);
                    });
                }
            }).catch(error => {
                console.error("Ошибка при импорте playground:", error);
            });
        } catch (error) {
            console.error("Ошибка при обновлении ground:", error);
        }
        
        return plane;
    } catch (error) {
        console.error("Ошибка при создании аварийной площадки:", error);
        return null;
    }
}

/**
 * Фиксирует потерянный raycaster
 */
export function fixRaycasterIssues() {
    
    // Создаем глобальную функцию для вычисления точки размещения объекта
    window.determineObjectPlacementPosition = function(event) {
        // Проверяем наличие необходимых объектов
        if (!window.app || !window.app.camera || !window.app.scene) {
            console.error("Не инициализированы необходимые компоненты");
            return new THREE.Vector3(0, 0, 0);
        }
        
        // Создаем новый raycaster
        const raycaster = new THREE.Raycaster();
        
        // Вычисляем нормализованные координаты мыши
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Устанавливаем raycaster из камеры через координаты мыши
        raycaster.setFromCamera(mouse, window.app.camera);
        
        // Находим все объекты площадки в сцене
        const groundObjects = [];
        window.app.scene.traverse((object) => {
            if ((object.userData && object.userData.isPlayground) || 
                (object.name && (object.name.includes('playground') || object.name === 'simple_playground'))) {
                if (object.isMesh) {
                    groundObjects.push(object);
                }
            }
        });
        
        // Ищем пересечения с площадкой
        let intersects = [];
        if (groundObjects.length > 0) {
            intersects = raycaster.intersectObjects(groundObjects, true);
        }
        
        // Если нашли пересечение с площадкой
        if (intersects.length > 0) {
            return intersects[0].point;
        }
        
        // Если не нашли пересечение с площадкой, используем плоскость Y=0
        const planeY0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const planeIntersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(planeY0, planeIntersect)) {
            return planeIntersect;
        }
        
        // Если ничего не нашли, возвращаем нулевую точку
        return new THREE.Vector3(0, 0, 0);
    };
    
    // ВАЖНО: НЕ добавляем дополнительные обработчики dragend, так как они дублируют основной функционал
    // Это приводит к созданию множественных копий объектов
}

/**
 * Сбрасывает обработчики drag-and-drop, чтобы избежать дублирования
 */
export function resetDragHandlers() {
    try {
        // Сначала проверяем, есть ли модуль ui 
        import('./ui.js').then(uiModule => {
            if (uiModule.initUI) {
                // Переинициализируем UI, что приведет к сбросу обработчиков
                uiModule.initUI();
            }
        }).catch(error => {
            console.error("Ошибка при импорте модуля UI:", error);
        });
    } catch (error) {
        console.error("Ошибка при сбросе обработчиков drag-and-drop:", error);
    }
}

/**
 * Восстанавливает размещенные объекты из сессии
 * @param {Object} session - Данные сессии
 * @returns {Promise<void>}
 */
export async function restorePlacedObjects(session) {
    if (!session || !session.placedObjects || session.placedObjects.length === 0) {        
        return;
    }
    
    try {
        // Получаем текущие модели из sessionStorage для фильтрации
        const currentModels = JSON.parse(sessionStorage.getItem('models') || '[]');
        
        // Если нет данных о текущих моделях, выходим
        if (!currentModels || currentModels.length === 0) {
            return;
        }
        
        // Получаем полные данные моделей через API для сопоставления
        const { API_BASE_URL } = await import('./api/serverConfig.js');
        const matchResponse = await fetch(`${API_BASE_URL}/models/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ models: currentModels }),
        });

        if (!matchResponse.ok) {
            console.error('Failed to match models with database');
            return;
        }

        const { models: matchedModels } = await matchResponse.json();
        
        // Получаем специальные модели (деревья, пальмы, кустарники, люди)
        const specialResponse = await fetch(`${API_BASE_URL}/models/special-categories`);
        const { models: specialModels } = specialResponse.ok ? await specialResponse.json() : { models: [] };
        
        // Создаем набор доступных имен моделей для быстрой проверки
        const availableModelNames = new Set();
        
        // Добавляем обычные модели
        matchedModels.forEach(model => {
            const modelName = `${model.name}.glb`;
            availableModelNames.add(modelName);
        });
        
        // Добавляем специальные модели
        specialModels.forEach(model => {
            const modelName = `${model.name}.glb`;
            availableModelNames.add(modelName);
        });
        
        console.log('Available models for restoration:', Array.from(availableModelNames));
                
        // Импортируем необходимые модули
        const objectManager = await import('./modules/objectManager.js');
        const collisionModule = await import('./modules/collisionDetection.js');
                
        // Фильтруем объекты - восстанавливаем только те, модели которых есть в текущих modelsData
        const objectsToRestore = session.placedObjects.filter(objectData => {
            const isAvailable = availableModelNames.has(objectData.modelName);
            if (!isAvailable) {
                console.log(`Пропускаем восстановление объекта ${objectData.modelName} - модель не найдена в текущих данных`);
            }
            return isAvailable;
        });
        
        console.log(`Будет восстановлено ${objectsToRestore.length} из ${session.placedObjects.length} объектов`);
        
        // Восстанавливаем только отфильтрованные объекты
        for (const objectData of objectsToRestore) {
            // Создаем объект позиции из сохраненных координат
            const position = {
                x: parseFloat(objectData.coordinates.x),
                y: parseFloat(objectData.coordinates.y),
                z: parseFloat(objectData.coordinates.z)
            };
            
            // Загружаем и размещаем модель с флагом восстановления
            await objectManager.loadAndPlaceModel(objectData.modelName, position, true);
            
            // Находим последний размещенный объект и устанавливаем его поворот
            const lastPlacedObject = objectManager.placedObjects[objectManager.placedObjects.length - 1];
            if (lastPlacedObject) {
                lastPlacedObject.rotation.y = parseFloat(objectData.rotation);
                
                // Обновляем размеры объекта, если они были сохранены
                if (objectData.dimensions) {
                    lastPlacedObject.userData.realWidth = parseFloat(objectData.dimensions.width);
                    lastPlacedObject.userData.realHeight = parseFloat(objectData.dimensions.height);
                    lastPlacedObject.userData.realDepth = parseFloat(objectData.dimensions.depth);
                }
                
                // ВАЖНО: сохраняем исходный ID объекта, чтобы при последующих
                // обновлениях позиции/поворота в существующей сессии данные
                // в базе перезаписывались, а не добавлялись как новые записи
                lastPlacedObject.userData.id = objectData.id;
                
                // Также обновляем имя контейнера (используется в логах/отладке)
                // чтобы он соответствовал исходному ID
                if (lastPlacedObject.name) {
                    lastPlacedObject.name = `${objectData.modelName}_${objectData.id}`;
                }
            }
        }
        
        // Проверяем все объекты на коллизии после восстановления
        collisionModule.checkAllObjectsPositions();
        
        // Если некоторые объекты были отфильтрованы, обновляем сессию в базе данных
        if (objectsToRestore.length < session.placedObjects.length) {
            try {
                // Получаем project_id из sessionStorage
                const userId = sessionStorage.getItem('userId');
                
                if (userId) {
                    // Найдем объекты, которые не были восстановлены
                    const filteredOutObjects = session.placedObjects.filter(objectData => 
                        !availableModelNames.has(objectData.modelName)
                    );
                    
                    // Обновляем сессию, сохраняя только восстановленные объекты
                    const updatedSessionData = {
                        ...session,
                        placedObjects: objectsToRestore
                    };
                    
                    // Возвращаем количества для моделей, объекты которых не были восстановлены
                    // Но только если эти модели есть в текущих modelsData
                    const updatedQuantities = { ...session.quantities };
                    filteredOutObjects.forEach(objectData => {
                        const modelName = objectData.modelName;
                        // Проверяем, есть ли эта модель в текущих данных
                        if (availableModelNames.has(modelName)) {
                            // Если модель доступна, но объект не восстановлен (что не должно происходить)
                            // То увеличиваем количество
                            const currentQuantity = updatedQuantities[modelName] || 0;
                            updatedQuantities[modelName] = currentQuantity + 1;
                        }
                        // Если модели нет в доступных, просто не возвращаем количество
                    });
                    
                    updatedSessionData.quantities = updatedQuantities;
                    
                    // Сохраняем обновленную сессию
                    const saveResponse = await fetch(`${API_BASE_URL}/session`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ userId, sessionData: updatedSessionData }),
                    });

                    if (saveResponse.ok) {
                        console.log(`Сессия обновлена: удалено ${session.placedObjects.length - objectsToRestore.length} недоступных объектов`);
                        console.log('Отфильтрованные объекты:', filteredOutObjects.map(obj => obj.modelName));
                    } else {
                        console.error('Failed to update session after filtering');
                    }
                }
            } catch (updateError) {
                console.error('Error updating session after filtering:', updateError);
            }
        }
        
    } catch (error) {
        console.error("Ошибка при восстановлении размещенных объектов:", error);
    }
}

/**
 * Применяет все исправления
 */
export function applyAllFixes() {    
    // Проверка целостности сцены
    validateSceneIntegrity();
    
    // Исправление проблем с raycaster
    fixRaycasterIssues();
    
    // Сбрасываем обработчики drag-and-drop, чтобы избежать дублирования
    resetDragHandlers();
    
    // Восстанавливаем размещенные объекты, если есть сессия
    try {
        // Получаем project_id из sessionStorage
        const userId = sessionStorage.getItem('userId');
        if (userId) {
            // Получаем данные сессии
            (async () => {
                const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
                if (sessionResponse.ok) {
                    const { session } = await sessionResponse.json();
                    if (session) {
                        await restorePlacedObjects(session);
                    }
                }
            })();
        }
    } catch (error) {
        console.error("Ошибка при восстановлении сессии:", error);
    }
        
    // Устанавливаем флаг, что исправления применены
    window.fixesApplied = true;
}
