/**
 * Модуль для управления drag and drop элементов
 */
import { canvas, scene } from '../scene.js';
import { ground } from '../playground.js';
import { loadAndPlaceModel, placedObjects, removeObject } from '../objects.js';
import { 
    raycaster, 
    updateMousePosition, 
    updateRaycaster 
} from './uiCore.js';
import * as THREE from 'three';
import { API_BASE_URL } from '../api/serverConfig.js';

// Map для отслеживания обработки drop по моделям (вместо глобальной блокировки)
const processingModels = new Map();

/**
 * Надежная функция для скрытия preloader модели
 * @param {string} modelName - Имя модели
 */
function hidePreloaderForModel(modelName) {
    console.log('🔄 [hidePreloaderForModel] Attempting to hide preloader for:', modelName);
    
    let preloadersHidden = 0;
    
    // Способ 1: Прямой поиск в DOM
    const modelElements = document.querySelectorAll(`[data-model="${modelName}"]`);
    console.log('🔍 [hidePreloaderForModel] Found model elements:', modelElements.length, 'for:', modelName);
    
    modelElements.forEach((element, index) => {
        const preloader = element.querySelector('.model-preloader');
        console.log(`🔍 [hidePreloaderForModel] Element ${index} preloader:`, preloader, 'visible class:', preloader ? preloader.classList.contains('visible') : 'N/A');
        
        if (preloader) {
            const hadVisible = preloader.classList.contains('visible');
            preloader.classList.remove('visible');
            preloader.style.display = 'none'; // Принудительное скрытие через style
            
            if (hadVisible) {
                preloadersHidden++;
                console.log(`✅ [hidePreloaderForModel] Preloader hidden (element ${index}) for:`, modelName);
            } else {
                console.log(`ℹ️ [hidePreloaderForModel] Preloader was already hidden (element ${index}) for:`, modelName);
            }
        }
    });
    
    // Способ 2: Дополнительная проверка по всем preloader элементам
    const allPreloaders = document.querySelectorAll('.model-preloader.visible');
    console.log('🔍 [hidePreloaderForModel] Found all visible preloaders:', allPreloaders.length);
    
    allPreloaders.forEach((preloader, index) => {
        const parentElement = preloader.closest('[data-model]');
        const parentModelName = parentElement ? parentElement.getAttribute('data-model') : null;
        console.log(`🔍 [hidePreloaderForModel] Visible preloader ${index} parent model:`, parentModelName);
        
        if (parentElement && parentModelName === modelName) {
            preloader.classList.remove('visible');
            preloader.style.display = 'none'; // Принудительное скрытие
            preloadersHidden++;
            console.log(`✅ [hidePreloaderForModel] Additional preloader hidden (${index}) for:`, modelName);
        }
    });
    
    // Способ 3: Поиск по всем preloader без класса visible, но с display: block
    const allModelPreloaders = document.querySelectorAll('.model-preloader');
    allModelPreloaders.forEach((preloader, index) => {
        const parentElement = preloader.closest('[data-model]');
        const parentModelName = parentElement ? parentElement.getAttribute('data-model') : null;
        
        if (parentElement && parentModelName === modelName) {
            const computedStyle = window.getComputedStyle(preloader);
            if (computedStyle.display !== 'none') {
                console.log(`🔍 [hidePreloaderForModel] Found visible preloader via computed style (${index}) for:`, modelName);
                preloader.classList.remove('visible');
                preloader.style.display = 'none';
                preloadersHidden++;
                console.log(`✅ [hidePreloaderForModel] Forced hidden via style (${index}) for:`, modelName);
            }
        }
    });
    
    console.log(`📊 [hidePreloaderForModel] Total preloaders hidden: ${preloadersHidden} for:`, modelName);
    
    // Способ 4: Вызов функции из sidebar.js как дополнительная мера
    import('../sidebar.js').then(sidebarModule => {
        if (sidebarModule.hideModelPreloader) {
            console.log('🔄 [hidePreloaderForModel] Calling sidebar hideModelPreloader for:', modelName);
            sidebarModule.hideModelPreloader(modelName);
        }
    }).catch(error => {
        console.error('❌ [hidePreloaderForModel] Failed to import sidebar:', error);
    });
}

/**
 * Мгновенно обновляет UI без батчинга
 * @param {string} modelName - Имя модели
 * @param {number} delta - Изменение количества
 */
function batchUIUpdate(modelName, delta) {
    // Прямое мгновенное обновление
    updateSidebarInstantly(modelName, delta);
}

