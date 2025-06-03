/**
 * Модуль управления модальным окном
 * Отвечает за запуск приложения в модальном режиме
 */
import { startSceneChecks } from './sceneCheck.js';
import { initializeNewSession } from './models.js';
import { API_BASE_URL } from './api/serverConfig.js';
import { loadModels } from './models.js';
import { getUserSession, savePlaygroundParams, createNewSession } from './api/apiWrapper.js';

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
    const currentWidth = window.selectedPlaygroundWidth || 40;
    const currentLength = window.selectedPlaygroundLength || 30;
    const currentColor = window.selectedPlaygroundColor || 'серый';
    
    // Обновляем значения в модальном окне
    const modalPlaygroundWidth = document.getElementById('modalPlaygroundWidth');
    const modalPlaygroundLength = document.getElementById('modalPlaygroundLength');
    const modalPlaygroundColor = document.getElementById('modalPlaygroundColor');
    
    // Устанавливаем placeholder вместо value для современного вида
    if (modalPlaygroundWidth) {
        modalPlaygroundWidth.placeholder = `Ширина, м (${currentWidth})`;
        modalPlaygroundWidth.value = "";
    }
    
    if (modalPlaygroundLength) {
        modalPlaygroundLength.placeholder = `Длина, м (${currentLength})`;
        modalPlaygroundLength.value = "";
    }
    
    if (modalPlaygroundColor) modalPlaygroundColor.value = currentColor;
    
    // Обновляем выделение цветного квадратика
    const colorSquares = document.querySelectorAll('.color-square');
    colorSquares.forEach(square => {
        square.classList.remove('selected');
        if (square.getAttribute('data-color') === currentColor) {
            square.classList.add('selected');
        }
    });
    
    console.log('Обновлены значения в модальном окне из текущей площадки:', {
        ширина: currentWidth,
        длина: currentLength,
        цвет: currentColor
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы DOM с проверкой их существования
    const launchContainer = document.getElementById('launchContainer');
    const launchButton = document.getElementById('launchApp');
    const platformSelectModal = document.getElementById('platformSelectModal');
    const appModal = document.getElementById('appModal');
    const startAppButton = document.getElementById('startAppButton');
    const cancelAppButton = document.getElementById('cancelAppButton');
    const closeAppButton = document.getElementById('closeAppButton');
    const playgroundPreview = document.getElementById('playgroundPreview');
    const modalPlaygroundType = document.getElementById('modalPlaygroundType');
    const modalPlaygroundColorField = document.getElementById('modalPlaygroundColor');
    const colorSquares = document.querySelectorAll('.color-square');
    
    // Инициализация модального окна управления сессией
    // Переменные объявлены в другом месте файла:
    // const sessionModal = document.getElementById('sessionModal');
    // const continueSessionButton = document.getElementById('continueSessionButton');
    // const newSessionButton = document.getElementById('newSessionButton');
    
    // Логирование для диагностики
    console.log('DOM elements found:', { 
        launchContainer: !!launchContainer,
        launchButton: !!launchButton,
        platformSelectModal: !!platformSelectModal,
        appModal: !!appModal,
        startAppButton: !!startAppButton,
        cancelAppButton: !!cancelAppButton,
        closeAppButton: !!closeAppButton
    });
    
    // Инициализация превью площадки
    initializePlaygroundPreview();

    // Добавляем обработчики для цветных квадратиков
    colorSquares.forEach(square => {
        square.addEventListener('click', function() {
            // Снимаем выделение с ранее выбранного квадратика
            colorSquares.forEach(s => s.classList.remove('selected'));
            
            // Выделяем новый выбранный квадратик
            this.classList.add('selected');
            
            // Получаем значение цвета из атрибута data-color
            const selectedColor = this.getAttribute('data-color');
            
            // Устанавливаем значение в скрытое поле
            modalPlaygroundColorField.value = selectedColor;
            
            console.log('Выбран цвет:', selectedColor);
        });
    });
    
    // Запуск модального окна выбора площадки
    if (launchButton) {
        launchButton.addEventListener('click', async () => {
            try {
                // Показываем индикатор загрузки на кнопке
                if (launchButton) {
                    launchButton.textContent = 'Загрузка...';
                    launchButton.disabled = true;
                }
                
                // Подготавливаем данные для отправки
                const modelsData = {
                    "user_id": "id_12345678",
                    "models": [
                        {"article": "ЛГД-19", "quantity": 2},
                        {"article": "ЛГК-24.7","quantity": 1},
                        {"article": "ЛГИК-7.26","quantity": 1},
                        {"article": "ЛГИК-7.03","quantity": 1},
                        {"article": "ЛГИК-7.01","quantity": 1},
                        {"article": "ЛГД-29","quantity": 1},
                        {"article": "ЛГД-25","quantity": 1},
                        {"article": "ЛГД-23","quantity": 1},
                        {"article": "ЛГД-14","quantity": 1},
                        {"article": "ЛГВО-421","quantity": 1}
                    ]
                };

                // Сохраняем userId в sessionStorage
                sessionStorage.setItem('userId', modelsData.user_id);
                sessionStorage.setItem('models', JSON.stringify(modelsData.models));

                try {
                    // Загружаем модели через новую API-обертку
                    await loadModels(modelsData);
                    console.log('Модели успешно загружены');
                } catch (error) {
                    console.warn('Ошибка загрузки моделей, но продолжаем работу:', error);
                }

                // Проверяем наличие сессии через API-обертку
                try {
                    const { session } = await getUserSession(modelsData.user_id);
                    
                    if (session) {
                        // Если есть сессия, показываем модальное окно управления сессией
                        if (launchContainer) {
                            launchContainer.style.display = 'none';
                        }
                        const sessionModal = document.getElementById('sessionModal');
                        if (sessionModal) {
                            sessionModal.style.display = 'block';
                        }
                    } else {
                        // Если сессии нет, сразу показываем окно выбора площадки
                        openPlatformSelectModal();
                    }
                } catch (error) {
                    console.warn('Ошибка получения сессии, показываем окно выбора площадки:', error);
                    openPlatformSelectModal();
                }
            } catch (error) {
                console.error('Ошибка запуска приложения:', error);
                
                // В случае ошибки все равно показываем окно выбора площадки
                openPlatformSelectModal();
            } finally {
                // Восстанавливаем состояние кнопки
                if (launchButton) {
                    launchButton.textContent = 'Запустить приложение';
                    launchButton.disabled = false;
                }
            }
        });
    } else {
        console.error('Кнопка запуска приложения не найдена');
    }
    
    // Вспомогательная функция для открытия окна выбора площадки
    function openPlatformSelectModal() {
        if (launchContainer) {
            launchContainer.style.display = 'none';
        }
        const platformSelectModal = document.getElementById('platformSelectModal');
        if (platformSelectModal) {
            // Устанавливаем placeholder для полей ввода
            const widthInput = document.getElementById('modalPlaygroundWidth');
            const lengthInput = document.getElementById('modalPlaygroundLength');
            if (widthInput) {
                widthInput.placeholder = 'Ширина, м (40)';
                widthInput.value = '';
            }
            if (lengthInput) {
                lengthInput.placeholder = 'Длина, м (30)';
                lengthInput.value = '';
            }
            
            // Показываем модальное окно
            platformSelectModal.style.display = 'block';
        }
    }
    
    // Добавляем обработчик для кнопки "Отмена" в модальном окне выбора площадки
    const cancelPlatformButton = document.getElementById('cancelPlatformButton');
    if (cancelPlatformButton) {
        cancelPlatformButton.addEventListener('click', () => {
            if (platformSelectModal) {
                platformSelectModal.style.display = 'none';
            }
            
            // Проверяем, нужно ли вернуться к приложению
            if (window.returnToApp && appModal) {
                // Возвращаемся к приложению
                appModal.style.display = 'block';
            } else if (launchContainer) {
                // Возвращаемся к начальному экрану
                launchContainer.style.display = 'flex';
            }
        });
    }
    
    // Обработчик для кнопки "Запустить" в модальном окне выбора площадки
    if (startAppButton) {
        startAppButton.addEventListener('click', async () => {
        try {
            // Показываем индикатор загрузки на кнопке
            startAppButton.innerHTML = 'Загрузка...';
            startAppButton.disabled = true;
            
            // Получаем выбранные значения
            const modalPlaygroundWidth = document.getElementById('modalPlaygroundWidth');
            const modalPlaygroundLength = document.getElementById('modalPlaygroundLength');
            
            // Получаем значения из полей или берём значения из placeholder
            const selectedWidth = modalPlaygroundWidth.value || 
                (modalPlaygroundWidth.placeholder.match(/\d+/) ? 
                 modalPlaygroundWidth.placeholder.match(/\d+/)[0] : 40);
                 
            const selectedLength = modalPlaygroundLength.value || 
                (modalPlaygroundLength.placeholder.match(/\d+/) ? 
                 modalPlaygroundLength.placeholder.match(/\d+/)[0] : 30);
                 
            const selectedColor = document.getElementById('modalPlaygroundColor').value;
            
            // Сохраняем выбранные значения в глобальных переменных для использования в приложении
            window.selectedPlaygroundType = 'basketball_court.glb';
            window.selectedPlaygroundWidth = parseFloat(selectedWidth);
            window.selectedPlaygroundLength = parseFloat(selectedLength);
            window.selectedPlaygroundColor = selectedColor;
                
            // Получаем user_id из sessionStorage
            let userId = sessionStorage.getItem('userId');
            
            // Если userId отсутствует, создаем временный
            if (!userId) {
                console.warn('User ID not found, creating temporary ID');
                userId = 'temp_' + Date.now();
                sessionStorage.setItem('userId', userId);
            }
            
            try {
                // Пытаемся получить модели из sessionStorage
                const models = JSON.parse(sessionStorage.getItem('models'));
                
                // Инициализируем новую сессию с моделями из JSON, если они есть
                if (models && Array.isArray(models)) {
                    console.log('Initializing new session with models:', models);
                    try {
                        const newSessionData = await initializeNewSession(userId, models);
                        
                        // Добавляем параметры площадки в сессию
                        if (newSessionData) {
                            try {
                                // Сохраняем параметры площадки через API-обертку
                                const playgroundData = {
                                    type: window.selectedPlaygroundType,
                                    width: window.selectedPlaygroundWidth,
                                    length: window.selectedPlaygroundLength,
                                    color: window.selectedPlaygroundColor
                                };
                                
                                await savePlaygroundParams(userId, playgroundData);
                                console.log('Параметры площадки успешно сохранены:', playgroundData);
                            } catch (saveError) {
                                console.warn('Ошибка сохранения параметров площадки, но продолжаем работу:', saveError);
                            }
                        }
                    } catch (sessionError) {
                        console.error('Error initializing session, continuing anyway:', sessionError);
                    }
                } else {
                    console.warn('No valid models found in sessionStorage');
                }
            } catch (modelsError) {
                console.error('Error parsing models from sessionStorage:', modelsError);
            }
        
            // Выводим информацию в консоль для отладки
            console.log('Настройки площадки из модального окна:', {
                тип: 'basketball_court.glb',
                ширина: selectedWidth,
                длина: selectedLength,
                цвет: selectedColor
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
            
            // Проверяем и создаем функцию инициализации, если она отсутствует
            if (!window.initApp) {
                console.warn('initApp function not found, creating fallback');
                window.initApp = async function() {
                    try {
                        console.log('Using fallback initialization');
                        // Импортируем необходимые модули
                        const sceneModule = await import('./scene.js');
                        const playgroundModule = await import('./playground.js');
                        
                        // Инициализируем сцену
                        if (typeof sceneModule.initScene === 'function') {
                            window.app = sceneModule.initScene();
                        }
                        
                        // Загружаем площадку с выбранными параметрами
                        if (typeof playgroundModule.loadPlayground === 'function') {
                            await playgroundModule.loadPlayground(
                                window.selectedPlaygroundType || 'basketball_court.glb',
                                window.selectedPlaygroundWidth || 40,
                                window.selectedPlaygroundLength || 30,
                                window.selectedPlaygroundColor || 'зеленый'
                            );
                        }
                        
                        // Скрываем индикатор загрузки
                        if (loadingOverlay) {
                            loadingOverlay.classList.add('hidden');
                            window.isLoading = false;
                        }
                    } catch (initError) {
                        console.error('Error in fallback initialization:', initError);
                        if (loadingOverlay) {
                            loadingOverlay.classList.add('hidden');
                            window.isLoading = false;
                        }
                    }
                };
            }
            
            // Запускаем приложение
            try {
                window.initApp();
                setTimeout(initializeTopViewButtonWithDelay, 1000);
                setTimeout(() => {
                    console.log("Запуск проверки сцены после открытия модального окна");
                    try {
                        startSceneChecks();
                    } catch (checksError) {
                        console.error('Error running scene checks:', checksError);
                    }
                }, 3000);
            } catch (initError) {
                console.error('Error initializing app:', initError);
                // Скрываем индикатор загрузки при ошибке
                if (loadingOverlay) {
                    loadingOverlay.classList.add('hidden');
                    window.isLoading = false;
                }
            }
            
            // Восстанавливаем состояние кнопки после задержки
            setTimeout(() => {
                startAppButton.innerHTML = 'Создать';
                startAppButton.disabled = false;
            }, 2000);
        } catch (error) {
            console.error('Error starting app:', error);
            startAppButton.innerHTML = 'Заказать площадку';
            startAppButton.disabled = false;
            
            // Скрываем индикатор загрузки при ошибке
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
                window.isLoading = false;
            }
        }
    });
    } else {
        console.warn('Кнопка Запустить не найдена');
    }
    
    // Обработчик для кнопки "Начать новую сессию"
    const newSessionButton = document.getElementById('newSessionButton');
    if (newSessionButton) {
        newSessionButton.addEventListener('click', async () => {
            try {
                // Показываем индикатор загрузки на кнопке
                newSessionButton.innerHTML = 'Загрузка...';
                newSessionButton.disabled = true;
                
                // Получаем user_id из sessionStorage
                let userId = sessionStorage.getItem('userId');
                const models = JSON.parse(sessionStorage.getItem('models') || '[]');

                if (!userId) {
                    // Создаем временный ID пользователя
                    userId = 'temp_' + Date.now();
                    sessionStorage.setItem('userId', userId);
                    console.log('Создан временный ID пользователя:', userId);
                }

                try {
                    // Создаем новую сессию через API-обертку
                    const result = await createNewSession(userId, models || []);
                    console.log('Создана новая сессия:', result);
                } catch (error) {
                    console.warn('Ошибка создания новой сессии, но продолжаем работу:', error);
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
                    if (widthInput) widthInput.value = '40';
                    if (lengthInput) lengthInput.value = '30';
                    
                    // Показываем модальное окно
                    platformSelectModal.style.display = 'block';
                    console.log('Showing platform selection modal');
                } else {
                    console.error('Platform selection modal not found');
                }
            } catch (error) {
                console.error('Error creating new session:', error);
            } finally {
                // Восстанавливаем состояние кнопки
                newSessionButton.innerHTML = 'Начать новую сессию';
                newSessionButton.disabled = false;
            }
        });
    }
    
    // Обработчик для кнопки "Продолжить сессию"
    const continueSessionButton = document.getElementById('continueSessionButton');
    if (continueSessionButton) {
        continueSessionButton.addEventListener('click', async () => {
            try {
                // Показываем индикатор загрузки на кнопке
                continueSessionButton.innerHTML = 'Загрузка...';
                continueSessionButton.disabled = true;
                
                // Получаем user_id из sessionStorage
                let userId = sessionStorage.getItem('userId');

                if (!userId) {
                    // Создаем временный ID пользователя
                    userId = 'temp_' + Date.now();
                    sessionStorage.setItem('userId', userId);
                    console.log('Создан временный ID пользователя:', userId);
                    throw new Error('Пользовательский ID не найден, создан новый');
                }

                try {
                    // Получаем данные сессии через API-обертку
                    const { session } = await getUserSession(userId);
                    
                    if (!session) {
                        throw new Error('Сессия не найдена');
                    }
                    
                    console.log('Загружена существующая сессия:', session);
                    
                    // Сохраняем playground параметры, если они есть
                    if (session.playground) {
                        window.selectedPlaygroundType = session.playground.type || 'basketball_court.glb';
                        window.selectedPlaygroundWidth = session.playground.width || 40;
                        window.selectedPlaygroundLength = session.playground.length || 30;
                        window.selectedPlaygroundColor = session.playground.color || 'зеленый';
                        console.log('Восстановлены параметры площадки:', window.selectedPlaygroundWidth, window.selectedPlaygroundLength, window.selectedPlaygroundColor);
                    }
                } catch (error) {
                    console.warn('Ошибка получения сессии:', error);
                    throw error;
                }

                const sessionModal = document.getElementById('sessionModal');
                if (sessionModal) {
                    sessionModal.style.display = 'none';
                }
                
                // Показываем приложение
                const appModal = document.getElementById('appModal');
                if (appModal) {
                    appModal.style.display = 'block';
                    console.log('Приложение открыто с восстановленной сессией');
                }
                
                // Показываем индикатор загрузки
                const loadingOverlay = document.getElementById('loadingOverlay');
                if (loadingOverlay) {
                    loadingOverlay.classList.remove('hidden');
                    window.isLoading = true;
                }
                
                // Восстанавливаем параметры площадки из сессии
                if (session.playground) {
                    window.selectedPlaygroundType = session.playground.type;
                    window.selectedPlaygroundWidth = session.playground.width;
                    window.selectedPlaygroundLength = session.playground.length;
                    window.selectedPlaygroundColor = session.playground.color;
                } else {
                    // Если параметры не найдены, используем дефолтные значения
                    window.selectedPlaygroundType = 'basketball_court.glb';
                    window.selectedPlaygroundWidth = 40;
                    window.selectedPlaygroundLength = 30;
                    window.selectedPlaygroundColor = 'серый';
                }
                
                // Запускаем приложение
                try {
                    if (typeof window.initApp === 'function') {
                        window.initApp();
                        setTimeout(initializeTopViewButtonWithDelay, 1000);
                        setTimeout(() => {
                            console.log("Запуск проверки сцены после открытия модального окна");
                            try {
                                if (typeof startSceneChecks === 'function') {
                                    startSceneChecks();
                                }
                            } catch (checksError) {
                                console.error('Error running scene checks:', checksError);
                            }
                        }, 3000);
                    } else {
                        console.error('initApp function not found');
                    }
                } catch (initError) {
                    console.error('Error initializing app:', initError);
                    // Скрываем индикатор загрузки при ошибке
                    if (loadingOverlay) {
                        loadingOverlay.classList.add('hidden');
                        window.isLoading = false;
                    }
                }
                
                // Запускаем приложение или возвращаемся в него
                if (window.returnToApp) {
                    try {
                        import('./playground.js').then(module => {
                            // Загружаем площадку с сохраненными параметрами
                            module.loadPlayground(
                                window.selectedPlaygroundType,
                                window.selectedPlaygroundWidth,
                                window.selectedPlaygroundLength,
                                window.selectedPlaygroundColor
                            ).then(() => {
                                console.log('Площадка успешно восстановлена');
                            });
                        });
                    } catch (error) {
                        console.error('Ошибка при загрузке площадки:', error);
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
    
    // Очищаем modelQuantities из sessionStorage
    sessionStorage.removeItem('modelQuantities');
    
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
