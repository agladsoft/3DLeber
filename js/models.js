import { initDragAndDrop } from './ui/dragAndDrop.js';
import { getQuantityFromDatabase } from './ui/dragAndDrop.js';
import { getUserSession, createNewSession, savePlaygroundParams, getModels } from './api/apiWrapper.js';
import { categories, renderCategories, filterModelsByCategory, getModelCategory } from './categories.js';

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
        
        // Используем API-обертку для создания новой сессии
        // Обертка автоматически использует мок-данные, если API недоступен
        const newSessionData = await createNewSession(userId, models);
        
        // Если сессия создана успешно, логируем результат
        if (newSessionData) {
            console.log('New session created:', newSessionData);
            
            // Сохраняем ID сессии в sessionStorage для быстрого доступа
            if (newSessionData.session && newSessionData.session.id) {
                sessionStorage.setItem('sessionId', newSessionData.session.id);
            }
            
            return newSessionData;
        } else {
            throw new Error('Session not created');
        }
    } catch (error) {
        console.error('Error initializing new session:', error);
        
        // Возвращаем заглушку данных сессии, чтобы не блокировать приложение
        return {
            userId: userId,
            session: {
                id: 'fallback_session_' + Date.now(),
                playground: {},
                models: models || [],
                quantities: {},
                placedObjects: []
            }
        };
    }
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
        
        // Получаем данные сессии через API-обертку
        const { session: sessionData } = await getUserSession(userId);
        console.log('Loaded session data:', sessionData);
        
        // Получаем список всех моделей через API-обертку
        const modelsList = await getModels();
        console.log('Loaded models:', modelsList);

        // Check if we have valid data
        if (!modelsList || !Array.isArray(modelsList)) {
            console.error('Invalid data format');
            const sidebar = document.getElementById('sidebar');
            sidebar.innerHTML = '<h3>Ошибка загрузки моделей</h3>';
            return;
        }

        // Используем полученные модели
        const models = modelsList;

        // Get the sidebar element
        const sidebar = document.getElementById('sidebar');
        const categoriesList = document.getElementById('categoriesList');
        const objectsList = document.getElementById('objectsList');
        
        // Сначала показываем категории
        if (categoriesList && objectsList) {
            categoriesList.style.display = 'block';
            objectsList.style.display = 'none';
            
            // Рендерим категории
            renderCategories(categoriesList, async (selectedCategory) => {
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
                const filteredModels = filterModelsByCategory(models, selectedCategory.id);
                
                // Создаем контейнер для объектов
                const itemsContainer = document.createElement('div');
                itemsContainer.className = 'items-container';
                
                // Отображаем модели выбранной категории
                for (const model of filteredModels) {
                    await createModelItem(model, modelsData, sessionData, itemsContainer);
                }
                
                objectsList.appendChild(itemsContainer);
                
                // Initialize drag and drop
                initDragAndDrop();
            });
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
    item.setAttribute('draggable', 'true');
    item.setAttribute('data-model', modelName);
    item.setAttribute('data-article', model.article);
    item.setAttribute('data-quantity', quantity);
    
    // Добавляем класс blurred если количество 0
    if (quantity === 0) {
        item.classList.add('blurred');
    }
    
    // Создаем структуру карточки товара
    item.innerHTML = `
        <div class="category-icon">
            <span>${getCategoryIcon(model.article)}</span>
        </div>
        <model-viewer 
            src="models/${modelName}" 
            poster="" 
            shadow-intensity="1" 
            auto-rotate
            camera-controls
            disable-pan
            disable-zoom
            rotation-per-second="30deg"
            min-camera-orbit="auto auto 5m"
            max-camera-orbit="auto auto 20m"
            style="width: 100%; height: 200px;">
        </model-viewer>
        <div class="item-code">${model.article}</div>
        <p>${model.title || model.name}</p>
        <div class="item-status">Добавлено на площадку: 0 из ${quantity}</div>
        <div class="item-tags">
            <div class="tags-row">
                <div class="tag">
                    <span class="tag-icon">👤</span>
                    <span>${model.age || '5+ лет'}</span>
                </div>
                <div class="tag">
                    <span class="tag-icon">📏</span>
                    <span>${model.size || '63.2 м²'}</span>
                </div>
            </div>
            <div class="color-tag">
                <div class="color-circle"></div>
            </div>
        </div>
    `;
    
    container.appendChild(item);
}

// Возвращает иконку для категории
function getCategoryIcon(article) {
    const category = getModelCategory(article);
    const categoryData = categories.find(c => c.id === category);
    return categoryData ? categoryData.icon : '🎯';
}


// Load models when the page loads
// document.addEventListener('DOMContentLoaded', loadModels);
