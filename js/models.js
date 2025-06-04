import { initDragAndDrop } from './ui/dragAndDrop.js';
import { getQuantityFromDatabase } from './ui/dragAndDrop.js';
import { API_BASE_URL } from './api/serverConfig.js';

/**
 * Получает актуальное количество модели из сессии
 * @param {string} modelName - Имя модели
 * @param {Object} sessionData - Данные сессии
 * @returns {number} Количество модели
 */
export function getModelQuantity(modelName, sessionData) {
    if (!sessionData || !sessionData.quantities) {
        return 0;
    }
    return sessionData.quantities[modelName] || 0;
}

/**
 * Сохраняет актуальное количество модели в сессии
 * @param {string} userId - ID пользователя
 * @param {string} modelName - Имя модели
 * @param {number} quantity - Количество
 */
export async function saveModelQuantity(userId, modelName, quantity) {
    try {
        // Получаем текущую сессию
        const response = await fetch(`${API_BASE_URL}/session/${userId}`);
        if (!response.ok) {
            throw new Error('Failed to get session');
        }
        const { session } = await response.json();
        
        // Обновляем количество в сессии
        const sessionData = session || { quantities: {} };
        sessionData.quantities = sessionData.quantities || {};
        sessionData.quantities[modelName] = quantity;
        
        // Сохраняем обновленную сессию
        await fetch(`${API_BASE_URL}/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, sessionData }),
        });
    } catch (error) {
        console.error('Error saving model quantity:', error);
    }
}

/**
 * Инициализирует новую сессию данными из JSON
 * @param {string} userId - ID пользователя
 * @param {Array} models - Массив моделей из JSON
 */
export async function initializeNewSession(userId, models) {
    try {
        console.log('Initializing new session with models:', models);
        
        // Сначала получаем полные данные моделей через API
        const matchResponse = await fetch(`${API_BASE_URL}/models/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ models }),
        });

        if (!matchResponse.ok) {
            throw new Error('Failed to match models with database');
        }

        const { models: matchedModels } = await matchResponse.json();
        console.log('Matched models:', matchedModels);

        // Создаем начальные данные сессии
        const sessionData = {
            quantities: {},
            placedObjects: []
        };

        // Заполняем количества из JSON, используя article для сопоставления
        models.forEach(jsonModel => {
            const matchedModel = matchedModels.find(m => m.article === jsonModel.article);
            if (matchedModel && matchedModel.name) {
                const modelName = `${matchedModel.name}.glb`;
                sessionData.quantities[modelName] = jsonModel.quantity;
                console.log(`Setting quantity for ${modelName}: ${jsonModel.quantity}`);
            }
        });

        console.log('Final session data to save:', sessionData);

        // Сохраняем сессию в БД
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

        // Проверяем, что данные сохранились
        const verifyResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
        if (verifyResponse.ok) {
            const { session } = await verifyResponse.json();
            console.log('Verified saved session data:', session);
        }

        return sessionData;
    } catch (error) {
        console.error('Error initializing new session:', error);
        return null;
    }
}

async function loadModels(modelsData) {
    try {
        console.log('Loaded JSON data:', modelsData);
        
        // Получаем сессию из БД
        let sessionData = null;
        if (modelsData.user_id) {
            const sessionResponse = await fetch(`${API_BASE_URL}/session/${modelsData.user_id}`);
            if (sessionResponse.ok) {
                const { session } = await sessionResponse.json();
                sessionData = session;
                console.log('Loaded session data:', sessionData);
            }
        }
        
        // Отправляем данные на сервер для сопоставления с БД
        const matchResponse = await fetch(`${API_BASE_URL}/models/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ models: modelsData.models }),
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

        // Get the sidebar element
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = `<h3>Выберите категорию (User: ${modelsData.user_id || 'default'})</h3>`;

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
            
            // Получаем количество из сессии или из JSON
            let quantity = 0;
            if (sessionData && sessionData.quantities) {
                // Если есть данные в сессии, используем их
                quantity = sessionData.quantities[modelName] || 0;
            } else {
                // Если сессии нет, ищем количество в JSON по article
                const jsonModel = modelsData.models.find(m => m.article === model.article);
                if (jsonModel) {
                    quantity = jsonModel.quantity || 0;
                }
            }
            
            console.log(`Model ${modelName} (${model.article}) quantity: ${quantity}`);
            
            // Создаем копию модели с количеством
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
            categoryButton.onclick = () => showModelsForCategory(modelsData, category, categories[category], sidebar);
            categoriesContainer.appendChild(categoryButton);
        });

        sidebar.appendChild(categoriesContainer);

    } catch (error) {
        console.error('Error loading models:', error);
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = '<h3>Ошибка загрузки моделей</h3>';
    }
}

async function showModelsForCategory(modelsData, category, models, sidebar) {
    // Clear previous content
    sidebar.innerHTML = `<h3>${category}</h3>`;
    
    // Add back button
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = '← Назад к категориям';
    backButton.onclick = () => loadModels(modelsData);
    sidebar.appendChild(backButton);

    // Create models container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-container';

    // Create model items
    for (const model of models) {
        const item = document.createElement('div');
        item.className = 'item';
        item.setAttribute('draggable', 'true');
        item.setAttribute('data-model', model.name);
        item.setAttribute('data-article', model.article);
        
        // Проверяем количество в базе данных
        const storedQuantity = await getQuantityFromDatabase(model.name);
        const quantity = storedQuantity !== null ? storedQuantity : model.quantity;
        
        item.setAttribute('data-quantity', quantity);

        // Добавляем класс blurred если количество 0
        if (quantity === 0) {
            item.classList.add('blurred');
            item.style.filter = 'blur(2px)';
            item.style.opacity = '0.9';
            item.style.pointerEvents = 'none';
        }

        // Создаем изображение вместо model-viewer
        const modelImage = document.createElement('img');
        // Заменяем расширение .glb на .png
        const imageName = model.name.replace('.glb', '.png');
        modelImage.src = `textures/${imageName}`;
        modelImage.alt = model.name;
        modelImage.className = 'model-image';

        const article = document.createElement('p');
        article.className = 'model-article';
        article.textContent = model.article;

        const description = document.createElement('p');
        description.className = 'model-description';
        description.textContent = model.description;

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

        item.appendChild(modelImage);
        item.appendChild(article);
        item.appendChild(description);
        item.appendChild(cartContainer);
        itemsContainer.appendChild(item);
    }

    sidebar.appendChild(itemsContainer);

    // Reinitialize drag and drop handlers after creating new items
    if (typeof initDragAndDrop === 'function') {
        initDragAndDrop();
    }
}

// Load models when the page loads
// document.addEventListener('DOMContentLoaded', loadModels);

// Export the loadModels function
export { loadModels };
