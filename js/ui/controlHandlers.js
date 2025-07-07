/**
 * Модуль для управления элементами интерфейса
 */
import { 
    resetCameraView, 
    takeScreenshot, 
    toggleTopView 
} from '../scene.js';
import {
    playgroundWidth, 
    playgroundLength 
} from '../playground.js';
import { API_BASE_URL } from '../api/serverConfig.js';
// import { updateModelPlacementCounter } from '../sidebar.js'; // Убрано - используем refreshAllModelCounters для массового обновления
import { showNotification } from '../utils/notifications.js';
import { hideAllDimensions, placedObjects, showModelDimensions, removeObjectsBatch } from '../objects.js';
import { removeAllSafetyZones, toggleSafetyZones, showAllSafetyZones, syncSafetyZonesState } from '../core/safetyManager.js';

// Описания для инструментов
const TOOL_DESCRIPTIONS = {
    'resetView': 'Сбросить вид',
    'toggleDimensions': 'Показать размеры',
    'toggleSafetyZone': 'Показать зоны безопасности',
    'saveScreenshot': 'Сохранить скриншот',
    'deleteAllModels': 'Удалить все объекты',
    'helpButton': 'Справка',
    'checkMissingModelsButton': 'Проверить отсутствующие модели',
    'closeAppButton': 'Закрыть приложение',
    'exportModel': 'Вид сверху',
    'playgroundButton': 'Настройки площадки'
};

// Флаг для защиты от повторной инициализации
let controlHandlersInitialized = false;

/**
 * Инициализирует обработчики для элементов управления в интерфейсе
 */
export function initControlHandlers() {
    if (controlHandlersInitialized) {
        console.log('Control handlers already initialized, skipping...');
        return;
    }
    
    console.log('Initializing control handlers...');
    controlHandlersInitialized = true;
    setupControlHandlers();
}

/**
 * Настраивает обработчики для элементов управления
 */
function setupControlHandlers() {    
    // Создаем контейнер для подсказок
    createTooltipContainer();
    
    // Устанавливаем обработчики для различных элементов управления
    setupScreenshotButton();
    setupPlaygroundSizeInputs();
    setupChangePlaygroundButton();
    setupResetViewButton();
    setupPlaygroundButton();
    setupDeleteAllButton();
    setupHelpButton();
    
    // Обработчики для элементов панели инструментов
    setupSettingsButton();
    setupExportModelButton();
    setupToggleDimensionsButton();
    setupToggleSafetyZoneButton();
    setupCloseAppButton();
    setupCheckMissingModelsButton();
    setupToolButtonsEffects();
    setupToolButtonsContainerState();
}

/**
 * Создает контейнер для подсказок инструментов
 */
function createTooltipContainer() {
    // Проверяем, не создан ли уже контейнер
    if (document.getElementById('tool-tooltip-container')) {
        return;
    }
    
    const tooltipContainer = document.createElement('div');
    tooltipContainer.id = 'tool-tooltip-container';
    tooltipContainer.className = 'tool-tooltip-container';
    // Скрываем подсказку при инициализации
    tooltipContainer.style.display = 'none';
    
    // Добавляем базовые стили
    tooltipContainer.style.position = 'fixed';
    tooltipContainer.style.backgroundColor = 'white';
    tooltipContainer.style.color = 'black';
    tooltipContainer.style.padding = '8px 12px';
    tooltipContainer.style.borderRadius = '12px';
    tooltipContainer.style.fontSize = '14px';
    tooltipContainer.style.fontFamily = 'Arial, sans-serif';
    tooltipContainer.style.whiteSpace = 'nowrap';
    tooltipContainer.style.zIndex = '10000';
    tooltipContainer.style.pointerEvents = 'none';
    tooltipContainer.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    
    document.body.appendChild(tooltipContainer);
}

/**
 * Показывает подсказку для инструмента
 */
