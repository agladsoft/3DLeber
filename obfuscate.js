const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

// Путь к исходному файлу
const inputFilePath = path.join(__dirname, 'main.js');
// Путь к обфусцированному файлу
const outputFilePath = path.join(__dirname, 'main.obfuscated.js');

// Чтение содержимого исходного файла
const fileContent = fs.readFileSync(inputFilePath, 'utf8');

// Настройки обфускации
const obfuscationResult = JavaScriptObfuscator.obfuscate(fileContent, {
    compact: false, // Не минимизировать код
    controlFlowFlattening: true, // Запутывание потока выполнения
    controlFlowFlatteningThreshold: 0.7, // Уровень запутывания потока выполнения
    deadCodeInjection: true, // Добавление мертвого кода
    deadCodeInjectionThreshold: 0.4, // Уровень добавления мертвого кода
    debugProtection: true, // Защита от отладки
    debugProtectionInterval: 3000, // Интервальная защита от отладки (в миллисекундах)
    disableConsoleOutput: false, // Разрешаем консольные выводы
    identifierNamesGenerator: 'hexadecimal', // Генерация имен идентификаторов
    log: false, // Не выводить логи
    numbersToExpressions: true, // Конвертация чисел в выражения
    renameGlobals: false, // Не переименовывать глобальные переменные
    selfDefending: true, // Самозащита от модификации
    simplify: true, // Упрощение кода
    splitStrings: true, // Разбиение строк
    splitStringsChunkLength: 10, // Длина чанков при разбиении строк
    stringArray: true, // Использование массива строк
    stringArrayCallsTransform: true,
    stringArrayCallsTransformThreshold: 0.75,
    stringArrayEncoding: ['base64'], // Кодирование массива строк
    stringArrayIndexShift: true, // Смещение индекса массива строк
    stringArrayRotate: true, // Вращение массива строк
    stringArrayShuffle: true, // Перемешивание массива строк
    stringArrayWrappersCount: 2, // Количество оберток для массива строк
    stringArrayWrappersChainedCalls: true, // Цепные вызовы оберток для массива строк
    stringArrayWrappersParametersMaxCount: 4, // Максимальное количество параметров оберток для массива строк
    stringArrayWrappersType: 'function', // Тип оберток для массива строк
    stringArrayThreshold: 0.75, // Порог для массива строк
    transformObjectKeys: true, // Преобразование ключей объектов
    unicodeEscapeSequence: false // Не использовать unicode-последовательности
});

// Запись обфусцированного кода в файл
fs.writeFileSync(outputFilePath, obfuscationResult.getObfuscatedCode());

console.log('Обфускация успешно завершена. Обфусцированный файл сохранен как:', outputFilePath);
