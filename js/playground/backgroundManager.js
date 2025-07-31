/**
 * Модуль для управления фоном и текстурами площадки
 */
import * as THREE from 'three';
import { scene } from '../scene.js';

// Конфигурация доступных фонов и текстур
export const BACKGROUND_TYPES = {
    GRASS: {
        name: 'grass',
        displayName: 'Трава',
        texturePath: 'textures/ground/grass_texture.png',
        color: '#7CB342', // Более естественный зеленый цвет
        roughness: 0.8, // Увеличена шероховатость для травы
        metalness: 0.0  // Трава не металлическая
    },
    SAND: {
        name: 'sand',
        displayName: 'Песок',
        texturePath: 'textures/ground/smooth-sand-dunes-2048x2048.png',
        color: '#F4D03F', // Желтый песок
        roughness: 0.95, // Очень шероховатый
        metalness: 0.0   // Песок не металлический
    },
    DIRT: {
        name: 'dirt',
        displayName: 'Земля',
        texturePath: 'textures/ground/red-sand-ground-2048x2048.png',
        color: '#db9e6c', // Коричневый цвет земли
        roughness: 0.9,  // Очень шероховатый
        metalness: 0.0   // Земля не металлическая
    },
    CONCRETE: {
        name: 'concrete',
        displayName: 'Бетон',
        texturePath: 'textures/ground/concrete-wall-2048x2048.png',
        color: '#95A5A6', // Серый бетон
        roughness: 0.7,  // Средняя шероховатость
        metalness: 0.1   // Слегка металлический
    }
};

// Текущий тип фона
let currentBackgroundType = BACKGROUND_TYPES.GRASS;
let currentBackgroundMesh = null;

/**
 * Инициализирует менеджер фона
 */
export function initBackgroundManager() {
    // Восстанавливаем сохраненный тип фона из localStorage
    const savedBackground = localStorage.getItem('selectedBackgroundType');
    if (savedBackground && BACKGROUND_TYPES[savedBackground.toUpperCase()]) {
        currentBackgroundType = BACKGROUND_TYPES[savedBackground.toUpperCase()];
    }
    
    console.log('Background manager initialized with type:', currentBackgroundType.name);
}

/**
 * Создает фон с указанным типом
 * @param {Number} width - Ширина основной площадки
 * @param {Number} length - Длина основной площадки
 * @param {String} backgroundType - Тип фона (grass, sand, dirt, concrete)
 * @returns {THREE.Mesh} Созданный фон
 */
export function createBackground(width, length, backgroundType = 'grass') {
    console.log('Создаем фон типа:', backgroundType);
    
    // Удаляем существующий фон
    removeExistingBackground();
    
    // Получаем конфигурацию для выбранного типа
    const backgroundConfig = getBackgroundConfig(backgroundType);
    if (!backgroundConfig) {
        console.warn('Неизвестный тип фона:', backgroundType, 'используем траву');
        backgroundConfig = BACKGROUND_TYPES.GRASS;
    }
    
    // Обновляем текущий тип
    currentBackgroundType = backgroundConfig;
    
    // Устанавливаем фиксированный большой размер для фона
    const size = 1000; // Увеличенный размер для лучшего качества текстур
    
    // Создаем геометрию круга с большим количеством сегментов для гладкости
    const circleGeometry = new THREE.CircleGeometry(size / 2, 128);
    
    // Создаем материал для фона
    const material = createBackgroundMaterial(backgroundConfig, size);
    
    // Создаем меш фона
    const backgroundMesh = new THREE.Mesh(circleGeometry, material);
    
    // Поворачиваем и позиционируем круг
    backgroundMesh.rotation.x = -Math.PI / 2;
    backgroundMesh.position.y = -0.1; // Чуть ниже основной площадки
    backgroundMesh.receiveShadow = true;
    backgroundMesh.name = "background_surface";
    
    // Добавляем информацию для предотвращения выбора
    backgroundMesh.userData = {
        isGround: true,
        nonInteractive: true,
        isBackground: true,
        backgroundType: backgroundType
    };
    
    // Добавляем фон в сцену
    scene.add(backgroundMesh);
    currentBackgroundMesh = backgroundMesh;
    
    console.log('Фон типа', backgroundType, 'добавлен в сцену');
    return backgroundMesh;
}

