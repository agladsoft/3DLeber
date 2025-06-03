// Категории объектов для детских площадок
export const categories = [
    {
        id: 'houses',
        name: 'Домики',
        icon: '🏠',
        active: false,
        expanded: false, // Новое свойство для отслеживания раскрытия
        modelPrefixes: ['ЛГД-']
    },
    {
        id: 'swings',
        name: 'Качалки',
        icon: '🎠',
        active: false,
        expanded: false,
        modelPrefixes: ['ЛГК-', 'ЛГКР-']
    },
    {
        id: 'complexes',
        name: 'Комплексы',
        icon: '🏗️',
        active: false,
        expanded: false,
        modelPrefixes: ['ЛГИК-', 'ЛГИ-']
    },
    {
        id: 'gazebos',
        name: 'Беседки',
        icon: '🛖',
        active: false,
        expanded: false,
        modelPrefixes: ['ЛГБ-', 'ЛГБЕ-']
    },
    {
        id: 'sportComplexes',
        name: 'Спортивные комплексы',
        icon: '🏋️',
        active: false,
        expanded: false,
        modelPrefixes: ['ЛГСК-', 'ЛГСП-']
    }
];
// Рендерит список категорий с возможностью раскрытия элементов
export function renderCategories(container, onCategoryClick, models) {
    if (!container) {
        console.error("Container for categories not found");
        return;
    }
    
    container.innerHTML = '';
    
    categories.forEach(category => {
        // Создаем контейнер для категории
        const categoryContainer = document.createElement('div');
        categoryContainer.className = `category-container ${category.expanded ? 'open' : ''}`;
        
        // Создаем заголовок категории
        const categoryElement = document.createElement('div');
        categoryElement.className = `category-item ${category.active ? 'active' : ''}`;
        categoryElement.setAttribute('data-category', category.id);
        
        // Добавляем содержимое категории
        categoryElement.innerHTML = `
            <span class="category-name">${category.name}</span>
            <span class="category-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="#F05323" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </span>
        `;
        
        // Добавляем контейнер для элементов категории
        const itemsList = document.createElement('div');
        itemsList.className = 'category-items-list';
        itemsList.id = `${category.id}-items`;
        
        // Фильтруем и добавляем элементы для этой категории
        const filteredModels = models ? filterModelsByCategory(models, category) : [];
        
        // Если есть модели, добавляем их в список
        if (filteredModels.length > 0) {
            filteredModels.forEach(model => {
                const modelElement = document.createElement('div');
                modelElement.className = 'subcategory-item';
                modelElement.textContent = model.name || model.id;
                
                // Добавляем обработчик клика на элемент
                modelElement.addEventListener('click', (event) => {
                    event.stopPropagation(); // Предотвращаем всплытие
                    
                    // Устанавливаем активный элемент
                    const activeItem = container.querySelector('.subcategory-item.active');
                    if (activeItem) activeItem.classList.remove('active');
                    modelElement.classList.add('active');
                    
                    // Вызываем переданный обработчик для этой модели
                    if (onCategoryClick) {
                        // Передаем модель и тип действия (выбор элемента)
                        onCategoryClick(model, 'select-item');
                    }
                });
                
                itemsList.appendChild(modelElement);
            });
        } else {
            // Если нет моделей, показываем заглушку
            const emptyElement = document.createElement('div');
            emptyElement.className = 'subcategory-item empty';
            emptyElement.textContent = 'Нет доступных элементов';
            itemsList.appendChild(emptyElement);
        }
        
        // Добавляем обработчик клика на категорию
        categoryElement.addEventListener('click', (event) => {
            event.stopPropagation();
            
            // Переключаем состояние развернутости
            category.expanded = !category.expanded;
            categoryContainer.classList.toggle('open', category.expanded);
            
            // Вызываем переданный обработчик для этой категории
            if (onCategoryClick) {
                // Передаем категорию и тип действия (переключение категории)
                onCategoryClick(category, 'toggle-category');
            }
        });
        
        // Собираем контейнер
        categoryContainer.appendChild(categoryElement);
        categoryContainer.appendChild(itemsList);
        container.appendChild(categoryContainer);
    });
}

// Фильтр моделей по категории
export function filterModelsByCategory(models, category) {
    if (!models || !category) return [];
    
    return models.filter(model => {
        // Проверяем соответствие по префиксу модели
        if (category.modelPrefixes && category.modelPrefixes.length > 0) {
            return category.modelPrefixes.some(prefix => 
                model.id && model.id.startsWith(prefix)
            );
        }
        return false;
    });
}

// Получает категорию модели по её идентификатору
export function getModelCategory(modelId) {
    if (!modelId) return null;
    
    for (const category of categories) {
        if (category.modelPrefixes && category.modelPrefixes.some(prefix => modelId.startsWith(prefix))) {
            return category;
        }
    }
    
    return null;
}

// Экспортируем категории
export { categories };