/**
 * Мгновенно обновляет UI в sidebar (используется из батчинга)
 * @param {string} modelName - Имя модели
 * @param {number} delta - Изменение количества
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

/**
 * Получает актуальные данные сессии без кэширования
 * @returns {Promise<Object>} Данные сессии
 */
async function getSessionData() {
    const userId = sessionStorage.getItem('userId');
    if (!userId) {
        throw new Error('No user ID found');
    }

    try {
        const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
        if (!sessionResponse.ok) {
            throw new Error('Failed to get session');
        }

        const { session } = await sessionResponse.json();
        return session || { quantities: {}, placedObjects: [] };
    } catch (error) {
        console.error('Error getting session data:', error);
        return { quantities: {}, placedObjects: [] };
    }
}

/**
 * Получает количество модели из базы данных
 * @param {string} modelName - Имя модели
 * @returns {Promise<number>} Количество модели
 */
export async function getQuantityFromDatabase(modelName) {
    try {
        const sessionData = await getSessionData();
        return sessionData.quantities?.[modelName] || 0;
    } catch (error) {
        console.error('Error getting quantity from database:', error);
        return 0;
    }
}

/**
 * Сохраняет количество модели в базе данных
 * @param {string} modelName - Имя модели
 * @param {number} quantity - Новое количество
 */
export async function saveQuantityToDatabase(modelName, quantity) {
    try {
        const userId = sessionStorage.getItem('userId');
        if (!userId) {
            throw new Error('No user ID found');
        }

        const sessionData = await getSessionData();
        sessionData.quantities = sessionData.quantities || {};
        sessionData.quantities[modelName] = quantity;

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
        
        // Обновляем UI
        const items = document.querySelectorAll('.item');
        items.forEach(item => {
            if (item.getAttribute('data-model') === modelName) {
                updateModelQuantityUI(item, quantity);
            }
        });
    } catch (error) {
        console.error('Error saving quantity to database:', error);
    }
}

/**
 * Обновляет UI элемента с новым количеством
 */
export function updateModelQuantityUI(item, newQuantity) {
    const quantityElement = item.querySelector('.model-quantity');
    if (quantityElement) {
        quantityElement.textContent = newQuantity;
    }
    
    item.setAttribute('data-quantity', newQuantity);
    
    if (newQuantity <= 0) {
        item.style.filter = 'blur(2px)';
        item.style.opacity = '0.9';
        item.style.pointerEvents = 'none';
    } else {
        item.style.filter = 'none';
        item.style.opacity = '1';
        item.style.pointerEvents = 'auto';
    }
}

/**
 * Инициализирует обработчики для drag and drop
 */
export function initDragAndDrop() {    
    // Сначала удаляем все существующие обработчики, чтобы избежать дублирования
    removeExistingHandlers();
    
    // Добавляем обработчик начала перетаскивания для элементов каталога
    addDragStartHandlers();

    // Останавливаем поведение по умолчанию для drop
    canvas.addEventListener("dragover", event => event.preventDefault());

    // Обработка события drop для загрузки модели
    canvas.addEventListener("drop", handleDrop);
    
    // Добавляю обновление крестиков при инициализации
    updateSidebarDeleteButtons();
    
    // Также обновляю крестики каждые 2 секунды (уменьшено с 500 мс)
    setInterval(updateSidebarDeleteButtons, 2000);
}

/**
 * Удаляет существующие обработчики перед добавлением новых
 */
function removeExistingHandlers() {    
    // Удаляем только обработчики drag-and-drop, не трогая canvas
    // Это безопаснее, чем заменять canvas, что может нарушить 3D-сцену
    
    // Удаляем старые обработчики с canvas
    if (canvas) {
        // Сохраняем ссылку на старый обработчик
        const oldHandler = canvas._dropHandler;
        
        // Если есть сохраненный обработчик, удаляем его
        if (oldHandler) {
            canvas.removeEventListener("drop", oldHandler);
            canvas.removeEventListener("dragover", event => event.preventDefault());
        }
        
        // Сохраняем новый обработчик для возможного последующего удаления
        canvas._dropHandler = handleDrop;
    }
    
    // Удаляем старые обработчики dragstart с элементов каталога
    document.querySelectorAll(".item").forEach(item => {
        // Удаляем все существующие обработчики dragstart
        const newItem = item.cloneNode(true);
        if (item.parentNode) {
            item.parentNode.replaceChild(newItem, item);
        }
    });
}

/**
 * Обновляет количество модели в сайдбаре
 * @param {string} modelName - Имя модели
 * @param {number} newQuantity - Новое количество
 */
