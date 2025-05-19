/**
 * Модуль для динамической загрузки моделей в сайдбар
 */
import { initDragAndDrop } from './ui/dragAndDrop.js';
import { showNotification } from './utils.js';

// Все модели, которые должны быть доступны
const MODELS = [
    // Стандартные модели
    { model: "ЛГИК-7.26 Игровой комплекс Весна-6 (TE706).glb", image: "textures/ЛГИК-7.26 Игровой комплекс Весна-6 (TE706).png", name: "ЛГИК-7.26 Игровой комплекс Весна-6 (TE706)" },
    { model: "ЛГДП-36 Диван чугунный.glb", image: "textures/ЛГДП-36 Диван чугунный.png", name: "ЛГДП-36 Диван чугунный" },
    { model: "ЛГВО-425 Спортивный комплекс ЛГВО-425 (Нержавеющая сталь) (2263.50).glb", image: "textures/ЛГВО-425 Спортивный комплекс ЛГВО-425 (Нержавеющая сталь) (2263.50).png", name: "ЛГВО-425 Спортивный комплекс" },
    { model: "ЛГВП-06 Велопарковка Омега (1439.8.4).glb", image: "textures/ЛГВП-06 Велопарковка Омега (1439.8.4).png", name: "ЛГВП-06 Велопарковка Омега" },
    { model: "ЛГД-19 Домик Белочка (TE319).glb", image: "textures/ЛГД-19 Домик Белочка (TE319).png", name: "ЛГД-19 Домик Белочка" },
    { model: "ЛГД-29 Домик Спускаемый модуль (1384).glb", image: "textures/ЛГД-29 Домик Спускаемый модуль (1384).png", name: "ЛГД-29 Домик Спускаемый модуль" },
    { model: "0001.glb", image: "textures/MG0001 Качели-балансир двойной.png", name: "MG0001 Качели-балансир двойной" },
    { model: "242.glb", image: "textures/ЛГГ-24-2 Горка h=950 (HPL).png", name: "ЛГГ-24-2 Горка h=950 (HPL)" },
    { model: "0502.glb", image: "textures/MG0502 Качели одинарные.png", name: "MG0502 Качели одинарные" },
    { model: "3540.glb", image: "textures/MG3540 Спортивное оборудование Лазательный комплекс.png", name: "MG3540 Спортивное оборудование Лазательный комплекс" },
    { model: "4209.glb", image: "textures/MG4209 Спортивный комплекс.png", name: "MG4209 Спортивный комплекс" },
    { model: "lgd_3.glb", image: "textures/lgd_3.png", name: "Модель lgd_3" },
    { model: "миссури.glb", image: "textures/lgk_314.png", name: "Модель lgk_314" },
    { model: "msk_201.glb", image: "textures/msk_201.png", name: "Модель msk_201" },
];

/**
 * Обновляет содержимое сайдбара, добавляя все модели
 */
export function updateSidebar() {
    console.log("Обновление сайдбара с моделями...");
    
    try {
        // Получаем ссылку на элемент сайдбара
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            console.error("Сайдбар не найден в DOM");
            return;
        }
        
        // Сохраняем заголовок сайдбара
        const title = sidebar.querySelector('h3');
        
        // Очищаем текущее содержимое сайдбара
        sidebar.innerHTML = '';
        
        // Возвращаем заголовок
        if (title) {
            sidebar.appendChild(title);
        } else {
            // Если по каким-то причинам заголовка нет, создаем новый
            const newTitle = document.createElement('h3');
            newTitle.textContent = 'Выберите элемент';
            sidebar.appendChild(newTitle);
        }
        
        // Добавляем все модели в сайдбар
        MODELS.forEach(model => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item';
            itemDiv.setAttribute('draggable', 'true');
            itemDiv.setAttribute('data-model', model.model);
            
            const img = document.createElement('img');
            img.src = model.image;
            img.alt = model.name;
            img.onerror = () => {
                console.warn(`Изображение не найдено: ${model.image}`);
                img.src = 'textures/placeholder.png'; // Путь к плейсхолдеру
            };
            
            const p = document.createElement('p');
            p.textContent = model.name;
            
            itemDiv.appendChild(img);
            itemDiv.appendChild(p);
            sidebar.appendChild(itemDiv);
        });
        
        console.log(`Добавлено ${MODELS.length} моделей в сайдбар`);
        
        // Переинициализируем обработчики drag & drop
        initDragAndDrop();
        
        showNotification("Каталог моделей обновлен", false);
    } catch (error) {
        console.error("Ошибка при обновлении сайдбара:", error);
        showNotification("Ошибка при обновлении каталога моделей", true);
    }
}

// Экспортируем функцию автообновления по таймеру
export function setupAutoUpdate() {
    // Обновляем сразу при загрузке модуля
    setTimeout(updateSidebar, 1000);
    
    // Настраиваем периодическое обновление каждые 5 секунд на случай, 
    // если сайдбар будет перезагружен или изменен другим кодом
    setInterval(updateSidebar, 5000);
}
