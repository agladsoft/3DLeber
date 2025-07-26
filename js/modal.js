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

// Флаг для отслеживания инициализации sidebar
let sidebarInitialized = false;

// Флаг для предотвращения множественных вызовов showPlatformSelectModal
let showPlatformSelectModalInProgress = false;

// Импортируем централизованные функции управления loading screen
import { 
    showLoadingScreen, 
    hideLoadingScreenSmooth, 
    hideLoadingScreenInstant,
    setLoadingText 
} from './utils/loadingScreen.js';

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
            // Приложение еще не инициализировано, ждем загрузки HDRI
            console.log('App not initialized yet, waiting for HDRI to load');
        } else if (!window.app.renderLoopRunning) {
            console.log('Starting render loop after showing app');
            // Импортируем и запускаем рендер loop из appCore
            import('./core/appCore.js').then(appCore => {
                if (appCore.startRenderLoop) {
                    appCore.startRenderLoop();
                    console.log('Render loop started successfully - waiting for HDRI to load');
                } else {
                    console.error('startRenderLoop function not found in appCore');
                }
            }).catch(error => {
                console.error('Error importing appCore for render loop:', error);
                // Попробуем запустить рендер loop напрямую, если он уже есть в window.app
                if (window.app && typeof window.app.startRenderLoop === 'function') {
                    window.app.startRenderLoop();
                    console.log('Render loop started from window.app fallback - waiting for HDRI to load');
                }
            });
        } else {
            // Рендер loop уже запущен, но не скрываем loadingScreen - ждем загрузки HDRI
            console.log('Render loop active, waiting for HDRI to load before hiding loadingScreen');
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
    // Проверяем, не выполняется ли уже процесс показа модального окна
    if (showPlatformSelectModalInProgress) {
        console.log('showPlatformSelectModal already in progress, skipping');
        return;
    }
    
    // Устанавливаем флаг, что процесс запущен
    showPlatformSelectModalInProgress = true;
    
    try {
        const platformSelectModal = document.getElementById('platformSelectModal');
        const appModal = document.getElementById('appModal');
        
        // Более надежная проверка видимости модальных окон
        const isPlatformModalVisible = platformSelectModal && 
            (platformSelectModal.style.display === 'block' || 
             window.getComputedStyle(platformSelectModal).display === 'block');
        
        if (isPlatformModalVisible) {
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
            
            // Автоматически принимаем решение о сессии вместо показа модального окна
            if (userId) {
                try {
                    const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
                    if (sessionResponse.ok) {
                        const { session } = await sessionResponse.json();
                        
                        if (session) {
                            // Если есть сессия, автоматически восстанавливаем ее
                            console.log('Existing session found, automatically restoring...');
                            await autoRestoreSession(userId, session);
                            return;
                        }
                    }
                } catch (error) {
                    console.log('Error checking session, proceeding with new session creation:', error);
                }
            }
            
            // Если сессии нет, автоматически создаем новую
            console.log('No session found, automatically creating new session...');
            await autoCreateNewSession(userId, models);
            
        } else {
            console.error('Не найдено модальное окно выбора площадки');
        }
        
    } finally {
        // Сбрасываем флаг в любом случае
        showPlatformSelectModalInProgress = false;
    }
}

/**
 * Автоматически создает новую сессию
 */
