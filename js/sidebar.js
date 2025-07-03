/**
 * Модуль для интеграции новой версии категорий в основной проект
 */
import { API_BASE_URL } from './api/serverConfig.js';

// Переменная для отслеживания последнего обновления
let lastUpdateTime = 0;
const UPDATE_THROTTLE = 1000; // Минимальный интервал между обновлениями в мс

// Кэш DOM элементов для быстрого доступа
const modelElementsCache = new Map();
const placementElementsCache = new Map();
const preloaderElementsCache = new Map();

// Функция для применения новых стилей
function applyNewStyles() {
    // Стили теперь находятся в styles.css, поэтому ничего не нужно делать
    console.log('Styles are already included in styles.css');
}

// Функция для создания новой структуры сайдбара
async function createNewSidebar() {
    console.log('Creating new sidebar...');
    
    // Находим сайдбар
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
        console.error('Sidebar not found!');
        return;
    }
    
    // Применяем класс для изоляции стилей
    sidebar.classList.add('categories-sidebar');
    
    // Очищаем кэши DOM элементов при пересоздании sidebar
    modelElementsCache.clear();
    placementElementsCache.clear();
    preloaderElementsCache.clear();
    
    // Очищаем сайдбар
    sidebar.innerHTML = '';
    
    // Создаем новую структуру сайдбара
    const sidebarHeader = document.createElement('div');
    sidebarHeader.className = 'sidebar-header';
    sidebarHeader.innerHTML = `
        <div class="back-button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <h3 class="sidebar-title">ИЗДЕЛИЯ</h3>
    `;
    
    // Создаем вертикальный текст для схлопнутого состояния
    const verticalTitle = document.createElement('div');
    verticalTitle.className = 'vertical-title';
    verticalTitle.textContent = 'ИЗДЕЛИЯ';
    
    const categoriesList = document.createElement('div');
    categoriesList.className = 'categories-list';
    
    // Получаем данные из sessionStorage
    const modelsData = JSON.parse(sessionStorage.getItem('models') || '[]');
    const userId = sessionStorage.getItem('userId');
    
    try {
        // Получаем сессию из БД
        let sessionData = null;
        const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
        if (sessionResponse.ok) {
            const { session } = await sessionResponse.json();
            sessionData = session;
            console.log('Loaded session data:', sessionData);
        }
        
        // Отправляем данные на сервер для сопоставления с БД
        const matchResponse = await fetch(`${API_BASE_URL}/models/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ models: modelsData }),
        });
        
        if (!matchResponse.ok) {
            throw new Error('Failed to match models with database');
        }
        
        const { models: dbModels } = await matchResponse.json();
        console.log('Matched models from database:', dbModels);

        // Получаем все модели из специальных категорий
        const specialResponse = await fetch(`${API_BASE_URL}/models/special-categories`);
        const { models: specialModels } = specialResponse.ok ? await specialResponse.json() : { models: [] };
        console.log('Special category models:', specialModels);

        // Объединяем данные из всех источников
        const combinedModels = dbModels.map(dbModel => {
            // Находим соответствующую модель из modelsData
            const jsonModel = modelsData.find(m => m.article === dbModel.article);
            
            return {
                ...dbModel,
                name: `${dbModel.name}.glb`,
                quantity: jsonModel ? jsonModel.quantity : 0,
                isAvailable: true // Все модели из БД считаются доступными
            };
        });

        // Добавляем специальные модели с бесконечным количеством
        const specialCombinedModels = specialModels.map(specialModel => ({
            ...specialModel,
            name: `${specialModel.name}.glb`,
            quantity: Infinity,
            isSpecial: true,
            isAvailable: true
        }));

        // Объединяем обычные и специальные модели
        const allModels = [...combinedModels, ...specialCombinedModels];

        // Группируем модели по категориям
        const categorizedModels = {};
        const additionalCategories = ['Деревья', 'Пальмы', 'Кустарники', 'Люди'];
        const regularModels = [];
        
        allModels.forEach(model => {
            const category = model.category || 'Без категории';
            
            // Если модель относится к дополнительным категориям, группируем отдельно
            if (additionalCategories.includes(category)) {
                if (!categorizedModels[category]) {
                    categorizedModels[category] = [];
                }
                categorizedModels[category].push(model);
            } else {
                // Остальные модели показываем без группировки
                regularModels.push(model);
            }
        });

        // Сначала добавляем обычные модели без группировки по категориям
        regularModels.forEach(model => {
            const modelElement = createModelElement(model, sessionData, modelsData);
            categoriesList.appendChild(modelElement);
        });

        // Затем добавляем секцию "Дополнительные модели" в конце, если есть дополнительные категории
        const hasAdditionalModels = additionalCategories.some(cat => categorizedModels[cat] && categorizedModels[cat].length > 0);
        
        if (hasAdditionalModels) {
            createSimpleAdditionalModelsSection(categoriesList, categorizedModels, additionalCategories, sessionData, modelsData);
        }
        
        // Добавляем все элементы в сайдбар
        sidebar.appendChild(sidebarHeader);
        sidebar.appendChild(categoriesList);
        sidebar.appendChild(verticalTitle);
        
        // Добавляем обработчик для кнопки возврата (теперь это кнопка схлопывания)
        const backButton = sidebarHeader.querySelector('.back-button');
        backButton.addEventListener('click', function() {            
            // Переключаем класс collapsed для сайдбара
            sidebar.classList.toggle('collapsed');
            
            // Сохраняем состояние в localStorage для сохранения после перезагрузки
            if (sidebar.classList.contains('collapsed')) {
                localStorage.setItem('sidebar_collapsed', 'true');
            } else {
                localStorage.setItem('sidebar_collapsed', 'false');
            }
        });
        
        // Проверяем сохраненное состояние при загрузке
        if (localStorage.getItem('sidebar_collapsed') === 'true') {
            sidebar.classList.add('collapsed');
        }
                
        // Обновляем все счетчики сразу после создания sidebar для актуальных данных
        setTimeout(async () => {
            await refreshAllModelCounters();
        }, 100);
        
    } catch (error) {
        console.error('Error creating sidebar:', error);
        sidebar.innerHTML = '<div class="error-message">Ошибка загрузки моделей</div>';
    }
}

/**
 * Создает элемент модели
 * @param {Object} model - Объект модели
 * @param {Object} sessionData - Данные сессии
 * @param {Array} modelsData - Данные моделей из sessionStorage
 * @returns {HTMLElement} - DOM элемент модели
 */
function createModelElement(model, sessionData, modelsData) {
    const modelElement = document.createElement('div');
    modelElement.className = 'model';
    modelElement.dataset.modelId = model.id;
    modelElement.setAttribute('data-model', model.name);
    modelElement.setAttribute('data-article', model.article);
    modelElement.setAttribute('data-quantity', model.quantity);
    
    // Добавляем атрибут для специальных моделей
    if (model.isSpecial) {
        modelElement.setAttribute('data-special', 'true');
    }
    
    // Кэшируем элемент для быстрого доступа
    modelElementsCache.set(model.name, modelElement);
    
    // Получаем количество размещенных объектов
    const placedCount = sessionData?.placedObjects ? sessionData.placedObjects.filter(obj => obj.modelName === model.name).length : 0;
    
    // Для специальных моделей устанавливаем бесконечное количество
    let totalQuantity, remainingQuantity;
    if (model.isSpecial) {
        totalQuantity = '∞';
        remainingQuantity = Infinity;
    } else {
        // Получаем общее количество из modelsData для обычных моделей
        totalQuantity = modelsData.find(m => m.article === model.article)?.quantity || 0;
        remainingQuantity = totalQuantity - placedCount;
    }
    
    // Добавляем классы в зависимости от состояния модели
    if (!model.isSpecial && remainingQuantity <= 0) {
        modelElement.classList.add('blurred');
        modelElement.style.filter = 'blur(2px)';
        modelElement.style.opacity = '0.9';
        modelElement.style.pointerEvents = 'none';
        modelElement.setAttribute('draggable', 'false');
    } else {
        modelElement.setAttribute('draggable', 'true');
    }
    
    modelElement.innerHTML = `
        <div class="model-image">
            <img src="textures/${model.name.replace('.glb', '.png')}" alt="${model.description}">
        </div>
        <div class="model-article">${model.article}</div>
        <div class="model-title">${model.description}</div>
        <div class="model-placement">${model.isSpecial ? `Добавлено на площадку: ${placedCount}` : `Добавлено на площадку: ${placedCount} из ${totalQuantity}`}</div>
        <div class="model-preloader">
            <div class="model-preloader-spinner"></div>
        </div>
    `;
    
    // Кэшируем placement и preloader элементы для быстрого доступа
    const placementElement = modelElement.querySelector('.model-placement');
    const preloaderElement = modelElement.querySelector('.model-preloader');
    placementElementsCache.set(model.name, placementElement);
    preloaderElementsCache.set(model.name, preloaderElement);
    
    // Добавляем обработчик drag-and-drop с невидимым изображением
    modelElement.addEventListener('dragstart', function(event) {
        const element = event.currentTarget;
        
        // Проверяем актуальное состояние доступности модели
        const isDraggable = element.getAttribute('draggable');
        const isBlurred = element.classList.contains('blurred');
        
        console.log(`Drag attempt for model: ${model.name}, draggable: ${isDraggable}, blurred: ${isBlurred}`);
        
        if (isDraggable === 'false' || isBlurred) {
            console.log('Model is not available for dragging:', model.name, 'isDraggable:', isDraggable, 'isBlurred:', isBlurred);
            event.preventDefault();
            return;
        }
        
        // Дополнительная проверка через актуальные данные только для обычных моделей
        if (!model.isSpecial) {
            const placementDiv = element.querySelector('.model-placement');
            if (placementDiv) {
                const placementText = placementDiv.textContent;
                console.log(`Placement text for ${model.name}:`, placementText);
                const match = placementText.match(/(\d+) из (\d+)/);
                if (match) {
                    const [, placed, total] = match;
                    const remaining = parseInt(total) - parseInt(placed);
                    console.log(`Model ${model.name}: placed=${placed}, total=${total}, remaining=${remaining}`);
                    if (remaining <= 0) {
                        console.log('No remaining quantity for model:', model.name);
                        event.preventDefault();
                        return;
                    }
                }
            }
        }
        
        event.dataTransfer.setData('model', model.name);
        event.dataTransfer.setData('article', model.article);
        
        // Создаем невидимое изображение для drag
        const invisibleDragImage = document.createElement('div');
        invisibleDragImage.style.width = '1px';
        invisibleDragImage.style.height = '1px';
        invisibleDragImage.style.position = 'absolute';
        invisibleDragImage.style.top = '-1000px';
        invisibleDragImage.style.opacity = '0';
        document.body.appendChild(invisibleDragImage);
        
        // Устанавливаем невидимое изображение
        event.dataTransfer.setDragImage(invisibleDragImage, 0, 0);
        
        // Удаляем невидимый элемент через небольшое время
        setTimeout(() => {
            if (invisibleDragImage.parentNode) {
                invisibleDragImage.parentNode.removeChild(invisibleDragImage);
            }
        }, 100);
        
        console.log('Drag started successfully for model:', model.name);
        
        // Показываем preloader при начале перетаскивания
        showModelPreloader(model.name);
    });
    
    // Добавляем обработчик dragend для скрытия preloader если drag отменен
    modelElement.addEventListener('dragend', function(event) {
        // Скрываем preloader через небольшую задержку, чтобы дать время на drop
        setTimeout(() => {
            // Проверяем, не был ли уже обработан drop
            if (!event.currentTarget.dataset.dragProcessed) {
                console.log('Dragend: hiding preloader for cancelled drag:', model.name);
                hideModelPreloader(model.name);
            } else {
                console.log('Dragend: drop was processed, not hiding preloader:', model.name);
            }
            // Сбрасываем флаг
            delete event.currentTarget.dataset.dragProcessed;
        }, 150); // Увеличили задержку для надежности
    });
    
    return modelElement;
}

/**
 * Создает секцию "Дополнительные модели" с простым списком моделей
 * @param {HTMLElement} parentElement - Родительский элемент
 * @param {Object} categorizedModels - Объект с моделями по категориям
 * @param {Array} additionalCategories - Массив дополнительных категорий
 * @param {Object} sessionData - Данные сессии
 * @param {Array} modelsData - Данные моделей из sessionStorage
 */
function createSimpleAdditionalModelsSection(parentElement, categorizedModels, additionalCategories, sessionData, modelsData) {
    // Создаем основной контейнер для дополнительных моделей
    const additionalSection = document.createElement('div');
    additionalSection.className = 'category additional-models-section active';
    
    // Создаем заголовок секции
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'category-header additional-header';
    sectionHeader.innerHTML = `
        <h4 class="category-name">Дополнительные модели</h4>
        <div class="category-arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 19l-7-7 7-7" stroke="#FF7E3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
    `;
    
    // Создаем контейнер для моделей
    const modelsContainer = document.createElement('div');
    modelsContainer.className = 'models-container';
    
    // Собираем все модели из дополнительных категорий в один список
    let allAdditionalModels = [];
    additionalCategories.forEach(categoryName => {
        if (categorizedModels[categoryName] && categorizedModels[categoryName].length > 0) {
            allAdditionalModels = allAdditionalModels.concat(categorizedModels[categoryName]);
        }
    });
    
    // Добавляем все модели в контейнер
    allAdditionalModels.forEach(model => {
        const modelElement = createModelElement(model, sessionData, modelsData);
        modelsContainer.appendChild(modelElement);
    });
    
    // Добавляем обработчик клика на заголовок основной секции
    sectionHeader.addEventListener('click', function() {
        additionalSection.classList.toggle('active');
        
        // Сохраняем состояние в localStorage
        const categoryState = JSON.parse(localStorage.getItem('categories_state') || '{}');
        categoryState['Дополнительные модели'] = additionalSection.classList.contains('active');
        localStorage.setItem('categories_state', JSON.stringify(categoryState));
    });
    
    // Восстанавливаем состояние из localStorage
    const categoryState = JSON.parse(localStorage.getItem('categories_state') || '{}');
    if (categoryState['Дополнительные модели'] === false) {
        additionalSection.classList.remove('active');
    }
    
    // Собираем секцию
    additionalSection.appendChild(sectionHeader);
    additionalSection.appendChild(modelsContainer);
    
    // Добавляем в родительский элемент
    parentElement.appendChild(additionalSection);
}

/**
 * Обновляет все счетчики моделей в sidebar
 */
export async function refreshAllModelCounters() {
    try {
        // Убираем throttling для быстрого обновления при множественных операциях
        lastUpdateTime = Date.now();

        const modelElements = document.querySelectorAll('.model[data-model]');
        if (modelElements.length === 0) {
            return;
        }

        // Получаем данные сессии один раз для всех моделей
        const userId = sessionStorage.getItem('userId');
        if (!userId) {
            console.warn('No user ID found for updating counters');
            return;
        }

        // Получаем актуальные данные сессии
        let sessionData = null;
        try {
            const { getSessionData } = await import('./ui/dragAndDrop.js');
            sessionData = await getSessionData();
        } catch (error) {
            console.error('Error getting session data:', error);
            return;
        }

        if (!sessionData) {
            console.warn('No session data available for updating counters');
            return;
        }

        const modelsData = JSON.parse(sessionStorage.getItem('models') || '[]');
        
        // Обновляем все счетчики одним проходом
        modelElements.forEach(element => {
            const modelName = element.getAttribute('data-model');
            const article = element.getAttribute('data-article');
            const isSpecial = element.hasAttribute('data-special');
            
            if (!modelName || !article) return;

            const placedCount = sessionData.placedObjects ? 
                sessionData.placedObjects.filter(obj => obj.modelName === modelName).length : 0;
            
            let totalQuantity, remainingQuantity;
            if (isSpecial) {
                totalQuantity = '∞';
                remainingQuantity = Infinity;
            } else {
                totalQuantity = modelsData.find(m => m.article === article)?.quantity || 0;
                remainingQuantity = totalQuantity - placedCount;
            }
            
            // Используем кэшированный элемент если доступен, иначе ищем в DOM
            const cachedPlacementElement = placementElementsCache.get(modelName);
            const placementDiv = cachedPlacementElement || element.querySelector('.model-placement');
            
            if (placementDiv) {
                if (isSpecial) {
                    placementDiv.textContent = `Добавлено на площадку: ${placedCount}`;
                } else {
                    placementDiv.textContent = `Добавлено на площадку: ${placedCount} из ${totalQuantity}`;
                }
            }
            
            // Обновляем состояние blur и draggable только для обычных моделей
            if (!isSpecial && remainingQuantity <= 0) {
                element.classList.add('blurred');
                element.style.filter = 'blur(2px)';
                element.style.opacity = '0.9';
                element.style.pointerEvents = 'none';
                element.setAttribute('draggable', 'false');
            } else {
                element.classList.remove('blurred');
                element.style.filter = '';
                element.style.opacity = '';
                element.style.pointerEvents = '';
                element.setAttribute('draggable', 'true');
            }
        });
        
    } catch (error) {
        console.error('Error refreshing model counters:', error);
    }
}

/**
 * Инициализация сайдбара - экспортируемая функция
 */
export async function initSidebar() {
    applyNewStyles();
    await createNewSidebar();
    
    // Делаем функцию обновления доступной глобально для мгновенного доступа
    window.updateModelCounterDirectly = updateModelCounterDirectly;
    
    // Дополнительное обновление счетчиков после полной инициализации
    setTimeout(async () => {
        await refreshAllModelCounters();
    }, 100);
}

/**
 * Обновляет счетчик размещенных объектов для конкретной модели
 * @param {string} modelName - Имя модели
 * @param {number} placedCount - Количество размещенных объектов (опционально, если не передано - получается из БД)
 */
export async function updateModelPlacementCounter(modelName, placedCount = null) {
    try {
        const userId = sessionStorage.getItem('userId');
        const modelsData = JSON.parse(sessionStorage.getItem('models') || '[]');
        
        // Если placedCount передан, используем его без дополнительного API запроса
        let actualPlacedCount = placedCount;
        if (actualPlacedCount === null) {
            // Получаем актуальные данные сессии
            try {
                const { getSessionData } = await import('./ui/dragAndDrop.js');
                const sessionData = await getSessionData();
                actualPlacedCount = sessionData?.placedObjects ? 
                    sessionData.placedObjects.filter(obj => obj.modelName === modelName).length : 0;
            } catch (error) {
                console.error('Error getting session data:', error);
                actualPlacedCount = 0;
            }
        }
        
        const modelElements = document.querySelectorAll(`[data-model="${modelName}"]`);
        
        modelElements.forEach(element => {
            const article = element.getAttribute('data-article');
            const isSpecial = element.hasAttribute('data-special');
            
            let totalQuantity, remainingQuantity;
            if (isSpecial) {
                totalQuantity = '∞';
                remainingQuantity = Infinity;
            } else {
                totalQuantity = modelsData.find(m => m.article === article)?.quantity || 0;
                remainingQuantity = totalQuantity - actualPlacedCount;
            }
            
            // Обновляем счетчик
            const placementDiv = element.querySelector('.model-placement');
            if (placementDiv) {
                if (isSpecial) {
                    placementDiv.textContent = `Добавлено на площадку: ${actualPlacedCount}`;
                } else {
                    placementDiv.textContent = `Добавлено на площадку: ${actualPlacedCount} из ${totalQuantity}`;
                }
            }
            
            // Обновляем состояние blur и draggable только для обычных моделей
            if (!isSpecial && remainingQuantity <= 0) {
                element.classList.add('blurred');
                element.style.filter = 'blur(2px)';
                element.style.opacity = '0.9';
                element.style.pointerEvents = 'none';
                element.setAttribute('draggable', 'false');
            } else {
                element.classList.remove('blurred');
                element.style.filter = '';
                element.style.opacity = '';
                element.style.pointerEvents = '';
                element.setAttribute('draggable', 'true');
            }
        });
        
    } catch (error) {
        console.error('Error updating model placement counter:', error);
    }
}

/**
 * Принудительно обновляет счетчики модели (можно вызывать из других модулей)
 * @param {string} modelName - Имя модели для обновления (опционально, если не указано - обновляются все)
 */
export async function forceUpdateModelCounters(modelName = null) {
    // Сбрасываем throttling для принудительного обновления
    lastUpdateTime = 0;
    
    if (modelName) {
        await updateModelPlacementCounter(modelName);
    } else {
        await refreshAllModelCounters();
    }
}

/**
 * Мгновенно обновляет счетчик модели на указанную дельту (для optimistic updates)
 * @param {string} modelName - Имя модели
 * @param {number} delta - Изменение счетчика (+1 или -1)
 */
export function updateModelCounterDirectly(modelName, delta) {
    // Используем кэшированные элементы для быстрого доступа
    const cachedModelElement = modelElementsCache.get(modelName);
    const cachedPlacementElement = placementElementsCache.get(modelName);
    
    if (cachedModelElement && cachedPlacementElement) {
        // Быстрый путь с кэшированными элементами
        updateSingleModelElement(cachedModelElement, cachedPlacementElement, delta);
    } else {
        // Fallback: используем querySelector если кэш недоступен
        const modelElements = document.querySelectorAll(`[data-model="${modelName}"]`);
        modelElements.forEach(element => {
            const placementElement = element.querySelector('.model-placement');
            updateSingleModelElement(element, placementElement, delta);
        });
    }
}

/**
 * Обновляет отдельный элемент модели
 * @param {HTMLElement} element - Элемент модели
 * @param {HTMLElement} placementElement - Элемент счетчика размещения
 * @param {number} delta - Изменение счетчика
 */
function updateSingleModelElement(element, placementElement, delta) {
    if (placementElement) {
        const isSpecial = element.hasAttribute('data-special');
        const placementText = placementElement.textContent;
        
        if (isSpecial) {
            // Для специальных моделей только обновляем счетчик размещенных
            const match = placementText.match(/Добавлено на площадку: (\d+)/);
            if (match) {
                const currentPlaced = parseInt(match[1]) || 0;
                const newPlaced = Math.max(0, currentPlaced + delta);
                placementElement.textContent = `Добавлено на площадку: ${newPlaced}`;
            }
            
            // Специальные модели всегда доступны для перетаскивания
            element.classList.remove('blurred');
            element.style.filter = 'none';
            element.style.opacity = '1';
            element.style.pointerEvents = 'auto';
            element.setAttribute('draggable', 'true');
        } else {
            // Для обычных моделей используем старую логику
            const match = placementText.match(/Добавлено на площадку: (\d+) из (\d+)/);
            
            if (match) {
                const currentPlaced = parseInt(match[1]) || 0;
                const total = parseInt(match[2]) || 0;
                const newPlaced = Math.max(0, Math.min(total, currentPlaced + delta));
                const remaining = total - newPlaced;
                
                // Обновляем текст
                placementElement.textContent = `Добавлено на площадку: ${newPlaced} из ${total}`;
                
                // Мгновенно обновляем визуальное состояние
                if (remaining <= 0) {
                    element.classList.add('blurred');
                    element.style.filter = 'blur(2px)';
                    element.style.opacity = '0.9';
                    element.style.pointerEvents = 'none';
                    element.setAttribute('draggable', 'false');
                } else {
                    element.classList.remove('blurred');
                    element.style.filter = 'none';
                    element.style.opacity = '1';
                    element.style.pointerEvents = 'auto';
                    element.setAttribute('draggable', 'true');
                }
            }
        }
    }
}

/**
 * Показывает preloader для указанной модели
 * @param {string} modelName - Имя модели
 */
export function showModelPreloader(modelName) {
    console.log('🔄 [showModelPreloader] Attempting to show preloader for:', modelName);
    
    let preloadersShown = 0;
    
    // Способ 1: Попытка через кэш
    const preloaderElement = preloaderElementsCache.get(modelName);
    if (preloaderElement) {
        const wasVisible = preloaderElement.classList.contains('visible');
        preloaderElement.classList.add('visible');
        preloaderElement.style.display = ''; // Убираем принудительное скрытие если было
        
        if (!wasVisible) {
            preloadersShown++;
            console.log('✅ [showModelPreloader] Preloader shown via cache for:', modelName);
        }
    }
    
    // Способ 2: Прямой поиск в DOM (даже если кэш сработал, для надежности)
    console.log('🔍 [showModelPreloader] Performing additional DOM search for:', modelName);
    const modelElements = document.querySelectorAll(`[data-model="${modelName}"]`);
    console.log('🔍 [showModelPreloader] Found model elements:', modelElements.length, 'for:', modelName);
    
    modelElements.forEach((element, index) => {
        const preloader = element.querySelector('.model-preloader');
        if (preloader && !preloader.classList.contains('visible')) {
            preloader.classList.add('visible');
            preloader.style.display = ''; // Убираем принудительное скрытие
            preloadersShown++;
            console.log(`✅ [showModelPreloader] Preloader shown via DOM search (element ${index}) for:`, modelName);
        }
    });
    
    console.log(`📊 [showModelPreloader] Total preloaders shown: ${preloadersShown} for:`, modelName);
    
    // Если ничего не нашли, выводим предупреждение
    if (preloadersShown === 0) {
        console.warn(`⚠️ [showModelPreloader] No preloaders to show found for model: ${modelName}`);
    }
}

/**
 * Скрывает preloader для указанной модели
 * @param {string} modelName - Имя модели
 */
export function hideModelPreloader(modelName) {
    console.log('hideModelPreloader called for:', modelName);
    
    let preloadersHidden = 0;
    
    // Способ 1: Попытка через кэш
    const preloaderElement = preloaderElementsCache.get(modelName);
    if (preloaderElement) {
        console.log('Found preloader in cache for:', modelName);
        preloaderElement.classList.remove('visible');
        preloadersHidden++;
        console.log('Preloader hidden via cache for:', modelName);
    }
    
    // Способ 2: Прямой поиск в DOM (даже если кэш сработал, для надежности)
    console.log('Performing additional DOM search for:', modelName);
    const modelElements = document.querySelectorAll(`[data-model="${modelName}"]`);
    console.log('Found model elements:', modelElements.length, 'for:', modelName);
    
    modelElements.forEach((element, index) => {
        const preloader = element.querySelector('.model-preloader');
        if (preloader && preloader.classList.contains('visible')) {
            preloader.classList.remove('visible');
            preloadersHidden++;
            console.log(`Preloader hidden via DOM search (element ${index}) for:`, modelName);
        }
    });
    
    // Способ 3: Поиск по всем видимым preloader'ам
    const allVisiblePreloaders = document.querySelectorAll('.model-preloader.visible');
    allVisiblePreloaders.forEach((preloader, index) => {
        const parentElement = preloader.closest('[data-model]');
        if (parentElement && parentElement.getAttribute('data-model') === modelName) {
            preloader.classList.remove('visible');
            preloadersHidden++;
            console.log(`Additional preloader hidden (${index}) for:`, modelName);
        }
    });
    
    console.log(`Total preloaders hidden: ${preloadersHidden} for:`, modelName);
    
    // Если ничего не нашли, выводим предупреждение
    if (preloadersHidden === 0) {
        console.warn(`No visible preloaders found for model: ${modelName}`);
    }
}

// Экспортируем функции для использования в других модулях
export { applyNewStyles, createNewSidebar };