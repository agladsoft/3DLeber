/**
 * Модуль управления модальным окном
 * Отвечает за запуск приложения в модальном режиме
 */

document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы DOM
    const launchContainer = document.getElementById('launchContainer');
    const launchButton = document.getElementById('launchApp');
    const modal = document.getElementById('appModal');
    const closeButton = document.querySelector('.modal-close');
    
    // Отключаем собственный обработчик кнопки запуска, так как он перенесен в app.js
    // для обеспечения одноразовой инициализации
    
    // Обработчик нажатия на крестик закрытия
    closeButton.addEventListener('click', () => {
        // Скрываем модальное окно
        modal.style.display = 'none';
        
        // Показываем контейнер с кнопкой запуска
        launchContainer.style.display = 'flex';
    });
    
    // Обработчик нажатия на кнопку закрытия приложения
    const closeAppButton = document.getElementById('closeAppButton');
    if (closeAppButton) {
        closeAppButton.addEventListener('click', () => {
            // Скрываем модальное окно
            modal.style.display = 'none';
            
            // Показываем контейнер с кнопкой запуска
            launchContainer.style.display = 'flex';
            
            // Дополнительно можно добавить подтверждение закрытия, если нужно
            // if (confirm('Вы уверены, что хотите закрыть приложение?')) {
            //     modal.style.display = 'none';
            //     launchContainer.style.display = 'flex';
            // }
        });
    }
    
    // Закрытие модального окна при клике вне его содержимого (опционально)
    // Отключено, т.к. модальное содержит всю функциональность приложения
    /*
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            launchContainer.style.display = 'flex';
        }
    });
    */
});
