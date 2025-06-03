/**
 * Обновленный скрипт для управления сайдбаром категорий
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('NEW SIDEBAR CODE LOADED - v1.0');
    
    // Находим все элементы категорий
    const categoryItems = document.querySelectorAll('.category-item-new');
    console.log('Found category items:', categoryItems.length);
    
    // Добавляем обработчики клика для каждой категории
    categoryItems.forEach(item => {
        item.addEventListener('click', function() {
            const container = this.closest('.category-container-new');
            
            // Если категория уже активна, закрываем её
            if (container.classList.contains('active')) {
                container.classList.remove('active');
                return;
            }
            
            // Открываем выбранную категорию
            container.classList.add('active');
            
            // Загружаем подкатегории, если они еще не загружены
            const categoryId = this.getAttribute('data-category');
            const itemsList = container.querySelector('.category-items-list-new');
            
            // Проверяем, есть ли уже содержимое
            if (itemsList.children.length === 0) {
                // Здесь можно загрузить подкатегории через AJAX или из заранее подготовленных данных
                loadSubcategories(categoryId, itemsList);
            }
        });
    });
    
    // Функция для загрузки подкатегорий
    function loadSubcategories(categoryId, container) {
        // Пример подкатегорий (можно заменить на реальные данные из API)
        const subcategories = {
            'domiki': ['Домик 1', 'Домик 2', 'Домик 3'],
            'kachalki': ['Качалка 1', 'Качалка 2'],
            'kompleksy': ['Комплекс 1', 'Комплекс 2', 'Комплекс 3'],
            'besedki': ['Беседка 1', 'Беседка 2'],
            'sportkompleksy': ['Спорткомплекс 1', 'Спорткомплекс 2', 'Спорткомплекс 3']
        };        
        // Получаем подкатегории для текущей категории
        const items = subcategories[categoryId] || [];
        
        // Добавляем подкатегории в контейнер
        items.forEach(item => {
            const element = document.createElement('div');
            element.className = 'subcategory-item-new';
            element.textContent = item;
            
            // Добавляем обработчик клика для подкатегории
            element.addEventListener('click', function(event) {
                event.stopPropagation(); // Предотвращаем всплытие события
                
                // Здесь можно добавить код для отображения элементов подкатегории
                console.log(`Выбрана подкатегория: ${item}`);
                
                // Переход к списку объектов подкатегории
                document.getElementById('categoriesList').style.display = 'none';
                document.getElementById('objectsList').style.display = 'block';
                
                // Загрузка объектов подкатегории
                // loadObjectsForSubcategory(item);
            });
            
            container.appendChild(element);
        });
    }
    
    // Кнопка возврата из списка объектов к категориям
    const backButton = document.querySelector('.toggle-categories');
    if (backButton) {
        backButton.addEventListener('click', function() {
            document.getElementById('objectsList').style.display = 'none';
            document.getElementById('categoriesList').style.display = 'block';
        });
    }
});