/**
 * Модуль управления модальным окном
 * Отвечает за запуск приложения в модальном режиме
 */
import { startSceneChecks } from './sceneCheck.js';
import { API_BASE_URL } from './api/serverConfig.js';
import { clearModelCache } from './modules/objectManager.js';
import { 
    standardNewSessionInit, 
    standardSessionRestore, 
    standardPlaygroundLoading,
    forceHideAllLoading 
} from './loadingManager.js';
import { safeFetch } from './utils/security.js';

// Флаг для отслеживания инициализации sidebar
let sidebarInitialized = false;

// Флаг для предотвращения множественных вызовов showPlatformSelectModal
let showPlatformSelectModalInProgress = false;

/**
 * Показывает loadingScreen
 */
function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        console.log('Showing loadingScreen');
        loadingScreen.classList.remove('hidden', 'fade-out');
    }
}

/**
 * Плавно скрывает loadingScreen
 */
function hideLoadingScreenSmooth() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen && !loadingScreen.classList.contains('fade-out')) {
        console.log('Starting smooth hide of loadingScreen');
        // Начинаем плавное исчезновение
        loadingScreen.classList.add('fade-out');
        
        // Полностью скрываем после завершения анимации
        setTimeout(() => {
            loadingScreen.classList.add('hidden');
            console.log('LoadingScreen fully hidden');
        }, 800); // Время анимации из CSS (0.8s)
    }
}

/**
 * Обеспечивает правильное отображение приложения после показа appModal
 */
function ensureAppVisibility() {
    try {
        console.log('ensureAppVisibility called - ensuring app is visible and working');
        
        // Убеждаемся, что loading overlay скрыт
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            window.isLoading = false;
            console.log('Loading overlay hidden');
        }
        
        // Убеждаемся, что canvas правильно ресайзится
        setTimeout(() => {
            if (window.app && window.app.renderer && window.app.camera) {
                const renderer = window.app.renderer;
                const camera = window.app.camera;
                
                // Обновляем размеры рендерера
                renderer.setSize(window.innerWidth, window.innerHeight);
                
                // Если используется перспективная камера, обновляем её аспект
                if (camera.isPerspectiveCamera) {
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                }
                
                // Принудительно рендерим один кадр
                if (window.app.scene) {
                    renderer.render(window.app.scene, camera);
                }
                
                console.log('Canvas resized, camera updated and frame rendered after showing app');
            } else {
                console.warn('App components not ready for resize:', {
                    app: !!window.app,
                    renderer: !!(window.app && window.app.renderer),
                    camera: !!(window.app && window.app.camera)
                });
            }
        }, 100);
        
        // Убеждаемся, что рендер loop запущен
        if (!window.app) {
            // Приложение еще не инициализировано, скрываем loadingScreen через короткое время
            setTimeout(() => {
                hideLoadingScreenSmooth();
            }, 1000);
        } else if (!window.app.renderLoopRunning) {
            console.log('Starting render loop after showing app');
            // Импортируем и запускаем рендер loop из appCore
            import('./core/appCore.js').then(appCore => {
                if (appCore.startRenderLoop) {
                    appCore.startRenderLoop();
                    console.log('Render loop started successfully');
                    
                    // Скрываем loadingScreen после запуска рендер loop
                    setTimeout(() => {
                        hideLoadingScreenSmooth();
                    }, 300);
                } else {
                    console.error('startRenderLoop function not found in appCore');
                }
            }).catch(error => {
                console.error('Error importing appCore for render loop:', error);
                // Попробуем запустить рендер loop напрямую, если он уже есть в window.app
                if (window.app && typeof window.app.startRenderLoop === 'function') {
                    window.app.startRenderLoop();
                    console.log('Render loop started from window.app fallback');
                    
                    // Скрываем loadingScreen после запуска рендер loop
                    setTimeout(() => {
                        hideLoadingScreenSmooth();
                    }, 300);
                }
            });
        } else {
            // Рендер loop уже запущен, скрываем loadingScreen
            setTimeout(() => {
                hideLoadingScreenSmooth();
            }, 100);
        }
        
    } catch (error) {
        console.error('Error in ensureAppVisibility:', error);
    }
}

