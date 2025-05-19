/**
 * Модуль для управления безопасными зонами и удаления нежелательных элементов
 */

// Состояние видимости безопасных зон
let safetyZonesVisible = true;

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
function showAllSafetyZones() {
    // Показываем все объекты с именем, заканчивающимся на safety_zone в Three.js сцене
    if (window.app && window.app.scene) {
        window.app.scene.traverse((object) => {
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
    if (window.app && window.app.scene) {
        window.app.scene.traverse((object) => {
            if (object.isMesh && object.name && object.name.endsWith('safety_zone')) {
                object.visible = false;
            }
        });
    }
}