/**
 * Создает материал для фона
 * @param {Object} config - Конфигурация фона
 * @param {Number} size - Размер фона
 * @returns {THREE.Material} Материал для фона
 */
function createBackgroundMaterial(config, size) {
    const textureLoader = new THREE.TextureLoader();
    
    // Пытаемся загрузить текстуру
    let texture = null;
    try {
        texture = textureLoader.load(config.texturePath);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        // Улучшенные настройки повторения текстуры для реалистичности
        // Используем более разумное повторение в зависимости от типа текстуры
        let repeats;
        switch (config.name) {
            case 'grass':
                repeats = size / 20; // Трава - более крупная текстура
                break;
            case 'sand':
                repeats = size / 15; // Песок - средняя текстура
                break;
            case 'dirt':
                repeats = size / 12; // Земля - крупная текстура
                break;
            case 'concrete':
                repeats = size / 25; // Бетон - мелкая текстура
                break;
            default:
                repeats = size / 20;
        }
        
        texture.repeat.set(repeats, repeats);
        texture.anisotropy = 16; // Улучшает качество при наклонных углах
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        console.log('Текстура загружена:', config.texturePath);
    } catch (error) {
        console.warn('Не удалось загрузить текстуру:', config.texturePath, 'используем цвет без текстуры');
        texture = null;
    }
    
    const material = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: config.roughness,
        metalness: config.metalness,
        side: THREE.DoubleSide
    });
    
    // Применяем текстуру, если она загрузилась
    if (texture) {
        material.map = texture;
    }
    
    return material;
}

/**
 * Получает конфигурацию фона по типу
 * @param {String} type - Тип фона
 * @returns {Object|null} Конфигурация фона
 */
function getBackgroundConfig(type) {
    const upperType = type.toUpperCase();
    return BACKGROUND_TYPES[upperType] || BACKGROUND_TYPES.GRASS;
}

/**
 * Удаляет существующий фон из сцены
 */
function removeExistingBackground() {
    if (currentBackgroundMesh) {
        scene.remove(currentBackgroundMesh);
        if (currentBackgroundMesh.geometry) {
            currentBackgroundMesh.geometry.dispose();
        }
        if (currentBackgroundMesh.material) {
            if (Array.isArray(currentBackgroundMesh.material)) {
                currentBackgroundMesh.material.forEach(m => m.dispose());
            } else {
                currentBackgroundMesh.material.dispose();
            }
        }
        currentBackgroundMesh = null;
    }
    
    // Также удаляем все объекты с именем background_surface
    const backgroundObjects = scene.children.filter(obj =>
        obj.name === 'background_surface' || 
        (obj.userData && obj.userData.isBackground)
    );
    
    backgroundObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });
}

/**
 * Меняет тип фона
 * @param {String} newBackgroundType - Новый тип фона
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 */
export function changeBackground(newBackgroundType, width, length) {
    console.log('Меняем фон на:', newBackgroundType);
    
    // Создаем новый фон
    const newBackground = createBackground(width, length, newBackgroundType);
    
    // Сохраняем выбор в localStorage
    localStorage.setItem('selectedBackgroundType', newBackgroundType);
    
    return newBackground;
}

/**
 * Получает текущий тип фона
 * @returns {String} Текущий тип фона
 */
export function getCurrentBackgroundType() {
    return currentBackgroundType.name;
}

/**
 * Получает список доступных типов фона
 * @returns {Array} Массив доступных типов фона
 */
export function getAvailableBackgroundTypes() {
    return Object.values(BACKGROUND_TYPES);
} 