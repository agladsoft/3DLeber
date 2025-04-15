/**
 * Модуль управления модальным окном
 * Отвечает за запуск приложения в модальном режиме
 */
import { startSceneChecks } from './sceneCheck.js';

document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы DOM
    const launchContainer = document.getElementById('launchContainer');
    const launchButton = document.getElementById('launchApp');
    const modal = document.getElementById('appModal');
    const closeButton = document.querySelector('.modal-close');
    
    // Отключаем собственный обработчик кнопки запуска, так как он перенесен в app.js
    // для обеспечения одноразовой инициализации
    
    // Обработчик для кнопки запуска (для повторной инициализации)
    launchButton.addEventListener('click', () => {
        // Отложенная инициализация кнопки "Вид сверху" после открытия модального окна
        setTimeout(initializeTopViewButtonWithDelay, 1000);
        
        // Запускаем проверку сцены после открытия модального окна
        setTimeout(() => {
            // Если площадка не отображается, запускаем проверку
            console.log("Запуск проверки сцены после открытия модального окна");
            startSceneChecks();
        }, 2000);
    });
    
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
            
            // Очищаем сетку и ресурсы при закрытии
            cleanupResources();
        });
    }
});

/**
 * Инициализирует кнопку "Вид сверху" с задержкой после открытия модального окна
 */
function initializeTopViewButtonWithDelay() {
    console.log("Инициализация кнопки вида сверху в модальном окне...");
    const topViewButton = document.getElementById("topView");
    
    if (topViewButton) {
        console.log("Кнопка вида сверху найдена, устанавливаем базовый стиль");
        
        // Устанавливаем базовые стили напрямую
        topViewButton.style.cssText = `
            background-color: #4CAF50 !important;
            color: white !important;
            padding: 10px !important;
            border: none !important;
            border-radius: 5px !important;
            cursor: pointer !important;
            transition: background-color 0.3s ease !important;
        `;
        
        topViewButton.textContent = "Вид сверху (сетка 1×1м)";
        topViewButton.classList.remove("active");
        
        console.log("Базовый стиль кнопки установлен:", topViewButton.style.backgroundColor);
    } else {
        console.error("Кнопка вида сверху не найдена при инициализации модального окна");
    }
}

/**
 * Очищает ресурсы при закрытии приложения
 */
function cleanupResources() {
    console.log("Очистка ресурсов при закрытии приложения");
    
    // Очистка сетки, если режим вида сверху был активен
    if (window.app && window.app.gridHelper) {
        console.log("Удаляем сетку при закрытии");
        window.app.scene.remove(window.app.gridHelper);
        
        // Освобождаем ресурсы геометрии и материалов
        if (window.app.gridHelper.geometry) {
            window.app.gridHelper.geometry.dispose();
        }
        
        if (window.app.gridHelper.material) {
            if (Array.isArray(window.app.gridHelper.material)) {
                window.app.gridHelper.material.forEach(mat => {
                    if (mat) mat.dispose();
                });
            } else {
                window.app.gridHelper.material.dispose();
            }
        }
        
        window.app.gridHelper = null;
    }
    
    // Сбрасываем флаг активного режима сверху
    if (window.app) {
        window.app.isTopViewActive = false;
    }
    
    // Сбрасываем стиль кнопки на неактивный
    const topViewButton = document.getElementById("topView");
    if (topViewButton) {
        topViewButton.style.cssText = `
            background-color: #4CAF50 !important;
            color: white !important;
        `;
        topViewButton.textContent = "Вид сверху (сетка 1×1м)";
        topViewButton.classList.remove("active");
    }
}