function showToolTooltip(event, toolId) {
    const tooltipContainer = document.getElementById('tool-tooltip-container');
    if (!tooltipContainer) return;
    
    // Получаем описание инструмента
    const description = TOOL_DESCRIPTIONS[toolId] || 'Инструмент';
    
    // Устанавливаем содержимое
    tooltipContainer.innerHTML = description;
    
    // Позиционируем блок относительно кнопки
    const buttonRect = event.target.closest('button').getBoundingClientRect();
    
    // Показываем блок для измерения его реальных размеров
    tooltipContainer.style.display = 'flex';
    tooltipContainer.style.visibility = 'hidden'; // Скрываем визуально, но можем измерить
    
    // Задержка для вычисления размеров
    setTimeout(() => {
        // Получаем реальные размеры подсказки после рендеринга
        const tooltipRect = tooltipContainer.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;
        const gap = 10; // Отступ между подсказкой и кнопкой
        
        // Позиция по горизонтали: слева от кнопки с отступом
        let leftPos = buttonRect.left - tooltipWidth - gap;
        
        // Проверяем, не выходит ли подсказка за левый край экрана
        if (leftPos < 10) {
            // Если выходит, показываем справа от кнопки
            leftPos = buttonRect.right + gap;
        }
        
        tooltipContainer.style.left = leftPos + 'px';
        
        // Позиция по вертикали: центрируем по вертикали относительно кнопки
        let topPos = buttonRect.top + (buttonRect.height - tooltipHeight) / 2;
        
        // Проверяем границы экрана по вертикали
        if (topPos < 10) {
            topPos = 10;
        } else if (topPos + tooltipHeight > window.innerHeight - 10) {
            topPos = window.innerHeight - tooltipHeight - 10;
        }
        
        tooltipContainer.style.top = topPos + 'px';
        
        // Теперь показываем
        tooltipContainer.style.visibility = 'visible';
    }, 0);
}

/**
 * Скрывает подсказку инструмента
 */
function hideToolTooltip() {
    const tooltipContainer = document.getElementById('tool-tooltip-container');
    if (tooltipContainer) {
        tooltipContainer.style.display = 'none';
    }
}

/**
 * Настраивает эффекты нажатия для всех кнопок инструментов
 */
function setupToolButtonsEffects() {
    const allButtons = document.querySelectorAll('.tool-button-new');
    allButtons.forEach(button => {
        // Добавляем эффект нажатия
        button.addEventListener('mousedown', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('mouseup', function() {
            this.style.transform = 'scale(1)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
            // Также скрываем подсказку при уходе курсора
            hideToolTooltip();
        });
        
        // Добавляем обработчики для подсказок
        // Пропускаем кнопку настроек
        if (button.id !== 'settingsButton') {
            button.addEventListener('mouseenter', function(event) {
                showToolTooltip(event, this.id);
            });
            
            button.addEventListener('mouseleave', function() {
                hideToolTooltip();
            });
        }
    });
}

/**
 * Восстанавливает состояние контейнера с кнопками инструментов
 */
function setupToolButtonsContainerState() {
    const toolButtonsContainer = document.querySelector('.tool-buttons-container');
    if (toolButtonsContainer) {
        // Восстановление состояния из localStorage
        const isHidden = localStorage.getItem('toolButtonsContainerHidden') === 'true';        
        if (isHidden) {
            // Применяем напрямую стиль вместо класса для надежности
            toolButtonsContainer.style.display = 'none';
            console.log('Скрыли панель инструментов при загрузке');
        } else {
            toolButtonsContainer.style.display = '';
            console.log('Отобразили панель инструментов при загрузке');
        }
    } else {
        console.error('Контейнер кнопок не найден при загрузке!');
    }
}

/**
 * Настраивает кнопку настроек (показать/скрыть панель инструментов)
 */
function setupSettingsButton() {
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {        
        settingsButton.addEventListener('click', function() {
            // Найти контейнер с кнопками
            const toolButtonsContainer = document.querySelector('.tool-buttons-container');            
            // Проверяем текущее состояние видимости через вычисляемые стили
            if (toolButtonsContainer) {
                const computedStyle = window.getComputedStyle(toolButtonsContainer);
                const isCurrentlyVisible = computedStyle.display !== 'none';
                console.log('Текущее состояние видимости (вычисляемые стили):', 
                            {display: computedStyle.display, isVisible: isCurrentlyVisible});
                
                // Переключаем видимость
                if (isCurrentlyVisible) {
                    // Если видим - скрываем
                    toolButtonsContainer.classList.add('hidden');
                    
                    // Затем дополнительно через прямой стиль для надежности
                    if (window.getComputedStyle(toolButtonsContainer).display !== 'none') {
                        toolButtonsContainer.style.display = 'none';
                    }
                    
                    localStorage.setItem('toolButtonsContainerHidden', 'true');
                } else {
                    // Если скрыт - показываем
                    toolButtonsContainer.classList.remove('hidden');
                    toolButtonsContainer.style.display = '';
                    localStorage.setItem('toolButtonsContainerHidden', 'false');
                }
                
                // Проверяем, сработало ли переключение
                setTimeout(() => {
                    const newComputedStyle = window.getComputedStyle(toolButtonsContainer);
                    console.log('Состояние после переключения:', 
                              {display: newComputedStyle.display, 
                               visible: newComputedStyle.display !== 'none'});
                }, 50);
                
                // Добавляем эффект нажатия для визуальной обратной связи
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 200);
            } else {
                console.error('Контейнер с кнопками не найден!');
            }
        });
    } else {
        console.error('Кнопка настроек не найдена!');
    }
}