async function updateModelQuantity(modelName, newQuantity) {
    // Обновляем UI
    const items = document.querySelectorAll('.item');
    items.forEach(item => {
        if (item.getAttribute('data-model') === modelName) {
            updateModelQuantityUI(item, newQuantity);
        }
    });
}

/**
 * Обновляет счетчик размещения модели после drop
 * @param {string} modelName - Имя модели
 * @param {number} placedCount - Количество размещенных объектов
 */
async function updateModelPlacementAfterDrop(modelName, placedCount) {
    // Импортируем функцию updateModelPlacementCounter из sidebar
    const { updateModelPlacementCounter } = await import('../sidebar.js');
    
    // Передаем актуальное количество размещенных объектов для избежания лишнего API запроса
    await updateModelPlacementCounter(modelName, placedCount);
}

/**
 * Добавляет обработчики начала перетаскивания для элементов каталога
 */
function addDragStartHandlers() {
    // Проверяем наличие элементов с классом .model (новый sidebar)
    const modelElements = document.querySelectorAll(".model");
    if (modelElements.length > 0) {
        console.log("Found new sidebar structure with .model elements");
        // Для нового sidebar обработчики уже добавлены в sidebar.js
        return;
    }
    
    // Поддержка старой структуры с .item элементами
    const itemElements = document.querySelectorAll(".item");
    if (itemElements.length === 0) {
        console.log("No drag-and-drop elements found");
        return;
    }
        
    // Создаем невидимый элемент для использования в качестве изображения при перетаскивании
    const invisibleDragImage = document.createElement('div');
    invisibleDragImage.style.width = '1px';
    invisibleDragImage.style.height = '1px';
    invisibleDragImage.style.position = 'absolute';
    invisibleDragImage.style.top = '-1000px';
    invisibleDragImage.style.opacity = '0';
    document.body.appendChild(invisibleDragImage);
    
    itemElements.forEach(item => {
        item.addEventListener("dragstart", event => {
            const model = event.target.closest(".item").getAttribute("data-model");
            const currentQuantity = parseInt(event.target.closest(".item").getAttribute("data-quantity") || "0");
            
            // Проверяем, есть ли доступное количество
            if (currentQuantity <= 0) {
                event.preventDefault();
                return;
            }
            
            console.log("Drag started:", model);
            event.dataTransfer.setData("model", model);
            
            // Устанавливаем невидимое изображение для отображения при перетаскивании
            event.dataTransfer.setDragImage(invisibleDragImage, 0, 0);
        });
    });
}

/**
 * Обрабатывает событие drop для размещения модели
 * @param {DragEvent} event - Событие drop
 */
