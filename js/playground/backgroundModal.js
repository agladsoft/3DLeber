/**
 * Модуль для управления модальным окном выбора фона
 */
import { changeBackground, getCurrentBackgroundType, getAvailableBackgroundTypes, setCurrentClimateZone, BACKGROUND_TYPES } from './backgroundManager.js';
import { playgroundWidth, playgroundLength } from './playgroundCore.js';
import { showNotification } from '../utils/notifications.js';
import { setHdriBackground } from '../scene/sceneCore.js';
import { getClimateZones, getHdriSettings } from '../api/climate.js';

// Кэш для загруженных данных
let cachedClimateZones = null;
let cachedHdriSettings = null;
// Восстанавливаем сохраненную климатическую зону или используем по умолчанию
let currentClimateZone = localStorage.getItem('selectedClimateZone') || 'russia_cis';

// Резервный список HDRI-фонов (если БД недоступна)
const FALLBACK_HDRI_LIST = [
    { name: 'Городской парк', file: 'textures/hdri/buikslotermeerplein_4k.exr', preview: 'textures/hdri/buikslotermeerplein_4k.png' }
];

let selectedHdriPath = FALLBACK_HDRI_LIST[0].file;
let selectedSurfaceName = 'Трава';

/**
 * Получает текущие настройки фона из сессии
 * @returns {Promise<Object>} Объект с текущими настройками
 */
async function getCurrentBackgroundSettings() {
    try {
        // Получаем userId из sessionStorage
        const userId = sessionStorage.getItem('userId');
        if (!userId) {
            console.log('No user ID found, using default settings');
            return {
                background: 'textures/hdri/buikslotermeerplein_4k.exr',
                climateZone: 'russia_cis',
                coverage: 'Трава'
            };
        }

        // Получаем сессию из API
        const { API_BASE_URL } = await import('../api/serverConfig.js');
        const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
        
        if (!sessionResponse.ok) {
            console.log('Failed to get session, using default settings');
            return {
                background: 'textures/hdri/buikslotermeerplein_4k.exr',
                climateZone: 'russia_cis',
                coverage: 'Трава'
            };
        }

        const { session } = await sessionResponse.json();
        
        if (session && session.playground) {
            console.log('Found background settings in session:', session.playground);
            return {
                background: session.playground.background || 'textures/hdri/buikslotermeerplein_4k.exr',
                climateZone: session.playground.climateZone || 'russia_cis',
                coverage: session.playground.coverage || 'Трава'
            };
        } else {
            console.log('No playground settings in session, using default settings');
            return {
                background: 'textures/hdri/buikslotermeerplein_4k.exr',
                climateZone: 'russia_cis',
                coverage: 'Трава'
            };
        }
    } catch (error) {
        console.error('Error getting current background settings:', error);
        return {
            background: 'textures/hdri/buikslotermeerplein_4k.exr',
            climateZone: 'russia_cis',
            coverage: 'Трава'
        };
    }
}

/**
 * Загружает текущие значения в UI модального окна
 */
async function loadCurrentBackgroundValues() {
    try {
        const settings = await getCurrentBackgroundSettings();
        
        console.log('Loading current background values:', settings);
        
        // Обновляем глобальные переменные
        selectedHdriPath = settings.background;
        selectedSurfaceName = settings.coverage;
        currentClimateZone = settings.climateZone;
        
        // Обновляем localStorage
        localStorage.setItem('selectedHdriPath', settings.background);
        localStorage.setItem('selectedClimateZone', settings.climateZone);
        localStorage.setItem('selectedSurfaceName', settings.coverage);
        
        // Обновляем UI после загрузки всех опций
        setTimeout(() => {
            updateBackgroundSelection(settings.coverage);
            updateClimateZoneSelection(settings.climateZone);
            updateHdriSelection(settings.background);
        }, 300);
        
        console.log('Current background values loaded successfully');
    } catch (error) {
        console.error('Error loading current background values:', error);
    }
}

/**
 * Обновляет выделение климатической зоны в UI
 * @param {string} zoneName - Название климатической зоны
 */
