/**
 * Модуль для управления 3D-площадкой
 * Адаптирован для работы с Three.js
 */

// Импорт всех компонентов из индексного файла
import {
    playgroundWidth,
    playgroundLength,
    ground,
    groundMesh,
    createPlayground,
    loadPlayground,
    resizePlaygroundWithAnimation
} from './playground/index.js';
import { API_BASE_URL } from './api/serverConfig.js'
import { showNotification } from './utils/notifications.js';

// Реэкспорт всех переменных и функций для внешнего интерфейса
export {
    playgroundWidth,
    playgroundLength,
    ground,
    groundMesh,
    loadPlayground,
    createPlayground,
    resizePlaygroundWithAnimation
};

/**
 * Сохраняет параметры площадки в сессии
 * @param {String} modelName - Имя файла модели
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @param {String} color - Цвет площадки
 * @param {String} [background] - HDRI фон (опционально)
 * @param {String} [climateZone] - Климатическая зона (опционально)
 * @param {String} [coverage] - Покрытие площадки (опционально)
 */
export async function savePlaygroundParameters(modelName, width, length, color, background, climateZone, coverage) {
    try {
        // Получаем project_id из sessionStorage
        const userId = sessionStorage.getItem('userId');

        if (!userId) {
            throw new Error('No user ID found');
        }

        // Получаем текущую сессию
        const sessionResponse = await fetch(`${API_BASE_URL}/session/${userId}`);
        if (!sessionResponse.ok) {
            throw new Error('Failed to get session');
        }

        const { session } = await sessionResponse.json();
        const sessionData = session || { quantities: {}, placedObjects: [] };

        // Если параметры фона, климатической зоны и покрытия не переданы, получаем их из текущих настроек
        if (!background || !climateZone || !coverage) {
            try {
                const { 
                    getCurrentHdriBackground, 
                    getCurrentClimateZone, 
                    getCurrentSurfaceCoverage 
                } = await import('./playground/backgroundManager.js');
                
                background = background || getCurrentHdriBackground();
                climateZone = climateZone || getCurrentClimateZone();
                coverage = coverage || getCurrentSurfaceCoverage();
                
                console.log('Получены текущие настройки фона:', { background, climateZone, coverage });
            } catch (error) {
                console.warn('Не удалось получить текущие настройки фона, используем дефолтные:', error);
                background = background || 'textures/hdri/buikslotermeerplein_4k.exr';
                climateZone = climateZone || 'russia_cis';
                coverage = coverage || 'Трава';
            }
        }

        // Обновляем параметры площадки в сессии
        sessionData.playground = {
            type: modelName,
            width: width || 40,
            length: length || 30,
            color: color || 'серый',
            background: background,
            climateZone: climateZone,
            coverage: coverage
        };

        // Сохраняем обновленную сессию
        const saveResponse = await fetch(`${API_BASE_URL}/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, sessionData }),
        });

        if (!saveResponse.ok) {
            throw new Error('Failed to save session');
        }
        
        console.log('Параметры площадки сохранены в сессию:', sessionData.playground);
    } catch (error) {
        console.error('Error saving playground parameters:', error);
        showNotification('Ошибка при сохранении параметров площадки', true);
    }
}
