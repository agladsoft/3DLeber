/**
 * Модуль управления модальным окном
 * Отвечает за запуск приложения в модальном режиме
 */
import { startSceneChecks } from './sceneCheck.js';
import { API_BASE_URL } from './api/serverConfig.js';
import { clearModelCache } from './modules/objectManager.js';

// Флаг для отслеживания инициализации sidebar
let sidebarInitialized = false;

/**
 * Инициализирует новую сессию данными из JSON
 * @param {string} userId - ID пользователя
 * @param {Array} models - Массив моделей из JSON
 */
export async function initializeNewSession(userId, models) {
    try {
        console.log('Initializing new session with models:', models);
        
        // Сначала получаем полные данные моделей через API
        const matchResponse = await fetch(`${API_BASE_URL}/models/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ models }),
        });

        if (!matchResponse.ok) {
            throw new Error('Failed to match models with database');
        }

        const { models: matchedModels } = await matchResponse.json();
        console.log('Matched models:', matchedModels);

        // Создаем начальные данные сессии
        const sessionData = {
            quantities: {},
            placedObjects: []
        };

        // Заполняем количества из JSON, используя article для сопоставления
        models.forEach(jsonModel => {
            const matchedModel = matchedModels.find(m => m.article === jsonModel.article);
            if (matchedModel && matchedModel.name) {
                const modelName = `${matchedModel.name}.glb`;
                sessionData.quantities[modelName] = jsonModel.quantity;
                console.log(`Setting quantity for ${modelName}: ${jsonModel.quantity}`);
            }
        });

        console.log('Final session data to save:', sessionData);

        // Сохраняем сессию в БД
        const response = await fetch(`${API_BASE_URL}/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, sessionData }),
        });

        if (!response.ok) {
            throw new Error('Failed to save session');
        }

        // Проверяем, что данные сохранились
        const verifyResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
        if (verifyResponse.ok) {
            const { session } = await verifyResponse.json();
            console.log('Verified saved session data:', session);
        }

        return sessionData;
    } catch (error) {
        console.error('Error initializing new session:', error);
        return null;
    }
}

