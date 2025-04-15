/**
 * Модуль для управления интерфейсными элементами площадки
 */

/**
 * Обновляет метки и поля ввода с размерами площадки
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 */
export function updatePlaygroundLabels(width, length) {
    // Форматируем числа до 2-х знаков после запятой
    const formattedWidth = width.toFixed(2);
    const formattedLength = length.toFixed(2);
    
    // Обновляем текстовый статус в правой панели
    const statusElement = document.getElementById("playgroundStatus");
    if (statusElement) {
        statusElement.textContent = `Площадка: ${formattedWidth}м × ${formattedLength}м`;
    }
    
    // Обновляем HTML-метки размеров
    const widthLabel = document.getElementById("widthLabel");
    const lengthLabel = document.getElementById("lengthLabel");
    
    if (widthLabel) {
        widthLabel.textContent = `${formattedWidth}м`;
    }
    
    if (lengthLabel) {
        lengthLabel.textContent = `${formattedLength}м`;
    }
    
    // Также обновляем значения в полях ввода, если они существуют
    updateInputFields(formattedWidth, formattedLength);
}

/**
 * Обновляет значения в полях ввода размеров
 * @param {String} width - Ширина площадки (форматированная строка)
 * @param {String} length - Длина площадки (форматированная строка)
 */
function updateInputFields(width, length) {
    const widthInput = document.getElementById("playgroundWidth");
    const lengthInput = document.getElementById("playgroundLength");
    
    if (widthInput) {
        widthInput.value = width;
    }
    
    if (lengthInput) {
        lengthInput.value = length;
    }
}

/**
 * Обновляет метки во время анимации изменения размеров
 * @param {Number} width - Текущая ширина площадки
 * @param {Number} length - Текущая длина площадки
 */
export function updateLabelsDuringAnimation(width, length) {
    // Форматируем числа до 1 знака после запятой для анимации
    const formattedWidth = width.toFixed(1);
    const formattedLength = length.toFixed(1);
    
    // Обновляем HTML-метки размеров
    const widthLabel = document.getElementById("widthLabel");
    const lengthLabel = document.getElementById("lengthLabel");
    
    if (widthLabel) {
        widthLabel.textContent = `${formattedWidth}м`;
    }
    
    if (lengthLabel) {
        lengthLabel.textContent = `${formattedLength}м`;
    }
}