async function handleDrop(event) {
    event.preventDefault();
    
    const modelName = event.dataTransfer.getData("model");
    
    // Предотвращаем множественные drop для одной и той же модели
    if (processingModels.has(modelName)) {
        console.log(`Drop for ${modelName} already processing, skipping`);
        return;
    }
    
    // Устанавливаем флаг обработки для конкретной модели
    processingModels.set(modelName, true);
    
    try {
        console.log("Model name from event:", modelName);
        
        // Проверка наличия имени модели
        if (!modelName) {
            console.warn("Drop event without model name");
            return;
        }
        
        // Получаем текущее количество модели из sessionStorage
        const modelsData = JSON.parse(sessionStorage.getItem('models') || '[]');
        const userId = sessionStorage.getItem('userId');
        
        // Получаем article из data transfer (если есть) или из модели
        const article = event.dataTransfer.getData("article");
        
        // Проверяем, является ли модель специальной (из sidebar)
        const modelElement = document.querySelector(`[data-model="${modelName}"]`);
        const isSpecialModel = modelElement && modelElement.hasAttribute('data-special');
        
        // Находим модель по имени или артикулу
        let modelData = null;
        if (article) {
            modelData = modelsData.find(m => m.article === article);
        } else {
            // Fallback: ищем по имени модели (без .glb)
            const modelNameWithoutExt = modelName.replace('.glb', '');
            modelData = modelsData.find(m => m.name === modelNameWithoutExt);
        }
        
        // Для специальных моделей создаем временные данные если их нет в sessionStorage
        if (!modelData && isSpecialModel) {
            console.log(`Special model detected: ${modelName}, skipping sessionStorage check`);
            modelData = {
                name: modelName.replace('.glb', ''),
                article: article || 'SPECIAL',
                quantity: Infinity,
                isSpecial: true
            };
        }
        
        if (!modelData) {
            console.warn("Model data not found for:", modelName);
            return;
        }
        
        // БЫСТРАЯ ПРОВЕРКА: считаем размещенные объекты локально
        const { placedObjects } = await import('../modules/objectManager.js');
        const placedCount = placedObjects.filter(obj => obj.userData.modelName === modelName).length;
        
        const totalQuantity = modelData.quantity || 0;
        const remainingQuantity = totalQuantity - placedCount;
        
        console.log(`Fast drop check for ${modelName}: placed=${placedCount}, total=${totalQuantity}, remaining=${remainingQuantity}, isSpecial=${isSpecialModel}`);
        
        // Пропускаем проверку количества для специальных моделей
        if (!isSpecialModel && remainingQuantity <= 0) {
            console.warn(`No available quantity for model ${modelName}: ${remainingQuantity} remaining`);
            return;
        }
        
        // Проверка инициализации сцены и площадки
        if (!scene) {
            console.error("Scene not initialized");
            return;
        }
        
        if (!ground) {
            console.error("Ground not initialized");
            return;
        }
        
        // Обновляем позицию мыши
        updateMousePosition(event);
        
        // Обновляем raycaster
        updateRaycaster();
        
        // Определяем точку для размещения объекта
        const position = determineDropPosition();
        console.log("Determined drop position:", position);
        
        // Загружаем и размещаем модель
        console.log("Calling loadAndPlaceModel with:", modelName, position);
        
        // Отмечаем, что drop был обработан для предотвращения скрытия preloader в dragend
        if (modelElement) {
            modelElement.dataset.dragProcessed = 'true';
        }
        
        // Загружаем модель (UI уже обновлен мгновенно в objectManager)
        try {
            console.log("Starting model loading for:", modelName);
            await loadAndPlaceModel(modelName, position);
            console.log("Model loaded successfully, now hiding preloader for:", modelName);
            
            // Скрываем preloader после успешной загрузки модели
            hidePreloaderForModel(modelName);
            
            // Дополнительное принудительное скрытие через setTimeout для надежности
            setTimeout(() => {
                console.log("Forcing preloader hide via setTimeout for:", modelName);
                hidePreloaderForModel(modelName);
            }, 100);
            
            console.log("Preloader hidden successfully for:", modelName);
        } catch (loadError) {
            console.error("Failed to load model:", loadError);
            console.error("Stack trace:", loadError.stack);
            
            // Скрываем preloader и при ошибке загрузки
            console.log("Hiding preloader due to load error for:", modelName);
            hidePreloaderForModel(modelName);
            
            // Принудительное скрытие при ошибке
            setTimeout(() => {
                console.log("Forcing preloader hide after error for:", modelName);
                hidePreloaderForModel(modelName);
            }, 100);
            
            console.log("Preloader hidden after error for:", modelName);
        }
        
    } catch (error) {
        console.error("Error in handleDrop:", error);
        // Скрываем preloader при любой ошибке
        console.log("Hiding preloader due to general error for:", modelName);
        hidePreloaderForModel(modelName);
        console.log("Preloader hidden after general error for:", modelName);
    } finally {
        // Финальное принудительное скрытие preloader
        setTimeout(() => {
            console.log("🔄 [handleDrop] Final forced preloader hide for:", modelName);
            hidePreloaderForModel(modelName);
        }, 200);
        
        // Сбрасываем флаг обработки для конкретной модели
        processingModels.delete(modelName);
    }
}

/**
 * Определяет точку для размещения объекта при drop
 * @returns {THREE.Vector3} Позиция для размещения объекта
 */
function determineDropPosition() {
    console.log("Determining drop position");
    
    // Создаем массив объектов, которые могут быть выбраны (площадка)
    let intersects = [];
    
    // Проверка 1: Пересечение с ground через raycaster
    if (ground) {
        // Если ground сам является мешем (как в случае с простой площадкой)
        if (ground.isMesh) {
            console.log("Ground is a mesh itself, trying direct intersection");
            const directIntersect = raycaster.intersectObject(ground, false);
            console.log("Direct intersection results:", directIntersect);
            if (directIntersect && directIntersect.length > 0) {
                intersects.push(...directIntersect);
            }
        }
        
        // Проверка всех дочерних мешей в ground
        const childIntersects = raycaster.intersectObject(ground, true);
        console.log("Child intersection results:", childIntersects);
        if (childIntersects && childIntersects.length > 0) {
            intersects.push(...childIntersects);
        }
    } else {
        console.warn("Ground is null, can't check for intersections with ground");
    }
    
    // Проверка 2: Проверяем пересечения со всеми объектами в сцене, отмеченными как площадка
    if (scene) {
        console.log("Checking scene for playground objects");
        scene.traverse((object) => {
            if (object.userData && object.userData.isPlayground && object.isMesh) {
                console.log("Found playground mesh in scene:", object.name);
                const sceneIntersects = raycaster.intersectObject(object, false);
                if (sceneIntersects && sceneIntersects.length > 0) {
                    console.log("Found intersection with scene playground mesh:", sceneIntersects);
                    intersects.push(...sceneIntersects);
                }
            }
        });
    }
    
    // Если нашли пересечение с площадкой
    if (intersects.length > 0) {
        // Сортируем пересечения по расстоянию от камеры
        intersects.sort((a, b) => a.distance - b.distance);
        console.log("Using closest intersection point:", intersects[0].point);
        return intersects[0].point;
    } else {
        console.log("No intersections found, using plane at Y=0");
        
        // Создаем резервную плоскость на уровне Y=0
        const planeIntersect = new THREE.Vector3();
        const planeY0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersected = raycaster.ray.intersectPlane(planeY0, planeIntersect);
        
        if (intersected) {
            console.log("Plane Y=0 intersection found:", planeIntersect);
            return planeIntersect;
        } else {
            // Если совсем ничего не нашли, используем фиксированную точку
            console.log("Fallback to fixed position (0,0,0)");
            return new THREE.Vector3(0, 0, 0);
        }
    }
}

