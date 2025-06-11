/**
 * Модуль для управления безопасными зонами и удалением нежелательных элементов
 */
import { scene } from '../scene.js';

// Инициализируем состояние видимости безопасных зон из localStorage
// По умолчанию показаны, если нет сохраненного состояния
let safetyZonesVisible = localStorage.getItem('safetyZoneHidden') !== 'true';

/**
 * Переключает видимость безопасных зон
 * @returns {boolean} Новое состояние видимости
 */
export function toggleSafetyZones() {
    safetyZonesVisible = !safetyZonesVisible;
    
    if (safetyZonesVisible) {
        showAllSafetyZones();
    } else {
        removeAllSafetyZones();
    }
    
    return safetyZonesVisible;
}

/**
 * Показывает все элементы безопасной зоны
 */
export function showAllSafetyZones() {
    // Показываем все объекты с именем, заканчивающимся на safety_zone в Three.js сцене
    if (scene) {
        scene.traverse((object) => {
            if (object.isMesh && object.name && object.name.endsWith('safety_zone')) {
                object.visible = true;
            }
        });
    }
}

/**
 * Удаляет все элементы безопасной зоны из DOM и Three.js сцены
 */
export function removeAllSafetyZones() {
    // Удаляем все объекты с именем, заканчивающимся на safety_zone из Three.js сцены
    removeSafetyZonesFromScene();
}

/**
 * Удаляет объекты безопасной зоны из Three.js сцены
 */
function removeSafetyZonesFromScene() {
    if (scene) {
        scene.traverse((object) => {
            if (object.isMesh && object.name && object.name.endsWith('safety_zone')) {
                object.visible = false;
            }
        });
    }
}

/**
 * Проверяет и обновляет видимость безопасных зон
 * Эта функция должна вызываться при загрузке новых моделей или изменении сцены
 */
export function updateSafetyZonesVisibility() {
    if (safetyZonesVisible) {
        showAllSafetyZones();
    } else {
        removeAllSafetyZones();
    }
}

/**
 * Синхронизирует внутреннее состояние с localStorage
 * Вызывается при инициализации UI
 */
export function syncSafetyZonesState() {
    const isHidden = localStorage.getItem('safetyZoneHidden') === 'true';
    safetyZonesVisible = !isHidden;
}
