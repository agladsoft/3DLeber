/**
 * Модуль для управления сеткой и координатной системой
 */
import { scene } from './sceneCore.js';
import * as THREE from 'three';

// Экспортируем переменные для доступа из других модулей
export let gridHelper = null;
export let dimensionGrid = null;

/**
 * Создание и отображение сетки с метровыми делениями
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @returns {THREE.GridHelper} Возвращает созданную сетку
 */
export function createGrid(width, length) {
    console.log(`[GRID] createGrid вызвана с размерами: ${width}x${length}`);
    
    // Если сетка уже существует, удаляем ее
    if (gridHelper) {
        scene.remove(gridHelper);
        gridHelper.dispose();
        gridHelper = null;
    }
    
    // Создаем новую сетку с ячейками 1м x 1м
    const size = Math.max(width, length);
    // Количество делений должно соответствовать размеру, чтобы получить ячейки 1м x 1м
    const divisions = Math.round(size);
    
    gridHelper = new THREE.GridHelper(size, divisions, 0xFFFFFF, 0xFFFFFF); // Белый цвет для сетки
    gridHelper.position.y = 0.01; // Немного выше площадки, чтобы избежать z-fighting
    gridHelper.name = "gridHelper";
    
    // Добавляем сетку в сцену
    scene.add(gridHelper);
    
    console.log(`[GRID] Создана базовая сетка размером ${size}x${size} с ${divisions} делениями`);
    return gridHelper;
}

/**
 * Создает размерную сетку вокруг площадки с указанными размерами
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @param {String} color - Цвет площадки для адаптации цвета сетки
 * @param {Boolean} visible - Видимость сетки
 * @returns {THREE.Object3D} Объект сетки
 */
