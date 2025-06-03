/**
 * Модуль для инициализации обработчиков событий новой панели управления
 */

export function initializeControlPanelHandlers() {
    // Обработчики для кнопок инструментов
    const resetViewBtn = document.getElementById('resetView');
    const topViewBtn = document.getElementById('topView');
    const toggleDimensionsBtn = document.getElementById('toggleDimensions');
    const toggleSafetyZoneBtn = document.getElementById('toggleSafetyZone');
    const saveScreenshotBtn = document.getElementById('saveScreenshot');
    const playgroundBtn = document.getElementById('playgroundButton');
    const deleteAllBtn = document.getElementById('deleteAllModels');
    const closeAppBtn = document.getElementById('closeAppButton');
    
    // Переключение панели настроек площадки
    if (playgroundBtn) {
        playgroundBtn.addEventListener('click', function() {
            const settings = document.getElementById('playgroundSettings');
            const controlPanel = document.getElementById('controlPanel');
            
            if (settings) {
                // Если панель не расширена, сначала расширяем её
                if (!controlPanel.classList.contains('expanded')) {
                    controlPanel.classList.add('expanded');
                }
                
                // Переключаем видимость настроек
                settings.classList.toggle('hidden');
                playgroundBtn.classList.toggle('active');
                
                // Если настройки открыты, перемещаем их в расширенную панель
                if (!settings.classList.contains('hidden')) {
                    controlPanel.appendChild(settings);
                }
            }
        });
    }
    
    // Обработчик для кнопки закрытия приложения
    if (closeAppBtn) {
        closeAppBtn.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите закрыть приложение?')) {
                // Закрываем модальное окно приложения
                const appModal = document.getElementById('appModal');
                if (appModal) {
                    appModal.style.display = 'none';
                }
                
                // Показываем стартовый экран
                const launchContainer = document.getElementById('launchContainer');
                if (launchContainer) {
                    launchContainer.style.display = 'flex';
                }
            }
        });
    }
    
    // Добавляем эффект активности для остальных кнопок
    const toolButtons = document.querySelectorAll('.tool-button');
    toolButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Для некоторых кнопок добавляем/убираем класс active
            if (this.id === 'toggleDimensions' || this.id === 'toggleSafetyZone') {
                this.classList.toggle('active');
            }
        });
    });
}