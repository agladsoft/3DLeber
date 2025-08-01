/**
 * API модуль для работы с климатическими данными
 */
import { API_BASE_URL } from './serverConfig.js';

/**
 * Получает все климатические зоны из базы данных
 * @returns {Promise<Array>} Массив климатических зон
 */
export async function getClimateZones() {
    try {
        console.log('Fetching climate zones from:', `${API_BASE_URL}/climate/zones`);
        const response = await fetch(`${API_BASE_URL}/climate/zones`);
        if (!response.ok) {
            console.warn(`Climate zones API not available (${response.status}), using fallback`);
            return getFallbackClimateZones();
        }
        const data = await response.json();
        return data.zones || [];
    } catch (error) {
        console.error('Error fetching climate zones:', error);
        console.log('Using fallback climate zones');
        return getFallbackClimateZones();
    }
}

/**
 * Резервные климатические зоны при недоступности API
 */
function getFallbackClimateZones() {
    return [
        {
            id: 1,
            name: 'russia_cis',
            display_name: 'Россия и СНГ',
            description: 'Климатическая зона для России и стран СНГ с умеренным климатом',
            is_active: true
        }
    ];
}

/**
 * Получает настройки окружения для климатической зоны
 * @param {string} zoneName - Название климатической зоны
 * @returns {Promise<Array>} Массив настроек окружения
 */
export async function getClimateEnvironmentSettings(zoneName) {
    try {
        const response = await fetch(`${API_BASE_URL}/climate/environment/${encodeURIComponent(zoneName)}`);
        if (!response.ok) {
            console.warn(`Climate environment settings API not available (${response.status}), using fallback`);
            return getFallbackEnvironmentSettings();
        }
        const data = await response.json();
        return data.settings || [];
    } catch (error) {
        console.error('Error fetching climate environment settings:', error);
        console.log('Using fallback environment settings for:', zoneName);
        return getFallbackEnvironmentSettings();
    }
}

/**
 * Резервные настройки окружения
 */
function getFallbackEnvironmentSettings() {
    const baseSettings = {
        camera_fov: 75.0,
        camera_near: 0.1,
        camera_far: 1000.0,
        background_size: 1000.0,
        zone_display_name: 'Россия и СНГ'
    };
    
    return [
        { ...baseSettings, hdri_file_path: 'textures/hdri/buikslotermeerplein_4k.exr', hdri_display_name: 'Городской парк' }
    ];
}

/**
 * Получает модели, доступные для климатической зоны
 * @param {string} zoneName - Название климатической зоны
 * @returns {Promise<Array>} Массив моделей
 */
export async function getModelsForClimate(zoneName) {
    try {
        const response = await fetch(`${API_BASE_URL}/climate/models/${encodeURIComponent(zoneName)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.models || [];
    } catch (error) {
        console.error('Error fetching models for climate:', error);
        throw error;
    }
}

/**
 * Получает настройки поверхности для климатической зоны
 * @param {string} zoneName - Название климатической зоны
 * @returns {Promise<Array>} Массив настроек поверхности
 */
export async function getSurfaceSettings(zoneName) {
    try {
        const response = await fetch(`${API_BASE_URL}/climate/surfaces/${encodeURIComponent(zoneName)}`);
        if (!response.ok) {
            console.warn(`Surface settings API not available (${response.status}), using fallback`);
            return getFallbackSurfaceSettings();
        }
        const data = await response.json();
        return data.surfaces || [];
    } catch (error) {
        console.error('Error fetching surface settings:', error);
        console.log('Using fallback surface settings for:', zoneName);
        return getFallbackSurfaceSettings();
    }
}

/**
 * Резервные настройки поверхности
 */
function getFallbackSurfaceSettings() {
    // Базовые поверхности доступны для всех климатических зон
    return [
        {
            surface_texture_path: 'textures/ground/grass_texture.png',
            surface_display_name: 'Трава',
            surface_color: '#7CB342',
            surface_roughness: 0.8,
            surface_metalness: 0.0,
            texture_repeat_factor: 20.0
        }
    ];
}

/**
 * Получает HDRI настройки для климатической зоны
 * @param {string} zoneName - Название климатической зоны
 * @returns {Promise<Array>} Массив HDRI настроек
 */
export async function getHdriSettings(zoneName) {
    try {
        const response = await fetch(`${API_BASE_URL}/climate/hdri/${encodeURIComponent(zoneName)}`);
        if (!response.ok) {
            console.warn(`HDRI settings API not available (${response.status}), using fallback`);
            return getFallbackHdriSettings();
        }
        const data = await response.json();
        return data.hdri || [];
    } catch (error) {
        console.error('Error fetching HDRI settings:', error);
        console.log('Using fallback HDRI settings for:', zoneName);
        return getFallbackHdriSettings();
    }
}

/**
 * Резервные HDRI настройки
 */
function getFallbackHdriSettings() {
    return [
        { hdri_file_path: 'textures/hdri/buikslotermeerplein_4k.exr', hdri_display_name: 'Городской парк', tone_mapping_exposure: 0.5 }
    ];
}

/**
 * Получает все комбинации настроек для климатической зоны (HDRI + поверхность)
 * @param {string} zoneName - Название климатической зоны
 * @returns {Promise<Array>} Массив комбинаций настроек
 */
export async function getClimateSettings(zoneName) {
    try {
        const response = await fetch(`${API_BASE_URL}/climate/settings/${encodeURIComponent(zoneName)}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.settings || [];
    } catch (error) {
        console.error('Error fetching climate settings:', error);
        throw error;
    }
}