export function createDimensionGrid(width, length, color = 'серый', visible = true) {
    console.log(`[GRID] СОЗДАНИЕ НОВОЙ СЕТКИ! Размеры: ${width}x${length}, Цвет: ${color}, Видимость: ${visible}`);
    
    // Очищаем старую сетку, если она существует
    if (dimensionGrid) {
        scene.remove(dimensionGrid);
        
        // Рекурсивно удаляем все дочерние объекты и их ресурсы
        function disposeObject(obj) {
            if (obj.children) {
                obj.children.forEach(child => disposeObject(child));
            }
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        }
        
        disposeObject(dimensionGrid);
        dimensionGrid = null;
    }
    
    // Создаем новый контейнер для сетки
    dimensionGrid = new THREE.Object3D();
    dimensionGrid.name = "dimensionGrid";
    
    // Устанавливаем свойство raycast.enabled = false, чтобы сетка не блокировала взаимодействие с объектами
    // Это сделает сетку прозрачной для событий мыши
    dimensionGrid.userData.isInteractive = false;
    dimensionGrid.traverse(object => {
        object.userData.isInteractive = false;
    });
    
    // Увеличиваем размеры сетки на 1 метр с каждой стороны
    const gridWidth = width + 2;
    const gridLength = length + 2;
    
    console.log(`[GRID] Размеры сетки: ${gridWidth}x${gridLength} (на 1м больше с каждой стороны от ${width}x${length})`);
    
    // Используем белый цвет для сетки независимо от цвета площадки
    const gridColor = 0xFFFFFF; // Белый цвет для сетки
    
    // Создаем материалы для линий и меток - всегда белый цвет
    const lineMaterial = new THREE.LineBasicMaterial({ 
        color: 0xFFFFFF, // Белый цвет для всех линий
        transparent: true, 
        opacity: 0.8, // Немного увеличиваем непрозрачность для лучшей видимости
        linewidth: 2
    });
    
    // Вычисляем полуразмеры для позиционирования
    const halfGridWidth = gridWidth / 2;
    const halfGridLength = gridLength / 2;
    const halfWidth = width / 2;
    const halfLength = length / 2;
    
    // 1. Создаем основной контур площадки
    createOutlineRectangle(
        dimensionGrid, 
        -halfWidth, -halfLength, 
        halfWidth, halfLength, 
        0.03, 
        gridColor, 
        1.0
    );
    
    // 2. Создаем внешний контур (увеличенный на 1м с каждой стороны)
    createOutlineRectangle(
        dimensionGrid, 
        -halfGridWidth, -halfGridLength, 
        halfGridWidth, halfGridLength, 
        0.02, 
        gridColor, 
        0.7
    );
    
    // 3. Создаем размерные линии для ширины (верх и низ)
    // Верхняя размерная линия
    createDimensionLine(
        dimensionGrid,
        -halfWidth, halfLength + 0.5,
        halfWidth, halfLength + 0.5,
        0.04,
        gridColor,
        width.toString() + "м"
    );
    
    // Нижняя размерная линия
    createDimensionLine(
        dimensionGrid,
        -halfWidth, -halfLength - 0.5,
        halfWidth, -halfLength - 0.5,
        0.04,
        gridColor,
        width.toString() + "м"
    );
    
    // 4. Создаем размерные линии для длины (лево и право)
    // Левая размерная линия
    createDimensionLine(
        dimensionGrid,
        -halfWidth - 0.5, -halfLength,
        -halfWidth - 0.5, halfLength,
        0.04,
        gridColor,
        length.toString() + "м"
    );
    
    // Правая размерная линия
    createDimensionLine(
        dimensionGrid,
        halfWidth + 0.5, -halfLength,
        halfWidth + 0.5, halfLength,
        0.04,
        gridColor,
        length.toString() + "м"
    );
    
    // 5. Создаем сетку с делениями внутри площадки
    // Используем фиксированный шаг сетки 1м x 1м
    const gridStep = 1; // Фиксированный шаг в 1 метр
    console.log(`[GRID] Используем фиксированный шаг сетки: ${gridStep}м x ${gridStep}м`);
    
    // Вертикальные линии
    const verticalLines = Math.ceil(width / gridStep) + 1;
    for (let i = 0; i < verticalLines; i++) {
        const x = -halfWidth + (i * gridStep);
        if (x > halfWidth + 0.1) continue; // Пропускаем линии за пределами
        
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0.015, -halfLength),
            new THREE.Vector3(x, 0.015, halfLength)
        ]);
        const line = new THREE.Line(geometry, lineMaterial);
        dimensionGrid.add(line);
        
        // Добавляем метки с координатами для основных линий
        if (i % 2 === 0) {
            const distFromCenter = Math.abs(x);
            if (distFromCenter > 0.1) { // Не добавляем метку для центральной линии
                addCoordinateLabel(dimensionGrid, x, 0.02, halfLength + 0.3, distFromCenter.toFixed(1) + "м", gridColor);
                addCoordinateLabel(dimensionGrid, x, 0.02, -halfLength - 0.3, distFromCenter.toFixed(1) + "м", gridColor);
            }
        }
    }
    
    // Горизонтальные линии
    const horizontalLines = Math.ceil(length / gridStep) + 1;
    for (let i = 0; i < horizontalLines; i++) {
        const z = -halfLength + (i * gridStep);
        if (z > halfLength + 0.1) continue; // Пропускаем линии за пределами
        
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-halfWidth, 0.015, z),
            new THREE.Vector3(halfWidth, 0.015, z)
        ]);
        const line = new THREE.Line(geometry, lineMaterial);
        dimensionGrid.add(line);
        
        // Добавляем метки с координатами для основных линий
        if (i % 2 === 0) {
            const distFromCenter = Math.abs(z);
            if (distFromCenter > 0.1) { // Не добавляем метку для центральной линии
                addCoordinateLabel(dimensionGrid, -halfWidth - 0.3, 0.02, z, distFromCenter.toFixed(1) + "м", gridColor);
                addCoordinateLabel(dimensionGrid, halfWidth + 0.3, 0.02, z, distFromCenter.toFixed(1) + "м", gridColor);
            }
        }
    }
    
    // Делаем все объекты сетки неинтерактивными для raycast
    dimensionGrid.traverse(function(object) {
        // Переопределяем метод raycast для всех объектов сетки
        object.raycast = function() { return null; };
        // Устанавливаем дополнительные метки
        object.userData.isTopViewGrid = true;
        object.userData.isInteractive = false;
    });
    
    // Дополнительно переопределяем метод raycast для корневого объекта сетки
    dimensionGrid.raycast = function() { return null; };
    
    // Устанавливаем видимость и добавляем в сцену
    dimensionGrid.visible = visible;
    scene.add(dimensionGrid);
    
    console.log(`[GRID] Создана новая размерная сетка с ${verticalLines} вертикальными и ${horizontalLines} горизонтальными линиями`);
    console.log(`[GRID] Сетка настроена как неинтерактивная для взаимодействия с мышью`);
    
    return dimensionGrid;
}

/**
 * Создает прямоугольный контур
 */
function createOutlineRectangle(parent, x1, z1, x2, z2, y, color, opacity) {
    const material = new THREE.LineBasicMaterial({ 
        color: 0xFFFFFF, // Всегда белый цвет независимо от переданного параметра
        transparent: true, 
        opacity: opacity,
        linewidth: 2
    });
    
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, y, z1),
        new THREE.Vector3(x2, y, z1),
        new THREE.Vector3(x2, y, z2),
        new THREE.Vector3(x1, y, z2),
        new THREE.Vector3(x1, y, z1)
    ]);
    
    const outline = new THREE.Line(geometry, material);
    parent.add(outline);
    return outline;
}

/**
 * Создает размерную линию со стрелками и подписью
 */
