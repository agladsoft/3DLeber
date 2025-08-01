/**
 * Модуль для управления фоном и текстурами площадки
 */
import * as THREE from 'three';
import { scene } from '../scene.js';
import { getSurfaceSettings } from '../api/climate.js';

// Кэш для загруженных настроек поверхности
let cachedSurfaceSettings = null;
let currentClimateZone = 'russia_cis'; // Зона по умолчанию

// Конфигурация доступных фонов и текстур (резервная, если БД недоступна)
export const BACKGROUND_TYPES = {
    GRASS: {
        name: 'grass',
        displayName: 'Трава',
        texturePath: 'textures/ground/grass_texture.png',
        color: '#7CB342',
        roughness: 0.8,
        metalness: 0.0
    }
};

/**
 * Устанавливает текущую климатическую зону
 * @param {string} zoneName - Название климатической зоны
 */
export function setCurrentClimateZone(zoneName) {
    currentClimateZone = zoneName;
    // Очищаем кэш при смене зоны
    cachedSurfaceSettings = null;
    console.log('Climate zone changed to:', zoneName);
}

/**
 * Получает настройки поверхности из базы данных
 * @returns {Promise<Array>} Массив настроек поверхности
 */
async function loadSurfaceSettingsFromDB() {
    try {
        if (cachedSurfaceSettings) {
            return cachedSurfaceSettings;
        }
        
        const settings = await getSurfaceSettings(currentClimateZone);
        cachedSurfaceSettings = settings;
        console.log('Loaded surface settings from DB:', settings);
        return settings;
    } catch (error) {
        console.error('Error loading surface settings from DB:', error);
        // Возвращаем резервные настройки при ошибке
        return Object.values(BACKGROUND_TYPES);
    }
}

// Текущий тип фона
let currentBackgroundType = BACKGROUND_TYPES.GRASS;
let currentBackgroundMesh = null;

/**
 * Инициализирует менеджер фона
 */
export async function initBackgroundManager() {
    try {
        // Восстанавливаем сохраненную поверхность из localStorage
        const savedSurface = localStorage.getItem('selectedSurfaceName');
        if (savedSurface) {
            // Пытаемся загрузить конфигурацию из БД
            const backgroundConfig = await getBackgroundConfig(savedSurface);
            if (backgroundConfig) {
                currentBackgroundType = backgroundConfig;
            }
        }
        
        // Если не удалось загрузить, используем трavu по умолчанию
        if (!currentBackgroundType || !currentBackgroundType.name) {
            currentBackgroundType = BACKGROUND_TYPES.GRASS;
        }
        
        console.log('Background manager initialized with surface:', currentBackgroundType.displayName || currentBackgroundType.name);
    } catch (error) {
        console.error('Error initializing background manager:', error);
        currentBackgroundType = BACKGROUND_TYPES.GRASS;
        console.log('Background manager initialized with fallback surface:', currentBackgroundType.name);
    }
}

/**
 * Создает фон с указанным типом
 * @param {Number} width - Ширина основной площадки
 * @param {Number} length - Длина основной площадки
 * @param {String} surfaceName - Название поверхности
 * @returns {Promise<THREE.Mesh>} Созданный фон
 */
export async function createBackground(width, length, surfaceName = 'Трава') {
    console.log('Создаем фон:', surfaceName);
    
    try {
        // Удаляем существующий фон
        removeExistingBackground();
        
        // Получаем конфигурацию для выбранной поверхности
        const backgroundConfig = await getBackgroundConfig(surfaceName);
        if (!backgroundConfig) {
            console.warn('Неизвестная поверхность:', surfaceName, 'используем траву');
            backgroundConfig = BACKGROUND_TYPES.GRASS;
        }
        
        // Обновляем текущий тип
        currentBackgroundType = backgroundConfig;
        
        // Получаем размер фона из БД
        let size = 1000; // дефолтный размер
        try {
            const { getBackgroundSettings } = await import('../api/climate.js');
            const backgroundSettings = await getBackgroundSettings(currentClimateZone, surfaceName);
            if (backgroundSettings && backgroundSettings.backgroundSize) {
                size = backgroundSettings.backgroundSize;
                console.log('📐 Размер фона загружен из БД:', size, 'для поверхности:', surfaceName);
            }
        } catch (error) {
            console.warn('Не удалось загрузить размер фона из БД, используем дефолтный:', error);
        }
        
        // Создаем геометрию круга с большим количеством сегментов для гладкости
        const circleGeometry = new THREE.CircleGeometry(size / 2, 128);
        
        // Создаем материал для фона с настройками из БД
        const material = await createBackgroundMaterial(backgroundConfig, size, currentClimateZone, surfaceName);
        
        // Создаем меш фона
        const backgroundMesh = new THREE.Mesh(circleGeometry, material);
        
        // Поворачиваем и позиционируем круг
        backgroundMesh.rotation.x = -Math.PI / 2;
        backgroundMesh.position.y = -0.1;
        backgroundMesh.receiveShadow = true;
        backgroundMesh.name = "background_surface";
        
        // Добавляем информацию для предотвращения выбора
        backgroundMesh.userData = {
            isGround: true,
            nonInteractive: true,
            isBackground: true,
            surfaceName: surfaceName
        };
        
        // Добавляем фон в сцену
        scene.add(backgroundMesh);
        currentBackgroundMesh = backgroundMesh;
        
        console.log('Фон создан:', surfaceName);
        return backgroundMesh;
    } catch (error) {
        console.error('Ошибка создания фона:', error);
        // При ошибке создаем базовый фон
        return await createBasicBackground();
    }
}

