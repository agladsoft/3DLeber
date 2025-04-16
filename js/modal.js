/**
 * Модуль управления модальным окном
 * Отвечает за запуск приложения в модальном режиме
 */
import { startSceneChecks } from './sceneCheck.js';

// Экспортируем функцию для показа модального окна выбора площадки
export function showPlatformSelectModal() {
    const platformSelectModal = document.getElementById('platformSelectModal');
    const appModal = document.getElementById('appModal');
    
    if (platformSelectModal) {
        // Восстанавливаем значения из текущей площадки
        updateModalValuesFromCurrent();
        
        // Если открыто основное приложение, скрываем его временно
        if (appModal && appModal.style.display === 'block') {
            // Сохраняем информацию о том, что нужно вернуться к приложению
            window.returnToApp = true;
            // Скрываем основное приложение
            appModal.style.display = 'none';
        } else {
            window.returnToApp = false;
        }
        
        // Показываем модальное окно
        platformSelectModal.style.display = 'block';
        
        console.log('Открыто модальное окно выбора площадки');
    } else {
        console.error('Не найдено модальное окно выбора площадки');
    }
}

// Функция для обновления значений в модальном окне из текущей площадки
function updateModalValuesFromCurrent() {
    // Получаем текущие параметры площадки
    const currentType = window.selectedPlaygroundType || 'playground.glb';
    const currentWidth = window.selectedPlaygroundWidth || 10;
    const currentLength = window.selectedPlaygroundLength || 10;
    
    // Обновляем значения в модальном окне
    const modalPlaygroundType = document.getElementById('modalPlaygroundType');
    const modalPlaygroundWidth = document.getElementById('modalPlaygroundWidth');
    const modalPlaygroundLength = document.getElementById('modalPlaygroundLength');
    
    if (modalPlaygroundType) modalPlaygroundType.value = currentType;
    if (modalPlaygroundWidth) modalPlaygroundWidth.value = currentWidth;
    if (modalPlaygroundLength) modalPlaygroundLength.value = currentLength;
    
    // Обновляем предпросмотр модели
    updatePlaygroundPreview(currentType);
    
    console.log('Обновлены значения в модальном окне из текущей площадки:', {
        тип: currentType,
        ширина: currentWidth,
        длина: currentLength
    });
}

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
        
        // Проверяем, нужно ли вернуться к приложению
        if (window.returnToApp) {
            // Возвращаемся к приложению
            appModal.style.display = 'block';
        } else {
            // Возвращаемся к начальному экрану
            launchContainer.style.display = 'flex';
        }
    });
    
    // Обработчик смены типа площадки
    if (modalPlaygroundType) {
        modalPlaygroundType.addEventListener('change', (e) => {
            updatePlaygroundPreview(e.target.value);
        });
    }
    
    // Обработчик для кнопки "Запустить" в модальном окне выбора площадки
    startAppButton.addEventListener('click', () => {
        // Показываем индикатор загрузки на кнопке
        startAppButton.innerHTML = 'Загрузка...';
        startAppButton.disabled = true;
        
        // Получаем выбранные значения
        const selectedType = document.getElementById('modalPlaygroundType').value;
        const selectedWidth = document.getElementById('modalPlaygroundWidth').value;
        const selectedLength = document.getElementById('modalPlaygroundLength').value;
        
        // Сохраняем выбранные значения в глобальных переменных для использования в приложении
        window.selectedPlaygroundType = selectedType;
        window.selectedPlaygroundWidth = parseFloat(selectedWidth);
        window.selectedPlaygroundLength = parseFloat(selectedLength);
        
        // Выводим информацию в консоль для отладки
        console.log('Настройки площадки из модального окна:', {
            тип: selectedType,
            ширина: selectedWidth,
            длина: selectedLength
        });
        
        // Скрываем модальное окно выбора площадки
        platformSelectModal.style.display = 'none';
        
        // Проверяем, возвращаемся ли мы к приложению или запускаем новое
        if (window.returnToApp) {
            // Показываем приложение после смены площадки
            appModal.style.display = 'block';
            
            // Показываем индикатор загрузки
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('hidden');
                window.isLoading = true;
            }
            
            try {
                // Импортируем модуль загрузки площадки
                import('./playground.js').then(module => {
                    // Загружаем новую площадку
                    module.loadPlayground(selectedType).then(() => {
                        console.log('Площадка успешно изменена');
                        
                        // Восстанавливаем состояние кнопки
                        startAppButton.innerHTML = 'Запустить';
                        startAppButton.disabled = false;
                    });
                });
            } catch (error) {
                console.error('Ошибка при загрузке новой площадки:', error);
                
                // Восстанавливаем состояние кнопки в случае ошибки
                startAppButton.innerHTML = 'Запустить';
                startAppButton.disabled = false;
            }
        } else {
            // Показываем основное приложение для первого запуска
            appModal.style.display = 'block';
            
            // Показываем индикатор загрузки
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('hidden');
                window.isLoading = true;
            }
            
            // Вызываем функцию инициализации приложения
            if (window.initApp) {
                window.initApp();
                
                // Отложенная инициализация кнопки "Вид сверху" после открытия модального окна
                setTimeout(initializeTopViewButtonWithDelay, 1000);
                
                // Запускаем проверку сцены после открытия модального окна
                setTimeout(() => {
                    console.log("Запуск проверки сцены после открытия модального окна");
                    startSceneChecks();
                }, 3000);
            }
            
            // Восстанавливаем состояние кнопки после задержки
            setTimeout(() => {
                startAppButton.innerHTML = 'Запустить';
                startAppButton.disabled = false;
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
