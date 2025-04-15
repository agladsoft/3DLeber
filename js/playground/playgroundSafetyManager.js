/**
 * Модуль для управления элементами безопасности на площадке
 */
import { scene } from '../scene.js';

/**
 * Удаляет все элементы желтого цвета из сцены и DOM
 */
export function removeAllYellowElements() {
    // Удаляем желтые элементы из сцены Three.js
    removeYellowElementsFromScene();
    
    // Удаляем желтые элементы из DOM
    removeYellowElementsFromDOM();
}

/**
 * Удаляет все желтые элементы из 3D сцены
 */
function removeYellowElementsFromScene() {
    // Проходим по всем объектам в сцене
    scene.traverse((object) => {
        // Проверяем объекты по имени
        if (isSafetyObjectByName(object)) {
            // Делаем объект невидимым
            object.visible = false;
        }
        
        // Проверяем меши по материалу
        if (object.isMesh && object.material) {
            // Скрываем объекты с желтым материалом
            hideYellowMaterials(object);
        }
    });
}

/**
 * Проверяет, является ли объект элементом безопасности по его имени
 * @param {Object} object - 3D объект
 * @returns {Boolean} true, если объект - элемент безопасности
 */
function isSafetyObjectByName(object) {
    return object.name && (
        object.name.includes("safe") || 
        object.name.includes("Safe") || 
        object.name.includes("zone") || 
        object.name.includes("Zone") ||
        object.name.includes("border") ||
        object.name.includes("Border") ||
        object.name.includes("square") || 
        object.name.includes("Square") ||
        object.name.includes("yellow") || 
        object.name.includes("Yellow") ||
        object.name.includes("inner") || 
        object.name.includes("Inner")
    );
}

/**
 * Скрывает объекты с желтым материалом
 * @param {Object} object - 3D объект
 */
function hideYellowMaterials(object) {
    // Проверяем, является ли материал массивом
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    
    // Проверяем каждый материал
    materials.forEach(material => {
        // Если у материала есть жёлтый или оранжевый цвет
        if (material.color && (
            (material.color.r > 0.8 && material.color.g > 0.4 && material.color.b < 0.3) ||
            (material.emissive && material.emissive.r > 0.8 && material.emissive.g > 0.4 && material.emissive.b < 0.3)
        )) {
            // Если это не границы площадки (основные линии), скрываем их
            if (!object.name.includes("Line")) {
                object.visible = false;
                
                // Если материал поддерживает прозрачность, делаем его полностью прозрачным
                if (material.transparent) {
                    material.opacity = 0;
                }
            }
        }
    });
}

/**
 * Удаляет все желтые элементы из DOM
 */
function removeYellowElementsFromDOM() {
    // Проверяем все HTML-элементы на желтый цвет и скрываем их
    document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        if (hasYellowColor(style)) {
            hideElement(el);
        }
    });
}

/**
 * Проверяет, имеет ли стиль желтый цвет
 * @param {CSSStyleDeclaration} style - Стили элемента
 * @returns {Boolean} true, если элемент имеет желтый цвет
 */
function hasYellowColor(style) {
    return style.backgroundColor === 'rgb(255, 255, 0)' || 
           style.backgroundColor === '#ffff00' || 
           style.backgroundColor === 'yellow' ||
           style.borderColor === 'rgb(255, 255, 0)' || 
           style.borderColor === '#ffff00' ||
           style.borderColor === 'yellow';
}

/**
 * Скрывает HTML-элемент
 * @param {HTMLElement} element - HTML-элемент для скрытия
 */
function hideElement(element) {
    element.style.display = 'none';
    element.style.visibility = 'hidden';
    element.style.opacity = '0';
}