async function autoCreateNewSession(userId, models) {
    try {
        // Показываем загрузочный экран
        await showLoadingScreen();
        
        // Инициализируем стандартную загрузку новой сессии
        const loadingManager = await standardNewSessionInit();
        
        if (userId) {
            // Обновляем прогресс - очистка сессии
            await loadingManager.updateProgress(30, 'Очистка предыдущей сессии...');
            
            // Очищаем сессию в базе данных
            const clearResponse = await fetch(`${API_BASE_URL}/session/${userId}`, {
                method: 'DELETE'
            });

            if (!clearResponse.ok) {
                console.warn('Failed to clear session, but continuing...');
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
        
        // Завершаем загрузку перед показом модального окна
        await loadingManager.finish(200);

        // Показываем модальное окно выбора площадки
        await showPlatformSelectModalForNewSession();
        
        // Устанавливаем флаг для автоматического показа справки после запуска приложения
        window.shouldShowHelpForNewUser = true;
        
    } catch (error) {
        console.error('Error in autoCreateNewSession:', error);
        await forceHideAllLoading();
        
        // Скрываем загрузочный экран в случае ошибки
        await hideLoadingScreenSmooth();
        
        // Сбрасываем флаг в случае ошибки
        showPlatformSelectModalInProgress = false;
    }
}

/**
 * Автоматически восстанавливает существующую сессию
 */
async function autoRestoreSession(userId, session) {
    try {
        // Показываем загрузочный экран
        await showLoadingScreen();
        
        // Инициализируем стандартное восстановление сессии
        const loadingManager = await standardSessionRestore();
        
        // Обновляем прогресс - получение данных
        await loadingManager.updateProgress(40, 'Получение данных сессии...');

        // Обновляем прогресс - восстановление параметров
        await loadingManager.updateProgress(50, 'Восстановление параметров площадки...');
        
        // Сбрасываем флаг для возможности повторного вызова showPlatformSelectModal
        showPlatformSelectModalInProgress = false;
        
        // Для восстановления сессии НЕ показываем справку автоматически
        window.shouldShowHelpForNewUser = false;
        
        // Sidebar уже инициализирован в showPlatformSelectModal, не нужно дублировать
        console.log('Sidebar already initialized, skipping re-initialization for session restore');
        
        // Показываем приложение
        const appModal = document.getElementById('appModal');
        if (appModal) {
            appModal.style.display = 'block';
        }
        
        // Убеждаемся, что canvas правильно отображается
        ensureAppVisibility();
        
        // Восстанавливаем параметры площадки из сессии
        if (session.playground) {
            window.selectedPlaygroundType = session.playground.type;
            window.selectedPlaygroundWidth = session.playground.width;
            window.selectedPlaygroundLength = session.playground.length;
            window.selectedPlaygroundColor = session.playground.color;
            
            // Восстанавливаем данные кастомной площадки если есть
            if (session.playground.customShape) {
                window.customPlaygroundShape = session.playground.customShape;
            }
        } else {
            // Если параметры не найдены, используем дефолтные значения
            window.selectedPlaygroundType = 'rubber';
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
            checkMissingModelsAfterStart('autoRestoreSession');
        }, 3000);
        
    } catch (error) {
        console.error('Error in autoRestoreSession:', error);
        await forceHideAllLoading();
        
        // Скрываем загрузочный экран в случае ошибки
        await hideLoadingScreenSmooth();
        
        // Сбрасываем флаг в случае ошибки
        showPlatformSelectModalInProgress = false;
        
        // Если произошла ошибка, показываем модальное окно выбора площадки
        await showPlatformSelectModalForNewSession();
    }
}

/**
 * Показывает модальное окно выбора площадки для новой сессии
 */
async function showPlatformSelectModalForNewSession() {
    const platformSelectModal = document.getElementById('platformSelectModal');
    const appModal = document.getElementById('appModal');
    
    // Восстанавливаем значения из текущей площадки
    updateModalValuesFromCurrent();
    
    // Если открыто основное приложение, скрываем его временно
    if (appModal && appModal.style.display === 'block') {
        // Сохраняем информацию о том, что нужно вернуться к приложению
        console.log('🔄 Приложение уже открыто, устанавливаем returnToApp = true');
        window.returnToApp = true;
        // Скрываем основное приложение
        appModal.style.display = 'none';
    } else {
        console.log('🆕 Новая сессия, устанавливаем returnToApp = false');
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
        
        // Для полностью новых сессий устанавливаем флаг показа справки
        window.shouldShowHelpForNewUser = true;
        console.log('Установлен флаг для автоматического показа справки новому пользователю');
    }
    
    // Показываем модальное окно
    if (platformSelectModal) {
        platformSelectModal.style.display = 'block';
        console.log('Platform select modal shown');
    }
    
    // Скрываем загрузочный экран после показа модального окна
    console.log('🎯 Модальное окно показано, скрываем loadingScreen чтобы пользователь мог видеть модальное окно');
    await hideLoadingScreenSmooth();
    
    console.log('✅ Модальное окно выбора площадки готово к использованию');
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
    
    // Элементы для управления типом площадки
    const standardPlaygroundOption = document.getElementById('standardPlayground');
    const customPlaygroundOption = document.getElementById('customPlayground');
    const standardPlaygroundConfig = document.getElementById('standardSettings');
    const customPlaygroundEditor = document.getElementById('customSettings');
    
    // Инициализация превью площадки
    initializePlaygroundPreview();
    
    // Инициализация переключения типа площадки
    initializePlaygroundTypeSwitch();

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
            
            // Сбрасываем флаг показа справки при отмене
            window.shouldShowHelpForNewUser = false;
            
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
            try {
                // Показываем загрузочный экран
                await showLoadingScreen();
                
                // Показываем индикатор загрузки на кнопке
                startAppButton.innerHTML = 'Загрузка...';
                startAppButton.disabled = true;
                
                // Инициализируем стандартную загрузку новой сессии
                const loadingManager = await standardNewSessionInit();
                
                // Определяем тип площадки
                const customPlaygroundElement = document.getElementById('customPlayground');
                const isCustomPlayground = customPlaygroundElement && (customPlaygroundElement.classList.contains('selected') || customPlaygroundElement.classList.contains('active'));
                
                console.log('Custom playground element:', customPlaygroundElement);
                console.log('Is custom playground:', isCustomPlayground);
                if (customPlaygroundElement) {
                    console.log('Custom playground classes:', customPlaygroundElement.classList.toString());
                }
                console.log('Custom playground shape data:', window.customPlaygroundShape);
                
                let selectedWidth, selectedLength, selectedColor, customShape = null;
                
                if (isCustomPlayground) {
                    // Кастомная площадка - экспортируем данные из Fabric.js
                    if (window.customPlaygroundCanvas) {
                        const playgroundObjects = window.customPlaygroundCanvas.getObjects()
                            .filter(obj => !obj.isGrid && obj.objectType === 'playground');
                        
                        if (playgroundObjects.length === 0) {
                            throw new Error('Создайте хотя бы одну фигуру для кастомной площадки');
                        }
                        
                        customShape = {
                            objects: playgroundObjects.map(obj => obj.toObject(['objectType'])),
                            canvasWidth: window.customPlaygroundCanvas.width,
                            canvasHeight: window.customPlaygroundCanvas.height
                        };
                        
                        // Для кастомной площадки используем размеры canvas
                        selectedWidth = 60; // Примерный размер в метрах
                        selectedLength = 40;
                        selectedColor = 'зеленый';
                    } else {
                        throw new Error('Canvas кастомной площадки не инициализирован');
                    }
                } else {
                    // Стандартная площадка
                    selectedWidth = document.getElementById('modalPlaygroundWidth').value;
                    selectedLength = document.getElementById('modalPlaygroundLength').value;
                    selectedColor = document.getElementById('modalPlaygroundColor').value;
                }
                
                // Сохраняем выбранные значения в глобальных переменных для использования в приложении
                window.selectedPlaygroundType = isCustomPlayground ? 'custom' : 'rubber';
                window.selectedPlaygroundWidth = parseFloat(selectedWidth);
                window.selectedPlaygroundLength = parseFloat(selectedLength);
                window.selectedPlaygroundColor = selectedColor;
                window.customPlaygroundShape = customShape;
                    
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
                    тип: 'rubber',
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
                console.log('🔍 Отладка запуска приложения:');
                console.log('window.returnToApp:', window.returnToApp);
                console.log('window.initApp:', typeof window.initApp);
                console.log('window.appInitialized:', window.appInitialized);
                
                if (window.returnToApp) {
                    console.log('📁 Путь: Возвращение к существующему приложению');
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
                    console.log('🚀 Путь: Инициализация нового приложения');
                    if (window.initApp && !window.appInitialized) {
                        console.log('✅ Запускаем window.initApp() - инициализация Three.js и сцены');
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
                        console.log('❌ App initialization skipped:', {
                            'window.initApp exists': !!window.initApp,
                            'window.appInitialized': window.appInitialized
                        });
                        await loadingManager.finish();
                    }
                }
                
                // Проверяем отсутствующие модели после запуска приложения (один раз)
                setTimeout(() => {
                    checkMissingModelsAfterStart('startAppButton');
                }, 3000);
                
                // Автоматически показываем справку для новых пользователей
                if (window.shouldShowHelpForNewUser) {
                    setTimeout(async () => {
                        const { showHelpModalForNewUser } = await import('./helpModal.js');
                        showHelpModalForNewUser(1000); // Показываем через 1 секунду после запуска
                        window.shouldShowHelpForNewUser = false; // Сбрасываем флаг
                    }, 1000);
                }
                
                // Восстанавливаем состояние кнопки после задержки
                setTimeout(() => {
                    startAppButton.innerHTML = 'Запустить';
                    startAppButton.disabled = false;
                }, 2000);
            } catch (error) {
                console.error('Error starting app:', error);
                await forceHideAllLoading();
                
                // Скрываем загрузочный экран в случае ошибки
                await hideLoadingScreenSmooth();
                
                startAppButton.innerHTML = 'Запустить';
                startAppButton.disabled = false;
                
                // Сбрасываем флаг в случае ошибки
                showPlatformSelectModalInProgress = false;
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
        updatePlaygroundPreview('rubber');
    }
}

/**
 * Инициализирует переключение типа площадки
 */
function initializePlaygroundTypeSwitch() {
    const standardPlaygroundOption = document.getElementById('standardPlayground');
    const customPlaygroundOption = document.getElementById('customPlayground');
    const standardPlaygroundConfig = document.getElementById('standardSettings');
    const customPlaygroundEditor = document.getElementById('customSettings');
    
    if (!standardPlaygroundOption || !customPlaygroundOption) {
        console.log('Playground type options not found, skipping initialization');
        console.log('Standard option:', standardPlaygroundOption);
        console.log('Custom option:', customPlaygroundOption);
        return;
    }
    
    console.log('Playground type switch initialized successfully');
    console.log('Standard config:', standardPlaygroundConfig);
    console.log('Custom editor:', customPlaygroundEditor);
    
    // Обработчик для стандартной площадки
    standardPlaygroundOption.addEventListener('click', () => {
        // Визуальное обновление выбора
        standardPlaygroundOption.classList.add('selected', 'active');
        customPlaygroundOption.classList.remove('selected', 'active');
        
        // Показать/скрыть соответствующие секции
        if (standardPlaygroundConfig) standardPlaygroundConfig.style.display = 'block';
        if (customPlaygroundEditor) customPlaygroundEditor.style.display = 'none';
        
        // Очистить любой активный Fabric.js canvas
        if (window.customPlaygroundCanvas) {
            window.customPlaygroundCanvas.dispose();
            window.customPlaygroundCanvas = null;
        }
        
        console.log('Выбрана стандартная площадка');
    });
    
    // Обработчик для кастомной площадки
    customPlaygroundOption.addEventListener('click', () => {
        // Открываем полный редактор в новом окне
        openFullPlaygroundEditor();
    });
    
    // Установить стандартную площадку по умолчанию
    standardPlaygroundOption.click();
}

/**
 * Открывает полный редактор площадок в новом окне
 */
window.openFullPlaygroundEditor = function openFullPlaygroundEditor() {
    // Параметры нового окна
    const windowFeatures = [
        'width=1200',
        'height=800', 
        'scrollbars=yes',
        'resizable=yes',
        'toolbar=no',
        'menubar=no',
        'location=no',
        'status=no'
    ].join(',');
    
    // Открываем новое окно с полным редактором
    const editorWindow = window.open('playground-fabric-editor.html', 'playgroundEditor', windowFeatures);
    
    if (!editorWindow) {
        alert('Не удалось открыть редактор. Пожалуйста, разрешите всплывающие окна для этого сайта.');
        return;
    }
    
    // Центрируем окно на экране
    editorWindow.onload = () => {
        const screenWidth = screen.width;
        const screenHeight = screen.height;
        const windowWidth = 1200;
        const windowHeight = 800;
        
        const left = (screenWidth - windowWidth) / 2;
        const top = (screenHeight - windowHeight) / 2;
        
        editorWindow.moveTo(left, top);
        editorWindow.focus();
    };
    
    // Слушаем сообщения от редактора
    window.addEventListener('message', handleEditorMessage);
    
    console.log('Opened full playground editor in new window');
}

/**
 * Обрабатывает сообщения от редактора площадок
 */
function handleEditorMessage(event) {
    console.log('Received message from editor:', event);
    console.log('Event origin:', event.origin);
    console.log('Window origin:', window.location.origin);
    console.log('Event data:', event.data);
    
    // Проверяем источник сообщения для безопасности
    if (event.origin !== window.location.origin) {
        console.warn('Message from different origin ignored');
        return;
    }
    
    const { type, data } = event.data;
    console.log('Message type:', type);
    console.log('Message data:', data);
    
    switch (type) {
        case 'PLAYGROUND_CREATED':
            console.log('=== ОБРАБОТКА PLAYGROUND_CREATED ===');
            console.log('Получены данные площадки:', data);
            console.log('Количество объектов в данных:', data?.objects?.length || 0);
            
            // Получаем данные созданной площадки
            window.customPlaygroundShape = data;
            console.log('=== ДАННЫЕ СОХРАНЕНЫ В window.customPlaygroundShape ===');
            console.log('window.customPlaygroundShape:', window.customPlaygroundShape);
            console.log('objects в window.customPlaygroundShape:', window.customPlaygroundShape?.objects);
            
            // Remove message listener to prevent duplicate handling
            window.removeEventListener('message', handleEditorMessage);
            
            // Визуально выбираем кастомную площадку
            const customPlaygroundOption = document.getElementById('customPlayground');
            const standardPlaygroundOption = document.getElementById('standardPlayground');
            
            if (customPlaygroundOption && standardPlaygroundOption) {
                customPlaygroundOption.classList.add('selected', 'active');
                standardPlaygroundOption.classList.remove('selected', 'active');
            }
            
            // Автоматически запускаем приложение с кастомной площадкой
            console.log('=== ЗАПУСК ПРИЛОЖЕНИЯ С КАСТОМНОЙ ПЛОЩАДКОЙ ===');
            console.log('window.customPlaygroundShape в handleEditorMessage:', window.customPlaygroundShape);
            console.log('Объекты в данных:', window.customPlaygroundShape?.objects);
            startAppWithCustomPlayground();
            break;
            
        case 'EDITOR_CLOSED':
            // Редактор закрыт без создания площадки
            console.log('Editor closed without creating playground');
            // Remove message listener when editor is closed
            window.removeEventListener('message', handleEditorMessage);
            break;
            
        case 'TEST_MESSAGE':
            console.log('Received test message:', data);
            alert('Тестовое сообщение получено: ' + data.message);
            break;
            
        default:
            console.log('Unknown message type:', type);
    }
}

/**
 * Показывает подтверждение созданной кастомной площадки
 */
function showCustomPlaygroundConfirmation(playgroundData) {
    // Заменяем стандартные настройки на информацию о кастомной площадке
    const standardSettings = document.getElementById('standardSettings');
    const customSettings = document.getElementById('customSettings');
    
    if (standardSettings) standardSettings.style.display = 'none';
    if (customSettings) {
        customSettings.style.display = 'block';
        customSettings.innerHTML = `
            <div class="custom-playground-confirmation">
                <div class="confirmation-header">
                    <span class="confirmation-icon">✅</span>
                    <h4>Нестандартная площадка готова</h4>
                </div>
                <div class="confirmation-details">
                    <p><strong>Объектов создано:</strong> ${playgroundData.objects?.length || 0}</p>
                    <p><strong>Размер canvas:</strong> ${playgroundData.canvasWidth}×${playgroundData.canvasHeight} пикселей</p>
                    <p><strong>Статус:</strong> <span style="color: #4CAF50;">Готово к использованию</span></p>
                </div>
                <div class="confirmation-actions">
                    <button class="canvas-action-btn" onclick="window.openFullPlaygroundEditor()">
                        🔧 Редактировать снова
                    </button>
                    <button class="canvas-action-btn" onclick="window.clearCustomPlayground()">
                        🗑️ Удалить и создать новую
                    </button>
                </div>
            </div>
        `;
    }
}

/**
 * Очищает кастомную площадку и возвращается к стандартной
 */
window.clearCustomPlayground = function clearCustomPlayground() {
    window.customPlaygroundShape = null;
    
    // Возвращаемся к стандартной площадке
    const customPlaygroundOption = document.getElementById('customPlayground');
    const standardPlaygroundOption = document.getElementById('standardPlayground');
    
    if (customPlaygroundOption && standardPlaygroundOption) {
        customPlaygroundOption.classList.remove('selected', 'active');
        standardPlaygroundOption.classList.add('selected', 'active');
        
        const standardSettings = document.getElementById('standardSettings');
        const customSettings = document.getElementById('customSettings');
        
        if (standardSettings) standardSettings.style.display = 'block';
        if (customSettings) customSettings.style.display = 'none';
    }
    
    console.log('Custom playground cleared');
}

/**
 * Запускает приложение с кастомной площадкой
 */
async function startAppWithCustomPlayground() {
    try {
        console.log('Starting app with custom playground...');
        
        // Получаем необходимые элементы
        const platformSelectModal = document.getElementById('platformSelectModal');
        const appModal = document.getElementById('appModal');
        
        // Показываем загрузочный экран
        await showLoadingScreen();
        
        // Инициализируем стандартную загрузку новой сессии
        const loadingManager = await standardNewSessionInit();
        
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
            
            // Обновляем прогресс - сохранение параметров кастомной площадки
            await loadingManager.updateProgress(50, 'Сохранение кастомной площадки...');
            
            // Сохраняем параметры кастомной площадки
            if (newSessionData && window.customPlaygroundShape) {
                const playgroundModule = await import('./playground.js');
                
                // Сохраняем параметры кастомной площадки
                await playgroundModule.savePlaygroundParameters(
                    'custom',  // тип площадки
                    60,        // примерная ширина
                    40,        // примерная длина
                    'зеленый'  // цвет
                );
            }
        }
        
        // Устанавливаем глобальные переменные для кастомной площадки
        window.selectedPlaygroundType = 'custom';
        window.selectedPlaygroundWidth = 60;
        window.selectedPlaygroundLength = 40;
        window.selectedPlaygroundColor = 'зеленый';
        
        // Обновляем прогресс - подготовка к запуску
        await loadingManager.updateProgress(60, 'Подготовка к запуску приложения...');
        
        // Скрываем модальное окно выбора площадки
        if (platformSelectModal) {
            platformSelectModal.style.display = 'none';
        }
        
        // Показываем приложение
        if (appModal) {
            appModal.style.display = 'block';
        }
        
        // Убеждаемся, что canvas правильно отображается
        ensureAppVisibility();
        
        // Обновляем прогресс - запуск приложения
        await loadingManager.updateProgress(70, 'Запуск приложения...');
        
        // Запускаем приложение
        console.log('🔍 Отладка запуска приложения с кастомной площадкой:');
        console.log('window.initApp:', typeof window.initApp);
        console.log('window.appInitialized:', window.appInitialized);
        
        if (window.initApp && !window.appInitialized) {
            console.log('✅ Запускаем window.initApp() - инициализация Three.js и сцены');
            window.appInitialized = true;
            
            // Обновляем прогресс - инициализация Three.js
            await loadingManager.updateProgress(80, 'Инициализация Three.js...');
            
            window.initApp();
            
            // После инициализации приложения загружаем кастомную площадку
            setTimeout(async () => {
                try {
                    console.log('Loading custom playground...');
                    const playgroundModule = await import('./playground.js');
                    await standardPlaygroundLoading(
                        playgroundModule.loadPlayground,
                        'custom',  // тип площадки
                        60,        // ширина
                        40,        // длина  
                        'зеленый'  // цвет
                    );
                    console.log('Custom playground loaded successfully');
                } catch (error) {
                    console.error('Error loading custom playground:', error);
                    
                    // Принудительно скрываем loading screen в случае ошибки
                    const { hideLoadingOverlay } = await import('./loadingManager.js');
                    hideLoadingOverlay();
                }
            }, 1000);
            
            setTimeout(() => {
                startSceneChecks();
            }, 3000);
            
            // Завершаем загрузку через стандартный механизм
            setTimeout(async () => {
                await loadingManager.finish();
            }, 2000);
        } else {
            // Если приложение уже инициализировано, просто загружаем кастомную площадку
            console.log('App already initialized, loading custom playground directly');
            try {
                const playgroundModule = await import('./playground.js');
                await standardPlaygroundLoading(
                    playgroundModule.loadPlayground,
                    'custom',  // тип площадки
                    60,        // ширина
                    40,        // длина
                    'зеленый'  // цвет
                );
                console.log('Custom playground loaded successfully');
            } catch (error) {
                console.error('Error loading custom playground:', error);
                await forceHideAllLoading();
            }
            await loadingManager.finish();
        }
        
        console.log('✅ Custom playground app started successfully');
        
    } catch (error) {
        console.error('Error starting app with custom playground:', error);
        await forceHideAllLoading();
        
        // Скрываем загрузочный экран в случае ошибки
        await hideLoadingScreenSmooth();
        
        // Показываем ошибку пользователю
        alert('Ошибка при запуске приложения с кастомной площадкой: ' + error.message);
    }
}