/**
 * Обновляет количество модели в сайдбаре при удалении объекта
 * @param {string} modelName - Имя модели
 */
export async function updateModelQuantityOnRemove(modelName) {
    // Проверяем новую структуру sidebar с .model элементами
    const modelElements = document.querySelectorAll('.model');
    if (modelElements.length > 0) {
        // Используем функцию updateModelPlacementCounter из sidebar.js
        try {
            const { updateModelPlacementCounter } = await import('../sidebar.js');
            
            // Обновляем счетчик без передачи placedCount - 
            // функция сама получит актуальные данные из БД
            await updateModelPlacementCounter(modelName);
        } catch (error) {
            console.error('Error updating model placement counter:', error);
        }
        return;
    }
    
    // Поддержка старой структуры с .item элементами
    const items = document.querySelectorAll('.item');
    items.forEach(item => {
        if (item.getAttribute('data-model') === modelName) {
            const currentQuantity = parseInt(item.getAttribute('data-quantity') || '0');
            const newQuantity = currentQuantity + 1;
            
            // Обновляем UI
            updateModelQuantityUI(item, newQuantity);
            
            item.classList.remove('blurred');
        }
    });
}

function updateSidebarDeleteButtons() {
    // Проверяем новую структуру sidebar с .model элементами
    const modelElements = document.querySelectorAll('.model');
    if (modelElements.length > 0) {
        // В новом sidebar кнопки удаления пока не реализованы
        // Можно добавить поддержку в будущем
        return;
    }
    
    // Поддержка старой структуры с .item элементами
    document.querySelectorAll('.item').forEach(item => {
        const modelName = item.getAttribute('data-model');
        const deleteBtn = item.querySelector('.sidebar-delete');
        if (!deleteBtn) {
            return;
        }
        // Проверяем, есть ли хотя бы один объект этой модели на площадке
        const exists = placedObjects.some(obj => obj.userData.modelName === modelName);
        deleteBtn.style.display = exists ? '' : 'none';
        // Снимаем старые обработчики
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        if (exists) {
            newDeleteBtn.addEventListener('click', async () => {
                // Удаляем все объекты этой модели с площадки используя оптимизированную функцию
                const objectsToRemove = placedObjects.filter(obj => obj.userData.modelName === modelName);
                
                if (objectsToRemove.length > 1) {
                    // Массовое удаление - используем оптимизированную функцию
                    try {
                        const { removeObjectsBatch } = await import('../modules/objectManager.js');
                        await removeObjectsBatch(objectsToRemove, modelName);
                        console.log(`Массово удалено ${objectsToRemove.length} объектов модели ${modelName}`);
                    } catch (error) {
                        console.error('Ошибка при массовом удалении:', error);
                        // Fallback к старому способу
                        objectsToRemove.forEach((obj, index) => {
                            const isMassRemoval = index < objectsToRemove.length - 1;
                            removeObject(obj, isMassRemoval);
                            if (!isMassRemoval) {
                                updateModelQuantityOnRemove(modelName);
                            }
                        });
                    }
                } else if (objectsToRemove.length === 1) {
                    // Одиночное удаление - используем стандартную функцию
                    removeObject(objectsToRemove[0]);
                    updateModelQuantityOnRemove(modelName);
                }
                
                // После удаления обновляем кнопки
                setTimeout(updateSidebarDeleteButtons, 100);
            });
        }
    });
}

// Экспортируем функции для использования в других модулях
export { getSessionData, batchUIUpdate };
