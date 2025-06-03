/**
 * Обновленный модуль для управления боковой панелью с раскрывающимися категориями
 */

import { categories, renderCategories, filterModelsByCategory } from './categories_new.js';

// Функция для инициализации
export function initSidebarToggle() {
    // Находим элементы DOM
    const sidebar = document.getElementById('sidebar');
    const toggleCategoriesBtn = document.querySelector('.toggle-categories');
    const categoriesList = document.getElementById('categoriesList');
    
    // Проверяем, найдены ли элементы
    if (!sidebar || !toggleCategoriesBtn || !categoriesList) {
        console.error("Не найдены элементы для управления сайдбаром");
        return;
    }
    
    // Добавляем обработчик клика на кнопку со стрелкой (скрытие/показ всей панели)
    toggleCategoriesBtn.addEventListener('click', () => {
        // Переключаем класс hidden для сайдбара
        sidebar.classList.toggle('hidden');
        
        // Обновляем содержимое холста для отображения фона при скрытом меню
        const renderCanvas = document.getElementById('renderCanvas');
        if (renderCanvas) {
            if (sidebar.classList.contains('hidden')) {
                renderCanvas.style.background = "url('/img/citybox_nz.jpg') center/cover";
            } else {
                renderCanvas.style.background = "url('/img/citybox_pz.jpg') center/cover";
            }
        }
    });
    
    // Получаем модели из JSON или API
    fetch('/models.json')
        .then(response => response.json())
        .then(data => {
            // Рендерим категории с моделями
            renderCategories(categoriesList, handleCategoryAction, data.models);
        })
        .catch(error => {
            console.error('Ошибка при загрузке моделей:', error);
            // В случае ошибки, все равно рендерим категории, но без моделей
            renderCategories(categoriesList, handleCategoryAction);
        });
}

// Обработчик действий с категориями и моделями
function handleCategoryAction(item, action) {
    console.log(`Действие ${action} с элементом:`, item);
    
    // В зависимости от типа действия выполняем соответствующую логику
    switch (action) {
        case 'toggle-category':
            // Логика при переключении категории (раскрытие/скрытие)
            break;
            
        case 'select-item':
            // Логика при выборе элемента (например, загрузка модели)
            break;
    }
}

// Инициализируем при загрузке страницы
document.addEventListener('DOMContentLoaded', initSidebarToggle);
