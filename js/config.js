/**
 * Конфигурационный файл проекта
 * Содержит константы, размеры, цены и другие настройки
 * Адаптирован для работы с Three.js
 */

// Размеры площадки
export const PLAYGROUND = {
    defaultWidth: 40,
    defaultLength: 30,
    minSize: 10,
    maxSize: 100
};

// Настройки конвертации размеров
export const SIZE_CONVERSION = {
    // Пороговое значение для конвертации мм в м (если размер больше - считаем, что это мм)
    thresholdForCmToM: 1000  
};

// Настройки камеры для Three.js
export const CAMERA_SETTINGS = {
    // Настройки для OrbitControls в Three.js
    fov: 75,                // Угол обзора (в градусах)
    initialPosition: {      // Начальная позиция камеры
        x: 0,
        y: 15,              // Высота камеры
        z: 15               // Отдаление камеры
    },
    lookAt: {               // Точка, на которую смотрит камера
        x: 0,
        y: 0,
        z: 0
    },
    minDistance: 2,         // Минимальное расстояние до центра
    maxDistance: 50,        // Максимальное расстояние до центра
    enableDamping: true,    // Плавное движение камеры
    dampingFactor: 0.07,    // Коэффициент инерции (аналог inertia)
    maxPolarAngle: Math.PI / 2 - 0.1, // Ограничение поворота камеры вниз (почти до горизонта)
    minPolarAngle: 0.1,     // Ограничение поворота камеры вверх
    zoomSpeed: 1.0          // Скорость зума (аналог wheelPrecision)
};

// Настройки рендерера Three.js
export const RENDERER_SETTINGS = {
    clearColor: 0x87ceeb,   // Цвет фона (голубое небо)
    pixelRatio: window.devicePixelRatio,
    antialias: true,        // Сглаживание
    shadowMapEnabled: true  // Включить карты теней
};

// Настройки освещения для Three.js
export const LIGHTING = {
    ambientLight: {
        color: 0xffffff,    // Белый цвет
        intensity: 0.8      // Интенсивность (увеличена с 0.5 до 0.7)
    },
    directionalLight: {
        color: 0xffffff,    // Белый цвет
        intensity: 1.1,     // Интенсивность (увеличена с 0.8 до 1.1)
        position: {         // Позиция источника света
            x: 50,
            y: 50,
            z: 50
        },
        castShadow: true    // Отбрасывает тени
    }
};

// Настройки анимации
export const ANIMATION = {
    duration: 1000,                   // Продолжительность анимации в мс
    notificationDuration: 3000,       // Продолжительность показа уведомления в мс
    easing: 'Power2.easeInOut'        // Функция плавности (для GSAP или аналогичной библиотеки)
};

// Настройки для режима вида сверху
export const TOP_VIEW_SETTINGS = {
    panSpeed: 0.7,                  // Скорость перемещения камеры при перетаскивании
    zoomSpeed: 0.5,                 // Скорость масштабирования
    minZoom: 0.2,                   // Минимальный уровень масштабирования
    maxZoom: 3.0,                   // Максимальный уровень масштабирования
    heightMultiplier: 1.1           // Множитель высоты камеры относительно диагонали площадки
};

// Префиксы для объектов, которые не должны подсвечиваться при выходе за границы площадки
export const PLAYGROUND_GROUND_PREFIXES = ['tree', 'bush', 'palm', 'people', 'man', 'woman', 'person', 'human'];

// Ключевые слова для определения элементов площадки (деревья, кусты)
export const PLAYGROUND_ELEMENTS = ['tree', 'bush', 'palm'];

// Ключевые слова для определения людей/персонажей
export const PEOPLE_KEYWORDS = ['people', 'man', 'woman', 'person', 'human'];