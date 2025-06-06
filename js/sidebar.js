/**
 * Модуль для интеграции новой версии категорий в основной проект
 */
import { API_BASE_URL } from './api/serverConfig.js';

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
        <h3 class="sidebar-title">КАТЕГОРИИ ОБЪЕКТОВ</h3>
    `;
    
    // Создаем вертикальный текст для схлопнутого состояния
    const verticalTitle = document.createElement('div');
    verticalTitle.className = 'vertical-title';
    verticalTitle.textContent = 'КАТЕГОРИИ ОБЪЕКТОВ';
    
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

        // Добавляем модели напрямую в список без группировки по категориям
        combinedModels.forEach(model => {
            const modelElement = document.createElement('div');
            modelElement.className = 'model';
            modelElement.dataset.modelId = model.id;
            modelElement.setAttribute('draggable', model.isAvailable);
            modelElement.setAttribute('data-model', model.name);
            modelElement.setAttribute('data-article', model.article);
            modelElement.setAttribute('data-quantity', model.quantity);
            
            // Получаем количество размещенных объектов
            const placedCount = sessionData.placedObjects ? sessionData.placedObjects.filter(obj => obj.modelName === model.name).length : 0;
            // Получаем общее количество из modelsData
            const totalQuantity = modelsData.find(m => m.article === model.article)?.quantity || 0;
            // Вычисляем оставшееся количество
            const remainingQuantity = totalQuantity - placedCount;
            
            // Добавляем классы в зависимости от состояния модели
            if (remainingQuantity === 0) {
                modelElement.classList.add('blurred');
                modelElement.style.filter = 'blur(2px)';
                modelElement.style.opacity = '0.9';
                modelElement.style.pointerEvents = 'none';
            }
            
            modelElement.innerHTML = `
                <div class="model-image">
                    <img src="textures/${model.name.replace('.glb', '.png')}" alt="${model.description}">
                </div>
                <div class="model-article">${model.article}</div>
                <div class="model-title">${model.description}</div>
                <div class="model-placement">Добавлено на площадку: ${placedCount} из ${totalQuantity}</div>
                <div class="model-specs">
                    <div class="model-spec">
                        <span class="model-spec-icon">👤</span>
                        <span>${model.age || '5+ лет'}</span>
                    </div>
                    <div class="model-spec">
                        <span class="model-spec-icon">📏</span>
                        <span>${model.size || '63.2 м²'}</span>
                    </div>
                </div>
            `;
            
            // Добавляем обработчик drag-and-drop
            modelElement.addEventListener('dragstart', function(event) {
                event.dataTransfer.setData('model', model.name);
                event.dataTransfer.setData('article', model.article);
                console.log('Drag started for model:', model.name);
            });            
            categoriesList.appendChild(modelElement);
        });
        
        // Добавляем все элементы в сайдбар
        sidebar.appendChild(sidebarHeader);
        sidebar.appendChild(categoriesList);
        sidebar.appendChild(verticalTitle);
        
        // Добавляем обработчик для кнопки возврата (теперь это кнопка схлопывания)
        const backButton = sidebarHeader.querySelector('.back-button');
        backButton.addEventListener('click', function() {
            console.log('Toggle sidebar collapse');
            
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
        
        console.log('New sidebar created!');
    } catch (error) {
        console.error('Error creating sidebar:', error);
        sidebar.innerHTML = '<div class="error-message">Ошибка загрузки моделей</div>';
    }
}

/**
 * Инициализация сайдбара - экспортируемая функция
 */
export function initSidebar() {
    console.log('Initializing sidebar v2...');
    applyNewStyles();
    createNewSidebar();
}

/**
 * Обновляет счетчик размещенных объектов для конкретной модели
 * @param {string} modelName - Имя модели
 * @param {number} placedCount - Количество размещенных объектов
 */
export function updateModelPlacementCounter(modelName, placedCount) {
    const modelsData = JSON.parse(sessionStorage.getItem('models') || '[]');
    const modelElements = document.querySelectorAll(`[data-model="${modelName}"]`);
    
    modelElements.forEach(element => {
        const article = element.getAttribute('data-article');
        const totalQuantity = modelsData.find(m => m.article === article)?.quantity || 0;
        const remainingQuantity = totalQuantity - placedCount;
        
        // Обновляем счетчик
        const placementDiv = element.querySelector('.model-placement');
        if (placementDiv) {
            placementDiv.textContent = `Добавлено на площадку: ${placedCount} из ${totalQuantity}`;
        }
        
        // Обновляем состояние blur
        if (remainingQuantity === 0) {
            element.classList.add('blurred');
            element.style.filter = 'blur(2px)';
            element.style.opacity = '0.9';
            element.style.pointerEvents = 'none';
        } else {
            element.classList.remove('blurred');
            element.style.filter = '';
            element.style.opacity = '';
            element.style.pointerEvents = '';
        }
    });
}

// Экспортируем функции для использования в других модулях
export { applyNewStyles, createNewSidebar };