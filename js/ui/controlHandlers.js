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
    setupResetViewButton();

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
 * Проверяет, что размер в допустимом диапазоне
 * @param {Number} size - Размер для проверки
 * @returns {Boolean} true, если размер допустим
 */
function isValidSize(size) {
    return size >= PLAYGROUND.minSize && size <= PLAYGROUND.maxSize;
}