/**
 * Настраивает кнопку экспорта (вид сверху)
 */
function setupExportModelButton() {
    const exportModelButton = document.getElementById('exportModel');
    if (exportModelButton) {
        // Проверяем, не был ли уже добавлен обработчик
        if (exportModelButton.hasAttribute('data-handler-added')) {
            console.log('Обработчик для кнопки экспорта уже добавлен, пропускаем');
            return;
        }
        
        // Отмечаем, что обработчик добавлен
        exportModelButton.setAttribute('data-handler-added', 'true');
        
        exportModelButton.addEventListener('click', function() {
            console.log('=== Нажата кнопка экспорта (вид сверху) ===');
            try {
                // Получаем текущие размеры площадки
                let width = 40;
                let length = 30;
                
                if (window.app && window.app.playgroundWidth && window.app.playgroundLength) {
                    width = window.app.playgroundWidth;
                    length = window.app.playgroundLength;
                } else {
                    // Используем импортированные переменные
                    width = playgroundWidth;
                    length = playgroundLength;
                }
                
                console.log('Размеры площадки:', width, 'x', length);
                
                // Вызываем функцию toggleTopView
                const isActive = toggleTopView(width, length);
                                
                // Визуальная обратная связь на кнопке
                if (isActive) {
                    this.classList.add('active');
                } else {
                    this.classList.remove('active');
                }
            } catch (error) {
                console.error('Ошибка при включении режима вид сверху:', error);
                showNotification('Произошла ошибка при включении режима "Вид сверху"');
            }
        });
    }
}

/**
 * Настраивает кнопку переключения размеров
 */
function setupToggleDimensionsButton() {
    const toggleDimensionsButton = document.getElementById('toggleDimensions');
    if (toggleDimensionsButton) {
        // Восстанавливаем состояние из localStorage
        const isHidden = localStorage.getItem('dimensionLabelsHidden') === 'true';
        
        // Устанавливаем начальное состояние
        const dimensionLabels = document.getElementById('dimensionLabels');
        if (dimensionLabels) {
            if (isHidden) {
                dimensionLabels.style.display = 'none';
                hideAllDimensions();
                toggleDimensionsButton.classList.remove('active');
            } else {
                dimensionLabels.style.display = '';
                // Показываем размеры для всех объектов
                if (Array.isArray(placedObjects)) {
                    placedObjects.forEach(obj => showModelDimensions(obj));
                }
                toggleDimensionsButton.classList.add('active');
            }
        }
        
        toggleDimensionsButton.addEventListener('click', function() {
            const dimensionLabels = document.getElementById('dimensionLabels');
            if (!dimensionLabels) return;
            
            const isCurrentlyHidden = dimensionLabels.style.display === 'none';
            
            if (isCurrentlyHidden) {
                // Показываем размеры
                dimensionLabels.style.display = '';
                if (Array.isArray(placedObjects)) {
                    placedObjects.forEach(obj => showModelDimensions(obj));
                }
                this.classList.add('active');
                localStorage.setItem('dimensionLabelsHidden', 'false');
            } else {
                // Скрываем размеры
                dimensionLabels.style.display = 'none';
                hideAllDimensions();
                this.classList.remove('active');
                localStorage.setItem('dimensionLabelsHidden', 'true');
            }
        });
    }
}

