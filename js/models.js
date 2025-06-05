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

// Кэш для изображений
const imageCache = new Map();

/**
 * Предварительно загружает изображение и кэширует его
 * @param {string} imageName - Имя файла изображения
 * @returns {Promise<HTMLImageElement>} - Promise с загруженным изображением
 */
function preloadImage(imageName) {
    if (imageCache.has(imageName)) {
        return Promise.resolve(imageCache.get(imageName));
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            imageCache.set(imageName, img);
            resolve(img);
        };
        img.onerror = reject;
        img.src = `textures/${imageName}`;
    });
}

/**
 * Предварительно загружает все изображения для категории
 * @param {Array} models - Массив моделей
 */
async function preloadCategoryImages(models) {
    const imagePromises = models.map(model => {
        const imageName = model.name.replace('.glb', '.png');
        return preloadImage(imageName).catch(error => {
            console.warn(`Failed to preload image for ${imageName}:`, error);
            return null;
        });
    });

    await Promise.all(imagePromises);
}

// Фильтрует модели по выбранной категории
function filterModelsByCategory(models, categoryId) {
    if (!categoryId || categoryId === 'all') {
        return models;
    }
    
    return models.filter(model => model.category === categoryId);
}

export async function loadModels(modelsData) {
    try {
        console.log('Loaded JSON data:', modelsData);
        
        // Получаем ID пользователя из sessionStorage
        let userId = sessionStorage.getItem('userId');
        if (!userId) {
            // Создаем временный ID пользователя если он отсутствует
            userId = 'temp_' + Date.now();
            sessionStorage.setItem('userId', userId);
            console.log('Created temporary user ID:', userId);
        }
        
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
            body: JSON.stringify({ models: modelsData.models }),
        });
        
        if (!matchResponse.ok) {
            throw new Error('Failed to match models with database');
        }
        
        const { models: dbModels } = await matchResponse.json();
        console.log('Matched models from database:', dbModels);

        // Объединяем данные из всех источников
        const combinedModels = dbModels.map(dbModel => {
            // Находим соответствующую модель из modelsData
            const jsonModel = modelsData.models.find(m => m.article === dbModel.article);
            
            return {
                ...dbModel,
                name: `${dbModel.name}.glb`,
                quantity: jsonModel ? jsonModel.quantity : 0,
                isAvailable: true // Все модели из БД считаются доступными
            };
        });

        // Check if we have valid data
        if (!combinedModels || !Array.isArray(combinedModels)) {
            console.error('Invalid data format');
            const sidebar = document.getElementById('sidebar');
            sidebar.innerHTML = '<h3>Ошибка загрузки моделей</h3>';
            return;
        }

        // Get the sidebar element
        const categoriesList = document.getElementById('categoriesList');
        const objectsList = document.getElementById('objectsList');
        
        // Сначала показываем категории
        if (categoriesList && objectsList) {
            categoriesList.style.display = 'block';
            objectsList.style.display = 'none';
            

            // При клике на категорию показываем объекты этой категории
            categoriesList.style.display = 'none';
            objectsList.style.display = 'block';
            
            // Очищаем список объектов
            objectsList.innerHTML = `
                <div class="categories-header">
                    <div class="toggle-categories" onclick="document.getElementById('categoriesList').style.display='block'; document.getElementById('objectsList').style.display='none';">
                        <span>←</span>
                    </div>
                    <h3 class="categories-title">${selectedCategory.name.toUpperCase()}</h3>
                </div>
            `;
            
            // Фильтруем модели по категории
            const filteredModels = filterModelsByCategory(combinedModels, selectedCategory.id);
            
            // Создаем контейнер для объектов
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'items-container';
            
            // Показываем индикатор загрузки
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'loading-indicator';
            loadingIndicator.textContent = 'Загрузка моделей...';
            objectsList.appendChild(loadingIndicator);
            
            try {
            // Предварительно загружаем все изображения
            await preloadCategoryImages(filteredModels);
            
            // Отображаем модели выбранной категории
            for (const model of filteredModels) {
                await createModelItem(model, modelsData, sessionData, itemsContainer);
            }
                
                // Удаляем индикатор загрузки
                loadingIndicator.remove();
            
            objectsList.appendChild(itemsContainer);
            
            // Initialize drag and drop
            initDragAndDrop();
            } catch (error) {
                console.error('Error loading models:', error);
                loadingIndicator.textContent = 'Ошибка загрузки моделей';
            }
        }

    } catch (error) {
        console.error('Error loading models:', error);
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = '<h3>Ошибка загрузки моделей</h3>';
    }
}

// Создает элемент модели для отображения в списке
async function createModelItem(model, modelsData, sessionData, container) {
    const modelName = `${model.name}.glb`;
    
    // Получаем количество из сессии или из JSON
    let quantity = 0;
    if (sessionData && sessionData.quantities) {
        quantity = sessionData.quantities[modelName] || 0;
    } else {
        const jsonModel = modelsData.models.find(m => m.article === model.article);
        if (jsonModel) {
            quantity = jsonModel.quantity || 0;
        }
    }
    
    // Проверяем количество в базе данных
    const storedQuantity = await getQuantityFromDatabase(modelName);
    if (storedQuantity !== null) {
        quantity = storedQuantity;
    }
    
    const item = document.createElement('div');
    item.className = 'item';
    item.setAttribute('draggable', model.isAvailable);
    item.setAttribute('data-model', modelName);
    item.setAttribute('data-article', model.article);
    item.setAttribute('data-quantity', quantity);
    
    // Добавляем классы в зависимости от состояния модели
    if (quantity === 0) {
        item.classList.add('blurred');
        item.style.filter = 'blur(2px)';
        item.style.opacity = '0.9';
        item.style.pointerEvents = 'none';
    }
    
    if (!model.isAvailable) {
        item.classList.add('unavailable');
        item.style.opacity = '0.5';
        item.style.pointerEvents = 'none';
    }
    
    // Создаем изображение
    const modelImage = document.createElement('img');
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

    // Добавляем индикатор доступности, если модель недоступна
    if (!model.isAvailable) {
        const availabilityIndicator = document.createElement('div');
        availabilityIndicator.className = 'availability-indicator';
        availabilityIndicator.textContent = 'Модель недоступна';
        item.appendChild(availabilityIndicator);
    }

    item.appendChild(modelImage);
    item.appendChild(article);
    item.appendChild(description);
    item.appendChild(cartContainer);
    
    container.appendChild(item);
}
