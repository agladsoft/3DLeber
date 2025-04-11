/**
 * Вспомогательные функции проекта
 * Адаптированы для работы с Three.js
 */
import { ANIMATION } from './config.js';
import * as THREE from 'three';

/**
 * Показывает уведомление
 * @param {String} message - Сообщение для отображения
 * @param {Boolean} isWarning - Флаг, является ли уведомление предупреждением
 */
export function showNotification(message, isWarning = true) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.querySelector('.notification-message');
    
    if (notification && notificationMessage) {
        notificationMessage.textContent = message;
        notification.className = isWarning ? 'notification warning' : 'notification info';
        notification.classList.remove('hidden');
        
        // Автоматически скрываем уведомление через указанное время
        setTimeout(() => {
            notification.classList.add('hidden');
        }, ANIMATION.notificationDuration);
        
        // Обработчик для кнопки закрытия
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.onclick = function() {
                notification.classList.add('hidden');
            };
        }
    }
}

/**
 * Обновляет статус позиции объекта в интерфейсе
 * @param {Boolean} isValid - Находится ли объект в пределах площадки
 */
export function updatePositionStatus(isValid) {
    const statusElement = document.getElementById("positionStatus");
    
    if (!statusElement) return;
    
    // Полностью скрываем элемент статуса, не показывая никаких сообщений
    statusElement.style.display = "none";
}

/**
 * Функция плавной анимации
 * @param {Number} t - Прогресс анимации от 0 до 1
 * @returns {Number} Преобразованный прогресс с эффектом замедления
 */
export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Вычисляет ограничивающий бокс для объекта Three.js
 * @param {THREE.Object3D} object - Объект для вычисления границ
 * @returns {THREE.Box3} Объект ограничивающего бокса
 */
export function computeBoundingBox(object) {
    return new THREE.Box3().setFromObject(object);
}

/**
 * Вычисляет размер объекта (максимальную сторону ограничивающего бокса)
 * @param {THREE.Object3D} object - Объект для вычисления размера
 * @returns {Number} Максимальный размер объекта
 */
export function computeObjectSize(object) {
    const boundingBox = computeBoundingBox(object);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    return Math.max(size.x, size.y, size.z);
}

/**
 * Вычисляет центр объекта
 * @param {THREE.Object3D} object - Объект для вычисления центра
 * @returns {THREE.Vector3} Координаты центра объекта
 */
export function computeObjectCenter(object) {
    const boundingBox = computeBoundingBox(object);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    return center;
}

/**
 * Интерполирует между двумя значениями Vector3 с использованием функции плавности
 * @param {THREE.Vector3} start - Начальное значение
 * @param {THREE.Vector3} end - Конечное значение
 * @param {Number} progress - Прогресс от 0 до 1
 * @param {Function} easingFunction - Функция плавности (по умолчанию easeInOutCubic)
 * @returns {THREE.Vector3} Интерполированное значение
 */
export function lerpVector3(start, end, progress, easingFunction = easeInOutCubic) {
    const easedProgress = easingFunction(progress);
    
    return new THREE.Vector3(
        start.x + (end.x - start.x) * easedProgress,
        start.y + (end.y - start.y) * easedProgress,
        start.z + (end.z - start.z) * easedProgress
    );
}

/**
 * Преобразует координаты экрана в координаты на плоскости Y=0
 * @param {Number} x - X-координата на экране
 * @param {Number} y - Y-координата на экране
 * @param {THREE.Camera} camera - Камера
 * @returns {THREE.Vector3} Точка на плоскости или null, если луч не пересекает плоскость
 */
export function screenToGroundPosition(x, y, camera) {
    // Создаем нормализованные координаты (-1 до 1)
    const normalizedX = (x / window.innerWidth) * 2 - 1;
    const normalizedY = -(y / window.innerHeight) * 2 + 1;
    
    // Создаем raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), camera);
    
    // Создаем плоскость Y=0
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    // Находим пересечение луча с плоскостью
    const intersectionPoint = new THREE.Vector3();
    const intersects = raycaster.ray.intersectPlane(groundPlane, intersectionPoint);
    
    return intersects ? intersectionPoint : null;
}
