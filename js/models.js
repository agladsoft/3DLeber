import { initDragAndDrop } from './ui/dragAndDrop.js';

async function loadModels() {
    try {
        // TODO: В будущем раскомментировать API и закомментировать локальный JSON
        // Try to fetch the models list from the API
        let data;
        // try {
        //     const response = await fetch('http://localhost:3000/api/models');
        //     data = await response.json();
        // } catch (apiError) {
        //     console.log('API not available, using local JSON file');
        //     // If API is not available, try to load local JSON file
        //     try {
        //         const localResponse = await fetch('models.json');
        //         data = await localResponse.json();
        //     } catch (localError) {
        //         console.error('Error loading local JSON:', localError);
        //         // If both API and local JSON fail, show empty sidebar
        //         const sidebar = document.getElementById('sidebar');
        //         sidebar.innerHTML = '<h3>Нет доступных моделей</h3>';
        //         return;
        //     }
        // }

        // Временное решение для тестов - используем локальный JSON
        try {
            const localResponse = await fetch('models.json');
            data = await localResponse.json();
        } catch (localError) {
            console.error('Error loading local JSON:', localError);
            const sidebar = document.getElementById('sidebar');
            sidebar.innerHTML = '<h3>Нет доступных моделей</h3>';
            return;
        }

        // Check if we have valid data
        if (!data || !data.models || !Array.isArray(data.models)) {
            console.error('Invalid data format');
            const sidebar = document.getElementById('sidebar');
            sidebar.innerHTML = '<h3>Ошибка загрузки моделей</h3>';
            return;
        }

        const { user_id, models } = data;

        // Get the sidebar element
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = `<h3>Выберите категорию (User: ${user_id || 'default'})</h3>`;

        // Group models by category
        const categories = {};
        models.forEach(model => {
            if (!model.name || !model.category) return;
            if (!categories[model.category]) {
                categories[model.category] = [];
            }
            // Добавляем расширение .glb к имени модели
            model.name = `${model.name}.glb`;
            categories[model.category].push(model);
        });

        // Create categories container
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'categories-container';

        // Create category buttons
        Object.keys(categories).forEach(category => {
            const categoryButton = document.createElement('button');
            categoryButton.className = 'category-button';
            categoryButton.textContent = category;
            categoryButton.onclick = () => showModelsForCategory(category, categories[category], sidebar);
            categoriesContainer.appendChild(categoryButton);
        });

        sidebar.appendChild(categoriesContainer);

    } catch (error) {
        console.error('Error loading models:', error);
        const sidebar = document.getElementById('sidebar');
        sidebar.innerHTML = '<h3>Ошибка загрузки моделей</h3>';
    }
}

function showModelsForCategory(category, models, sidebar) {
    // Clear previous content
    sidebar.innerHTML = `<h3>${category}</h3>`;
    
    // Add back button
    const backButton = document.createElement('button');
    backButton.className = 'back-button';
    backButton.textContent = '← Назад к категориям';
    backButton.onclick = () => loadModels();
    sidebar.appendChild(backButton);

    // Create models container
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'items-container';

    // Create model items
    models.forEach(model => {
        const item = document.createElement('div');
        item.className = 'item';
        item.setAttribute('draggable', 'true');
        item.setAttribute('data-model', model.name);
        item.setAttribute('data-quantity', model.quantity || 0);

        const modelViewer = document.createElement('model-viewer');
        modelViewer.setAttribute('src', `models/${model.name}`);
        modelViewer.setAttribute('auto-rotate', '');
        modelViewer.setAttribute('camera-controls', '');
        modelViewer.setAttribute('disable-zoom', '');
        modelViewer.setAttribute('ar-status', 'not-presenting');
        modelViewer.setAttribute('rotation-per-second', '30deg');
        modelViewer.setAttribute('alt', model.name);

        const name = document.createElement('p');
        name.className = 'model-name';
        name.textContent = model.name;

        // Создаем отдельный контейнер для корзины и количества
        const cartContainer = document.createElement('div');
        cartContainer.className = 'cart-container';
        const cartIcon = document.createElement('span');
        cartIcon.className = 'cart-icon';
        cartIcon.textContent = '🛒';
        const quantity = document.createElement('span');
        quantity.className = 'model-quantity';
        quantity.textContent = model.quantity || 0;
        cartContainer.appendChild(cartIcon);
        cartContainer.appendChild(quantity);

        item.appendChild(modelViewer);
        item.appendChild(name);
        item.appendChild(cartContainer);
        itemsContainer.appendChild(item);
    });

    sidebar.appendChild(itemsContainer);

    // Reinitialize drag and drop handlers after creating new items
    if (typeof initDragAndDrop === 'function') {
        initDragAndDrop();
    }
}

// Load models when the page loads
document.addEventListener('DOMContentLoaded', loadModels);
