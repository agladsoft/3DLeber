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
            // Динамически импортируем placedObjects и removeObject
            const module = await import('../objects.js');
            // Копируем массив, чтобы не было проблем при изменении во время итерации
            const objectsToDelete = [...module.placedObjects];
            objectsToDelete.forEach(obj => module.removeObject(obj));
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
    
    button.textContent = "🔝 Вид сверху";
    
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
        button.textContent = "🔝 Вид сверху";
        button.setAttribute("style", inactiveStyles);
        button.classList.remove("active");
    }
    
    console.log("Стиль кнопки обновлен:", button.style.backgroundColor);
}

/**
 * Проверяет, что размер в допустимом диапазоне
 * @param {Number} size - Размер для проверки
 * @returns {Boolean} true, если размер допустим
 */
function isValidSize(size) {
    return size >= PLAYGROUND.minSize && size <= PLAYGROUND.maxSize;
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
    const widthValue = document.getElementById('widthValue');
    const lengthValue = document.getElementById('lengthValue');
    const applyButton = document.getElementById('applyPlaygroundSize');
    
    if (!playgroundButton || !playgroundSettings) return;
    
    // Инициализация текущих значений размеров площадки
    window.selectedPlaygroundWidth = window.selectedPlaygroundWidth || 10;
    window.selectedPlaygroundLength = window.selectedPlaygroundLength || 10;
    
    // Установка начальных значений для ползунков
    if (widthSlider && widthValue) {
        widthSlider.value = window.selectedPlaygroundWidth;
        widthValue.textContent = window.selectedPlaygroundWidth;
    }
    
    if (lengthSlider && lengthValue) {
        lengthSlider.value = window.selectedPlaygroundLength;
        lengthValue.textContent = window.selectedPlaygroundLength;
    }
    
    // Отмечаем текущий выбранный цвет
    updateSelectedColorSquare();
    
    // Обработчик нажатия на кнопку площадки
    playgroundButton.onclick = function() {
        // Показываем/скрываем панель настроек площадки
        playgroundSettings.classList.toggle('hidden');
        updateSelectedColorSquare();
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
        } catch (error) {
            console.error('Ошибка при изменении размеров площадки:', error);
        }
    };
    
    // Обработчики для ползунков
    if (widthSlider && widthValue) {
        // Обновляем текст при перемещении ползунка
        widthSlider.oninput = function() {
            widthValue.textContent = this.value;
        };
        
        // Применяем новый размер при отпускании ползунка
        widthSlider.onchange = function() {
            const newWidth = parseInt(this.value);
            const newLength = parseInt(lengthSlider.value);
            applyPlaygroundSize(newWidth, newLength);
        };
    }
    
    if (lengthSlider && lengthValue) {
        // Обновляем текст при перемещении ползунка
        lengthSlider.oninput = function() {
            lengthValue.textContent = this.value;
        };
        
        // Применяем новый размер при отпускании ползунка
        lengthSlider.onchange = function() {
            const newWidth = parseInt(widthSlider.value);
            const newLength = parseInt(this.value);
            applyPlaygroundSize(newWidth, newLength);
        };
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

