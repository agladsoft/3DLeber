import { initDragAndDrop } from './ui/dragAndDrop.js';
import { loadAndPlaceModel } from './modules/objectManager.js';

const STORAGE_KEY = 'model_quantities';
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Очищает сохраненные количества моделей
 */
export function clearModelQuantities() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Сохраняет актуальное количество модели
 * @param {string} modelName - Имя модели
 * @param {number} quantity - Количество
 */
export function saveModelQuantity(modelName, quantity) {
    const quantities = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    quantities[modelName] = quantity;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
    // Автоматически сохраняем сессию при изменении количества
    // autoSaveSession();
}

/**
 * Получает актуальное количество модели
 * @param {string} modelName - Имя модели
 * @returns {number} Количество модели
 */
export function getModelQuantity(modelName) {
    const quantities = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return quantities[modelName] ?? 0;
}

/**
 * Инициализирует начальные количества моделей
 * @param {Array} models - Массив моделей из models.json
 */
function initializeModelQuantities(models) {
    const quantities = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    let hasChanges = false;

    models.forEach(model => {
        if (model.name) {
            const modelName = `${model.name}.glb`;
            // Инициализируем только если количество еще не установлено
            if (!(modelName in quantities)) {
                quantities[modelName] = model.quantity || 0;
                hasChanges = true;
            }
        }
    });

    if (hasChanges) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
    }
}

/**
 * Сохраняет текущую сессию в БД
 * @param {string} userId - ID пользователя
 * @param {Object} sessionData - Данные сессии
 */
async function saveSessionToDb(userId, sessionData) {
    try {
        if (!userId || !sessionData) {
            console.error('Invalid session data or userId');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, sessionData }),
        });
        
        if (!response.ok) {
            throw new Error('Failed to save session');
        }
    } catch (error) {
        console.error('Error saving session:', error);
    }
}

/**
 * Загружает сохраненную сессию из БД
 * @param {string} userId - ID пользователя
 * @returns {Object|null} Данные сессии или null если сессия не найдена
 */
async function loadSessionFromDb(userId) {
    try {
        if (!userId) {
            console.error('Invalid userId');
            return null;
        }

        const response = await fetch(`${API_BASE_URL}/session/${userId}`);
        if (!response.ok) {
            if (response.status === 404) {
                return null;
            }
            throw new Error('Failed to load session');
        }
        const data = await response.json();
        return data.session;
    } catch (error) {
        console.error('Error loading session:', error);
        return null;
    }
}

/**
 * Восстанавливает состояние из сессии
 * @param {Object} session - Данные сессии
 */
async function restoreSession(session) {
    if (!session) {
        return;
    }

    try {
        // Восстанавливаем количества моделей
        if (session.quantities) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session.quantities));
        }

        // Восстанавливаем размещенные объекты
        if (session.placedObjects && Array.isArray(session.placedObjects)) {
            for (const obj of session.placedObjects) {
                if (obj.modelName && obj.position) {
                    await loadAndPlaceModel(obj.modelName, obj.position);
                }
            }
        }
    } catch (error) {
        console.error('Error restoring session:', error);
    }
}

// Флаг для отслеживания первой загрузки
let isFirstLoad = true;

