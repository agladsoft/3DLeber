/**
 * Интеграционный модуль для функциональности площадки
 * Предоставляет глобальные функции для управления площадкой из других модулей
 */
import { resetPlayground, updatePlaygroundDimensions, ground } from './playground/playgroundCore.js';
import { createSimplePlayground } from './playground/playgroundCreator.js';
import { checkAllObjectsPositions } from './objects.js';

// Создаем глобальные функции для доступа из других модулей
window.resetPlayground = function(width, length, colorHex) {
    console.log('Вызвана глобальная функция resetPlayground:', { width, length, colorHex });
    try {
        // Применяем изменения размеров
        resetPlayground(width, length);
        
        // Обновляем глобальные размеры
        window.app = window.app || {};
        window.app.playgroundWidth = width;
        window.app.playgroundLength = length;
        
        // Обновляем глобальные переменные для проверки границ
        window.selectedPlaygroundWidth = width;
        window.selectedPlaygroundLength = length;
        
        // Если передан цвет, обновляем цвет площадки
        if (colorHex) {
            // Получаем объект ground
            const ground = window.app.ground || (window.scene ? window.scene.getObjectByName('main_surface') : null);
            
            if (ground) {
                // Сохраняем цвет в userData
                ground.userData.groundColor = colorHex;
                
                // Применяем цвет к материалу
                if (ground.material) {
                    if (Array.isArray(ground.material)) {
                        ground.material.forEach(mat => {
                            if (mat.color) mat.color.set(colorHex);
                        });
                    } else if (ground.material.color) {
                        ground.material.color.set(colorHex);
                    }
                }
            }
        }
        
        // Проверяем все объекты на соответствие новым границам площадки
        checkAllObjectsPositions();
        
        return true;
    } catch (error) {
        console.error('Ошибка в глобальной функции resetPlayground:', error);
        return false;
    }
};

// Функция-обертка для создания новой площадки
window.setPlaygroundParams = async function(width, length, colorName) {
    console.log('Вызвана глобальная функция setPlaygroundParams:', { width, length, colorName });
    
    try {
        // Обновляем глобальные переменные для проверки границ
        window.selectedPlaygroundWidth = width;
        window.selectedPlaygroundLength = length;
        
        // Попытка 1: Использовать функцию createSimplePlayground напрямую
        const creatorModule = await import('./playground/playgroundCreator.js');
        if (creatorModule && creatorModule.createSimplePlayground) {
            const playground = creatorModule.createSimplePlayground(width, length, colorName);
            console.log('Площадка создана через createSimplePlayground');
            
            // Проверяем все объекты на соответствие новым границам площадки
            checkAllObjectsPositions();
            
            return playground;
        }
        
        // Попытка 2: Создать с помощью resetPlayground
        const coreModule = await import('./playground/playgroundCore.js');
        if (coreModule && coreModule.resetPlayground) {
            coreModule.resetPlayground(width, length);
            console.log('Площадка обновлена через resetPlayground');
            
            // Попытка изменить цвет
            if (coreModule.ground && coreModule.ground.material) {
                // Получаем hex-код цвета
                let colorHex;
                switch (colorName) {
                    case 'черный': colorHex = '#100F0F'; break;
                    case 'зеленый': colorHex = '#2E7D32'; break;
                    case 'коричневый': colorHex = '#5D4037'; break;
                    case 'серый': 
                    default: colorHex = '#D9D9D9'; break;
                }
                
                // Применяем цвет
                if (Array.isArray(coreModule.ground.material)) {
                    coreModule.ground.material.forEach(mat => {
                        if (mat.color) {
                            mat.color.set(colorHex);
                            mat.needsUpdate = true;
                        }
                    });
                } else if (coreModule.ground.material.color) {
                    coreModule.ground.material.color.set(colorHex);
                    coreModule.ground.material.needsUpdate = true;
                }
                
                coreModule.ground.userData.groundColor = colorName;
                console.log('Цвет площадки изменен на', colorName);
            }
            
            // Проверяем все объекты на соответствие новым границам площадки
            checkAllObjectsPositions();
            
            return coreModule.ground;
        }
        
        console.error('Не удалось найти необходимые функции для создания площадки');
        return null;
    } catch (error) {
        console.error('Ошибка в функции setPlaygroundParams:', error);
        return null;
    }
};

// Функция для обновления размеров площадки
window.updatePlaygroundDimensions = function(width, length) {
    console.log('Вызвана глобальная функция updatePlaygroundDimensions:', { width, length });
    try {
        // Обновляем размеры
        updatePlaygroundDimensions(width, length);
        
        // Обновляем глобальные размеры
        window.app = window.app || {};
        window.app.playgroundWidth = width;
        window.app.playgroundLength = length;
        
        // Обновляем глобальные переменные для проверки границ
        window.selectedPlaygroundWidth = width;
        window.selectedPlaygroundLength = length;
        
        // Проверяем все объекты на соответствие новым границам площадки
        checkAllObjectsPositions();
        
        return true;
    } catch (error) {
        console.error('Ошибка в глобальной функции updatePlaygroundDimensions:', error);
        return false;
    }
};

// Функция для изменения цвета площадки
window.changePlaygroundColor = function(colorHex, colorName) {
    console.log('Вызвана глобальная функция changePlaygroundColor:', { colorHex, colorName });
    try {
        // Получаем объект ground
        const ground = window.app && window.app.ground ? 
                      window.app.ground : 
                      (window.scene ? window.scene.getObjectByName('main_surface') : null);
        
        if (ground) {
            // Сохраняем цвет в userData
            ground.userData.groundColor = colorName || colorHex;
            
            // Применяем цвет к материалу
            if (ground.material) {
                if (Array.isArray(ground.material)) {
                    ground.material.forEach(mat => {
                        if (mat.color) mat.color.set(colorHex);
                        mat.needsUpdate = true;
                    });
                } else if (ground.material.color) {
                    ground.material.color.set(colorHex);
                    ground.material.needsUpdate = true;
                }
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Ошибка в глобальной функции changePlaygroundColor:', error);
        return false;
    }
};// Экспортируем функции
export {
    resetPlayground,
    updatePlaygroundDimensions,
    changePlaygroundColor,
    setPlaygroundParams
};