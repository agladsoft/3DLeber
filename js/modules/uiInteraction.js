/**
 * Модуль для взаимодействия с интерфейсом пользователя
 */
import { ELEMENT_INFO } from '../config.js';
import { scene } from '../scene.js';
import { placedObjects, removeObject } from './objectManager.js';
import { checkAllObjectsPositions } from './collisionDetection.js';

/**
 * Добавляет объект в UI (таблицу элементов)
 * @param {Object} container - Контейнер модели
 * @param {String} modelName - Имя файла модели
 */
export function addObjectToUI(container, modelName) {
    // Получаем информацию об элементе
    const elementInfo = ELEMENT_INFO[modelName] || modelName;

    // Убедимся, что currentSize установлен
    if (!container.userData.currentSize && container.userData.originalSize) {
        container.userData.currentSize = container.userData.originalSize;
    } else if (!container.userData.currentSize) {
        container.userData.currentSize = 1; // Значение по умолчанию, если нет других данных
    }
    
    // Подготовим отображение размеров модели
    let sizeDisplay = container.userData.currentSize.toFixed(1) + 'м';
    
    // Если модель была сконвертирована, конвертируем оригинальные размеры в метры
    if (container.userData.wasConverted && container.userData.displayWidth) {
        const width = (container.userData.displayWidth / 1000).toFixed(2);
        const height = (container.userData.displayHeight / 1000).toFixed(2);
        const depth = (container.userData.displayDepth / 1000).toFixed(2);
        sizeDisplay = `${width}×${height}×${depth}м`;
    }
    // Иначе если есть реальные размеры, используем их
    else if (container.userData.realWidth && container.userData.realHeight && container.userData.realDepth) {
        const width = (container.userData.realWidth * container.scale.x).toFixed(2);
        const height = (container.userData.realHeight * container.scale.y).toFixed(2);
        const depth = (container.userData.realDepth * container.scale.z).toFixed(2);
        sizeDisplay = `${width}×${height}×${depth}м`;
    }
    
    // Добавляем информацию в таблицу с кнопкой удаления и отображением размера
    const tableBody = document.querySelector("#elementsTable tbody");
    const row = document.createElement("tr");
    row.innerHTML = `<td>${elementInfo}</td>
                     <td class="size-cell">
                        <span class="model-size" title="Реальные размеры модели (Ш×В×Г)">${sizeDisplay}</span>
                     </td>
                     <td><button class="delete-button" style="cursor:pointer;">🗑️</button></td>`;
    tableBody.appendChild(row);

    // Сохраняем ссылку на контейнер в строке
    row.container = container;

    // Обработчик удаления элемента
    row.querySelector(".delete-button").addEventListener("click", () => {
        if (row.container) {
            // Удаляем объект из сцены и обновляем список
            removeObject(row.container);
        }
        
        // Удаляем строку из таблицы
        row.remove();
        
        // Перепроверяем все объекты
        checkAllObjectsPositions();
    });
}

/**
 * Обновляет информацию о размере в UI
 * @param {Object} container - Контейнер модели
 */
export function updateSizeInUI(container) {
    if (!container) return;
    
    // Находим строку в таблице для данного контейнера
    const tableRows = document.querySelectorAll("#elementsTable tbody tr");
    for (let row of tableRows) {
        if (row.container === container) {
            // Обновляем размер в ячейке с классом 'model-size', если она существует
            const sizeCell = row.querySelector('.model-size');
            if (sizeCell) {
                // Если модель была сконвертирована, преобразуем оригинальные размеры в метры
                if (container.userData.wasConverted && container.userData.displayWidth) {
                    const widthMm = container.userData.displayWidth.toFixed(2);
                    const heightMm = container.userData.displayHeight.toFixed(2);
                    const depthMm = container.userData.displayDepth.toFixed(2);
                    
                    // Конвертируем в метры для отображения (1000мм = 1м)
                    const width = (container.userData.displayWidth / 1000).toFixed(2);
                    const height = (container.userData.displayHeight / 1000).toFixed(2);
                    const depth = (container.userData.displayDepth / 1000).toFixed(2);
                    
                    sizeCell.textContent = `${width}×${height}×${depth}м`;
                    
                    // Добавляем title с дополнительной информацией при наведении
                    sizeCell.title = `Оригинальные размеры: ${widthMm}×${heightMm}×${depthMm}мм (${width}×${height}×${depth}м)`;
                }
                // Иначе показываем реальные размеры модели (ширина × высота × глубина)
                else if (container.userData.realWidth && container.userData.realHeight && container.userData.realDepth) {
                    const width = (container.userData.realWidth * container.scale.x).toFixed(2);
                    const height = (container.userData.realHeight * container.scale.y).toFixed(2);
                    const depth = (container.userData.realDepth * container.scale.z).toFixed(2);
                    sizeCell.textContent = `${width}×${height}×${depth}м`;
                    
                    // Добавляем title с дополнительной информацией при наведении
                    sizeCell.title = `Ширина: ${width}м, Высота: ${height}м, Глубина: ${depth}м`;
                } else {
                    // Если реальные размеры не доступны, используем текущий размер
                    sizeCell.textContent = container.userData.currentSize.toFixed(1) + 'м';
                }
            }
            break;
        }
    }
}