/**
 * Создает базовый фон при ошибке загрузки из БД
 * @private
 */
async function createBasicBackground() {
    const backgroundConfig = BACKGROUND_TYPES.GRASS;
    currentBackgroundType = backgroundConfig;
    
    // Получаем размер из БД или используем дефолтный
    let size = 1000;
    try {
        const { getBackgroundSettings } = await import('../api/climate.js');
        const backgroundSettings = await getBackgroundSettings(currentClimateZone, 'Трава');
        if (backgroundSettings && backgroundSettings.backgroundSize) {
            size = backgroundSettings.backgroundSize;
            console.log('📐 Размер базового фона загружен из БД:', size);
        }
    } catch (error) {
        console.warn('Не удалось загрузить размер базового фона из БД, используем дефолтный');
    }
    
    const circleGeometry = new THREE.CircleGeometry(size / 2, 128);
    const material = await createBackgroundMaterial(backgroundConfig, size, currentClimateZone, 'Трава');
    const backgroundMesh = new THREE.Mesh(circleGeometry, material);
    
    backgroundMesh.rotation.x = -Math.PI / 2;
    backgroundMesh.position.y = -0.1;
    backgroundMesh.receiveShadow = true;
    backgroundMesh.name = "background_surface";
    backgroundMesh.userData = {
        isGround: true,
        nonInteractive: true,
        isBackground: true,
        surfaceName: 'Трава'
    };
    
    scene.add(backgroundMesh);
    currentBackgroundMesh = backgroundMesh;
    
    return backgroundMesh;
}

/**
 * Создает материал для фона
 * @param {Object} config - Конфигурация фона
 * @param {Number} size - Размер фона
 * @param {String} climateZone - Климатическая зона
 * @param {String} surfaceName - Название поверхности
 * @returns {Promise<THREE.Material>} Материал для фона
 */
