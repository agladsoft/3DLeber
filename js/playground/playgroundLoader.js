/**
 * Модуль для загрузки моделей площадки
 */
import { scene } from '../scene.js';
import { ground, updateGroundReferences, updatePlaygroundDimensions } from './playgroundCore.js';
import { createSimplePlayground } from './playgroundCreator.js';
import { PLAYGROUND } from '../config.js';


/**
 * Загрузка модели площадки
 * @param {String} modelName - Имя файла модели площадки (по умолчанию 'playground.glb')
 * @param {Number} width - Ширина площадки (опционально)
 * @param {Number} length - Длина площадки (опционально)
 * @param {String} color - Цвет площадки (серый, черный, зеленый, коричневый)
 * @returns {Promise} Промис, который разрешается, когда площадка загружена
 */
export function loadPlayground(modelName = 'playground.glb', width = null, length = null, color = null) {
    let userWidth = PLAYGROUND.defaultWidth;
    let userLength = PLAYGROUND.defaultLength;
    let userColor = 'серый'; // Добавляем переменную с цветом по умолчанию
    
    // Получаем размеры площадки
    if (width && length) {
        userWidth = width;
        userLength = length;
    } else if (window.selectedPlaygroundWidth && window.selectedPlaygroundLength) {
        userWidth = window.selectedPlaygroundWidth;
        userLength = window.selectedPlaygroundLength;
    } else {
        const widthInput = document.getElementById("playgroundWidth");
        const lengthInput = document.getElementById("playgroundLength");
        if (widthInput && lengthInput) {
            userWidth = parseFloat(widthInput.value) || PLAYGROUND.defaultWidth;
            userLength = parseFloat(lengthInput.value) || PLAYGROUND.defaultLength;
        }
    }
    
    // Получаем цвет площадки
    if (color) {
        userColor = color;
    } else if (window.selectedPlaygroundColor) {
        userColor = window.selectedPlaygroundColor;
    }
    try { removeExistingPlaygrounds(); } catch (error) {}
    updateGroundReferences(null, null);
    const simplePlane = createSimplePlayground(userWidth, userLength, userColor);
    // Устанавливаем позицию площадки на Y=0
    if (simplePlane && simplePlane.position) simplePlane.position.y = 0;
    updatePlaygroundDimensions(userWidth, userLength);
    
    // Сохраняем цвет площадки в userData
    if (simplePlane && simplePlane.userData) {
        simplePlane.userData.groundColor = userColor;
    }
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            window.isLoading = false;
        }
    }, 500);
    return Promise.resolve(simplePlane);
}

/**
 * Удаляет все существующие площадки из сцены
 */
function removeExistingPlaygrounds() {    
    // Проверяем, что scene определена и доступна
    if (!scene) {
        console.warn('Scene is undefined, cannot remove existing playgrounds');
        return;
    }
    
    try {
        // Создаем массив для объектов, которые нужно удалить
        // (нельзя удалять объекты прямо во время traverse)
        const objectsToRemove = [];
        
        scene.traverse((object) => {
            // Ищем объекты, которые могут быть площадками
            if (object && object.userData && 
                (object.userData.modelName === 'playground.glb' || 
                 object.userData.modelName === 'simple_playground' ||
                 (object.userData.modelName && object.userData.modelName.includes('playground')) ||
                 (object.name && object.name.includes('ground')) ||
                 (object.name && object.name.includes('playground')))) {
                
                objectsToRemove.push(object);
            }
        });
        
        // Удаляем все найденные объекты
        objectsToRemove.forEach(object => {
            console.log('Удаляем объект из сцены:', object.userData.modelName || object.name);
            scene.remove(object);
        });
        
    } catch (error) {
        console.error('Ошибка при удалении существующих площадок:', error);
    }
}