function createDimensionLine(parent, x1, z1, x2, z2, y, color, label) {
    // Материал для линии - всегда белый
    const material = new THREE.LineBasicMaterial({ 
        color: 0xFFFFFF, // Белый цвет для размерных линий
        transparent: true, 
        opacity: 0.9,
        linewidth: 2
    });
    
    // Основная линия
    const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x1, y, z1),
        new THREE.Vector3(x2, y, z2)
    ]);
    
    const line = new THREE.Line(geometry, material);
    parent.add(line);
    
    // Стрелки на концах
    const arrowSize = 0.2;
    
    // Вычисляем направление линии
    const direction = new THREE.Vector3(x2 - x1, 0, z2 - z1).normalize();
    
    // Вычисляем перпендикулярный вектор
    const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
    
    // Стрелка на начале
    createArrowHead(parent, x1, y, z1, -direction, perpendicular, color);
    
    // Стрелка на конце
    createArrowHead(parent, x2, y, z2, direction, perpendicular, color);
    
    // Метка с размером в центре линии
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    
    // Немного смещаем метку от линии
    const offset = 0.2;
    const labelX = midX + perpendicular.x * offset;
    const labelZ = midZ + perpendicular.z * offset;
    
    addCoordinateLabel(parent, labelX, y + 0.05, labelZ, label, color, 0.4);
    
    return line;
}

/**
 * Создает стрелку для размерной линии
 */
function createArrowHead(parent, x, y, z, direction, perpendicular, color) {
    const material = new THREE.LineBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.9
    });
    
    const arrowSize = 0.2;
    
    // Первая часть стрелки
    const geom1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(
            x + direction.x * arrowSize + perpendicular.x * (arrowSize/2),
            y,
            z + direction.z * arrowSize + perpendicular.z * (arrowSize/2)
        )
    ]);
    
    const arrow1 = new THREE.Line(geom1, material);
    parent.add(arrow1);
    
    // Вторая часть стрелки
    const geom2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(
            x + direction.x * arrowSize - perpendicular.x * (arrowSize/2),
            y,
            z + direction.z * arrowSize - perpendicular.z * (arrowSize/2)
        )
    ]);
    
    const arrow2 = new THREE.Line(geom2, material);
    parent.add(arrow2);
}

/**
 * Добавляет текстовую метку с координатой
 */
function addCoordinateLabel(parent, x, y, z, text, color, size = 0.2) {
    // Создаем канвас для текста
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;
    
    // Настраиваем стиль текста
    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'Bold 28px Arial';
    context.fillStyle = '#FFFFFF'; // Всегда белый цвет для текста
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 128, 32);
    
    // Создаем текстуру и спрайт
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.9
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(x, y, z);
    sprite.scale.set(size * 4, size, 1);
    
    parent.add(sprite);
    
    return sprite;
}

/**
 * Возвращает шаг для сетки - всегда 1 метр
 */
function calculateGridStep(size) {
    // Всегда возвращаем 1 метр независимо от размера
    return 1;
}

/**
 * Обновляет видимость размерной сетки
 * @param {Boolean} visible - Флаг видимости
 */
export function toggleDimensionGridVisibility(visible = null) {
    if (dimensionGrid) {
        // Проверяем, активен ли режим вида сверху
        const isTopViewActive = window.app && window.app.isTopViewActive;
        
        // Если вид сверху активен, сетка всегда видима
        if (isTopViewActive) {
            // Не позволяем скрыть сетку в режиме вида сверху
            dimensionGrid.visible = true;
            console.log(`[GRID] Сетка остается видимой в режиме вида сверху`);
        } else {
            // Если режим вида сверху неактивен, применяем стандартное поведение
            if (visible === null) {
                dimensionGrid.visible = !dimensionGrid.visible;
            } else {
                dimensionGrid.visible = visible;
            }
            console.log(`[GRID] Видимость сетки изменена на ${dimensionGrid.visible}`);
        }
        
        return dimensionGrid.visible;
    }
    return false;
}

/**
 * Обновляет размерную сетку при изменении размеров площадки
 * @param {Number} width - Новая ширина площадки
 * @param {Number} length - Новая длина площадки
 * @param {String} color - Цвет площадки
 */
export function updateDimensionGrid(width, length, color = 'серый') {
    console.log(`[GRID] Обновляем размерную сетку: ${width}x${length}, цвет: ${color}`);
    const isVisible = dimensionGrid ? dimensionGrid.visible : false;
    createDimensionGrid(width, length, color, isVisible);
}

/**
 * Интегрирует размерную сетку с режимом вида сверху
 * @param {Boolean} isTopViewEnabled - Включен ли режим вида сверху
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @param {String} color - Цвет площадки
 */
export function handleTopViewToggle(isTopViewEnabled, width, length, color = 'серый') {
    console.log(`[GRID] Переключение режима вида сверху: ${isTopViewEnabled}, размеры: ${width}x${length}`);
    
    if (isTopViewEnabled) {
        // Если режим вида сверху включен, создаем/показываем размерную сетку
        createDimensionGrid(width, length, color, true);
    } else {
        // Если режим вида сверху выключен, скрываем размерную сетку
        if (dimensionGrid) {
            toggleDimensionGridVisibility(false);
        }
    }
}