/**
 * Инициализирует новую сессию данными из JSON
 * @param {string} userId - ID пользователя
 * @param {Array} models - Массив моделей из JSON
 */
export async function initializeNewSession(userId, models) {
    try {        
        // Сначала получаем полные данные моделей через API
        const matchResponse = await safeFetch(`${API_BASE_URL}/models/match`, {
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
            }
        });

        console.log('Final session data to save:', sessionData);

        // Сохраняем сессию в БД
        const response = await safeFetch(`${API_BASE_URL}/session`, {
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
    // Проверяем, не выполняется ли уже процесс показа модального окна
    if (showPlatformSelectModalInProgress) {
        console.log('showPlatformSelectModal already in progress, skipping');
        return;
    }
    
    // Устанавливаем флаг, что процесс запущен
    showPlatformSelectModalInProgress = true;
    
    try {
        const platformSelectModal = document.getElementById('platformSelectModal');
        const sessionModal = document.getElementById('sessionModal');
        const appModal = document.getElementById('appModal');
        
        // Более надежная проверка видимости модальных окон
        const isPlatformModalVisible = platformSelectModal && 
            (platformSelectModal.style.display === 'block' || 
             window.getComputedStyle(platformSelectModal).display === 'block');
        
        const isSessionModalVisible = sessionModal && 
            (sessionModal.style.display === 'block' || 
             window.getComputedStyle(sessionModal).display === 'block');
        
        if (isPlatformModalVisible || isSessionModalVisible) {
            console.log('Modal already visible, skipping showPlatformSelectModal');
            return;
        }
    
    if (platformSelectModal) {
        // Инициализируем sidebar только если он еще не инициализирован
        const userId = sessionStorage.getItem('userId');
        const models = JSON.parse(sessionStorage.getItem('models'));
        
        if (userId && models) {
            try {
                if (!sidebarInitialized) {
                    console.log('Initializing sidebar for the first time...');
                } else {
                    console.log('Re-initializing sidebar to ensure special models are loaded...');
                }
                const { initSidebar } = await import('./sidebar.js');
                await initSidebar();
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
                        if (sessionModal) {
                            sessionModal.style.display = 'block';
                            console.log('Session modal shown');
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
            if (widthInput) {
                widthInput.value = '40';
                // Уведомляем систему суффиксов об изменении значения
                if (window.SuffixManager) {
                    window.SuffixManager.notifyValueChange('modalPlaygroundWidth');
                }
            }
            if (lengthInput) {
                lengthInput.value = '30';
                // Уведомляем систему суффиксов об изменении значения
                if (window.SuffixManager) {
                    window.SuffixManager.notifyValueChange('modalPlaygroundLength');
                }
            }
        }
        
        // Показываем модальное окно
        platformSelectModal.style.display = 'block';
        console.log('Platform select modal shown');
        
    } else {
        console.error('Не найдено модальное окно выбора площадки');
    }
    
    } finally {
        // Сбрасываем флаг в любом случае
        showPlatformSelectModalInProgress = false;
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
    
    if (modalPlaygroundWidth) {
        modalPlaygroundWidth.value = currentWidth;
        // Уведомляем систему суффиксов об изменении значения
        if (window.SuffixManager) {
            window.SuffixManager.notifyValueChange('modalPlaygroundWidth');
        }
    }
    
    if (modalPlaygroundLength) {
        modalPlaygroundLength.value = currentLength;
        // Уведомляем систему суффиксов об изменении значения
        if (window.SuffixManager) {
            window.SuffixManager.notifyValueChange('modalPlaygroundLength');
        }
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


async function checkMissingModelsAfterStart() {
    try {
        // Динамически импортируем модуль проверки отсутствующих моделей
        const { autoCheckAndShowMissingModels } = await import('./checkMissingModelsModal.js');
        
        // Запускаем автоматическую проверку
        const result = await autoCheckAndShowMissingModels();
        
        if (result.hasMissing) {
            console.log(`Found ${result.stats.missing} missing models out of ${result.stats.total} total`);
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
    const cancelAppButton = document.getElementById('cancelPlatformButton');
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
            
            // Сбрасываем флаг для возможности повторного вызова showPlatformSelectModal
            showPlatformSelectModalInProgress = false;
            
            // Проверяем, нужно ли вернуться к приложению
            if (window.returnToApp) {
                // Возвращаемся к приложению (sidebar уже инициализирован)
                appModal.style.display = 'block';
                
                // Убеждаемся, что canvas правильно отображается
                ensureAppVisibility();
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
            // Объявляем переменную один раз в начале
            const loadingScreen = document.getElementById('loadingScreen');
            
            try {
                // Показываем загрузочный экран
                showLoadingScreen();
                
                // Показываем индикатор загрузки на кнопке
                startAppButton.innerHTML = 'Загрузка...';
                startAppButton.disabled = true;
                
                // Инициализируем стандартную загрузку новой сессии
                const loadingManager = await standardNewSessionInit();
                
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

                // Обновляем прогресс - инициализация сессии
                await loadingManager.updateProgress(30, 'Инициализация новой сессии...');

                // Инициализируем новую сессию с моделями из JSON
                if (models && Array.isArray(models)) {
                    console.log('Initializing new session with models:', models);
                    const newSessionData = await initializeNewSession(userId, models);
                    
                    // Обновляем прогресс - сохранение параметров
                    await loadingManager.updateProgress(50, 'Сохранение параметров площадки...');
                    
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
                
                // Обновляем прогресс - подготовка к запуску
                await loadingManager.updateProgress(60, 'Подготовка к запуску приложения...');
                
                // Скрываем модальное окно выбора площадки
                platformSelectModal.style.display = 'none';
                
                // Сбрасываем флаг для возможности повторного вызова showPlatformSelectModal
                showPlatformSelectModalInProgress = false;
                
                // Показываем приложение
                appModal.style.display = 'block';
                
                // Убеждаемся, что canvas правильно отображается
                ensureAppVisibility();
                
                // Обновляем прогресс - запуск приложения
                await loadingManager.updateProgress(70, 'Запуск приложения...');
                
                // Запускаем приложение
                if (window.returnToApp) {
                    try {
                        const playgroundModule = await import('./playground.js');
                        // Используем стандартную загрузку площадки
                        await standardPlaygroundLoading(
                            playgroundModule.loadPlayground,
                            window.selectedPlaygroundType,
                            window.selectedPlaygroundWidth,
                            window.selectedPlaygroundLength,
                            window.selectedPlaygroundColor
                        );
                        console.log('Площадка успешно восстановлена');
                    } catch (error) {
                        console.error('Ошибка при загрузке площадки:', error);
                        await forceHideAllLoading();
                    }
                } else {
                    if (window.initApp && !window.appInitialized) {
                        window.appInitialized = true;
                        
                        // Обновляем прогресс - инициализация Three.js
                        await loadingManager.updateProgress(80, 'Инициализация Three.js...');
                        
                        window.initApp();
                        setTimeout(() => {
                            startSceneChecks();
                        }, 3000);
                        
                        // Завершаем загрузку через стандартный механизм
                        setTimeout(async () => {
                            await loadingManager.finish();
                        }, 2000);
                    } else {
                        console.log('App initialization skipped - already initialized or in progress');
                        await loadingManager.finish();
                    }
                }
                
                // Проверяем отсутствующие модели после запуска приложения (один раз)
                setTimeout(() => {
                    checkMissingModelsAfterStart('startAppButton');
                }, 3000);
                
                // Восстанавливаем состояние кнопки после задержки
                setTimeout(() => {
                    startAppButton.innerHTML = 'Запустить';
                    startAppButton.disabled = false;
                }, 2000);
            } catch (error) {
                console.error('Error starting app:', error);
                await forceHideAllLoading();
                
                // Скрываем загрузочный экран в случае ошибки
                hideLoadingScreenSmooth();
                
                startAppButton.innerHTML = 'Запустить';
                startAppButton.disabled = false;
                
                // Сбрасываем флаг в случае ошибки
                showPlatformSelectModalInProgress = false;
            }
        });
    }
    
    // Обработчик для кнопки "Начать новую сессию"
    const newSessionButton = document.getElementById('newSessionButton');
    if (newSessionButton) {
        newSessionButton.addEventListener('click', async () => {
            // Объявляем переменную один раз в начале
            const loadingScreen = document.getElementById('loadingScreen');
            
            try {
                // Показываем загрузочный экран
                showLoadingScreen();
                
                // Инициализируем стандартную загрузку новой сессии
                const loadingManager = await standardNewSessionInit();
                
                // Получаем project_id из sessionStorage
                const userId = sessionStorage.getItem('userId');
                const models = JSON.parse(sessionStorage.getItem('models'))

                if (userId) {
                    // Обновляем прогресс - очистка сессии
                    await loadingManager.updateProgress(30, 'Очистка предыдущей сессии...');
                    
                    // Очищаем сессию в базе данных
                    const clearResponse = await safeFetch(`${API_BASE_URL}/session/${userId}`, {
                        method: 'DELETE'
                    });

                    if (!clearResponse.ok) {
                        throw new Error('Failed to clear session');
                    }

                    // Обновляем прогресс - создание новой сессии
                    await loadingManager.updateProgress(50, 'Создание новой сессии...');

                    // Инициализируем новую сессию данными из JSON
                    if (models && Array.isArray(models)) {
                        await initializeNewSession(userId, models);
                    } else {
                        console.error('No models found in request');
                        throw new Error('No models found in request');
                    }
                }
                
                // Обновляем прогресс - подготовка к выбору площадки
                await loadingManager.updateProgress(70, 'Подготовка к выбору площадки...');
                
                // Скрываем модальное окно управления сессией
                const sessionModal = document.getElementById('sessionModal');
                if (sessionModal) {
                    sessionModal.style.display = 'none';
                }
                
                // Сбрасываем флаг для возможности повторного вызова showPlatformSelectModal
                showPlatformSelectModalInProgress = false;
                
                // Завершаем загрузку перед показом модального окна
                await loadingManager.finish(200);

                // Показываем модальное окно выбора площадки
                const platformSelectModal = document.getElementById('platformSelectModal');
                if (platformSelectModal) {
                    // Сбрасываем значения в полях ввода
                    const widthInput = document.getElementById('modalPlaygroundWidth');
                    const lengthInput = document.getElementById('modalPlaygroundLength');
                    if (widthInput) {
                        widthInput.value = '40';
                        // Уведомляем систему суффиксов об изменении значения
                        if (window.SuffixManager) {
                            window.SuffixManager.notifyValueChange('modalPlaygroundWidth');
                        }
                    }
                    if (lengthInput) {
                        lengthInput.value = '30';
                        // Уведомляем систему суффиксов об изменении значения
                        if (window.SuffixManager) {
                            window.SuffixManager.notifyValueChange('modalPlaygroundLength');
                        }
                    }
                    
                    // Показываем модальное окно
                    platformSelectModal.style.display = 'block';
                } else {
                    console.error('Platform selection modal not found');
                }
                
                // Скрываем загрузочный экран после успешного показа модального окна
                hideLoadingScreenSmooth();
            } catch (error) {
                console.error('Error clearing session:', error);
                await forceHideAllLoading();
                
                // Скрываем загрузочный экран в случае ошибки
                hideLoadingScreenSmooth();
                
                // Сбрасываем флаг в случае ошибки
                showPlatformSelectModalInProgress = false;
            }
        });
    }
    
    // Обработчик для кнопки "Продолжить сессию"
    const continueSessionButton = document.getElementById('continueSessionButton');
    if (continueSessionButton) {
        continueSessionButton.addEventListener('click', async () => {
            // Объявляем переменную один раз в начале
            const loadingScreen = document.getElementById('loadingScreen');
            
            try {
                // Показываем загрузочный экран
                showLoadingScreen();
                
                // Инициализируем стандартное восстановление сессии
                const loadingManager = await standardSessionRestore();
                
                // Получаем project_id из sessionStorage
                const userId = sessionStorage.getItem('userId');

                if (!userId) {
                    throw new Error('No user ID found');
                }

                // Обновляем прогресс - получение данных
                await loadingManager.updateProgress(40, 'Получение данных сессии...');

                // Получаем данные сессии из БД
                const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
                if (!sessionResponse.ok) {
                    throw new Error('Failed to get session');
                }

                const { session } = await sessionResponse.json();
                if (!session) {
                    throw new Error('No session found');
                }

                // Обновляем прогресс - восстановление параметров
                await loadingManager.updateProgress(50, 'Восстановление параметров площадки...');

                const sessionModal = document.getElementById('sessionModal');
                if (sessionModal) {
                    sessionModal.style.display = 'none';
                }
                
                // Сбрасываем флаг для возможности повторного вызова showPlatformSelectModal
                showPlatformSelectModalInProgress = false;
                
                // Sidebar уже инициализирован в showPlatformSelectModal, не нужно дублировать
                console.log('Sidebar already initialized, skipping re-initialization for session restore');
                
                // Показываем приложение
                appModal.style.display = 'block';
                
                // Убеждаемся, что canvas правильно отображается
                ensureAppVisibility();
                
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
                
                // Обновляем прогресс - запуск приложения
                await loadingManager.updateProgress(60, 'Запуск приложения...');
                
                // Запускаем приложение только если оно еще не запущено
                if (window.returnToApp) {
                    try {
                        const playgroundModule = await import('./playground.js');
                        // Используем стандартную загрузку площадки
                        await standardPlaygroundLoading(
                            playgroundModule.loadPlayground,
                            window.selectedPlaygroundType,
                            window.selectedPlaygroundWidth,
                            window.selectedPlaygroundLength,
                            window.selectedPlaygroundColor
                        );
                        console.log('Площадка успешно восстановлена');
                    } catch (error) {
                        console.error('Ошибка при загрузке площадки:', error);
                        await forceHideAllLoading();
                    }
                } else if (!window.app || !window.app.scene || !window.appInitialized) {
                    // Приложение еще не запущено, запускаем инициализацию
                    console.log('App not initialized yet, starting initialization...');
                    if (window.initApp && !window.appInitialized) {
                        window.appInitialized = true;
                        
                        // Обновляем прогресс - инициализация Three.js
                        await loadingManager.updateProgress(70, 'Инициализация Three.js...');
                        
                        window.initApp();
                        setTimeout(() => {
                            console.log("Запуск проверки сцены после открытия модального окна");
                            startSceneChecks();
                        }, 3000);
                        
                        // Завершаем загрузку через стандартный механизм
                        setTimeout(async () => {
                            await loadingManager.finish();
                        }, 2000);
                    } else {
                        console.log('App initialization skipped - already initialized or in progress');
                        await loadingManager.finish();
                    }
                } else {
                    // Приложение уже запущено, просто восстанавливаем площадку
                    console.log('App already initialized, restoring playground...');
                    try {
                        const playgroundModule = await import('./playground.js');
                        // Используем стандартную загрузку площадки
                        await standardPlaygroundLoading(
                            playgroundModule.loadPlayground,
                            window.selectedPlaygroundType,
                            window.selectedPlaygroundWidth,
                            window.selectedPlaygroundLength,
                            window.selectedPlaygroundColor
                        );
                        console.log('Площадка успешно восстановлена для существующего приложения');
                    } catch (error) {
                        console.error('Ошибка при загрузке площадки для существующего приложения:', error);
                        await forceHideAllLoading();
                    }
                }
                
                // Проверяем отсутствующие модели после восстановления сессии (один раз)
                setTimeout(() => {
                    checkMissingModelsAfterStart('continueSessionButton');
                }, 3000);
            } catch (error) {
                console.error('Error continuing session:', error);
                await forceHideAllLoading();
                
                // Скрываем загрузочный экран в случае ошибки
                hideLoadingScreenSmooth();
                
                // Сбрасываем флаг в случае ошибки
                showPlatformSelectModalInProgress = false;
                
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
    
    // Сбрасываем флаг инициализации приложения для возможности перезапуска
    window.appInitialized = false;
    console.log('App initialization flag reset for restart');
    
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

// Уведомляем систему суффиксов о готовности модуля
document.addEventListener('DOMContentLoaded', () => {
    // Небольшая задержка для инициализации модуля
    setTimeout(() => {
        if (window.SuffixManager) {
            window.SuffixManager.notifyModuleReady('modal');
        }
    }, 100);
});