/**
 * Настраивает кнопку переключения безопасной зоны
 */
function setupToggleSafetyZoneButton() {
    const toggleSafetyZoneButton = document.getElementById('toggleSafetyZone');
    if (toggleSafetyZoneButton) {
        // Синхронизируем внутреннее состояние с localStorage
        syncSafetyZonesState();
        
        // Восстанавливаем состояние из localStorage
        const isHidden = localStorage.getItem('safetyZoneHidden') === 'true';
        
        // Устанавливаем начальное состояние
        if (isHidden) {
            removeAllSafetyZones();
            toggleSafetyZoneButton.classList.remove('active');
        } else {
            showAllSafetyZones();
            toggleSafetyZoneButton.classList.add('active');
        }
        
        toggleSafetyZoneButton.addEventListener('click', function() {
            const isVisible = toggleSafetyZones();
            
            if (isVisible) {
                // Зоны безопасности показаны
                this.classList.add('active');
                localStorage.setItem('safetyZoneHidden', 'false');
            } else {
                // Зоны безопасности скрыты
                this.classList.remove('active');
                localStorage.setItem('safetyZoneHidden', 'true');
            }
        });
    }
}

/**
 * Настраивает кнопку закрытия приложения
 */
function setupCloseAppButton() {
    const closeAppButton = document.getElementById('closeAppButton');
    if (closeAppButton) {
        closeAppButton.addEventListener('click', async function() {
            if (confirm('Вы действительно хотите закрыть приложение?')) {
                // Закрываем модальное окно приложения
                const appModal = document.getElementById('appModal');
                if (appModal) {
                    appModal.style.display = 'none';
                }
                
                // Если нет токена, показываем ошибку токена
                const { showTokenError } = await import('../tokenHandler.js');
                showTokenError();
            }
        });
    }
}

/**
 * Настраивает кнопку удаления всех моделей
 */
