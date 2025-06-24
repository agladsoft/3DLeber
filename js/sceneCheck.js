/**
 * Модуль для проверки и восстановления сцены после загрузки страницы
 */
import { createEmergencyGround } from './fixes.js';

// Таймер для периодической проверки сцены
let sceneCheckInterval = null;

/**
 * Начинает периодическую проверку сцены
 */
export function startSceneChecks() {    
    // Удаляем предыдущий интервал, если он был
    if (sceneCheckInterval) {
        clearInterval(sceneCheckInterval);
    }
    
    // Запускаем проверку каждые 2 секунды
    sceneCheckInterval = setInterval(() => {
        checkScene();
    }, 2000);
}

/**
 * Останавливает периодическую проверку сцены
 */
export function stopSceneChecks() {
    if (sceneCheckInterval) {
        clearInterval(sceneCheckInterval);
        sceneCheckInterval = null;
    }
}

/**
 * Проверяет сцену и восстанавливает её при необходимости
 */
function checkScene() {
    // Проверяем, инициализировано ли приложение
    if (!window.app || !window.app.scene) {
        console.log("Сцена еще не инициализирована");
        return;
    }
    
    // Ищем площадку в сцене
    let groundFound = false;
    
    window.app.scene.traverse((object) => {
        if (object.userData && object.userData.isPlayground) {
            groundFound = true;
        }
    });
    
    // Если площадки нет, пытаемся её создать
    if (!groundFound) {        
        // Создаем аварийную площадку
        try {
            const emergencyGround = createEmergencyGround();
            
            if (emergencyGround) {
                // Если успешно создали площадку, останавливаем проверки
                stopSceneChecks();
            }
        } catch (error) {
            console.error("Ошибка при создании аварийной площадки:", error);
        }
    } else {
        // Если площадка найдена, останавливаем проверки
        console.log("Площадка найдена, останавливаем проверки");
        stopSceneChecks();
    }
}

// Экспортируем функцию создания аварийной площадки напрямую для использования в других модулях
export function createSceneEmergencyGround() {
    return createEmergencyGround();
}
