/**
 * Модуль с исправлениями для решения проблем с перемещением объектов
 */

import * as THREE from 'three';
import { showNotification } from './utils.js';

/**
 * Проверяет целостность сцены и объектов
 * @returns {Boolean} Результат проверки
 */
export function validateSceneIntegrity() {
    console.log("Проверка целостности сцены");
    
    // Проверяем наличие window.app
    if (!window.app) {
        console.error("window.app не инициализирован");
        return false;
    }
    
    // Проверяем наличие основных компонентов
    if (!window.app.scene || !window.app.camera || !window.app.renderer) {
        console.error("Основные компоненты сцены не инициализированы");
        return false;
    }
    
    // Проверяем наличие ground
    let groundFound = false;
    let groundObject = null;
    
    window.app.scene.traverse((object) => {
        if (object.userData && object.userData.isPlayground) {
            groundFound = true;
            groundObject = object;
        }
    });
    
    // Проверяем модуль playground напрямую
    try {
        // Асинхронно проверяем ground в модуле playground
        setTimeout(() => {
            import('./playground.js').then(module => {
                console.log("Состояние ground в модуле playground:", module.ground);
                
                // Если ground в модуле пуст, но мы нашли площадку в сцене
                if (!module.ground && groundObject) {
                    console.log("Ground в модуле пуст, но объект площадки найден в сцене");
                    
                    // Обновляем ссылки
                    if (module.updateGroundReferences) {
                        module.updateGroundReferences(groundObject, groundObject);
                        console.log("Обновлены ссылки на существующую площадку");
                    }
                }
            }).catch(error => {
                console.error("Ошибка при импорте playground:", error);
            });
        }, 500);
    } catch (error) {
        console.error("Ошибка при проверке модуля playground:", error);
    }
    
    if (!groundFound) {
        console.error("Площадка (ground) не найдена в сцене");
        
        // Создаем аварийную площадку и получаем её
        const emergencyGround = createEmergencyGround();
        
        // Если удалось создать аварийную площадку
        if (emergencyGround) {
            groundFound = true;
        }
    }
    
    // Если площадка все равно не найдена, попробуем через явный вызов createSimplePlayground
    if (!groundFound) {
        console.log("Последняя попытка создать площадку через createSimplePlayground");
        
        try {
            import('./playground/playgroundCreator.js').then(module => {
                if (module.createSimplePlayground) {
                    const simplePlane = module.createSimplePlayground();
                    console.log("Создана простая площадка через explicit createSimplePlayground:", simplePlane);
                }
            }).catch(error => {
                console.error("Ошибка при импорте playgroundCreator:", error);
            });
        } catch (error) {
            console.error("Ошибка при вызове createSimplePlayground:", error);
        }
    }
    
    return groundFound;
}

/**
 * Создает аварийную площадку, если основная не загрузилась
 * @returns {Object|null} Созданная площадка или null в случае ошибки
 */
export function createEmergencyGround() {
    console.log("Создание аварийной площадки");
    
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
        console.log("Площадка уже существует:", existingGround);
        
        // Принудительно обновляем ссылки на ground
        try {
            import('./playground.js').then(module => {
                if (module.updateGroundReferences) {
                    module.updateGroundReferences(existingGround, existingGround);
                    console.log("Обновлены ссылки на существующую площадку");
                }
            });
        } catch (error) {
            console.error("Ошибка при обновлении ссылок на существующую площадку:", error);
        }
        
        return existingGround;
    }
    
    try {
        // Создаем геометрию плоскости
        const planeGeometry = new THREE.PlaneGeometry(10, 10);
        
        // Создаем материал для плоскости
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
        
        // Добавляем имя и флаг для идентификации как площадки
        plane.name = "emergency_playground";
        
        // Добавляем данные для идентификации
        plane.userData = {
            originalWidth: 10,
            originalHeight: 0.1,
            originalDepth: 10,
            modelName: 'emergency_playground',
            isPlayground: true  // Маркер, что это площадка
        };
        
        // Обязательно помечаем, что это меш, для корректной работы raycasting
        plane.isMesh = true;
        
        // Добавляем плоскость в сцену
        window.app.scene.add(plane);
        console.log("Аварийная площадка добавлена в сцену");
        
        // Сохраняем размеры площадки в приложении
        if (window.app) {
            window.app.playgroundWidth = 10;
            window.app.playgroundLength = 10;
        }
        
        // Обновляем глобальный ground через модуль playground
        try {
            // Сначала пробуем получить ссылку на updateGroundReferences
            import('./playground.js').then(module => {
                if (module.updateGroundReferences) {
                    module.updateGroundReferences(plane, plane);
                    console.log("Глобальные ссылки на ground обновлены");
                } else {
                    // Если не получилось, пробуем через playground/playgroundCore.js
                    import('./playground/playgroundCore.js').then(coreModule => {
                        if (coreModule.updateGroundReferences) {
                            coreModule.updateGroundReferences(plane, plane);
                            console.log("Глобальные ссылки на ground обновлены через playgroundCore");
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
        
        showNotification("Создана аварийная площадка из-за ошибки загрузки", true);
        console.log("Аварийная площадка создана");
        
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
    console.log("Исправление проблем с raycaster");
    
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
    
    console.log("Исправления raycaster применены");
}

/**
 * Сбрасывает обработчики drag-and-drop, чтобы избежать дублирования
 */
export function resetDragHandlers() {
    console.log("Сброс обработчиков drag-and-drop");
    
    try {
        // Сначала проверяем, есть ли модуль ui 
        import('./ui.js').then(uiModule => {
            if (uiModule.initUI) {
                // Переинициализируем UI, что приведет к сбросу обработчиков
                uiModule.initUI();
                console.log("UI переинициализирован");
            }
        }).catch(error => {
            console.error("Ошибка при импорте модуля UI:", error);
        });
    } catch (error) {
        console.error("Ошибка при сбросе обработчиков drag-and-drop:", error);
    }
}

/**
 * Применяет все исправления
 */
export function applyAllFixes() {
    console.log("Применение всех исправлений");
    
    // Проверка целостности сцены
    validateSceneIntegrity();
    
    // Исправление проблем с raycaster
    fixRaycasterIssues();
    
    // Сбрасываем обработчики drag-and-drop, чтобы избежать дублирования
    resetDragHandlers();
    
    // Показываем уведомление
    showNotification("Дополнительные исправления применены", false);
    
    console.log("Все исправления применены");
    
    // Устанавливаем флаг, что исправления применены
    window.fixesApplied = true;
}
