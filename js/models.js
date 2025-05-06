async function loadModels() {
    try {
        // Fetch the models list from the API
        const response = await fetch('http://localhost:3000/api/models');
        const data = await response.json();
        const models = data.models;

        // Get the sidebar element
        const sidebar = document.getElementById('sidebar');
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'items-container';

        // Create model items
        models.forEach(model => {
            const item = document.createElement('div');
            item.className = 'item';
            item.setAttribute('draggable', 'true');
            item.setAttribute('data-model', model);

            const modelViewer = document.createElement('model-viewer');
            modelViewer.setAttribute('src', `models/${model}`);
            modelViewer.setAttribute('auto-rotate', '');
            modelViewer.setAttribute('camera-controls', '');
            modelViewer.setAttribute('disable-zoom', '');
            modelViewer.setAttribute('ar-status', 'not-presenting');
            modelViewer.setAttribute('rotation-per-second', '30deg');
            modelViewer.setAttribute('alt', model);

            const name = document.createElement('p');
            name.textContent = model;

            item.appendChild(modelViewer);
            item.appendChild(name);
            itemsContainer.appendChild(item);
        });

        // Clear existing items and add new ones
        sidebar.innerHTML = '<h3>Выберите элемент</h3>';
        sidebar.appendChild(itemsContainer);

    } catch (error) {
        console.error('Error loading models:', error);
    }
}

// Load models when the page loads
document.addEventListener('DOMContentLoaded', loadModels);