function setupDeleteAllButton() {
    const deleteAllBtn = document.getElementById('deleteAllModels');
    if (deleteAllBtn) {
        deleteAllBtn.onclick = async function() {
            if (!confirm('Вы действительно хотите удалить все модели с площадки?')) {
                return;
            }
            
            try {
                // Получаем project_id из sessionStorage
                const userId = sessionStorage.getItem('userId');

                if (!userId) {
                    throw new Error('No user ID found');
                }

                // Получаем текущую сессию
                const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
                if (!sessionResponse.ok) {
                    throw new Error('Failed to get session');
                }

                const { session } = await sessionResponse.json();
                const sessionData = session || { quantities: {}, placedObjects: [] };

                // Создаем копию текущих количеств для обновления
                const updatedQuantities = { ...sessionData.quantities };

                // Увеличиваем количество для каждой удаляемой модели
                if (Array.isArray(sessionData.placedObjects)) {
                    sessionData.placedObjects.forEach(obj => {
                        const modelName = obj.modelName;
                        if (modelName) {
                            const currentQuantity = updatedQuantities[modelName] || 0;
                            updatedQuantities[modelName] = currentQuantity + 1;
                        }
                    });
                }

                // Очищаем placedObjects в текущей сессии
                sessionData.placedObjects = [];
                // Обновляем количества
                sessionData.quantities = updatedQuantities;

                // Сохраняем обновленную сессию перед удалением объектов
                const saveResponse = await fetch(`${API_BASE_URL}/session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId, sessionData }),
                });

                if (!saveResponse.ok) {
                    throw new Error('Failed to save session');
                }

                // Удаляем все объекты с площадки используя оптимизированную batch функцию
                // Копируем массив, чтобы не было проблем при изменении во время итерации
                const objectsToDelete = [...placedObjects];
                
                // Используем новую removeObjectsBatch функцию для лучшей производительности
                // Она автоматически обновляет БД и UI в одной операции
                await removeObjectsBatch(objectsToDelete);

                console.log('All models removed and session updated with new quantities:', updatedQuantities);
            } catch (error) {
                console.error('Error removing all models:', error);
                showNotification('Ошибка при удалении моделей');
            }
        };
    }
}

/**
 * Настраивает кнопку создания скриншота
 */
function setupScreenshotButton() {
    const screenshotButton = document.getElementById("saveScreenshot");
    if (screenshotButton) {
        screenshotButton.addEventListener("click", takeScreenshot);
    }
}

/**
 * Настраивает поля ввода размеров площадки
 */
function setupPlaygroundSizeInputs() {
    // Устанавливаем начальные значения в поля формы
    const widthInput = document.getElementById("playgroundWidth");
    const lengthInput = document.getElementById("playgroundLength");
    
    if (widthInput) widthInput.value = playgroundWidth.toFixed(2);
    if (lengthInput) lengthInput.value = playgroundLength.toFixed(2);
    
    // Обновляем статус с текущими размерами площадки
    updatePlaygroundStatusText();
    
    // Добавляем обработчики для предпросмотра размеров
    addSizePreviewHandlers();
}

/**
 * Обновляет текст статуса площадки
 */
function updatePlaygroundStatusText() {
    const statusElement = document.getElementById("playgroundStatus");
    if (statusElement) {
        statusElement.textContent = `Площадка: ${playgroundWidth.toFixed(2)}м × ${playgroundLength.toFixed(2)}м`;
    }
}

/**
 * Добавляет обработчики для предпросмотра размеров
 */
export function addSizePreviewHandlers() {
    const widthInput = document.getElementById('playgroundWidth');
    const lengthInput = document.getElementById('playgroundLength');
    const widthLabel = document.getElementById('widthLabel');
    const lengthLabel = document.getElementById('lengthLabel');

    if (widthInput && lengthInput && widthLabel && lengthLabel) {
        widthInput.addEventListener('input', () => {
            const value = parseFloat(widthInput.value) || 0;
            // Меняем местами значения для отображения
            widthLabel.textContent = `Ширина: ${value.toFixed(2)} м`;
            lengthLabel.textContent = `Длина: ${parseFloat(lengthInput.value || 0).toFixed(2)} м`;
        });

        lengthInput.addEventListener('input', () => {
            const value = parseFloat(lengthInput.value) || 0;
            // Меняем местами значения для отображения
            widthLabel.textContent = `Ширина: ${parseFloat(widthInput.value || 0).toFixed(2)} м`;
            lengthLabel.textContent = `Длина: ${value.toFixed(2)} м`;
        });
    }
}

/**
 * Настраивает кнопку "Сменить площадку"
 */
function setupChangePlaygroundButton() {
    const changePlaygroundButton = document.getElementById("changePlayground");
    if (changePlaygroundButton) {
        changePlaygroundButton.addEventListener("click", async () => {
            try {
                // Импортируем функцию показа модального окна из модуля modal.js
                import('../modal.js').then(async modalModule => {
                    if (typeof modalModule.showPlatformSelectModal === 'function') {
                        // Вызываем функцию показа модального окна
                        await modalModule.showPlatformSelectModal();
                    } else {
                        console.error("Функция showPlatformSelectModal не найдена в модуле");
                    }
                }).catch(error => {
                    console.error("Ошибка при импорте модуля modal.js:", error);
                });
            } catch (error) {
                console.error("Ошибка при открытии модального окна:", error);
            }
        });
    }
}

/**
 * Настраивает кнопку сброса вида
 */
function setupResetViewButton() {
    const resetViewButton = document.getElementById("resetView");
    if (resetViewButton) {
        resetViewButton.addEventListener("click", () => {
            resetCameraView(playgroundWidth, playgroundLength);
        });
    }
}

/**
 * Настраивает кнопку изменения параметров площадки
 */
function setupPlaygroundButton() {
    const playgroundButton = document.getElementById('playgroundButton');
    const playgroundSettings = document.getElementById('playgroundSettings');
    const colorPicker = document.getElementById('playgroundColorPicker');
    const colorSquares = colorPicker ? colorPicker.querySelectorAll('.color-square') : [];
    
    // Элементы управления размерами
    const widthSlider = document.getElementById('widthSlider');
    const lengthSlider = document.getElementById('lengthSlider');
    const widthInput = document.getElementById('widthInput');
    const lengthInput = document.getElementById('lengthInput');
    const applyButton = document.getElementById('applyPlaygroundSize');
    
    // Функция для валидации и форматирования ввода
    const validateAndFormatInput = (value) => {
        // Удаляем все нецифровые символы
        let num = value.replace(/\D/g, '');
        // Ограничиваем значение от 5 до 100
        num = Math.min(Math.max(parseInt(num) || 5, 5), 100);
        return num;
    };
    
    if (!playgroundButton || !playgroundSettings) return;
    
    // Скрываем панель настроек по умолчанию
    playgroundSettings.classList.add('hidden');
    // Добавляем также inline стиль для гарантии скрытия
    playgroundSettings.style.display = 'none';
        
    // Инициализация текущих значений размеров площадки
    window.selectedPlaygroundWidth = window.selectedPlaygroundWidth || 40;
    window.selectedPlaygroundLength = window.selectedPlaygroundLength || 30;
    
    // Установка начальных значений для полей ввода и ползунков
    if (widthSlider && widthInput) {
        widthSlider.value = window.selectedPlaygroundWidth;
        widthInput.value = window.selectedPlaygroundWidth;
    }
    
    if (lengthSlider && lengthInput) {
        lengthSlider.value = window.selectedPlaygroundLength;
        lengthInput.value = window.selectedPlaygroundLength;
    }
    
    // Отмечаем текущий выбранный цвет
    updateSelectedColorSquare();
    
    // Обработчик нажатия на кнопку площадки
    playgroundButton.onclick = function() {
        // Показываем/скрываем панель настроек площадки
        playgroundSettings.classList.toggle('hidden');
        
        // Переключаем стиль display
        if (playgroundSettings.classList.contains('hidden')) {
            playgroundSettings.style.display = 'none';
        } else {
            playgroundSettings.style.display = 'block';
        }
        
        // Обновляем значения полей ввода при открытии панели
        if (!playgroundSettings.classList.contains('hidden')) {
            if (widthInput) widthInput.value = widthSlider ? widthSlider.value : window.selectedPlaygroundWidth;
            if (lengthInput) lengthInput.value = lengthSlider ? lengthSlider.value : window.selectedPlaygroundLength;
        }
        
    };
    
    // Функция для применения новых размеров площадки
    const applyPlaygroundSize = async (newWidth, newLength) => {
        // Проверка на изменение размеров
        if (window.selectedPlaygroundWidth === newWidth && window.selectedPlaygroundLength === newLength) {
            return; // Размеры не изменились, ничего не делаем
        }
        
        // Сохраняем новые размеры
        window.selectedPlaygroundWidth = newWidth;
        window.selectedPlaygroundLength = newLength;
        
        // Получаем текущий цвет
        const currentColor = window.selectedPlaygroundColor || 'серый';
        
        try {
            // Импортируем модуль загрузки площадки
            const playgroundModule = await import('../playground.js');
            
            // Загружаем новую площадку с новыми размерами
            await playgroundModule.loadPlayground('basketball_court.glb', newWidth, newLength, currentColor);
            
            console.log(`Размеры площадки изменены: ширина=${newWidth}м, длина=${newLength}м`);

            // Обновляем сессию в базе данных
            try {
                // Получаем project_id из sessionStorage
                const userId = sessionStorage.getItem('userId');

                if (!userId) {
                    console.error('No user ID found');
                    return;
                }

                // Получаем текущую сессию
                const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
                if (!sessionResponse.ok) {
                    throw new Error('Failed to get session');
                }

                const { session } = await sessionResponse.json();
                const sessionData = session || { quantities: {}, placedObjects: [] };

                // Обновляем информацию о площадке в сессии
                sessionData.playground = {
                    width: newWidth,
                    length: newLength,
                    color: currentColor
                };

                // Сохраняем обновленную сессию
                const saveResponse = await fetch(`${API_BASE_URL}/session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId, sessionData }),
                });

                if (!saveResponse.ok) {
                    throw new Error('Failed to save session');
                }

                console.log('Session updated successfully with new playground size:', sessionData.playground);
            } catch (error) {
                console.error('Error updating session with playground size:', error);
            }
        } catch (error) {
            console.error('Ошибка при изменении размеров площадки:', error);
        }
    };
    
    // Функция для обновления значений и синхронизации полей
    function updateSizeValues(width, length) {
        // Валидируем значения
        const validWidth = Math.min(Math.max(parseInt(width) || 5, 5), 100);
        const validLength = Math.min(Math.max(parseInt(length) || 5, 5), 100);
        
        // Обновляем значения полей ввода
        if (widthInput) widthInput.value = validWidth;
        if (lengthInput) lengthInput.value = validLength;
        
        // Обновляем значения ползунков
        if (widthSlider) widthSlider.value = validWidth;
        if (lengthSlider) lengthSlider.value = validLength;
        
        // Возвращаем обновленные значения
        return { width: validWidth, length: validLength };
    }
    
    // Обработчики для полей ввода ширины
    if (widthInput) {
        // При изменении значения в поле ввода
        widthInput.addEventListener('input', function() {
            // Валидируем ввод в реальном времени
            const value = validateAndFormatInput(this.value);
            this.value = value;
            if (widthSlider) widthSlider.value = value;
        });
        
        // При потере фокуса или нажатии Enter применяем изменения
        widthInput.addEventListener('change', function() {
            const newWidth = validateAndFormatInput(this.value);
            const newLength = lengthInput ? validateAndFormatInput(lengthInput.value) : 10;
            const values = updateSizeValues(newWidth, newLength);
            applyPlaygroundSize(values.width, values.length);
        });
    }
    
    // Обработчики для полей ввода длины
    if (lengthInput) {
        // При изменении значения в поле ввода
        lengthInput.addEventListener('input', function() {
            // Валидируем ввод в реальном времени
            const value = validateAndFormatInput(this.value);
            this.value = value;
            if (lengthSlider) lengthSlider.value = value;
        });
        
        // При потере фокуса или нажатии Enter применяем изменения
        lengthInput.addEventListener('change', function() {
            const newWidth = widthInput ? validateAndFormatInput(widthInput.value) : 10;
            const newLength = validateAndFormatInput(this.value);
            const values = updateSizeValues(newWidth, newLength);
            applyPlaygroundSize(values.width, values.length);
        });
    }
    
    // Обработчики для ползунков
    if (widthSlider) {
        // Обновляем значение в поле ввода при перемещении ползунка
        widthSlider.addEventListener('input', function() {
            if (widthInput) widthInput.value = this.value;
        });
        
        // Применяем новый размер при отпускании ползунка
        widthSlider.addEventListener('change', function() {
            const newWidth = parseInt(this.value);
            const newLength = lengthSlider ? parseInt(lengthSlider.value) : 10;
            updateSizeValues(newWidth, newLength);
            applyPlaygroundSize(newWidth, newLength);
        });
    }
    
    if (lengthSlider) {
        // Обновляем значение в поле ввода при перемещении ползунка
        lengthSlider.addEventListener('input', function() {
            if (lengthInput) lengthInput.value = this.value;
        });
        
        // Применяем новый размер при отпускании ползунка
        lengthSlider.addEventListener('change', function() {
            const newWidth = widthSlider ? parseInt(widthSlider.value) : 10;
            const newLength = parseInt(this.value);
            updateSizeValues(newWidth, newLength);
            applyPlaygroundSize(newWidth, newLength);
        });
    }
    
    // Обработчики нажатия на цветные квадратики
    colorSquares.forEach(square => {
        square.addEventListener('click', async function() {
            // Получаем выбранный цвет
            const selectedColor = this.getAttribute('data-color');
            
            // Снимаем выделение с других квадратиков
            colorSquares.forEach(s => s.classList.remove('selected'));
            
            // Выделяем выбранный квадратик
            this.classList.add('selected');
            
            // Сохраняем выбранный цвет в глобальной переменной
            window.selectedPlaygroundColor = selectedColor;
            
            try {
                // Импортируем модуль загрузки площадки
                const playgroundModule = await import('../playground.js');
                
                // Получаем текущие размеры площадки
                const width = window.selectedPlaygroundWidth || 40;
                const length = window.selectedPlaygroundLength || 30;
                
                // Загружаем новую площадку с теми же размерами, но с новым цветом
                await playgroundModule.loadPlayground('basketball_court.glb', width, length, selectedColor);
                
                console.log('Цвет площадки изменен на:', selectedColor);

                // Обновляем сессию в базе данных
                try {
                    // Получаем project_id из sessionStorage
                    const userId = sessionStorage.getItem('userId');

                    if (!userId) {
                        console.error('No user ID found');
                        return;
                    }

                    // Получаем текущую сессию
                    const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
                    if (!sessionResponse.ok) {
                        throw new Error('Failed to get session');
                    }

                    const { session } = await sessionResponse.json();
                    const sessionData = session || { quantities: {}, placedObjects: [] };

                    // Обновляем информацию о площадке в сессии
                    sessionData.playground = {
                        width: width,
                        length: length,
                        color: selectedColor
                    };

                    // Сохраняем обновленную сессию
                    const saveResponse = await fetch(`${API_BASE_URL}/session`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ userId, sessionData }),
                    });

                    if (!saveResponse.ok) {
                        throw new Error('Failed to save session');
                    }

                    console.log('Session updated successfully with new playground color:', sessionData.playground);
                } catch (error) {
                    console.error('Error updating session with playground color:', error);
                }
            } catch (error) {
                console.error('Ошибка при изменении цвета площадки:', error);
            }
        });
    });
    
    // Функция для обновления выделения текущего цвета
    function updateSelectedColorSquare() {
        const currentColor = window.selectedPlaygroundColor || 'серый';
        colorSquares.forEach(square => {
            square.classList.remove('selected');
            if (square.getAttribute('data-color') === currentColor) {
                square.classList.add('selected');
            }
        });
    }
}

/**
 * Настраивает обработчик для кнопки справки
 */
function setupHelpButton() {
    const helpButton = document.getElementById('helpButton');
    
    if (helpButton) {
        helpButton.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
                        
            try {
                // Динамически импортируем модуль helpModal
                const { showHelpModal } = await import('../helpModal.js');
                showHelpModal();
            } catch (error) {
                console.error('Error loading help modal:', error);
            }
        });
    } else {
        console.warn('Help button not found');
    }
}

/**
 * Настраивает обработчик для кнопки проверки отсутствующих моделей
 */
function setupCheckMissingModelsButton() {
    const checkMissingModelsButton = document.getElementById('checkMissingModelsButton');
    
    if (checkMissingModelsButton) {
        checkMissingModelsButton.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
                        
            try {
                // Динамически импортируем модуль checkMissingModelsModal
                const { showCheckMissingModelsModal } = await import('../checkMissingModelsModal.js');
                showCheckMissingModelsModal();
            } catch (error) {
                console.error('Error loading check missing models modal:', error);
            }
        });
    } else {
        console.warn('Check missing models button not found');
    }
}