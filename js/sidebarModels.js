/**
 * Скрипт для управления сайдбаром с моделями
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('MODELS SIDEBAR LOADED - v1.0');
    
    // Находим все заголовки категорий
    const categoryItems = document.querySelectorAll('.category-item-new');
    console.log('Found category items:', categoryItems.length);
    
    // Данные для демонстрации (можно заменить на данные из API)
    const modelsByCategory = {
        'domiki': [
            {
                id: 1,
                article: 'ДТК-1012',
                title: 'Игровой комплекс «Кадмий»',
                image: 'https://via.placeholder.com/200x200?text=Домик+1',
                placement: 'Добавлено на площадку: 0 из 2',
                age: '5+ лет',
                size: '63.2 м²'
            },
            {
                id: 2,
                article: 'ДТК-2015',
                title: 'Игровой домик «Лунтик»',
                image: 'https://via.placeholder.com/200x200?text=Домик+2',
                placement: 'Добавлено на площадку: 0 из 1',
                age: '3+ лет',
                size: '42.0 м²'
            }
        ],
        'kachalki': [
            {
                id: 3,
                article: 'КЧЛ-3010',
                title: 'Качалка на пружине «Конек»',
                image: 'https://via.placeholder.com/200x200?text=Качалка+1',
                placement: 'Добавлено на площадку: 0 из 3',
                age: '3+ лет',
                size: '8.5 м²'
            }
        ],
        'kompleksy': [
            {
                id: 4,
                article: 'КМП-2021',
                title: 'Игровой комплекс «Большой»',
                image: 'https://via.placeholder.com/200x200?text=Комплекс+1',
                placement: 'Добавлено на площадку: 0 из 1',
                age: '6+ лет',
                size: '120.0 м²'
            }
        ],
        'besedki': [
            {
                id: 5,
                article: 'БСД-1001',
                title: 'Беседка «Отдых»',
                image: 'https://via.placeholder.com/200x200?text=Беседка+1',
                placement: 'Добавлено на площадку: 0 из 2',
                age: 'Все возрасты',
                size: '32.0 м²'
            }
        ],
        'sportkompleksy': [
            {
                id: 6,
                article: 'СПК-5010',
                title: 'Спортивный комплекс «Олимп»',
                image: 'https://via.placeholder.com/200x200?text=Спорткомплекс+1',
                placement: 'Добавлено на площадку: 0 из 1',
                age: '8+ лет',
                size: '85.0 м²'
            }
        ]
    };
    
    // Добавляем обработчики клика для каждой категории
    categoryItems.forEach(item => {
        const categoryContainer = item.closest('.category-container-new');
        const categoryId = categoryContainer.getAttribute('data-category');
        const modelsContainer = categoryContainer.querySelector('.models-container-new');
        
        // Добавляем обработчик клика для категории
        item.addEventListener('click', function() {
            // Проверяем, активна ли категория
            const isActive = categoryContainer.classList.contains('active');
            
            // Если категория уже активна, закрываем её
            if (isActive) {
                categoryContainer.classList.remove('active');
                return;
            }
            
            // Открываем выбранную категорию
            categoryContainer.classList.add('active');
            
            // Проверяем, загружены ли уже модели
            if (modelsContainer.children.length === 0) {
                loadModels(categoryId, modelsContainer);
            }
        });
    });
    
    /**
     * Загружает модели для указанной категории
     * @param {string} categoryId - ID категории
     * @param {HTMLElement} container - Контейнер для моделей
     */
    function loadModels(categoryId, container) {
        // Получаем модели для данной категории
        const models = modelsByCategory[categoryId] || [];
        
        // Если моделей нет, показываем сообщение
        if (models.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-models-message';
            emptyMessage.textContent = 'В этой категории пока нет моделей';
            container.appendChild(emptyMessage);
            return;
        }
        
        // Добавляем модели в контейнер
        models.forEach(model => {
            // Создаем элемент модели
            const modelElement = createModelElement(model);
            container.appendChild(modelElement);
        });
    }
    
    /**
     * Создает HTML-элемент для модели
     * @param {Object} model - Данные модели
     * @returns {HTMLElement} - Элемент модели
     */
    function createModelElement(model) {
        const modelElement = document.createElement('div');
        modelElement.className = 'model-item-new';
        modelElement.setAttribute('draggable', 'true');
        modelElement.setAttribute('data-model-id', model.id);
        
        // Формируем HTML для модели
        modelElement.innerHTML = `
            <div class="model-image-container-new">
                <img src="${model.image}" alt="${model.title}" class="model-image-new">
            </div>
            <div class="model-article-new">${model.article}</div>
            <div class="model-title-new">${model.title}</div>
            <div class="model-placement-new">${model.placement}</div>
            <div class="model-specs-new">
                <div class="model-spec-new">
                    <div class="model-spec-icon-new">👤</div>
                    <span>${model.age}</span>
                </div>
                <div class="model-spec-new">
                    <div class="model-spec-icon-new">📏</div>
                    <span>${model.size}</span>
                </div>
                <div class="availability-indicator-new"></div>
            </div>
        `;
        
        // Добавляем обработчик для drag-and-drop
        modelElement.addEventListener('dragstart', function(event) {
            event.dataTransfer.setData('model-id', model.id);
            console.log('Drag started for model:', model.id);
        });
        
        return modelElement;
    }
});
