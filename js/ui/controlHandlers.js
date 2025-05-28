/**
 * Модуль для управления элементами интерфейса
 */
import { PLAYGROUND } from '../config.js';
import { 
    resetCameraView, 
    takeScreenshot, 
    toggleTopView 
} from '../scene.js';
import { 
    loadPlayground, 
    resizePlaygroundWithAnimation, 
    playgroundWidth, 
    playgroundLength 
} from '../playground.js';
import { checkAllObjectsPositions } from '../objects.js';
import { showNotification } from '../utils.js';
import { initializeNewSession } from '../models.js';
import { updateModelQuantityUI, saveQuantityToDatabase } from './dragAndDrop.js';
import { API_BASE_URL } from '../api/serverConfig.js';
import { showAllDimensions, hideAllDimensions, addDimensionsToModel } from '../modules/dimensionDisplay/index.js';
import { placedObjects } from '../objects.js';

/**
 * Инициализирует обработчики для элементов управления в интерфейсе
 */
export function initControlHandlers() {
    // Проверяем состояние загрузки страницы
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", setupControlHandlers);
    } else {
        // Если DOMContentLoaded уже произошло
        setupControlHandlers();
    }
}

/**
 * Настраивает обработчики для элементов управления
 */
function setupControlHandlers() {
    // Устанавливаем обработчики для различных элементов управления
    setupScreenshotButton();
    setupPlaygroundSizeInputs();
    setupChangePlaygroundButton();
    setupResetViewButton();
    setupTopViewButton();
    setupDimensionsButton();
    setupPlaygroundButton();

    // Обработчик для кнопки удаления всех моделей
    const deleteAllBtn = document.getElementById('deleteAllModels');
    if (deleteAllBtn) {
        deleteAllBtn.onclick = async function() {
            try {
                // Получаем user_id из sessionStorage
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

                // Очищаем placedObjects в текущей сессии
                sessionData.placedObjects = [];

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

                // Удаляем все объекты с площадки
                const module = await import('../objects.js');
                // Копируем массив, чтобы не было проблем при изменении во время итерации
                const objectsToDelete = [...module.placedObjects];
                
                // Удаляем все объекты с площадки, передавая флаг массового удаления
                for (const obj of objectsToDelete) {
                    module.removeObject(obj, true);
                }

                // Инициализируем новую сессию с моделями из JSON
                if (data.models && Array.isArray(data.models)) {
                    console.log('Reinitializing session with models:', data.models);
                    const newSessionData = await initializeNewSession(userId, data.models);
                    
                    // Обновляем количества в sessionStorage
                    if (newSessionData && newSessionData.quantities) {
                        Object.entries(newSessionData.quantities).forEach(([modelName, quantity]) => {
                            const items = document.querySelectorAll('.item');
                            items.forEach(item => {
                                if (item.getAttribute('data-model') === modelName) {
                                    updateModelQuantityUI(item, quantity);
                                    saveQuantityToDatabase(modelName, quantity);
                                }
                            });
                        });
                    }
                }

                console.log('All models removed and session reinitialized');
            } catch (error) {
                console.error('Error removing all models:', error);
                showNotification('Ошибка при удалении всех моделей', true);
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
    addSizePreviewHandlers(widthInput, lengthInput);
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
 * @param {HTMLInputElement} widthInput - Поле ввода ширины
 * @param {HTMLInputElement} lengthInput - Поле ввода длины
 */
function addSizePreviewHandlers(widthInput, lengthInput) {
    if (widthInput) {
        widthInput.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value) || playgroundWidth;
            const widthLabel = document.getElementById("widthLabel");
            if (widthLabel) widthLabel.textContent = `${value}м`;
        });
    }
    
    if (lengthInput) {
        lengthInput.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value) || playgroundLength;
            const lengthLabel = document.getElementById("lengthLabel");
            if (lengthLabel) lengthLabel.textContent = `${value}м`;
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
                import('../modal.js').then(modalModule => {
                    if (typeof modalModule.showPlatformSelectModal === 'function') {
                        // Вызываем функцию показа модального окна
                        modalModule.showPlatformSelectModal();
                    } else {
                        console.error("Функция showPlatformSelectModal не найдена в модуле");
                        showNotification("Ошибка при открытии окна выбора площадки", true);
                    }
                }).catch(error => {
                    console.error("Ошибка при импорте модуля modal.js:", error);
                    showNotification("Ошибка при открытии окна выбора площадки", true);
                });
            } catch (error) {
                console.error("Ошибка при открытии модального окна:", error);
                showNotification("Не удалось открыть окно выбора площадки", true);
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
 * Настраивает кнопку вида сверху
 */
function setupTopViewButton() {
    // Находим кнопку вида сверху
    let topViewButton = document.getElementById("topView");
    if (!topViewButton) {
        console.error("Кнопка вида сверху не найдена в DOM! Проверяем еще раз...");
        
        // Пробуем найти повторно через небольшую задержку
        setTimeout(() => {
            topViewButton = document.getElementById("topView");
            if (topViewButton) {
                console.log("Кнопка найдена после задержки, настраиваем...");
                initializeTopViewButton(topViewButton);
            } else {
                console.error("Кнопка вида сверху не найдена даже после повторной попытки!");
            }
        }, 500);
    } else {
        console.log("Кнопка вида сверху найдена, настраиваем...");
        initializeTopViewButton(topViewButton);
    }
}

/**
 * Инициализирует кнопку вида сверху
 * @param {HTMLElement} button - Кнопка вида сверху
 */
function initializeTopViewButton(button) {
    // Принудительно сбрасываем все стили и классы
    button.className = ""; // Сбрасываем все классы
    
    button.textContent = "🔝 Вид сверху (сетка 1×1м)";
    
    // Создаем новый обработчик клика и удаляем старые, если они были
    button.replaceWith(button.cloneNode(true));
    
    // Получаем заново кнопку после клонирования
    const freshButton = document.getElementById("topView");
    
    freshButton.addEventListener("click", () => {
        console.log("Нажата кнопка вида сверху");
        console.log("Текущие размеры площадки:", playgroundWidth, "x", playgroundLength);
        
        try {
            // Переключаем режим и получаем новое состояние
            const isActive = toggleTopView(playgroundWidth, playgroundLength);
            console.log("Новое состояние вида сверху:", isActive);
            
            // Форсируем рендеринг и обновление DOM
            requestAnimationFrame(() => {
                updateTopViewButtonStyle(freshButton, isActive);
            });
        } catch (error) {
            console.error("Ошибка при переключении режима вида сверху:", error);
            showNotification("Ошибка при активации вида сверху", true);
        }
    });
    
    console.log("Кнопка вида сверху настроена успешно");
}

/**
 * Обновляет стиль кнопки вида сверху
 * @param {HTMLElement} button - Кнопка
 * @param {Boolean} isActive - Активен ли режим вид сверху
 */
function updateTopViewButtonStyle(button, isActive) {
    if (isActive) {
        // Устанавливаем красный стиль для активного режима
        console.log("Устанавливаем красный стиль кнопки");
        button.textContent = "Выйти из вида сверху";
        button.setAttribute("style", activeStyles);
        button.classList.add("active");
    } else {
        // Устанавливаем зеленый стиль для неактивного режима
        console.log("Устанавливаем зеленый стиль кнопки");
        button.textContent = "🔝 Вид сверху (сетка 1×1м)";
        button.setAttribute("style", inactiveStyles);
        button.classList.remove("active");
    }
    
    console.log("Стиль кнопки обновлен:", button.style.backgroundColor);
}

/**
 * Настраивает кнопку "Размеры"
 */
function setupDimensionsButton() {
    const dimensionsButton = document.getElementById('toggleDimensions');
    if (!dimensionsButton) return;

    // Устанавливаем начальное состояние
    if (typeof window.dimensionsVisible === 'undefined') {
        window.dimensionsVisible = false;
    }

    updateDimensionsButtonStyle(dimensionsButton, window.dimensionsVisible);

    dimensionsButton.onclick = async function() {
        window.dimensionsVisible = !window.dimensionsVisible;
        
        if (window.dimensionsVisible) {
            // Для всех объектов на сцене добавляем размеры, если их нет
            if (Array.isArray(placedObjects)) {
                placedObjects.forEach(obj => addDimensionsToModel(obj));
            }
            showAllDimensions();
        } else {
            hideAllDimensions();
        }
        
        updateDimensionsButtonStyle(dimensionsButton, window.dimensionsVisible);
    };
}

/**
 * Обновляет стиль кнопки "Размеры"
 * @param {HTMLElement} button - Кнопка
 * @param {Boolean} isActive - Активен ли режим отображения размеров
 */
function updateDimensionsButtonStyle(button, isActive) {
    if (isActive) {
        button.classList.add('active');
        button.textContent = '📏 Размеры ON';
    } else {
        button.classList.remove('active');
        button.textContent = '📏 Скрыть размеры';
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
    
    console.log('Элементы управления площадкой скрыты по умолчанию');
    
    // Инициализация текущих значений размеров площадки
    window.selectedPlaygroundWidth = window.selectedPlaygroundWidth || 10;
    window.selectedPlaygroundLength = window.selectedPlaygroundLength || 10;
    
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
        
        console.log('Элементы управления площадкой показаны');
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
                // Получаем user_id из sessionStorage
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
                const width = window.selectedPlaygroundWidth || 10;
                const length = window.selectedPlaygroundLength || 10;
                
                // Загружаем новую площадку с теми же размерами, но с новым цветом
                await playgroundModule.loadPlayground('basketball_court.glb', width, length, selectedColor);
                
                console.log('Цвет площадки изменен на:', selectedColor);

                // Обновляем сессию в базе данных
                try {
                    // Получаем user_id из sessionStorage
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
