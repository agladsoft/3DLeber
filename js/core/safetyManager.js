/**
 * Модуль для управления безопасными зонами и удаления нежелательных элементов
 */

/**
 * Удаляет все элементы безопасной зоны из DOM и Three.js сцены
 */
export function removeAllSafetyZones() {
    // Удаляем все элементы с классом safety-zone из DOM
    removeSafetyZonesFromDOM();
    
    // Удаляем все скрипты, которые могут создавать желтые прямоугольники
    removeUnsafeScripts();
    
    // Удаляем все объекты с желтым цветом из Three.js сцены
    removeSafetyZonesFromScene();
}

/**
 * Удаляет элементы безопасной зоны из DOM
 */
function removeSafetyZonesFromDOM() {
    document.querySelectorAll('.safety-zone, [class*="safe"], [class*="Safe"]').forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
    });
}

/**
 * Удаляет скрипты, которые могут создавать нежелательные элементы
 */
function removeUnsafeScripts() {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
        if (script.textContent && 
            (script.textContent.includes('safety') || 
             script.textContent.includes('SafeZone') || 
             script.textContent.includes('safeZone') ||
             script.textContent.includes('safeArea'))) {
            
            // Вместо удаления скрипта (что может вызвать ошибки), 
            // добавляем код для удаления созданных им элементов
            const cleanupScript = document.createElement('script');
            cleanupScript.textContent = `
                // Удаляем все элементы с желтым цветом
                document.querySelectorAll('*').forEach(el => {
                    const style = window.getComputedStyle(el);
                    if (style.backgroundColor === 'rgb(255, 255, 0)' || 
                        style.backgroundColor === '#ffff00' || 
                        style.backgroundColor === 'yellow' ||
                        style.borderColor === 'rgb(255, 255, 0)' || 
                        style.borderColor === '#ffff00' ||
                        style.borderColor === 'yellow') {
                        
                        el.style.display = 'none';
                        el.style.visibility = 'hidden';
                        el.style.opacity = '0';
                    }
                });
            `;
            document.body.appendChild(cleanupScript);
        }
    });
}

/**
 * Удаляет объекты безопасной зоны из Three.js сцены
 */
function removeSafetyZonesFromScene() {
    if (window.app && window.app.scene) {
        window.app.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                // Проверяем, имеет ли материал желтый цвет
                if (object.material.color && 
                    object.material.color.r > 0.8 && 
                    object.material.color.g > 0.8 && 
                    object.material.color.b < 0.3) {
                    
                    // Делаем объект невидимым
                    object.visible = false;
                    
                    // Если у объекта есть имя, проверяем его
                    if (object.name && (
                        object.name.includes("safe") || 
                        object.name.includes("Safe") || 
                        object.name.includes("zone") || 
                        object.name.includes("Zone") ||
                        object.name.includes("boundary") || 
                        object.name.includes("Boundary")
                    )) {
                        object.visible = false;
                    }
                }
            }
        });
    }
}
