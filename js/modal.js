/**
 * Модуль управления модальным окном
 * Отвечает за запуск приложения в модальном режиме
 */
import { startSceneChecks } from './sceneCheck.js';

document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы DOM
    const launchContainer = document.getElementById('launchContainer');
    const launchButton = document.getElementById('launchApp');
    const platformSelectModal = document.getElementById('platformSelectModal');
    const appModal = document.getElementById('appModal');
    const startAppButton = document.getElementById('startAppButton');
    const cancelAppButton = document.getElementById('cancelAppButton');
    const closeAppButton = document.getElementById('closeAppButton');
    const playgroundPreview = document.getElementById('playgroundPreview');
    const modalPlaygroundType = document.getElementById('modalPlaygroundType');
    
    // Инициализация превью площадки
    initializePlaygroundPreview();
    
    // Запуск модального окна выбора площадки
    launchButton.addEventListener('click', () => {
        launchContainer.style.display = 'none';
        platformSelectModal.style.display = 'block';
    });
    
    // Обработчик для кнопки "Отмена" в модальном окне выбора площадки
    cancelAppButton.addEventListener('click', () => {
        platformSelectModal.style.display = 'none';
        launchContainer.style.display = 'flex';
    });
    
    // Обработчик смены типа площадки
    if (modalPlaygroundType) {
        modalPlaygroundType.addEventListener('change', (e) => {
            updatePlaygroundPreview(e.target.value);
        });
    }
    
    // Обработчик для кнопки "Запустить" в модальном окне выбора площадки
    startAppButton.addEventListener('click', () => {
        // Получаем выбранные значения
        const selectedType = document.getElementById('modalPlaygroundType').value;
        const selectedWidth = document.getElementById('modalPlaygroundWidth').value;
        const selectedLength = document.getElementById('modalPlaygroundLength').value;
        
        // Передаем выбранные значения в основное приложение
        const playgroundType = document.getElementById('playgroundType');
        const playgroundWidth = document.getElementById('playgroundWidth');
        const playgroundLength = document.getElementById('playgroundLength');
        
        // Устанавливаем значения в контрольной панели
        if (playgroundType) playgroundType.value = selectedType;
        if (playgroundWidth) playgroundWidth.value = selectedWidth;
        if (playgroundLength) playgroundLength.value = selectedLength;
        
        // Скрываем модальное окно выбора площадки и показываем основное приложение
        platformSelectModal.style.display = 'none';
        appModal.style.display = 'block';
        
        // Вызываем функцию инициализации приложения
        if (window.initApp) {
            window.initApp();
            
            // Отложенная инициализация кнопки "Вид сверху" после открытия модального окна
            setTimeout(initializeTopViewButtonWithDelay, 1000);
            
            // Применяем установленные настройки площадки
            const applyButton = document.getElementById('applySettings');
            if (applyButton) {
                setTimeout(() => {
                    applyButton.click();
                }, 1500);
            }
            
            // Запускаем проверку сцены после открытия модального окна
            setTimeout(() => {
                console.log("Запуск проверки сцены после открытия модального окна");
                startSceneChecks();
            }, 2000);
        }
    });
    
    // Обработчик нажатия на кнопку закрытия приложения
    closeAppButton.addEventListener('click', () => {
        // Скрываем модальное окно
        appModal.style.display = 'none';
        
        // Показываем контейнер с кнопкой запуска
        launchContainer.style.display = 'flex';
        
        // Очищаем сетку и ресурсы при закрытии
        cleanupResources();
    });
});

/**
 * Инициализирует превью площадки
 */
function initializePlaygroundPreview() {
    const playgroundPreview = document.getElementById('playgroundPreview');
    if (playgroundPreview) {
        // Устанавливаем начальную модель
        updatePlaygroundPreview('playground.glb');
    }
}

/**
 * Обновляет превью площадки при смене типа
 * @param {string} modelName - Имя файла модели
 */
function updatePlaygroundPreview(modelName) {
    const playgroundPreview = document.getElementById('playgroundPreview');
    if (playgroundPreview) {
        playgroundPreview.src = `models/playgrounds/${modelName}`;
    }
}

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