async function loadModels() {
    try {
        // Очищаем сохраненные количества только при первой загрузке страницы
        if (isFirstLoad) {
            clearModelQuantities();
            isFirstLoad = false;
        }
        
        // Загружаем JSON файл
        const jsonResponse = await fetch('models.json');
        if (!jsonResponse.ok) {
            throw new Error('Failed to fetch JSON data');
        }
        const jsonData = await jsonResponse.json();
        
        // Пытаемся восстановить сессию
        if (jsonData.user_id) {
            const session = await loadSessionFromDb(jsonData.user_id);
            if (session) {
                await restoreSession(session);
            }
        }
        
        // Отправляем данные на сервер для сопоставления с БД
        const matchResponse = await fetch(`${API_BASE_URL}/models/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ models: jsonData.models }),
        });
        
        if (!matchResponse.ok) {
            throw new Error('Failed to match models with database');
        }
        
        const data = await matchResponse.json();
        console.log('Matched models:', data);

        // Check if we have valid data
        if (!data || !data.models || !Array.isArray(data.models)) {
            console.error('Invalid data format');
            const sidebar = document.getElementById('sidebar');
            sidebar.innerHTML = '<h3>Ошибка загрузки моделей</h3>';
            return;
        }

        const { models } = data;

        // Инициализируем начальные количества
        initializeModelQuantities(models);

        // Get the sidebar element
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = `<h3>Выберите категорию (User: ${jsonData.user_id || 'default'})</h3>`;

        // Group models by category
        const categories = {};
        models.forEach(model => {
            if (!model.name || !model.category) {
                return;
            }
            if (!categories[model.category]) {
                categories[model.category] = [];
            }
            // Добавляем расширение .glb к имени модели
            const modelName = `${model.name}.glb`;
            // Используем сохраненное количество
            const quantity = getModelQuantity(modelName);
            // Создаем копию модели с обновленным количеством
            const modelCopy = { ...model, name: modelName, quantity };
            categories[model.category].push(modelCopy);
        });

        // Create categories container
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'categories-container';

        // Create category buttons
        Object.keys(categories).forEach(category => {
            const categoryButton = document.createElement('button');
            categoryButton.className = 'category-button';
            categoryButton.textContent = category;
            categoryButton.onclick = () => showModelsForCategory(category, categories[category], sidebar);
            categoriesContainer.appendChild(categoryButton);
        });

        sidebar.appendChild(categoriesContainer);

        // После успешной загрузки моделей сохраняем текущее состояние сессии
        if (jsonData.user_id) {
            const sessionData = {
                quantities: JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'),
                placedObjects: window.placedObjects || []
            };
            await saveSessionToDb(jsonData.user_id, sessionData);
        }

    } catch (error) {
        console.error('Error loading models:', error);
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = '<h3>Ошибка загрузки моделей</h3>';
    }
}

function showModelsForCategory(category, models, sidebar) {
    // Clear previous content
    sidebar.innerHTML = `<h3>${category}</h3>`;
    
    // Add back button
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = '← Назад к категориям';
    backButton.onclick = () => loadModels();
    sidebar.appendChild(backButton);

    // Create models container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-container';

    // Create model items
    models.forEach(model => {
        const item = document.createElement('div');
        item.className = 'item';
        item.setAttribute('draggable', 'true');
        item.setAttribute('data-model', model.name);
        item.setAttribute('data-article', model.article);
        const quantity = getModelQuantity(model.name);
        item.setAttribute('data-quantity', quantity);

        // Добавляем класс blurred если количество 0
        if (quantity === 0) {
            item.classList.add('blurred');
        }

        const modelViewer = document.createElement('model-viewer');
        modelViewer.setAttribute('src', `models/${model.name}`);
        modelViewer.setAttribute('auto-rotate', '');
        modelViewer.setAttribute('camera-controls', '');
        modelViewer.setAttribute('disable-zoom', '');
        modelViewer.setAttribute('ar-status', 'not-presenting');
        modelViewer.setAttribute('rotation-per-second', '30deg');
        modelViewer.setAttribute('alt', model.name);

        const name = document.createElement('p');
        name.className = 'model-name';
        name.textContent = model.name;

        // Создаем отдельный контейнер для корзины и количества
        const cartContainer = document.createElement('div');
        cartContainer.className = 'cart-container';
        const cartIcon = document.createElement('span');
        cartIcon.className = 'cart-icon';
        cartIcon.textContent = '🛒';
        const quantityElement = document.createElement('span');
        quantityElement.className = 'model-quantity';
        quantityElement.textContent = quantity;
        cartContainer.appendChild(cartIcon);
        cartContainer.appendChild(quantityElement);

        item.appendChild(modelViewer);
        item.appendChild(name);
        item.appendChild(cartContainer);
        itemsContainer.appendChild(item);
    });

    sidebar.appendChild(itemsContainer);

    // Reinitialize drag and drop handlers after creating new items
    if (typeof initDragAndDrop === 'function') {
        initDragAndDrop();
    }
}

/**
 * Автоматически сохраняет текущее состояние сессии
 */
export async function autoSaveSession() {
    try {
        const jsonResponse = await fetch('models.json');
        if (!jsonResponse.ok) {
            return;
        }
        const jsonData = await jsonResponse.json();
        
        if (!jsonData.user_id) {
            return;
        }

        const sessionData = {
            quantities: JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'),
            placedObjects: window.placedObjects || []
        };
        await saveSessionToDb(jsonData.user_id, sessionData);
    } catch (error) {
        console.error('Error auto-saving session:', error);
    }
}

// Load models when the page loads
document.addEventListener('DOMContentLoaded', loadModels);