/**
 * Инициализирует Fabric.js canvas для кастомной площадки
 */
function initializeCustomPlaygroundCanvas() {
    const canvasElement = document.getElementById('customPlaygroundCanvas');
    if (!canvasElement) {
        console.error('Custom playground canvas element not found');
        return;
    }
    
    // Освобождаем предыдущий canvas если есть
    if (window.customPlaygroundCanvas) {
        window.customPlaygroundCanvas.dispose();
    }
    
    // Создаем новый canvas
    window.customPlaygroundCanvas = new fabric.Canvas('customPlaygroundCanvas', {
        width: 600,
        height: 400,
        backgroundColor: '#f8f9fa',
        selection: true
    });
    
    // Добавляем сетку
    addGridToCustomCanvas();
    
    // Инициализируем инструменты рисования
    initializeCustomDrawingTools();
    
    console.log('Custom playground canvas initialized');
}

/**
 * Добавляет сетку на кастомный canvas
 */
function addGridToCustomCanvas() {
    if (!window.customPlaygroundCanvas) return;
    
    const canvas = window.customPlaygroundCanvas;
    const gridSize = 25;
    const width = canvas.width;
    const height = canvas.height;
    
    // Очищаем предыдущую сетку
    const gridObjects = canvas.getObjects().filter(obj => obj.isGrid);
    gridObjects.forEach(obj => canvas.remove(obj));
    
    // Вертикальные линии
    for (let i = 0; i <= width; i += gridSize) {
        const line = new fabric.Line([i, 0, i, height], {
            stroke: '#e0e0e0',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            opacity: 0.6,
            isGrid: true
        });
        canvas.add(line);
    }
    
    // Горизонтальные линии
    for (let i = 0; i <= height; i += gridSize) {
        const line = new fabric.Line([0, i, width, i], {
            stroke: '#e0e0e0',
            strokeWidth: 1,
            selectable: false,
            evented: false,
            opacity: 0.6,
            isGrid: true
        });
        canvas.add(line);
    }
    
    canvas.renderAll();
}

