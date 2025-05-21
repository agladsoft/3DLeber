/**
 * Модуль управления модальным окном
 * Отвечает за запуск приложения в модальном режиме
 */
import { startSceneChecks } from './sceneCheck.js';
import { initializeNewSession } from './models.js';

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
    const currentWidth = window.selectedPlaygroundWidth || 10;
    const currentLength = window.selectedPlaygroundLength || 10;
    
    // Обновляем значения в модальном окне
    const modalPlaygroundWidth = document.getElementById('modalPlaygroundWidth');
    const modalPlaygroundLength = document.getElementById('modalPlaygroundLength');
    
    if (modalPlaygroundWidth) modalPlaygroundWidth.value = currentWidth;
    if (modalPlaygroundLength) modalPlaygroundLength.value = currentLength;
    
    console.log('Обновлены значения в модальном окне из текущей площадки:', {
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
    launchButton.addEventListener('click', async () => {
        try {
            // Получаем user_id из models.json
            const response = await fetch('models.json');
            const data = await response.json();
            const userId = data.user_id;

            if (!userId) {
                throw new Error('No user ID found');
            }

            // Проверяем наличие сессии
            const sessionResponse = await fetch(`http://localhost:3000/api/session/${userId}`);
            if (!sessionResponse.ok) {
                throw new Error('Failed to get session');
            }

            const { session } = await sessionResponse.json();
            
            if (session) {
                // Если есть сессия, показываем модальное окно управления сессией
                launchContainer.style.display = 'none';
                const sessionModal = document.getElementById('sessionModal');
                if (sessionModal) {
                    sessionModal.style.display = 'block';
                }
            } else {
                // Если сессии нет, сразу показываем окно выбора площадки
                launchContainer.style.display = 'none';
                const platformSelectModal = document.getElementById('platformSelectModal');
                if (platformSelectModal) {
                    // Сбрасываем значения в полях ввода
                    const widthInput = document.getElementById('modalPlaygroundWidth');
                    const lengthInput = document.getElementById('modalPlaygroundLength');
                    if (widthInput) widthInput.value = '10';
                    if (lengthInput) lengthInput.value = '10';
                    
                    platformSelectModal.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Error checking session:', error);
            // В случае ошибки показываем окно выбора площадки
        launchContainer.style.display = 'none';
            const platformSelectModal = document.getElementById('platformSelectModal');
            if (platformSelectModal) {
        platformSelectModal.style.display = 'block';
            }
        }
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
    
    // Обработчик для кнопки "Запустить" в модальном окне выбора площадки
    startAppButton.addEventListener('click', async () => {
        try {
        // Показываем индикатор загрузки на кнопке
        startAppButton.innerHTML = 'Загрузка...';
        startAppButton.disabled = true;
        
        // Получаем выбранные значения
        const selectedWidth = document.getElementById('modalPlaygroundWidth').value;
        const selectedLength = document.getElementById('modalPlaygroundLength').value;
        
        // Сохраняем выбранные значения в глобальных переменных для использования в приложении
        window.selectedPlaygroundType = 'basketball_court.glb'; // всегда площадка 3
        window.selectedPlaygroundWidth = parseFloat(selectedWidth);
        window.selectedPlaygroundLength = parseFloat(selectedLength);
            
            // Получаем user_id и модели из models.json
            const response = await fetch('models.json');
            const data = await response.json();
            const userId = data.user_id;

            if (!userId) {
                throw new Error('No user ID found');
            }

            // Инициализируем новую сессию с моделями из JSON
            if (data.models && Array.isArray(data.models)) {
                console.log('Initializing new session with models:', data.models);
                await initializeNewSession(userId, data.models);
            }
        
        // Выводим информацию в консоль для отладки
        console.log('Настройки площадки из модального окна:', {
            тип: 'basketball_court.glb',
            ширина: selectedWidth,
            длина: selectedLength
        });
        
        // Скрываем модальное окно выбора площадки
        platformSelectModal.style.display = 'none';
        
            // Показываем приложение
            appModal.style.display = 'block';
            
            // Показываем индикатор загрузки
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('hidden');
                window.isLoading = true;
            }
            
            // Запускаем приложение
            if (window.initApp) {
                window.initApp();
                setTimeout(initializeTopViewButtonWithDelay, 1000);
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
        } catch (error) {
            console.error('Error starting app:', error);
            startAppButton.innerHTML = 'Запустить';
            startAppButton.disabled = false;
        }
    });
    
    // Обработчик для кнопки "Начать новую сессию"
    const newSessionButton = document.getElementById('newSessionButton');
    if (newSessionButton) {
        newSessionButton.addEventListener('click', async () => {
            try {
                // Получаем user_id и модели из models.json
                const response = await fetch('models.json');
                const data = await response.json();
                console.log('Data from models.json:', data);
                const userId = data.user_id;

                if (userId) {
                    // Очищаем сессию в базе данных
                    const clearResponse = await fetch(`http://localhost:3000/api/session/${userId}`, {
                        method: 'DELETE'
                    });

                    if (!clearResponse.ok) {
                        throw new Error('Failed to clear session');
                    }

                    // Инициализируем новую сессию данными из JSON
                    if (data.models && Array.isArray(data.models)) {
                        console.log('Initializing new session with models:', data.models);
                        await initializeNewSession(userId, data.models);
                    } else {
                        console.error('No models found in models.json');
                        throw new Error('No models found in models.json');
                    }
                }
                
                // Скрываем модальное окно управления сессией
                const sessionModal = document.getElementById('sessionModal');
                if (sessionModal) {
                    sessionModal.style.display = 'none';
                }

                // Показываем модальное окно выбора площадки
                const platformSelectModal = document.getElementById('platformSelectModal');
                if (platformSelectModal) {
                    // Сбрасываем значения в полях ввода
                    const widthInput = document.getElementById('modalPlaygroundWidth');
                    const lengthInput = document.getElementById('modalPlaygroundLength');
                    if (widthInput) widthInput.value = '10';
                    if (lengthInput) lengthInput.value = '10';
                    
                    // Показываем модальное окно
                    platformSelectModal.style.display = 'block';
                    console.log('Showing platform selection modal');
                } else {
                    console.error('Platform selection modal not found');
                }
            } catch (error) {
                console.error('Error clearing session:', error);
            }
        });
    }
    
    // Обработчик для кнопки "Продолжить сессию"
    const continueSessionButton = document.getElementById('continueSessionButton');
    if (continueSessionButton) {
        continueSessionButton.addEventListener('click', async () => {
            try {
                // Получаем user_id из models.json
                const response = await fetch('models.json');
                const data = await response.json();
                const userId = data.user_id;

                if (!userId) {
                    throw new Error('No user ID found');
                }

                // Получаем данные сессии из БД
                const sessionResponse = await fetch(`http://localhost:3000/api/session/${userId}`);
                if (!sessionResponse.ok) {
                    throw new Error('Failed to get session');
                }

                const { session } = await sessionResponse.json();
                if (!session) {
                    throw new Error('No session found');
                }

                const sessionModal = document.getElementById('sessionModal');
                if (sessionModal) {
                    sessionModal.style.display = 'none';
                }
                
                // Показываем приложение с дефолтными настройками площадки
                appModal.style.display = 'block';
                
                // Устанавливаем дефолтные значения для площадки
                window.selectedPlaygroundType = 'basketball_court.glb';
                window.selectedPlaygroundWidth = 10;
                window.selectedPlaygroundLength = 10;
                
                // Показываем индикатор загрузки
                const loadingOverlay = document.getElementById('loadingOverlay');
                if (loadingOverlay) {
                    loadingOverlay.classList.remove('hidden');
                    window.isLoading = true;
                }
                
                // Запускаем приложение
                if (window.returnToApp) {
                    try {
                        import('./playground.js').then(module => {
                            module.loadPlayground('basketball_court.glb').then(() => {
                                console.log('Площадка успешно изменена');
                            });
                        });
                    } catch (error) {
                        console.error('Ошибка при загрузке новой площадки:', error);
                    }
                } else {
                    if (window.initApp) {
                        window.initApp();
                        setTimeout(initializeTopViewButtonWithDelay, 1000);
                        setTimeout(() => {
                            console.log("Запуск проверки сцены после открытия модального окна");
                            startSceneChecks();
                        }, 3000);
                    }
                }
            } catch (error) {
                console.error('Error continuing session:', error);
                // Если произошла ошибка, показываем модальное окно выбора площадки
                const platformSelectModal = document.getElementById('platformSelectModal');
                if (platformSelectModal) {
                    platformSelectModal.style.display = 'block';
                }
            }
        });
    }
    
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
        // Заменяем расширение .glb на .png
        const imageName = modelName.replace('.glb', '.png');
        playgroundPreview.src = `textures/${imageName}`;
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
        
        topViewButton.textContent = "🔝 Вид сверху (сетка 1×1м)";
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
        topViewButton.textContent = "🔝 Вид сверху (сетка 1×1м)";
        topViewButton.classList.remove("active");
    }
}