function updateClimateZoneSelection(zoneName) {
    const climateOptions = document.querySelectorAll('.climate-zone-option');
    climateOptions.forEach(option => {
        const optionZone = option.getAttribute('data-climate');
        if (optionZone === zoneName) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    console.log('Climate zone selection updated:', zoneName);
}

/**
 * Обновляет выделение HDRI в UI
 * @param {string} hdriPath - Путь к HDRI файлу
 */
function updateHdriSelection(hdriPath) {
    const hdriOptions = document.querySelectorAll('.hdri-option');
    hdriOptions.forEach(option => {
        const optionPath = option.getAttribute('data-hdri-path');
        if (optionPath === hdriPath) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    console.log('HDRI selection updated:', hdriPath);
}

/**
 * Получает путь к превью изображению для HDRI
 * @param {Object} hdri - Объект HDRI
 * @returns {string} Путь к превью изображению
 */
function getHdriPreviewPath(hdri) {
    // Если есть прямая ссылка на превью (из резервных данных)
    if (hdri.preview) {
        return hdri.preview;
    }
    
    // Если есть путь к HDRI файлу, создаем путь к превью
    const hdriPath = hdri.hdri_file_path || hdri.file;
    if (hdriPath) {
        // Заменяем .exr на .png для превью
        return hdriPath.replace(/\.exr$/i, '.png');
    }
    
    // Создаем путь на основе названия как последний вариант
    const displayName = hdri.hdri_display_name || hdri.name || 'default';
    const fileName = displayName.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    
    return `textures/hdri/${fileName}.png`;
}

/**
 * Устанавливает климатическую зону и обновляет доступные опции
 * @param {string} zoneName - Название климатической зоны
 */
export async function setClimateZone(zoneName) {
    if (currentClimateZone === zoneName) return;
    
    currentClimateZone = zoneName;
    // Очищаем кэш
    cachedHdriSettings = null;
    
    console.log('Changing climate zone to:', zoneName);
    
    try {
        // Обновляем настройки в backgroundManager
        setCurrentClimateZone(zoneName);
        
        // Загружаем новые настройки для выбранной зоны
        await loadHdriSettings();
        await loadSurfaceOptions();
        
        console.log('Climate zone changed successfully');
    } catch (error) {
        console.error('Error changing climate zone:', error);
    }
}

/**
 * Загружает климатические зоны из базы данных
 */
async function loadClimateZones() {
    try {
        if (cachedClimateZones) {
            updateClimateZoneOptions(cachedClimateZones);
            return cachedClimateZones;
        }
        
        const zones = await getClimateZones();
        cachedClimateZones = zones;
        console.log('Загружены климатические зоны:', zones);
        
        // Обновляем UI с климатическими зонами
        updateClimateZoneOptions(zones);
        
        return zones;
    } catch (error) {
        console.error('Ошибка загрузки климатических зон:', error);
        // При ошибке используем резервные зоны
        const fallbackZones = [
            { name: 'russia_cis', display_name: 'Россия и СНГ', is_active: true }
        ];
        updateClimateZoneOptions(fallbackZones);
        return fallbackZones;
    }
}

/**
 * Обновляет опции климатических зон в UI
 * @param {Array} zones - Массив климатических зон
 */
function updateClimateZoneOptions(zones) {
    const climateContainer = document.querySelector('.climate-zone-options');
    if (!climateContainer) {
        console.error('Climate zone container not found');
        return;
    }
    
    // Очищаем существующие опции
    climateContainer.innerHTML = '';
    
    // Создаем новые опции на основе данных из БД
    zones.forEach((zone, index) => {
        const zoneOption = document.createElement('div');
        zoneOption.className = 'climate-zone-option';
        zoneOption.setAttribute('data-climate', zone.name);
        
        // Не устанавливаем выделение здесь - это будет делать loadCurrentBackgroundValues
        // Выделение будет установлено позже на основе данных из сессии
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'climate-zone-name';
        nameSpan.textContent = zone.display_name;
        
        zoneOption.appendChild(nameSpan);
        climateContainer.appendChild(zoneOption);
        
        console.log(`Climate zone option created: ${zone.display_name} (${zone.name})`);
    });
    
    // Настраиваем обработчики событий для новых элементов
    setTimeout(() => {
        setupClimateZoneHandlers();
    }, 100);
}

/**
 * Загружает HDRI настройки для текущей климатической зоны
 */
async function loadHdriSettings() {
    try {
        const hdriSettings = await getHdriSettings(currentClimateZone);
        cachedHdriSettings = hdriSettings;
        console.log('Загружены HDRI настройки:', hdriSettings);
        
        // Обновляем UI с новыми HDRI опциями
        updateHdriOptions(hdriSettings);
        
        return hdriSettings;
    } catch (error) {
        console.error('Ошибка загрузки HDRI настроек:', error);
        console.log('Using fallback HDRI list:', FALLBACK_HDRI_LIST);
        // При ошибке используем резервные настройки
        updateHdriOptions(FALLBACK_HDRI_LIST);
        return FALLBACK_HDRI_LIST;
    }
}

/**
 * Загружает доступные поверхности для текущей климатической зоны
 */
async function loadSurfaceOptions() {
    try {
        console.log('Loading surface options for climate zone:', currentClimateZone);
        const surfaceTypes = await getAvailableBackgroundTypes();
        console.log('Загружены поверхности:', surfaceTypes);
        
        if (!surfaceTypes || surfaceTypes.length === 0) {
            console.warn('No surface types loaded, using fallback');
            // Если нет данных из БД, используем резервные значения
            const fallbackSurfaces = Object.values(BACKGROUND_TYPES).map(bg => ({
                name: bg.name,
                displayName: bg.displayName,
                texturePath: bg.texturePath,
                color: bg.color,
                roughness: bg.roughness,
                metalness: bg.metalness
            }));
            updateSurfaceOptions(fallbackSurfaces);
            return fallbackSurfaces;
        }
        
        // Обновляем UI с новыми опциями поверхности
        updateSurfaceOptions(surfaceTypes);
        
        return surfaceTypes;
    } catch (error) {
        console.error('Ошибка загрузки поверхностей:', error);
        // При ошибке используем резервные значения
        const fallbackSurfaces = Object.values(BACKGROUND_TYPES).map(bg => ({
            name: bg.name,
            displayName: bg.displayName,
            texturePath: bg.texturePath,
            color: bg.color,
            roughness: bg.roughness,
            metalness: bg.metalness
        }));
        updateSurfaceOptions(fallbackSurfaces);
        return fallbackSurfaces;
    }
}

/**
 * Обновляет HDRI опции в UI
 */
function updateHdriOptions(hdriList) {
    const hdriContainer = document.querySelector('.hdri-options');
    if (!hdriContainer) return;
    
    // Очищаем существующие опции
    hdriContainer.innerHTML = '';
    
    // Создаем новые опции на основе данных из БД
    hdriList.forEach((hdri, index) => {
        const hdriOption = document.createElement('div');
        hdriOption.className = 'hdri-option';
        const hdriPath = hdri.hdri_file_path || hdri.file;
        hdriOption.setAttribute('data-hdri', hdriPath);
        hdriOption.setAttribute('data-hdri-path', hdriPath); // Добавляем атрибут для выделения
        
        // Используем название из БД или резервное
        const displayName = hdri.hdri_display_name || hdri.name;
        
        // Создаем изображение элемент
        const imgElement = document.createElement('img');
        const previewPath = getHdriPreviewPath(hdri);
        imgElement.src = previewPath;
        imgElement.alt = displayName;
        
        // Обработка ошибки загрузки изображения
        imgElement.onerror = function() {
            console.warn(`Failed to load HDRI preview: ${previewPath}`);
            // Заменяем на иконку или цветной блок
            this.style.display = 'none';
            const placeholder = document.createElement('div');
            placeholder.className = 'hdri-placeholder';
            placeholder.style.cssText = `
                width: 80px;
                height: 50px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 12px;
                text-align: center;
            `;
            placeholder.textContent = 'HDRI';
            this.parentNode.insertBefore(placeholder, this);
        };
        
        // Добавляем успешную загрузку для отладки
        imgElement.onload = function() {
            console.log(`Successfully loaded HDRI preview: ${previewPath}`);
        };
        
        const spanElement = document.createElement('span');
        spanElement.textContent = displayName;
        
        hdriOption.appendChild(imgElement);
        hdriOption.appendChild(spanElement);
        
        // Не устанавливаем выделение здесь - это будет делать loadCurrentBackgroundValues
        // Выделение будет установлено позже на основе данных из сессии
        
        hdriContainer.appendChild(hdriOption);
    });
    
    // Переназначаем обработчики событий для новых элементов
    setupHdriHandlers();
}

/**
 * Обновляет опции поверхности в UI
 */
function updateSurfaceOptions(surfaceTypes) {
    console.log('Updating surface options with:', surfaceTypes);
    const surfaceContainer = document.querySelector('.background-options');
    if (!surfaceContainer) {
        console.error('Surface container not found');
        return;
    }
    
    // Очищаем существующие опции
    surfaceContainer.innerHTML = '';
    
    // Создаем новые опции на основе данных из БД
    surfaceTypes.forEach((surface, index) => {
        console.log(`Creating surface option ${index}:`, surface);
        
        const surfaceOption = document.createElement('div');
        surfaceOption.className = 'background-option';
        surfaceOption.setAttribute('data-background', surface.displayName);
        
        // Создаем превью с текстурой из базы данных
        const previewDiv = document.createElement('div');
        previewDiv.className = 'background-preview';
        previewDiv.style.backgroundColor = surface.color;
        
        // Пытаемся загрузить текстуру как фоновое изображение
        if (surface.texturePath) {
            previewDiv.style.backgroundImage = `url('${surface.texturePath}')`;
            previewDiv.style.backgroundSize = 'cover';
            previewDiv.style.backgroundPosition = 'center';
            previewDiv.style.backgroundRepeat = 'no-repeat';
        }
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'background-name';
        nameSpan.textContent = surface.displayName;
        
        surfaceOption.appendChild(previewDiv);
        surfaceOption.appendChild(nameSpan);
        
        surfaceContainer.appendChild(surfaceOption);
        
        console.log(`Surface option created: ${surface.displayName}`);
    });
    
    // Используем setTimeout чтобы дать DOM время для обновления
    setTimeout(() => {
        setupSurfaceHandlers();
    }, 100);
}

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
    
    // Убираем активное состояние кнопки "Выбор фона"
    const backgroundButton = document.getElementById('backgroundButton');
    if (backgroundButton) {
        backgroundButton.classList.remove('active');
    }
    
    console.log('Модальное окно выбора фона закрыто');
}

/**
 * Инициализирует модальное окно выбора фона
 */
async function initializeBackgroundModal() {
    try {
        // Загружаем климатические зоны
        await loadClimateZones();
        
        // Загружаем HDRI настройки для текущей зоны
        await loadHdriSettings();
        
        // Загружаем доступные поверхности для текущей зоны
        await loadSurfaceOptions();
        
        // Загружаем текущие значения из сессии
        await loadCurrentBackgroundValues();
        
        console.log('Модальное окно выбора фона инициализировано');
    } catch (error) {
        console.error('Ошибка инициализации модального окна:', error);
        // При ошибке инициализируем с резервными значениями
        initializeFallbackModal();
    }
}

/**
 * Инициализация с резервными значениями при ошибке загрузки из БД
 */
async function initializeFallbackModal() {
    try {
        // Пытаемся загрузить текущие значения из сессии даже при ошибке БД
        await loadCurrentBackgroundValues();
    } catch (error) {
        console.error('Error loading current values in fallback mode:', error);
        
        // Используем дефолтные значения
        const currentSurface = getCurrentBackgroundType();
        selectedSurfaceName = currentSurface;
        updateBackgroundSelection(currentSurface);
        
        const hdriOptions = document.querySelectorAll('.hdri-option');
        hdriOptions.forEach((el, idx) => {
            if (idx === 0) el.classList.add('selected');
            else el.classList.remove('selected');
        });
    }
    
    console.log('Модальное окно инициализировано с резервными значениями');
}

/**
 * Обновляет визуальное выделение выбранной поверхности
 * @param {String} surfaceName - Название выбранной поверхности
 */
function updateBackgroundSelection(surfaceName) {
    console.log('Updating background selection for:', surfaceName);
    
    // Убираем выделение со всех опций
    const options = document.querySelectorAll('.background-option');
    console.log('Found background options:', options.length);
    
    options.forEach(option => {
        option.classList.remove('selected');
    });
    
    // Выделяем выбранную опцию
    const selectedOption = document.querySelector(`[data-background="${surfaceName}"]`);
    console.log('Selected option found:', selectedOption);
    
    if (selectedOption) {
        selectedOption.classList.add('selected');
        console.log('Selection applied to:', surfaceName);
    } else {
        console.warn('No option found for surface:', surfaceName);
    }
}

/**
 * Настраивает обработчики событий для модального окна
 */
function setupBackgroundModalHandlers() {
    // Обработчики для климатических зон
    setupClimateZoneHandlers();
    
    // Обработчики для поверхностей
    setupSurfaceHandlers();
    
    // Обработчики для HDRI
    setupHdriHandlers();
    
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
        
        console.log('Применяем изменение фона на:', selectedHdriPath, 'с покрытием:', selectedSurfaceName, 'с размерами:', width, 'x', length);
        
        // Устанавливаем климатическую зону в backgroundManager
        setCurrentClimateZone(currentClimateZone);
        
        // Меняем HDRI фон
        await setHdriBackground(selectedHdriPath, currentClimateZone);
        // Меняем покрытие площадки
        await changeBackground(selectedSurfaceName, width, length);
        
        // Сохраняем настройки в localStorage
        localStorage.setItem('selectedHdriPath', selectedHdriPath);
        localStorage.setItem('selectedClimateZone', currentClimateZone);
        localStorage.setItem('selectedSurfaceName', selectedSurfaceName);
        
        // Сохраняем настройки в сессию
        try {
            const { savePlaygroundParameters } = await import('../playground.js');
            const currentColor = window.selectedPlaygroundColor || 'серый';
            
            await savePlaygroundParameters(
                'rubber', // тип площадки
                width,
                length,
                currentColor,
                selectedHdriPath, // HDRI фон
                currentClimateZone, // климатическая зона
                selectedSurfaceName // покрытие
            );
            
            console.log('Настройки фона сохранены в сессию:', {
                background: selectedHdriPath,
                climateZone: currentClimateZone,
                coverage: selectedSurfaceName
            });
        } catch (saveError) {
            console.error('Ошибка при сохранении настроек фона в сессию:', saveError);
        }
        
        // Показываем уведомление об успехе
        const displayName = await getBackgroundDisplayName(selectedSurfaceName);
        showNotification(`Фон изменен на "${displayName}"`, 'success');
        
        // Генерируем событие изменения фона для обновления других модулей
        const event = new CustomEvent('backgroundChanged', {
            detail: {
                background: selectedHdriPath,
                climateZone: currentClimateZone,
                coverage: selectedSurfaceName,
                displayName: displayName
            }
        });
        document.dispatchEvent(event);
        
        // Закрываем модальное окно
        hideBackgroundModal();
        
    } catch (error) {
        console.error('Ошибка при изменении фона:', error);
        showNotification('Ошибка при изменении фона', 'error');
    }
}

/**
 * Получает отображаемое имя поверхности
 * @param {String} surfaceName - Название поверхности
 * @returns {String} Отображаемое имя
 */
async function getBackgroundDisplayName(surfaceName) {
    try {
        // Пытаемся получить название из загруженных поверхностей
        const surfaceTypes = await getAvailableBackgroundTypes();
        const surface = surfaceTypes.find(s => s.displayName === surfaceName || s.name === surfaceName);
        return surface ? surface.displayName : surfaceName;
    } catch (error) {
        console.error('Error getting background display name:', error);
        return surfaceName;
    }
}

/**
 * Настраивает обработчики для климатических зон
 */
function setupClimateZoneHandlers() {
    console.log('Setting up climate zone handlers...');
    const climateOptions = document.querySelectorAll('.climate-zone-option');
    console.log('Found climate zone options:', climateOptions.length);
    
    climateOptions.forEach((option, index) => {
        // Удаляем старые обработчики, создавая новый элемент
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
        
        // Добавляем новый обработчик
        newOption.addEventListener('click', async function(e) {
            console.log('Climate zone clicked:', this.getAttribute('data-climate'));
            e.preventDefault();
            e.stopPropagation();
            
            const zoneName = this.getAttribute('data-climate');
            const displayName = this.querySelector('.climate-zone-name').textContent;
            
            // Убираем выделение со всех зон
            document.querySelectorAll('.climate-zone-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Выделяем выбранную зону
            this.classList.add('selected');
            
            console.log(`Selected climate zone: ${displayName} (${zoneName})`);
            
            // Сохраняем выбор в localStorage
            localStorage.setItem('selectedClimateZone', zoneName);
            
            // Меняем климатическую зону
            await setClimateZone(zoneName);
        });
        
        console.log(`Handler added to climate zone ${index}: ${newOption.getAttribute('data-climate')}`);
    });
}

/**
 * Настраивает обработчики для поверхностей
 */
function setupSurfaceHandlers() {
    console.log('Setting up surface handlers...');
    const surfaceOptions = document.querySelectorAll('.background-option');
    console.log('Found surface options:', surfaceOptions.length);
    
    surfaceOptions.forEach((option, index) => {
        // Удаляем старые обработчики, создавая новый элемент
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
        
        // Добавляем новый обработчик
        newOption.addEventListener('click', function(e) {
            console.log('Surface clicked:', this.getAttribute('data-background'));
            e.preventDefault();
            e.stopPropagation();
            
            const surfaceName = this.getAttribute('data-background');
            selectedSurfaceName = surfaceName;
            
            // Убираем выделение со всех поверхностей
            document.querySelectorAll('.background-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Выделяем выбранную поверхность
            this.classList.add('selected');
            
            console.log('Selected surface:', surfaceName);
        });
        
        console.log(`Handler added to surface ${index}: ${newOption.getAttribute('data-background')}`);
    });
}

/**
 * Настраивает обработчики для HDRI
 */
function setupHdriHandlers() {
    const hdriOptions = document.querySelectorAll('.hdri-option');
    hdriOptions.forEach(option => {
        // Удаляем старые обработчики
        const newOption = option.cloneNode(true);
        option.parentNode.replaceChild(newOption, option);
        
        // Добавляем новый обработчик
        newOption.addEventListener('click', function() {
            // Убираем выделение со всех HDRI
            document.querySelectorAll('.hdri-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Выделяем выбранную опцию
            this.classList.add('selected');
            selectedHdriPath = this.getAttribute('data-hdri');
        });
    });
} 

// Добавляем обработчик события для обновления значений в модальном окне
document.addEventListener('DOMContentLoaded', () => {
    // Обработчик события изменения фона
    document.addEventListener('backgroundChanged', async (e) => {
        console.log('Background changed event received:', e.detail);
        
        // Если модальное окно открыто, обновляем значения
        const modal = document.getElementById('backgroundModal');
        if (modal && modal.style.display === 'block') {
            console.log('Background modal is open, updating values');
            await loadCurrentBackgroundValues();
        }
    });
    
    // Обработчик события изменения сессии
    document.addEventListener('sessionChanged', async (e) => {
        console.log('Session changed event received:', e.detail);
        
        // Если модальное окно открыто, обновляем значения
        const modal = document.getElementById('backgroundModal');
        if (modal && modal.style.display === 'block') {
            console.log('Background modal is open, updating values from session');
            await loadCurrentBackgroundValues();
        }
    });
}); 