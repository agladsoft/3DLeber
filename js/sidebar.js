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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 6L9 12L15 18" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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

        // Группируем модели по категориям
        const modelsByCategory = {};
        combinedModels.forEach(model => {
            const category = model.category || 'other';
            if (!modelsByCategory[category]) {
                modelsByCategory[category] = [];
            }
            modelsByCategory[category].push(model);
        });

        // Получаем уникальные категории из моделей
        const uniqueCategories = [...new Set(combinedModels.map(model => model.category || 'other'))];
        
        // Добавляем категории
        uniqueCategories.forEach(categoryId => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'category';
            categoryElement.dataset.category = categoryId;
            
            // Создаем заголовок категории
            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'category-header';
            categoryHeader.innerHTML = `
                <span class="category-name">${categoryId}</span>
                <span class="category-arrow">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18L15 12L9 6" stroke="#FF7E3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </span>
            `;
            
            // Создаем контейнер для моделей
            const modelsContainer = document.createElement('div');
            modelsContainer.className = 'models-container';
            
            // Получаем модели для этой категории
            const categoryModels = modelsByCategory[categoryId] || [];
            
            // Добавляем модели в контейнер
            categoryModels.forEach(model => {
                const modelElement = document.createElement('div');
                modelElement.className = 'model';
                modelElement.dataset.modelId = model.id;
                modelElement.setAttribute('draggable', model.isAvailable);
                modelElement.setAttribute('data-model', model.name);
                modelElement.setAttribute('data-article', model.article);
                modelElement.setAttribute('data-quantity', model.quantity);
                
                // Добавляем классы в зависимости от состояния модели
                if (model.quantity === 0) {
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
                    <div class="model-placement">Добавлено на площадку: 0 из ${model.quantity}</div>
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
                modelsContainer.appendChild(modelElement);
            });
            
            // Добавляем все элементы категории
            categoryElement.appendChild(categoryHeader);
            categoryElement.appendChild(modelsContainer);
            categoriesList.appendChild(categoryElement);
            
            // Добавляем обработчик клика для категории
            categoryHeader.addEventListener('click', function() {
                // Если категория уже активна, закрываем её
                if (categoryElement.classList.contains('active')) {
                    categoryElement.classList.remove('active');
                } else {
                    // Открываем выбранную категорию
                    categoryElement.classList.add('active');
                }
            });
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

// Инициализация при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing sidebar v2...');
    applyNewStyles();
    createNewSidebar();
});

// Экспортируем функции для использования в других модулях
export { applyNewStyles, createNewSidebar };