// Экспортируем функцию для показа модального окна выбора площадки
export async function showPlatformSelectModal() {
    const platformSelectModal = document.getElementById('platformSelectModal');
    const appModal = document.getElementById('appModal');
    
    if (platformSelectModal) {
        // Инициализируем sidebar только если он еще не инициализирован
        const userId = sessionStorage.getItem('userId');
        const models = JSON.parse(sessionStorage.getItem('models'));
        
        if (userId && models && !sidebarInitialized) {
            try {
                console.log('Initializing sidebar for the first time...');
                const { initSidebar } = await import('./sidebar.js');
                initSidebar();
                sidebarInitialized = true;
            } catch (error) {
                console.error('Error loading models in showPlatformSelectModal:', error);
            }
        }
        
        // Проверяем наличие сессии и решаем что показать
        if (userId) {
            try {
                const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
                if (sessionResponse.ok) {
                    const { session } = await sessionResponse.json();
                    
                    if (session) {
                        // Если есть сессия, показываем модальное окно управления сессией
                        const sessionModal = document.getElementById('sessionModal');
                        if (sessionModal) {
                            sessionModal.style.display = 'block';
                            return;
                        }
                    }
                }
            } catch (error) {
                console.log('Error checking session, proceeding with platform selection:', error);
            }
        }
        
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
        
        // Сбрасываем значения в полях ввода для новых сессий
        if (!window.returnToApp) {
            const widthInput = document.getElementById('modalPlaygroundWidth');
            const lengthInput = document.getElementById('modalPlaygroundLength');
            if (widthInput) widthInput.value = '40';
            if (lengthInput) lengthInput.value = '30';
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
    
    if (modalPlaygroundWidth) modalPlaygroundWidth.value = currentWidth;
    if (modalPlaygroundLength) modalPlaygroundLength.value = currentLength;
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


async function checkMissingModelsAfterStart() {
    try {
        // Динамически импортируем модуль проверки отсутствующих моделей
        const { autoCheckAndShowMissingModels } = await import('./checkMissingModelsModal.js');
        
        // Запускаем автоматическую проверку
        const result = await autoCheckAndShowMissingModels();
        
        if (result.hasMissing) {
            console.log(`Found ${result.stats.missing} missing models out of ${result.stats.total} total`);
        } else {
            console.log(`No missing models found`);
        }
        
    } catch (error) {
        console.error(`Error checking missing models after start:`, error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Получаем элементы DOM
    const platformSelectModal = document.getElementById('platformSelectModal');
    const appModal = document.getElementById('appModal');
    const startAppButton = document.getElementById('startAppButton');
    const cancelAppButton = document.getElementById('cancelAppButton');
    const closeAppButton = document.getElementById('closeAppButton');
    const modalPlaygroundColorField = document.getElementById('modalPlaygroundColor');
    const colorSquares = document.querySelectorAll('.color-square');
    
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
    

    
    // Обработчик для кнопки "Отмена" в модальном окне выбора площадки
    if (cancelAppButton) {
        cancelAppButton.addEventListener('click', async () => {
            platformSelectModal.style.display = 'none';
            
            // Проверяем, нужно ли вернуться к приложению
            if (window.returnToApp) {
                // Возвращаемся к приложению (sidebar уже инициализирован)
                appModal.style.display = 'block';
            } else {
                // Если отменили, показываем ошибку токена (пользователь должен иметь валидный токен)
                const { showTokenError } = await import('./tokenHandler.js');
                showTokenError();
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
                const selectedWidth = document.getElementById('modalPlaygroundWidth').value;
                const selectedLength = document.getElementById('modalPlaygroundLength').value;
                const selectedColor = document.getElementById('modalPlaygroundColor').value;
                
                // Сохраняем выбранные значения в глобальных переменных для использования в приложении
                window.selectedPlaygroundType = 'basketball_court.glb';
                window.selectedPlaygroundWidth = parseFloat(selectedWidth);
                window.selectedPlaygroundLength = parseFloat(selectedLength);
                window.selectedPlaygroundColor = selectedColor;
                    
                // Получаем project_id из sessionStorage
                const userId = sessionStorage.getItem('userId');
                const models = JSON.parse(sessionStorage.getItem('models'));

                if (!userId) {
                    throw new Error('No user ID found');
                }

                // Инициализируем новую сессию с моделями из JSON
                if (models && Array.isArray(models)) {
                    console.log('Initializing new session with models:', models);
                    const newSessionData = await initializeNewSession(userId, models);
                    
                    // Добавляем параметры площадки в сессию
                    if (newSessionData) {
                        // Импортируем модуль playground
                        const playgroundModule = await import('./playground.js');
                        
                        // Сохраняем параметры площадки
                        await playgroundModule.savePlaygroundParameters(
                            window.selectedPlaygroundType,
                            window.selectedPlaygroundWidth,
                            window.selectedPlaygroundLength,
                            window.selectedPlaygroundColor
                        );
                    }
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
                
                // Запускаем приложение
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
                        setTimeout(() => {
                            console.log("Запуск проверки сцены после открытия модального окна");
                            startSceneChecks();
                        }, 3000);
                    }
                }
                
                // Проверяем отсутствующие модели после запуска приложения (один раз)
                setTimeout(() => {
                    console.log('Calling checkMissingModelsAfterStart from startAppButton handler');
                    checkMissingModelsAfterStart('startAppButton');
                }, 3000);
                
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
    }
    
    // Обработчик для кнопки "Начать новую сессию"
    const newSessionButton = document.getElementById('newSessionButton');
    if (newSessionButton) {
        newSessionButton.addEventListener('click', async () => {
            try {
                // Получаем project_id из sessionStorage
                const userId = sessionStorage.getItem('userId');
                const models = JSON.parse(sessionStorage.getItem('models'))

                if (userId) {
                    // Очищаем сессию в базе данных
                    const clearResponse = await fetch(`${API_BASE_URL}/session/${userId}`, {
                        method: 'DELETE'
                    });

                    if (!clearResponse.ok) {
                        throw new Error('Failed to clear session');
                    }

                    // Инициализируем новую сессию данными из JSON
                    if (models && Array.isArray(models)) {
                        console.log('Initializing new session with models:', models);
                        await initializeNewSession(userId, models);
                    } else {
                        console.error('No models found in request');
                        throw new Error('No models found in request');
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
                    if (widthInput) widthInput.value = '40';
                    if (lengthInput) lengthInput.value = '30';
                    
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
                // Получаем project_id из sessionStorage
                const userId = sessionStorage.getItem('userId');

                if (!userId) {
                    throw new Error('No user ID found');
                }

                // Получаем данные сессии из БД
                const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
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
                
                // Показываем приложение
                appModal.style.display = 'block';
                
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
                        setTimeout(() => {
                            console.log("Запуск проверки сцены после открытия модального окна");
                            startSceneChecks();
                        }, 3000);
                    }
                }
                
                // Проверяем отсутствующие модели после восстановления сессии (один раз)
                setTimeout(() => {
                    console.log('Calling checkMissingModelsAfterStart from continueSessionButton handler');
                    checkMissingModelsAfterStart('continueSessionButton');
                }, 3000);
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
    if (closeAppButton) {
        closeAppButton.addEventListener('click', () => {
            // Скрываем модальное окно
            if (appModal) {
                appModal.style.display = 'none';
            }
            
            // Показываем контейнер с кнопкой запуска
            if (launchContainer) {
                launchContainer.style.display = 'flex';
            }
            
            // Очищаем сетку и ресурсы при закрытии
            cleanupResources();
        });
    }
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
 * Очищает ресурсы при закрытии приложения
 */
function cleanupResources() {
    console.log("Очистка ресурсов при закрытии приложения");
    
    // Очищаем modelQuantities из sessionStorage
    sessionStorage.removeItem('modelQuantities');
    
    // Очищаем кэш моделей
    clearModelCache();
    
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