async function createBackgroundMaterial(config, size, climateZone, surfaceName) {
    const textureLoader = new THREE.TextureLoader();
    
    // Получаем настройки текстуры из БД
    let textureRepeatFactor = 20.0; // дефолтное значение
    try {
        const { getBackgroundSettings } = await import('../api/climate.js');
        const backgroundSettings = await getBackgroundSettings(climateZone, surfaceName);
        if (backgroundSettings && backgroundSettings.textureRepeatFactor) {
            textureRepeatFactor = backgroundSettings.textureRepeatFactor;
            console.log('🎨 Коэффициент повторения текстуры загружен из БД:', textureRepeatFactor, 'для поверхности:', surfaceName);
        }
    } catch (error) {
        console.warn('Не удалось загрузить настройки текстуры из БД, используем дефолтные');
    }
    
    // Пытаемся загрузить текстуру
    let texture = null;
    try {
        texture = textureLoader.load(config.texturePath);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        
        // Используем коэффициент повторения из БД
        const repeats = size / textureRepeatFactor;
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
 * @param {String} surfaceName - Название поверхности
 * @returns {Promise<Object|null>} Конфигурация фона
 */
async function getBackgroundConfig(surfaceName) {
    try {
        const surfaceSettings = await loadSurfaceSettingsFromDB();
        
        // Ищем настройки по названию поверхности
        const config = surfaceSettings.find(setting => 
            setting.surface_display_name === surfaceName ||
            setting.surface_display_name.toLowerCase() === surfaceName.toLowerCase()
        );
        
        if (config) {
            return {
                name: surfaceName.toLowerCase().replace(/\s+/g, '_'),
                displayName: config.surface_display_name,
                texturePath: config.surface_texture_path,
                color: config.surface_color,
                roughness: parseFloat(config.surface_roughness),
                metalness: parseFloat(config.surface_metalness),
                repeatFactor: parseFloat(config.texture_repeat_factor)
            };
        }
        
        // Если не найдено в БД, используем резервные настройки
        const upperType = surfaceName.toUpperCase();
        return BACKGROUND_TYPES[upperType] || BACKGROUND_TYPES.GRASS;
    } catch (error) {
        console.error('Error getting background config:', error);
        // При ошибке возвращаем резервные настройки
        const upperType = surfaceName.toUpperCase();
        return BACKGROUND_TYPES[upperType] || BACKGROUND_TYPES.GRASS;
    }
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
 * @param {String} surfaceName - Название поверхности
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @returns {Promise<THREE.Mesh>} Новый фон
 */
export async function changeBackground(surfaceName, width, length) {
    console.log('Меняем фон на:', surfaceName);
    
    try {
        // Создаем новый фон
        const newBackground = await createBackground(width, length, surfaceName);
        
        // Сохраняем выбор в localStorage
        localStorage.setItem('selectedSurfaceName', surfaceName);
        
        return newBackground;
    } catch (error) {
        console.error('Ошибка смены фона:', error);
        throw error;
    }
}

/**
 * Получает текущую поверхность
 * @returns {String} Название текущей поверхности
 */
export function getCurrentBackgroundType() {
    return currentBackgroundType.displayName || currentBackgroundType.name;
}

/**
 * Получает текущую климатическую зону
 * @returns {String} Название текущей климатической зоны
 */
export function getCurrentClimateZone() {
    return currentClimateZone;
}

/**
 * Получает текущий HDRI фон из localStorage или возвращает дефолтный
 * @returns {String} Путь к текущему HDRI фону
 */
export function getCurrentHdriBackground() {
    // Пытаемся получить из localStorage
    const savedHdri = localStorage.getItem('selectedHdriPath');
    if (savedHdri) {
        return savedHdri;
    }
    
    // Возвращаем дефолтный HDRI
    return 'textures/hdri/buikslotermeerplein_4k.exr';
}

/**
 * Получает текущее покрытие площадки из localStorage или возвращает дефолтное
 * @returns {String} Название текущего покрытия
 */
export function getCurrentSurfaceCoverage() {
    // Пытаемся получить из localStorage
    const savedSurface = localStorage.getItem('selectedSurfaceName');
    if (savedSurface) {
        return savedSurface;
    }
    
    // Возвращаем дефолтное покрытие
    return 'Трава';
}

/**
 * Восстанавливает фон из сохраненных настроек сессии
 * @param {Object} playgroundSettings - Настройки площадки из сессии
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 */
export async function restoreBackgroundFromSession(playgroundSettings, width, length) {
    try {
        if (!playgroundSettings) {
            console.log('Нет настроек фона для восстановления, используем дефолтные');
            return;
        }
        
        const { background, climateZone, coverage } = playgroundSettings;
        
        console.log('Восстанавливаем фон из сессии:', { background, climateZone, coverage });
        
        // Устанавливаем климатическую зону
        if (climateZone) {
            setCurrentClimateZone(climateZone);
            localStorage.setItem('selectedClimateZone', climateZone);
        }
        
        // Восстанавливаем HDRI фон
        if (background) {
            localStorage.setItem('selectedHdriPath', background);
            try {
                const { setHdriBackground } = await import('../scene/sceneCore.js');
                await setHdriBackground(background, climateZone);
                console.log('HDRI фон восстановлен:', background);
            } catch (hdriError) {
                console.error('Ошибка при восстановлении HDRI фона:', hdriError);
            }
        }
        
        // Восстанавливаем покрытие площадки
        if (coverage) {
            localStorage.setItem('selectedSurfaceName', coverage);
            try {
                await changeBackground(coverage, width, length);
                console.log('Покрытие площадки восстановлено:', coverage);
            } catch (coverageError) {
                console.error('Ошибка при восстановлении покрытия площадки:', coverageError);
            }
        }
        
        console.log('Фон успешно восстановлен из сессии');
        
        // Генерируем событие восстановления фона для обновления других модулей
        const event = new CustomEvent('backgroundChanged', {
            detail: {
                background: playgroundSettings.background,
                climateZone: playgroundSettings.climateZone,
                coverage: playgroundSettings.coverage,
                restored: true
            }
        });
        document.dispatchEvent(event);
    } catch (error) {
        console.error('Ошибка при восстановлении фона из сессии:', error);
    }
}

/**
 * Получает список доступных поверхностей для текущей климатической зоны
 * @returns {Promise<Array>} Массив доступных поверхностей
 */
export async function getAvailableBackgroundTypes() {
    try {
        const surfaceSettings = await loadSurfaceSettingsFromDB();
        
        // Конвертируем настройки БД в формат, совместимый со старым API
        return surfaceSettings.map(setting => ({
            name: setting.surface_display_name.toLowerCase().replace(/\s+/g, '_'),
            displayName: setting.surface_display_name,
            texturePath: setting.surface_texture_path,
            color: setting.surface_color,
            roughness: parseFloat(setting.surface_roughness),
            metalness: parseFloat(setting.surface_metalness),
            repeatFactor: parseFloat(setting.texture_repeat_factor)
        }));
    } catch (error) {
        console.error('Error getting available background types:', error);
        // При ошибке возвращаем резервные настройки
        return Object.values(BACKGROUND_TYPES);
    }
}

/**
 * Получает размер фона для текущей климатической зоны и поверхности
 * @param {string} surfaceName - Название поверхности
 * @returns {Promise<number>} Размер фона
 */
export async function getBackgroundSize(surfaceName = null) {
    try {
        const { getBackgroundSettings } = await import('../api/climate.js');
        const backgroundSettings = await getBackgroundSettings(
            currentClimateZone, 
            surfaceName || getCurrentBackgroundType()
        );
        
        if (backgroundSettings && backgroundSettings.backgroundSize) {
            return backgroundSettings.backgroundSize;
        }
        
        return 1000.0; // дефолтный размер
    } catch (error) {
        console.warn('Не удалось получить размер фона из БД:', error);
        return 1000.0;
    }
} 