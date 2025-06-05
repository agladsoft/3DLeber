/**
 * Модуль для управления интерфейсными элементами площадки
 */

/**
 * Обновляет метки и поля ввода с размерами площадки
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 */
export function updatePlaygroundLabels(width, length) {
    const widthLabel = document.getElementById('widthLabel');
    const lengthLabel = document.getElementById('lengthLabel');
    const statusElement = document.getElementById('playgroundStatus');
    
    if (widthLabel && lengthLabel) {
        widthLabel.textContent = `Ширина: ${length.toFixed(2)} м`;
        lengthLabel.textContent = `Длина: ${width.toFixed(2)} м`;
    }
    
    if (statusElement) {
        statusElement.textContent = `Размеры площадки: ${length.toFixed(2)}м x ${width.toFixed(2)}м`;
    }

    updateInputFields(width, length);
}

/**
 * Обновляет значения в полях ввода размеров
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 */
function updateInputFields(width, length) {
    const widthInput = document.getElementById("playgroundWidth");
    const lengthInput = document.getElementById("playgroundLength");
    
    if (widthInput) {
        widthInput.value = width.toFixed(2);
    }
    
    if (lengthInput) {
        lengthInput.value = length.toFixed(2);
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
