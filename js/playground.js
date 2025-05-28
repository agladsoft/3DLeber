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
 */
export async function savePlaygroundParameters(modelName, width, length, color) {
    try {
        // Получаем user_id из models.json
        const response = await fetch('models.json');
        const data = await response.json();
        const userId = data.user_id;

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

        // Обновляем параметры площадки в сессии
        sessionData.playground = {
            type: modelName,
            width: width || 10,
            length: length || 10,
            color: color || 'серый'
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
    } catch (error) {
        console.error('Error saving playground parameters:', error);
        showNotification('Ошибка при сохранении параметров площадки', true);
    }
}
