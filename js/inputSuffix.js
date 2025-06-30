/**
 * Модуль для динамического позиционирования суффиксов в полях ввода
 */

function updateSuffixPosition(input, suffix) {
    if (!input || !suffix) return;
    
    if (input.value && input.value.trim() !== '') {
        // Создаем временный скрытый span для точного измерения ширины текста
        const measureSpan = document.createElement('span');
        measureSpan.style.position = 'absolute';
        measureSpan.style.visibility = 'hidden';
        measureSpan.style.whiteSpace = 'pre';
        measureSpan.style.fontSize = getComputedStyle(input).fontSize;
        measureSpan.style.fontFamily = getComputedStyle(input).fontFamily;
        measureSpan.style.fontWeight = getComputedStyle(input).fontWeight;
        measureSpan.textContent = input.value;
        
        document.body.appendChild(measureSpan);
        const textWidth = measureSpan.offsetWidth;
        document.body.removeChild(measureSpan);
        
        // Позиционируем суффикс сразу после текста
        const paddingLeft = parseInt(getComputedStyle(input).paddingLeft);
        
        // Для pgModal убираем отступ между значением и "м"
        const spacing = (input.id === 'pgWidthInput' || input.id === 'pgLengthInput') ? 2 : 5;
        suffix.style.left = `${paddingLeft + textWidth + spacing}px`;
        suffix.classList.add('visible');
    } else {
        suffix.classList.remove('visible');
    }
}

// Дополнительная функция для инициализации при загрузке страницы
function checkInitialValues() {
    const inputs = [
        'modalPlaygroundWidth', 'modalPlaygroundLength',
        'pgWidthInput', 'pgLengthInput',
        'playground-width', 'playground-length',
        'widthInput', 'lengthInput'
    ];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            const suffix = input.parentElement.querySelector('.input-suffix');
            if (suffix) {
                updateSuffixPosition(input, suffix);
            }
        }
    });
}

function initInputSuffixes() {
    // Основные поля модального окна выбора площадки
    const widthInput = document.getElementById('modalPlaygroundWidth');
    const lengthInput = document.getElementById('modalPlaygroundLength');
    
    // Поля pgModal
    const pgWidthInput = document.getElementById('pgWidthInput');
    const pgLengthInput = document.getElementById('pgLengthInput');
    
    // Поля playgroundSettings
    const playgroundWidthInput = document.getElementById('playground-width');
    const playgroundLengthInput = document.getElementById('playground-length');
    
    // Поля size-controls
    const sizeWidthInput = document.getElementById('widthInput');
    const sizeLengthInput = document.getElementById('lengthInput');
    
    // Функция для настройки обработчиков событий
    function setupInputSuffix(input, inputName) {
        if (input) {
            const suffix = input.parentElement.querySelector('.input-suffix');
            if (suffix) {
                input.addEventListener('input', () => updateSuffixPosition(input, suffix));
                input.addEventListener('keyup', () => updateSuffixPosition(input, suffix));
                input.addEventListener('change', () => updateSuffixPosition(input, suffix));
                // Инициализация при загрузке
                updateSuffixPosition(input, suffix);
            }
        }
    }
    
    // Настраиваем все поля
    setupInputSuffix(widthInput, 'modalPlaygroundWidth');
    setupInputSuffix(lengthInput, 'modalPlaygroundLength');
    setupInputSuffix(pgWidthInput, 'pgWidthInput');
    setupInputSuffix(pgLengthInput, 'pgLengthInput');
    setupInputSuffix(playgroundWidthInput, 'playground-width');
    setupInputSuffix(playgroundLengthInput, 'playground-length');
    setupInputSuffix(sizeWidthInput, 'widthInput');
    setupInputSuffix(sizeLengthInput, 'lengthInput');
    
    // Проверяем начальные значения через небольшой таймаут
    setTimeout(checkInitialValues, 100);
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', initInputSuffixes);

// Дополнительная инициализация для случаев когда модальное окно открывается позже
setTimeout(() => {
    initInputSuffixes();
    checkInitialValues();
}, 500);

// Экспорт для использования в других модулях
export { initInputSuffixes, updateSuffixPosition };