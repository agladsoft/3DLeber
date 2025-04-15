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
    setupApplyButton();
    setupChangePlaygroundButton();
    setupResetViewButton();
    setupTopViewButton();
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
 * Настраивает кнопку "Применить"
 */
function setupApplyButton() {
    const applyButton = document.getElementById("applySettings");
    if (applyButton) {
        applyButton.addEventListener("click", () => {
            // Получаем значения из полей ввода
            const newWidth = parseFloat(document.getElementById("playgroundWidth").value);
            const newLength = parseFloat(document.getElementById("playgroundLength").value);
            
            // Проверяем, что размеры в допустимом диапазоне
            if (isValidSize(newWidth) && isValidSize(newLength)) {
                // Изменяем размеры площадки с анимацией
                resizePlaygroundWithAnimation(newWidth, newLength);
                
                // Обновляем информацию о размерах площадки
                updatePlaygroundStatusText();
            } else {
                // Показываем предупреждение, если размеры некорректны
                showNotification("Размеры должны быть в диапазоне от 5 до 50 метров", true);
            }
        });
    }
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
 * Настраивает кнопку "Сменить площадку"
 */
function setupChangePlaygroundButton() {
    const changePlaygroundButton = document.getElementById("changePlayground");
    if (changePlaygroundButton) {
        changePlaygroundButton.addEventListener("click", async () => {
            try {
                // Получаем значение выбранной площадки из dropdown
                const selectedModel = document.getElementById("playgroundType").value;
                
                // Загружаем выбранную модель площадки
                await loadPlayground(selectedModel);
                
                // Обновляем UI
                updateUIAfterPlaygroundChange(selectedModel);
                
                // Обновляем позиции всех объектов после смены площадки
                checkAllObjectsPositions();
            } catch (error) {
                console.error("Ошибка при смене площадки:", error);
                showNotification("Не удалось загрузить площадку", true);
            }
        });
    }
}

/**
 * Обновляет UI после смены площадки
 * @param {String} modelName - Имя модели площадки
 */
function updateUIAfterPlaygroundChange(modelName) {
    // Обновляем значения в полях ввода
    const widthInput = document.getElementById("playgroundWidth");
    const lengthInput = document.getElementById("playgroundLength");
    
    if (widthInput) widthInput.value = playgroundWidth.toFixed(2);
    if (lengthInput) lengthInput.value = playgroundLength.toFixed(2);
    
    // Обновляем информацию о размерах площадки
    updatePlaygroundStatusText();
    
    // Показываем уведомление об успешной смене площадки
    showNotification(`Площадка успешно изменена на ${modelName}. Реальные размеры: ${playgroundWidth.toFixed(2)}м × ${playgroundLength.toFixed(2)}м`, false);
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
    
    // Устанавливаем базовые стили через атрибут
    const baseStyles = `
        background-color: #4CAF50 !important;
        color: white !important;
        padding: 10px !important;
        border: none !important;
        border-radius: 5px !important;
        cursor: pointer !important;
        transition: background-color 0.3s ease !important;
    `;
    
    button.setAttribute("style", baseStyles);
    button.textContent = "Вид сверху (сетка 1×1м)";
    
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
        
        const activeStyles = `
            background-color: #F44336 !important;
            color: white !important;
            padding: 10px !important;
            border: none !important;
            border-radius: 5px !important;
            cursor: pointer !important;
            transition: background-color 0.3s ease !important;
            font-weight: bold !important;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3) !important;
        `;
        
        button.setAttribute("style", activeStyles);
        button.classList.add("active");
    } else {
        // Устанавливаем зеленый стиль для неактивного режима
        console.log("Устанавливаем зеленый стиль кнопки");
        button.textContent = "Вид сверху (сетка 1×1м)";
        
        const inactiveStyles = `
            background-color: #4CAF50 !important;
            color: white !important;
            padding: 10px !important;
            border: none !important;
            border-radius: 5px !important;
            cursor: pointer !important;
            transition: background-color 0.3s ease !important;
        `;
        
        button.setAttribute("style", inactiveStyles);
        button.classList.remove("active");
    }
    
    console.log("Стиль кнопки обновлен:", button.style.backgroundColor);
}
