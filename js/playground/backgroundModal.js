/**
 * Модуль для управления модальным окном выбора фона
 */
import { changeBackground, getCurrentBackgroundType, getAvailableBackgroundTypes } from './backgroundManager.js';
import { playgroundWidth, playgroundLength } from './playgroundCore.js';
import { showNotification } from '../utils/notifications.js';

let selectedBackgroundType = 'grass';

/**
 * Показывает модальное окно выбора фона
 */
export function showBackgroundModal() {
    const modal = document.getElementById('backgroundModal');
    const backdrop = document.getElementById('backgroundModalBackdrop');
    
    if (!modal || !backdrop) {
        console.error('Модальное окно выбора фона не найдено');
        return;
    }
    
    // Инициализируем модальное окно
    initializeBackgroundModal();
    
    // Показываем модальное окно
    modal.style.display = 'block';
    backdrop.style.display = 'block';
    
    // Добавляем обработчики событий
    setupBackgroundModalHandlers();
    
    console.log('Модальное окно выбора фона открыто');
}

/**
 * Скрывает модальное окно выбора фона
 */
export function hideBackgroundModal() {
    const modal = document.getElementById('backgroundModal');
    const backdrop = document.getElementById('backgroundModalBackdrop');
    
    if (modal) modal.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';
    
    console.log('Модальное окно выбора фона закрыто');
}

/**
 * Инициализирует модальное окно выбора фона
 */
function initializeBackgroundModal() {
    // Получаем текущий тип фона
    selectedBackgroundType = getCurrentBackgroundType();
    
    // Устанавливаем выбранный фон
    updateBackgroundSelection(selectedBackgroundType);
    
    console.log('Модальное окно выбора фона инициализировано с типом:', selectedBackgroundType);
}

/**
 * Обновляет визуальное выделение выбранного фона
 * @param {String} backgroundType - Тип выбранного фона
 */
function updateBackgroundSelection(backgroundType) {
    // Убираем выделение со всех опций
    const options = document.querySelectorAll('.background-option');
    options.forEach(option => {
        option.classList.remove('selected');
    });
    
    // Выделяем выбранную опцию
    const selectedOption = document.querySelector(`[data-background="${backgroundType}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
}

/**
 * Настраивает обработчики событий для модального окна
 */
function setupBackgroundModalHandlers() {
    // Обработчик для выбора фона
    const options = document.querySelectorAll('.background-option');
    options.forEach(option => {
        option.addEventListener('click', function() {
            const backgroundType = this.getAttribute('data-background');
            selectedBackgroundType = backgroundType;
            updateBackgroundSelection(backgroundType);
        });
    });
    
    // Обработчик для кнопки "Применить"
    const applyButton = document.getElementById('backgroundApplyButton');
    if (applyButton) {
        applyButton.addEventListener('click', applyBackgroundChange);
    }
    
    // Обработчик для кнопки закрытия
    const closeButton = document.getElementById('backgroundCloseButton');
    if (closeButton) {
        closeButton.addEventListener('click', hideBackgroundModal);
    }
    
    // Обработчик для клика по backdrop
    const backdrop = document.getElementById('backgroundModalBackdrop');
    if (backdrop) {
        backdrop.addEventListener('click', hideBackgroundModal);
    }
    
    // Обработчик для клавиши Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            hideBackgroundModal();
        }
    });
}

/**
 * Применяет изменение фона
 */
async function applyBackgroundChange() {
    try {
        // Получаем текущие размеры площадки
        let width = playgroundWidth;
        let length = playgroundLength;
        
        // Если есть глобальные переменные приложения, используем их
        if (window.app && window.app.playgroundWidth && window.app.playgroundLength) {
            width = window.app.playgroundWidth;
            length = window.app.playgroundLength;
        }
        
        console.log('Применяем изменение фона на:', selectedBackgroundType, 'с размерами:', width, 'x', length);
        
        // Меняем фон
        await changeBackground(selectedBackgroundType, width, length);
        
        // Показываем уведомление об успехе
        showNotification(`Фон изменен на "${getBackgroundDisplayName(selectedBackgroundType)}"`, 'success');
        
        // Закрываем модальное окно
        hideBackgroundModal();
        
    } catch (error) {
        console.error('Ошибка при изменении фона:', error);
        showNotification('Ошибка при изменении фона', 'error');
    }
}

/**
 * Получает отображаемое имя фона
 * @param {String} backgroundType - Тип фона
 * @returns {String} Отображаемое имя
 */
function getBackgroundDisplayName(backgroundType) {
    const backgroundTypes = getAvailableBackgroundTypes();
    const background = backgroundTypes.find(bg => bg.name === backgroundType);
    return background ? background.displayName : backgroundType;
} 