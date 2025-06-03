/**
 * Создание нового интерфейса категорий моделей
 * Версия 2.0 - полностью независимая реализация
 */

document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, существует ли сайдбар
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) {
        console.error('Sidebar not found!');
        return;
    }
    
    // Применяем класс для изоляции стилей
    sidebar.classList.add('categories-sidebar');
    
    // Определяем данные для категорий и моделей
    const categories = [
        {
            id: 'domiki',
            name: 'Домики',
            models: [
                {
                    id: 1,
                    article: 'ДТК-1012',
                    title: 'Игровой комплекс «Кадмий»',
                    image: 'https://via.placeholder.com/200x200?text=Домик',
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
            ]
        },
        {
            id: 'kachalki',
            name: 'Качалки',
            models: [
                {
                    id: 3,
                    article: 'КЧЛ-3010',
                    title: 'Качалка на пружине «Конек»',
                    image: 'https://via.placeholder.com/200x200?text=Качалка',
                    placement: 'Добавлено на площадку: 0 из 3',
                    age: '3+ лет',
                    size: '8.5 м²'
                }
            ]
        },
        {
            id: 'kompleksy',
            name: 'Комплексы',
            models: [
                {
                    id: 4,
                    article: 'КМП-2021',
                    title: 'Игровой комплекс «Большой»',
                    image: 'https://via.placeholder.com/200x200?text=Комплекс',
                    placement: 'Добавлено на площадку: 0 из 1',
                    age: '6+ лет',
                    size: '120.0 м²'
                }
            ]
        },
        {
            id: 'besedki',
            name: 'Беседки',
            models: [
                {
                    id: 5,
                    article: 'БСД-1001',
                    title: 'Беседка «Отдых»',
                    image: 'https://via.placeholder.com/200x200?text=Беседка',
                    placement: 'Добавлено на площадку: 0 из 2',
                    age: 'Все возрасты',
                    size: '32.0 м²'
                }
            ]
        },
        {
            id: 'sportkompleksy',
            name: 'Спортивные комплексы',
            models: [
                {
                    id: 6,
                    article: 'СПК-5010',
                    title: 'Спортивный комплекс «Олимп»',
                    image: 'https://via.placeholder.com/200x200?text=Спорткомплекс',
                    placement: 'Добавлено на площадку: 0 из 1',
                    age: '8+ лет',
                    size: '85.0 м²'
                }
            ]
        }
    ];    
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
    
    const categoriesList = document.createElement('div');
    categoriesList.className = 'categories-list';
    
    // Добавляем категории
    categories.forEach(category => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category';
        categoryElement.dataset.category = category.id;
        
        // Создаем заголовок категории
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `
            <span class="category-name">${category.name}</span>
            <span class="category-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 18L15 12L9 6" stroke="#FF7E3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </span>
        `;
        
        // Создаем контейнер для моделей
        const modelsContainer = document.createElement('div');
        modelsContainer.className = 'models-container';
        
        // Добавляем модели в контейнер
        category.models.forEach(model => {
            const modelElement = document.createElement('div');
            modelElement.className = 'model';
            modelElement.dataset.modelId = model.id;
            modelElement.setAttribute('draggable', 'true');
            
            modelElement.innerHTML = `
                <div class="model-image">
                    <img src="${model.image}" alt="${model.title}">
                </div>
                <div class="model-article">${model.article}</div>
                <div class="model-title">${model.title}</div>
                <div class="model-placement">${model.placement}</div>
                <div class="model-specs">
                    <div class="model-spec">
                        <span class="model-spec-icon">👤</span>
                        <span>${model.age}</span>
                    </div>
                    <div class="model-spec">
                        <span class="model-spec-icon">📏</span>
                        <span>${model.size}</span>
                    </div>
                    <div class="availability-indicator"></div>
                </div>
            `;
            
            // Добавляем обработчик drag-and-drop
            modelElement.addEventListener('dragstart', function(event) {
                event.dataTransfer.setData('model-id', model.id);
                console.log('Drag started for model:', model.id);
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
    
    // Добавляем обработчик для кнопки возврата
    const backButton = sidebarHeader.querySelector('.back-button');
    backButton.addEventListener('click', function() {
        console.log('Back button clicked');
        // Здесь можно добавить логику для возврата на предыдущую страницу
    });
    
    console.log('Categories v2 initialized!');
});