/**
 * Инициализирует инструменты рисования для кастомной площадки
 */
function initializeCustomDrawingTools() {
    // Получаем кнопки инструментов
    const polygonBtn = document.getElementById('polygonTool');
    const freehandBtn = document.getElementById('freehandTool');
    const clearBtn = document.getElementById('clearCanvas');
    const unionBtn = document.getElementById('unionShapes');
    
    // Состояние рисования
    let currentTool = 'select';
    let polygonPoints = [];
    let isDrawingPolygon = false;
    
    // Обработчик для инструмента многоугольника
    if (polygonBtn) {
        polygonBtn.addEventListener('click', () => {
            setDrawingTool('polygon');
            updateToolButtons('polygon');
        });
    }
    
    // Обработчик для инструмента свободного рисования
    if (freehandBtn) {
        freehandBtn.addEventListener('click', () => {
            setDrawingTool('freehand');
            updateToolButtons('freehand');
        });
    }
    
    // Обработчик для очистки canvas
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            clearCustomCanvas();
        });
    }
    
    // Обработчик для объединения фигур
    if (unionBtn) {
        unionBtn.addEventListener('click', () => {
            unionSelectedShapes();
        });
    }
    
    function setDrawingTool(tool) {
        currentTool = tool;
        const canvas = window.customPlaygroundCanvas;
        if (!canvas) return;
        
        // Сбрасываем режимы
        canvas.isDrawingMode = false;
        canvas.selection = true;
        
        if (tool === 'freehand') {
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush.width = 3;
            canvas.freeDrawingBrush.color = '#2E7D32';
        } else if (tool === 'polygon') {
            polygonPoints = [];
            isDrawingPolygon = true;
            canvas.selection = false;
            
            // Обработчик кликов для многоугольника
            canvas.on('mouse:down', handlePolygonClick);
        } else {
            // Режим выделения
            canvas.off('mouse:down', handlePolygonClick);
            isDrawingPolygon = false;
        }
    }
    
    function handlePolygonClick(event) {
        if (!isDrawingPolygon || currentTool !== 'polygon') return;
        
        const pointer = window.customPlaygroundCanvas.getPointer(event.e);
        polygonPoints.push({x: pointer.x, y: pointer.y});
        
        // Добавляем точку на canvas
        const point = new fabric.Circle({
            left: pointer.x - 3,
            top: pointer.y - 3,
            radius: 3,
            fill: '#F05323',
            selectable: false,
            evented: false,
            isPolygonPoint: true
        });
        window.customPlaygroundCanvas.add(point);
        
        // Если есть минимум 3 точки, можно завершить многоугольник на Enter
        if (polygonPoints.length >= 3) {
            document.addEventListener('keydown', handlePolygonComplete);
        }
    }
    
    function handlePolygonComplete(event) {
        if (event.key === 'Enter' && polygonPoints.length >= 3) {
            createPolygonFromPoints();
            document.removeEventListener('keydown', handlePolygonComplete);
        }
    }
    
    function createPolygonFromPoints() {
        if (polygonPoints.length < 3) return;
        
        const canvas = window.customPlaygroundCanvas;
        
        // Удаляем точки
        const points = canvas.getObjects().filter(obj => obj.isPolygonPoint);
        points.forEach(point => canvas.remove(point));
        
        // Создаем многоугольник
        const polygon = new fabric.Polygon(polygonPoints, {
            fill: '#2E7D32',
            stroke: '#1B5E20',
            strokeWidth: 2,
            opacity: 0.8,
            objectType: 'playground'
        });
        
        canvas.add(polygon);
        canvas.renderAll();
        
        // Сбрасываем состояние
        polygonPoints = [];
        isDrawingPolygon = false;
        setDrawingTool('select');
        updateToolButtons('select');
    }
    
    function updateToolButtons(activeTool) {
        const buttons = [polygonBtn, freehandBtn];
        buttons.forEach(btn => {
            if (btn) {
                btn.classList.remove('active');
                if (btn.id === activeTool + 'Tool') {
                    btn.classList.add('active');
                }
            }
        });
    }
    
    function clearCustomCanvas() {
        const canvas = window.customPlaygroundCanvas;
        if (!canvas) return;
        
        // Удаляем все объекты кроме сетки
        const objects = canvas.getObjects().filter(obj => !obj.isGrid);
        objects.forEach(obj => canvas.remove(obj));
        canvas.renderAll();
        
        // Сбрасываем состояние
        polygonPoints = [];
        isDrawingPolygon = false;
        setDrawingTool('select');
        updateToolButtons('select');
    }
    
    function unionSelectedShapes() {
        const canvas = window.customPlaygroundCanvas;
        const activeObjects = canvas.getActiveObjects();
        
        if (activeObjects.length < 2) {
            showCustomConfirmDialog(
                'Недостаточно фигур',
                'Выберите минимум 2 фигуры для объединения',
                null
            );
            return;
        }
        
        // Показываем диалог подтверждения
        showCustomConfirmDialog(
            'Объединить фигуры?',
            `Вы уверены, что хотите объединить ${activeObjects.length} выбранных фигур? Это действие нельзя отменить.`,
            () => {
                // Создаем объединенную группу
                const group = new fabric.Group(activeObjects, {
                    objectType: 'playground',
                    fill: '#2E7D32',
                    stroke: '#1B5E20',
                    strokeWidth: 2,
                    opacity: 0.8
                });
                
                // Удаляем исходные объекты
                activeObjects.forEach(obj => canvas.remove(obj));
                
                // Добавляем группу
                canvas.add(group);
                canvas.renderAll();
                
                console.log(`${activeObjects.length} shapes united successfully`);
                
                // Показываем уведомление об успехе
                showCustomConfirmDialog(
                    'Объединение завершено',
                    'Фигуры успешно объединены в одну группу',
                    null
                );
            }
        );
    }
    
    function showCustomConfirmDialog(title, message, onConfirm) {
        // Создаем диалог подтверждения
        const dialog = document.createElement('div');
        dialog.className = 'custom-confirm-dialog';
        dialog.innerHTML = `
            <div class="custom-confirm-content">
                <h4>${title}</h4>
                <p>${message}</p>
                <div class="custom-confirm-buttons">
                    ${onConfirm ? '<button class="confirm-btn">Да</button>' : ''}
                    <button class="cancel-btn">${onConfirm ? 'Отмена' : 'OK'}</button>
                </div>
            </div>
        `;
        
        // Добавляем стили для диалога
        if (!document.getElementById('customConfirmStyles')) {
            const styles = document.createElement('style');
            styles.id = 'customConfirmStyles';
            styles.textContent = `
                .custom-confirm-dialog {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                
                .custom-confirm-content {
                    background: white;
                    padding: 24px;
                    border-radius: 12px;
                    max-width: 400px;
                    width: 90%;
                    text-align: center;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                }
                
                .custom-confirm-content h4 {
                    margin: 0 0 16px 0;
                    color: #333;
                    font-size: 18px;
                    font-weight: 600;
                }
                
                .custom-confirm-content p {
                    margin: 0 0 24px 0;
                    color: #666;
                    line-height: 1.5;
                }
                
                .custom-confirm-buttons {
                    display: flex;
                    gap: 12px;
                    justify-content: center;
                }
                
                .custom-confirm-buttons button {
                    padding: 8px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .confirm-btn {
                    background: #F05323;
                    color: white;
                }
                
                .confirm-btn:hover {
                    background: #e04519;
                }
                
                .cancel-btn {
                    background: #f5f5f5;
                    color: #333;
                }
                
                .cancel-btn:hover {
                    background: #e0e0e0;
                }
            `;
            document.head.appendChild(styles);
        }
        
        document.body.appendChild(dialog);
        
        // Обработчики кнопок
        const confirmBtn = dialog.querySelector('.confirm-btn');
        const cancelBtn = dialog.querySelector('.cancel-btn');
        
        if (confirmBtn && onConfirm) {
            confirmBtn.addEventListener('click', () => {
                document.body.removeChild(dialog);
                onConfirm();
            });
        }
        
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
        
        // Закрытие по клику вне диалога
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });
    }
    
    // Инициализируем инструмент выделения по умолчанию
    setDrawingTool('select');
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

// Экспорт перенесен в централизованный модуль utils/loadingScreen.js