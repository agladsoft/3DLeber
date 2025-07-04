/**
 * Модуль для динамического позиционирования суффиксов в полях ввода
 * Рефакторинг для стабильной работы - упрощенная версия
 */

// Глобальное состояние системы
const SuffixManager = {
    initialized: false,
    initPromise: null,
    trackedInputs: new Map(),
    
    // Debounce для предотвращения избыточных обновлений
    debounceTimers: new Map(),
    
    // Состояние готовности модулей
    modulesReady: {
        modal: false,
        pgModal: false
    }
};

// Функция для точного измерения ширины текста
function measureTextWidth(input, text) {
    const measureSpan = document.createElement('span');
    measureSpan.style.position = 'absolute';
    measureSpan.style.visibility = 'hidden';
    measureSpan.style.whiteSpace = 'pre';
    measureSpan.style.fontSize = getComputedStyle(input).fontSize;
    measureSpan.style.fontFamily = getComputedStyle(input).fontFamily;
    measureSpan.style.fontWeight = getComputedStyle(input).fontWeight;
    measureSpan.textContent = text;
    
    document.body.appendChild(measureSpan);
    const textWidth = measureSpan.offsetWidth;
    document.body.removeChild(measureSpan);
    
    return textWidth;
}

// Основная функция позиционирования суффикса
function positionSuffix(input, suffix) {
    if (!input || !suffix) return;
    
    const value = input.value || '';
    const trimmedValue = value.trim();
    
    if (trimmedValue === '') {
        // Если поле пустое, скрываем суффикс
        suffix.style.opacity = '0';
        suffix.style.left = 'auto';
        suffix.style.right = '20px';
        return;
    }
    
    // Вычисляем позицию
    const textWidth = measureTextWidth(input, value);
    const paddingLeft = parseInt(getComputedStyle(input).paddingLeft) || 20;
    const spacing = (input.id === 'pgWidthInput' || input.id === 'pgLengthInput') ? 2 : 5;
    
    // Устанавливаем позицию и показываем суффикс
    suffix.style.right = 'auto';
    suffix.style.left = `${paddingLeft + textWidth + spacing}px`;
    suffix.style.opacity = '1';
    
    console.log(`Positioned suffix for ${input.id}: "${value}" -> left: ${paddingLeft + textWidth + spacing}px`);
}

// Debounced версия функции обновления
function updateSuffixPosition(input, suffix) {
    if (!input || !suffix) return;
    
    const inputId = input.id;
    
    // Очищаем предыдущий таймер debounce для этого input'а
    if (SuffixManager.debounceTimers.has(inputId)) {
        clearTimeout(SuffixManager.debounceTimers.get(inputId));
    }
    
    // Устанавливаем новый таймер debounce
    const timer = setTimeout(() => {
        positionSuffix(input, suffix);
        SuffixManager.debounceTimers.delete(inputId);
    }, 50); // 50ms debounce
    
    SuffixManager.debounceTimers.set(inputId, timer);
}

// Функция для настройки одного input с суффиксом
function setupSuffixInput(input) {
    if (!input) return;
    
    const suffix = input.parentElement.querySelector('.input-suffix');
    if (!suffix) return;
    
    const inputId = input.id;
    
    // Проверяем, не настроен ли уже этот input
    if (SuffixManager.trackedInputs.has(inputId)) {
        return;
    }
    
    // Создаем обработчик событий
    const handleInputChange = () => updateSuffixPosition(input, suffix);
    
    // Добавляем только один обработчик input событий
    input.addEventListener('input', handleInputChange);
    
    // Сохраняем информацию о настроенном input'е
    SuffixManager.trackedInputs.set(inputId, {
        input: input,
        suffix: suffix,
        handler: handleInputChange
    });
    
    // Выполняем начальное позиционирование
    positionSuffix(input, suffix);
    
    console.log(`Setup suffix for ${inputId}, initial value: "${input.value}"`);
}

// Упрощенная функция обновления всех суффиксов
function updateAllSuffixes() {
    if (!SuffixManager.initialized) return;
    
    // Находим все input'ы с суффиксами
    const inputs = document.querySelectorAll('.input-with-suffix input');
    
    inputs.forEach(input => {
        if (input.id) {
            setupSuffixInput(input);
        }
    });
}

// Основная функция инициализации
function initInputSuffixes() {
    console.log('Starting InputSuffix initialization...');
    
    // Предотвращаем повторную инициализацию
    if (SuffixManager.initialized) {
        console.log('InputSuffix already initialized, skipping...');
        return SuffixManager.initPromise;
    }
    
    // Создаем промис для отслеживания готовности
    SuffixManager.initPromise = new Promise((resolve) => {
        // Ждем, пока DOM будет готов
        const initialize = () => {
            try {
                console.log('Initializing input suffixes...');
                
                // Находим и настраиваем все input'ы с суффиксами
                updateAllSuffixes();
                
                // Отмечаем как инициализированное
                SuffixManager.initialized = true;
                
                console.log('InputSuffix initialization completed');
                resolve();
                
            } catch (error) {
                console.error('Error during InputSuffix initialization:', error);
                resolve(); // Resolve даже при ошибке, чтобы не блокировать другие модули
            }
        };
        
        // Если DOM готов, инициализируем сразу
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initialize);
        } else {
            // DOM уже готов, инициализируем с небольшой задержкой
            setTimeout(initialize, 100);
        }
    });
    
    return SuffixManager.initPromise;
}

// Функции для внешнего API (вызов из других модулей)
function notifyValueChange(inputId) {
    const input = document.getElementById(inputId);
    if (input && SuffixManager.trackedInputs.has(inputId)) {
        const { suffix } = SuffixManager.trackedInputs.get(inputId);
        updateSuffixPosition(input, suffix);
    }
}

function notifyModuleReady(moduleName) {
    if (SuffixManager.modulesReady.hasOwnProperty(moduleName)) {
        SuffixManager.modulesReady[moduleName] = true;
        console.log(`Module ${moduleName} ready, checking suffixes...`);
        
        // Если все ключевые модули готовы, обновляем суффиксы
        if (SuffixManager.initialized) {
            setTimeout(updateAllSuffixes, 100);
        }
    }
}

// Единственная точка инициализации
document.addEventListener('DOMContentLoaded', initInputSuffixes);

// Делаем функции доступными глобально для координации с другими модулями
window.SuffixManager = {
    notifyValueChange,
    notifyModuleReady,
    updateAllSuffixes: () => {
        if (SuffixManager.initialized) {
            updateAllSuffixes();
        }
    }
};

// Экспорт для использования в других модулях
export { initInputSuffixes, updateSuffixPosition, notifyValueChange, notifyModuleReady };