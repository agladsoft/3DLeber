/**
 * Модуль для управления боковой панелью (сайдбаром)
 */

// Функция для инициализации переключения сайдбара
export function initSidebarToggle() {
    // Находим элементы DOM
    const sidebar = document.getElementById('sidebar');
    const toggleCategoriesBtn = document.querySelector('.toggle-categories');
    
    // Проверяем, найдены ли элементы
    if (!sidebar || !toggleCategoriesBtn) {
        console.error("Не найдены элементы для управления сайдбаром");
        return;
    }
    
    // Добавляем обработчик клика на кнопку со стрелкой
    toggleCategoriesBtn.addEventListener('click', () => {
        // Переключаем класс hidden для сайдбара
        sidebar.classList.toggle('hidden');
        
        // Меняем направление стрелки в зависимости от состояния
        const arrowSpan = toggleCategoriesBtn.querySelector('span');
        if (arrowSpan) {
            if (sidebar.classList.contains('hidden')) {
                arrowSpan.innerHTML = '<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 6L10.5 15L19.5 24" stroke="#100F0F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            } else {
                arrowSpan.innerHTML = '<svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 6L10.5 15L19.5 24" stroke="#100F0F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            }
        }
    });
}

// Инициализируем переключение сайдбара при загрузке страницы
document.addEventListener('DOMContentLoaded', initSidebarToggle);
