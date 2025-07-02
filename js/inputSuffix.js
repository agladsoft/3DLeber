/**
 * Модуль для динамического позиционирования суффиксов в полях ввода
 */

function updateSuffixPosition(input, suffix) {
    if (!input || !suffix) return;
    
    // Суффикс теперь всегда видимый и позиционируется справа
    suffix.classList.add('visible');
    
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
        
        // Сбрасываем right позиционирование и используем left
        suffix.style.right = 'auto';
        suffix.style.left = `${paddingLeft + textWidth + spacing}px`;
    } else {
        // Если поле пустое, показываем суффикс справа
        suffix.style.left = 'auto';
        suffix.style.right = '20px';
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
                // Принудительно обновляем позицию суффикса
                updateSuffixPosition(input, suffix);
                console.log(`Updated suffix for ${inputId}, value: "${input.value}"`);
            }
        }
    });
}

// Функция для проверки и обновления всех суффиксов
function forceUpdateAllSuffixes() {
    // Находим все элементы с суффиксами
    const inputsWithSuffix = document.querySelectorAll('.input-with-suffix input');
    
    inputsWithSuffix.forEach(input => {
        const suffix = input.parentElement.querySelector('.input-suffix');
        if (suffix) {
            updateSuffixPosition(input, suffix);
            console.log(`Force updated suffix for ${input.id || 'unnamed'}, value: "${input.value}"`);
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
                // Отслеживаем программные изменения значений
                input.addEventListener('propertychange', () => updateSuffixPosition(input, suffix)); // IE
                
                // Создаем наблюдатель для конкретного input'а
                const inputObserver = new MutationObserver(() => {
                    updateSuffixPosition(input, suffix);
                });
                
                inputObserver.observe(input, {
                    attributes: true,
                    attributeFilter: ['value']
                });
                
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
    
    // Дополнительная проверка через больший таймаут для случаев когда значения устанавливаются JavaScript'ом
    setTimeout(forceUpdateAllSuffixes, 500);
    setTimeout(forceUpdateAllSuffixes, 1000);
    setTimeout(forceUpdateAllSuffixes, 2000);
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', initInputSuffixes);

// Дополнительная инициализация для случаев когда модальное окно открывается позже
setTimeout(() => {
    initInputSuffixes();
    checkInitialValues();
    forceUpdateAllSuffixes();
}, 500);

// Наблюдатель за изменениями в DOM для отслеживания динамически добавляемых элементов
const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Проверяем, добавлены ли input элементы с суффиксами
                    if (node.classList && node.classList.contains('input-with-suffix')) {
                        shouldUpdate = true;
                    }
                    // Или если добавлен элемент, содержащий такие input'ы
                    if (node.querySelector && node.querySelector('.input-with-suffix')) {
                        shouldUpdate = true;
                    }
                }
            });
        }
        
        // Отслеживаем изменения значений в атрибутах
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
            const target = mutation.target;
            if (target.closest('.input-with-suffix')) {
                shouldUpdate = true;
            }
        }
    });
    
    if (shouldUpdate) {
        setTimeout(forceUpdateAllSuffixes, 50);
    }
});

// Запускаем наблюдатель
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['value']
});

// Делаем функцию доступной глобально для вызова из других скриптов
window.forceUpdateAllSuffixes = forceUpdateAllSuffixes;

// Экспорт для использования в других модулях
export { initInputSuffixes, updateSuffixPosition, forceUpdateAllSuffixes };