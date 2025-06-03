// Категории объектов для детских площадок
export const categories = [
    {
        id: 'houses',
        name: 'Домики',
        icon: '🏠',
        active: false,
        modelPrefixes: ['ЛГД-']
    },
    {
        id: 'swings',
        name: 'Качалки',
        icon: '🎠',
        active: false,
        modelPrefixes: ['ЛГК-', 'ЛГКР-']
    },
    {
        id: 'complexes',
        name: 'Комплексы',
        icon: '🏗️',
        active: false,
        modelPrefixes: ['ЛГИК-', 'ЛГИ-']
    },
    {
        id: 'gazebos',
        name: 'Беседки',
        icon: '🛖',
        active: false,
        modelPrefixes: ['ЛГБ-', 'ЛГБЕ-']
    },
    {
        id: 'sports',
        name: 'Спортивные комплексы',
        icon: '🏃',
        active: false,
        modelPrefixes: ['ЛГВО-', 'ЛГС-', 'ЛГСП-']
    }
];

// Определяет категорию модели по её артикулу
export function getModelCategory(article) {
    for (const category of categories) {
        for (const prefix of category.modelPrefixes) {
            if (article.startsWith(prefix)) {
                return category.id;
            }
        }
    }
    return 'other';
}

// Рендерит список категорий
export function renderCategories(container, onCategoryClick) {
    container.innerHTML = '';
    
    categories.forEach(category => {
        const categoryElement = document.createElement('div');
        categoryElement.className = `category-item ${category.active ? 'active' : ''}`;
        categoryElement.innerHTML = `
            <span>${category.name}</span>
            <span class="arrow-icon">➔</span>
        `;
        
        categoryElement.addEventListener('click', () => {
            // Находим контейнер с категориями
            const categoriesList = document.getElementById('categoriesList');
            const objectsList = document.getElementById('objectsList');
            
            // Переключаем отображение
            if (categoriesList) categoriesList.style.display = 'none';
            if (objectsList) objectsList.style.display = 'block';
            
            // Деактивируем все категории
            categories.forEach(c => c.active = false);
            category.active = true;
            
            // Вызываем callback
            if (onCategoryClick) {
                onCategoryClick(category);
            }
        });
        
        container.appendChild(categoryElement);
    });
}

// Фильтрует модели по выбранной категории
export function filterModelsByCategory(models, categoryId) {
    if (!categoryId || categoryId === 'all') {
        return models;
    }
    
    const category = categories.find(c => c.id === categoryId);
    if (!category) {
        return models;
    }
    
    return models.filter(model => {
        const modelCategory = getModelCategory(model.article || '');
        return modelCategory === categoryId;
    });
}