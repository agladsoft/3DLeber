/**
 * Упрощенный модуль для отображения размеров 3D-моделей
 * Использует три простые стрелки для ширины, высоты и глубины
 */
import * as THREE from 'three';
import { scene } from '../../scene.js';

// Настройки отображения стрелок размеров
const ARROW_SETTINGS = {
    // Белый цвет для всех стрелок
    arrowColor: 0xFFFFFF,  // Белый цвет

    // Настройки линий
    lineWidth: 2,         // Толщина линии стрелки
    headLength: 0.08,     // Обычный наконечник (уменьшено)
    headWidth: 0.04,       // Обычный наконечник (уменьшено)

    // Настройки текста
    fontSize: 64,         // Размер шрифта (увеличен)
    canvasWidth: 400,     // Ширина канваса для текста
    canvasHeight: 120,    // Высота канваса для текста
    padding: 0.2          // Расстояние выноса стрелки от объекта
};

/**
 * Класс для управления отображением размеров модели
 */
class ModelDimensions {
    /**
     * Конструктор
     * @param {THREE.Object3D} model - 3D модель
     */
    constructor(model) {
        this.model = model;
        this.dimensionGroup = new THREE.Group();
        this.dimensionGroup.name = 'dimensions_' + model.uuid;

        // Делаем группу размеров неинтерактивной
        this.dimensionGroup.userData.nonInteractive = true;

        // Стрелки для трех измерений
        this.widthArrow = null;  // X - ширина
        this.heightArrow = null; // Y - высота
        this.depthArrow = null;  // Z - глубина

        // Устанавливаем начальную видимость
        this.visible = true;

        // Добавляем группу в сцену
        scene.add(this.dimensionGroup);

        // Инициализируем размеры
        this.update();
    }

    /**
     * Обновляет размеры модели и стрелки
     */
    update() {
        this.clear();
        const size = this.getModelSize();
        this.createAllArrows(size);
        this.updatePosition();
    }

    /**
     * Получает размеры модели из userData или вычисляет их
     */
    getModelSize() {
        const modelContainer = this.model;
        let width, height, depth;

        // Пытаемся получить размеры из userData модели
        if (modelContainer.userData) {
            // Если модель была сконвертирована из мм в м
            if (modelContainer.userData.wasConverted && modelContainer.userData.displayWidth) {
                width = modelContainer.userData.realWidth;
                height = modelContainer.userData.realHeight;
                depth = modelContainer.userData.realDepth;
            }
            // Если есть сохраненные реальные размеры
            else if (modelContainer.userData.realWidth !== undefined) {
                width = modelContainer.userData.realWidth * modelContainer.scale.x;
                height = modelContainer.userData.realHeight * modelContainer.scale.y;
                depth = modelContainer.userData.realDepth * modelContainer.scale.z;
            }
        }

        // Если размеры не были найдены, вычисляем их по границам модели
        if (width === undefined || height === undefined || depth === undefined) {
            const box = new THREE.Box3().setFromObject(modelContainer);
            const boxSize = new THREE.Vector3();
            box.getSize(boxSize);

            width = boxSize.x;
            height = boxSize.y;
            depth = boxSize.z;
        }

        // Проверяем на минимальные значения, чтобы стрелки были видны
        width = Math.max(0.1, width);
        height = Math.max(0.1, height);
        depth = Math.max(0.1, depth);

        return { width, height, depth };
    }

    /**
     * Получает текстовое представление размера
     */
    getSizeText(size, dimension) {
        const modelContainer = this.model;
        const modelName = modelContainer.userData?.modelName || 'unknown';

        // Некоторые проблемные модели имеют фиксированные размеры
        const fixedSizes = {
            "MG0001 2024-09 R2 Модель.glb": { width: "0.97м", height: "1.84м", depth: "2.48м" },
            "0519.glb": { width: "1.61м", height: "2.02м", depth: "2.30м" }
        };

        // Проверяем, есть ли фиксированные размеры для модели
        if (fixedSizes[modelName] && fixedSizes[modelName][dimension]) {
            return fixedSizes[modelName][dimension];
        }

        // Иначе форматируем число с двумя знаками после запятой и добавляем 'м'
        return size.toFixed(2) + 'м';
    }

    /**
     * Создает все стрелки
     */
    createAllArrows(size) {
        const padding = ARROW_SETTINGS.padding || 0.2;
        const groundY = 0; // если площадка всегда на Y=0, иначе подставьте нужное значение
        const offset = 0.1; // стрелки будут на 10 см выше площадки

        const origin = new THREE.Vector3(
            -size.width / 2 - padding,
            groundY + offset, // высота относительно площадки!
            -size.depth / 2 - padding
        );

        this.createWidthArrow(size, origin, padding);
        this.createHeightArrow(size, origin, padding);
        this.createDepthArrow(size, origin, padding);
    }

    /**
     * Создает стрелку ширины (ось X)
     */
    createWidthArrow(size, origin, padding) {
        const widthText = this.getSizeText(size.width, 'width');
        const dir = new THREE.Vector3(1, 0, 0);
        const length = size.width; // длина строго по размеру модели!
        this.widthArrow = this.createArrow(
            origin, dir, length, 0xFFFFFF, widthText, 'width'
        );
        this.dimensionGroup.add(this.widthArrow);
    }

    /**
     * Создает стрелку высоты (ось Y)
     */
    createHeightArrow(size, origin, padding) {
        const heightText = this.getSizeText(size.height, 'height');
        const dir = new THREE.Vector3(0, 1, 0);
        const length = size.height;
        this.heightArrow = this.createArrow(
            origin, dir, length, 0xFFFFFF, heightText, 'height'
        );
        this.dimensionGroup.add(this.heightArrow);
    }

    /**
     * Создает стрелку глубины (ось Z)
     */
    createDepthArrow(size, origin, padding) {
        const depthText = this.getSizeText(size.depth, 'depth');
        const dir = new THREE.Vector3(0, 0, 1);
        const length = size.depth;
        this.depthArrow = this.createArrow(
            origin, dir, length, 0xFFFFFF, depthText, 'depth'
        );
        this.dimensionGroup.add(this.depthArrow);
    }

    /**
     * Создает стрелку с текстом
     * @param {THREE.Vector3} origin - Начальная точка стрелки
     * @param {THREE.Vector3} direction - Направление стрелки
     * @param {Number} length - Длина стрелки
     * @param {Number} color - Цвет стрелки
     * @param {String} text - Текст для отображения
     * @param {String} dimensionType - Тип измерения (width, height, depth)
     * @returns {THREE.Group} Группа, содержащая стрелку и текст
     */
    createArrow(origin, direction, length, color, text, dimensionType = '') {
        const arrowGroup = new THREE.Group();
        const arrowHelper = new THREE.ArrowHelper(
            direction.clone().normalize(),
            origin,
            length,
            color,
            ARROW_SETTINGS.headLength,
            ARROW_SETTINGS.headWidth
        );
        arrowGroup.add(arrowHelper);

        const textMesh = this.createTextMesh(text, color);

        // Текст — на конце стрелки, чуть дальше
        const textOffset = 0.15;
        const textPos = new THREE.Vector3()
            .copy(origin)
            .addScaledVector(direction.clone().normalize(), length + textOffset);

        textMesh.position.copy(textPos);
        textMesh.name = 'dimension_text';

        arrowGroup.add(textMesh);

        return arrowGroup;
    }

    /**
     * Создает текстовую метку
     * @param {String} text - Текст для отображения
     * @param {Number} color - Цвет текста
     * @returns {THREE.Mesh} Меш с текстом
     */
    createTextMesh(text, color) {
        const canvas = document.createElement('canvas');
        canvas.width = ARROW_SETTINGS.canvasWidth;
        canvas.height = ARROW_SETTINGS.canvasHeight;
        const context = canvas.getContext('2d');

        // Удалён чёрный фон!
        // context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        // context.fillRect(0, 0, canvas.width, canvas.height);

        context.font = `bold ${ARROW_SETTINGS.fontSize}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Чёрный контур для читаемости
        context.strokeStyle = 'black';
        context.lineWidth = 5;
        context.strokeText(text, canvas.width / 2, canvas.height / 2);

        // Белый текст
        context.fillStyle = 'white';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            depthTest: false
        });
        const geometry = new THREE.PlaneGeometry(0.8, 0.4);
        const textMesh = new THREE.Mesh(geometry, material);

        return textMesh;
    }

    /**
     * Обновляет позицию и ориентацию стрелок
     */
    updatePosition() {
        if (!this.model || !this.dimensionGroup) return;

        // Копируем позицию и поворот от модели
        this.dimensionGroup.position.copy(this.model.position);
        this.dimensionGroup.rotation.copy(this.model.rotation);
        this.dimensionGroup.scale.copy(this.model.scale);

        // Обновляем матрицу
        this.dimensionGroup.updateMatrixWorld(true);

        // Обновляем ориентацию текста
        this.updateTextOrientation();
    }

    /**
     * Обновляет ориентацию текста к камере
     */
    updateTextOrientation() {
        if (!window.app || !window.app.camera) return;

        const camera = window.app.camera;

        // Функция для обновления ориентации текста в стрелке
        const updateTextInArrow = (arrow) => {
            if (!arrow) return;

            arrow.traverse(child => {
                if (child.name === 'dimension_text') {
                    child.lookAt(camera.position);
                }
            });
        };

        // Обновляем текст во всех стрелках
        updateTextInArrow(this.widthArrow);
        updateTextInArrow(this.heightArrow);
        updateTextInArrow(this.depthArrow);
    }

    /**
     * Показывает стрелки размеров
     */
    show() {
        this.visible = true;
        this.dimensionGroup.visible = true;
    }

    /**
     * Скрывает стрелки размеров
     */
    hide() {
        this.visible = false;
        this.dimensionGroup.visible = false;
    }

    /**
     * Переключает видимость стрелок
     */
    toggle() {
        this.visible = !this.visible;
        this.dimensionGroup.visible = this.visible;
    }

    /**
     * Очищает все стрелки
     */
    clear() {
        while (this.dimensionGroup.children.length > 0) {
            const child = this.dimensionGroup.children[0];
            this.disposeObject(child);
            this.dimensionGroup.remove(child);
        }
        this.widthArrow = null;
        this.heightArrow = null;
        this.depthArrow = null;
    }

    disposeObject(obj) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => {
                    if (mat.map) mat.map.dispose();
                    mat.dispose();
                });
            } else {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
        }
        if (obj.children) {
            obj.children.forEach(child => this.disposeObject(child));
        }
    }

    /**
     * Полностью удаляет объект размеров
     */
    dispose() {
        this.clear();
        // Удаляем группу из сцены
        if (this.dimensionGroup && this.dimensionGroup.parent) {
            this.dimensionGroup.parent.remove(this.dimensionGroup);
        }
    }
}

// Карта для хранения объектов ModelDimensions
const modelDimensionsMap = new Map();

/**
 * Добавляет отображение размеров к модели
 * @param {THREE.Object3D} model - 3D модель
 */
export function addDimensionsToModel(model) {
    if (!model) return null;

    // Проверяем, есть ли уже размеры для этой модели
    let dimensions = modelDimensionsMap.get(model.uuid);

    // Если нет, создаем новый объект ModelDimensions
    if (!dimensions) {
        dimensions = new ModelDimensions(model);
        modelDimensionsMap.set(model.uuid, dimensions);
    }

    return dimensions;
}

/**
 * Возвращает объект размеров для модели
 * @param {THREE.Object3D} model - 3D модель
 * @returns {ModelDimensions|null} Объект размеров или null
 */
export function getModelDimensions(model) {
    if (!model) return null;
    return modelDimensionsMap.get(model.uuid) || null;
}

/**
 * Обновляет отображение размеров модели
 * @param {THREE.Object3D} model - 3D модель
 */
export function updateModelDimensions(model) {
    if (!model) return;

    const dimensions = getModelDimensions(model);
    if (dimensions) {
        dimensions.update();
        dimensions.updatePosition();
    } else {
        // Если размеры не существуют, создаем их
        addDimensionsToModel(model);
    }
}

/**
 * Показывает размеры модели
 * @param {THREE.Object3D} model - 3D модель
 */
export function showModelDimensions(model) {
    if (!model) return;

    // Получаем существующий объект размеров или создаем новый
    let dimensions = getModelDimensions(model);
    if (!dimensions) {
        dimensions = addDimensionsToModel(model);
    }

    // Показываем размеры
    if (dimensions) {
        dimensions.update();
        dimensions.show();
    }
}

/**
 * Скрывает размеры модели
 * @param {THREE.Object3D} model - 3D модель
 */
export function hideModelDimensions(model) {
    if (!model) return;

    const dimensions = getModelDimensions(model);
    if (dimensions) {
        dimensions.hide();
    }
}

/**
 * Переключает видимость размеров модели
 * @param {THREE.Object3D} model - 3D модель
 */
export function toggleModelDimensions(model) {
    if (!model) return;

    // Получаем существующий объект размеров или создаем новый
    let dimensions = getModelDimensions(model);
    if (!dimensions) {
        dimensions = addDimensionsToModel(model);
        dimensions.show();
        return;
    }

    // Переключаем видимость
    dimensions.toggle();
}

/**
 * Удаляет отображение размеров модели
 * @param {THREE.Object3D} model - 3D модель
 */
export function removeModelDimensions(model) {
    if (!model) return;

    const dimensions = getModelDimensions(model);
    if (dimensions) {
        dimensions.dispose();
        modelDimensionsMap.delete(model.uuid);
    }
}

/**
 * Обновляет все размеры всех моделей
 */
export function updateAllDimensions() {
    modelDimensionsMap.forEach(dimensions => {
        dimensions.update();
    });
}

/**
 * Скрывает все размеры всех моделей
 */
export function hideAllDimensions() {
    modelDimensionsMap.forEach(dimensions => {
        dimensions.hide();
    });
}

/**
 * Показывает все размеры всех моделей
 */
export function showAllDimensions() {
    modelDimensionsMap.forEach(dimensions => {
        dimensions.show();
    });
}

// Централизованное обновление ориентации текста для всех размеров
export function updateAllTextOrientations() {
    if (!window.app || !window.app.camera) return;
    modelDimensionsMap.forEach(dimensions => {
        if (dimensions.visible) {
            dimensions.updateTextOrientation();
        }
    });
}

/**
 * Инициализирует периодическое обновление размеров и ориентации текста
 */
export function initDimensionUpdates() {
    setInterval(() => {
        // Создаем массив UUID моделей, которые нужно удалить
        const toRemove = [];

        // Проверяем все размеры
        modelDimensionsMap.forEach((dimensions, uuid) => {
            if (!dimensions) {
                // Если размеры не существуют, добавляем в список на удаление
                toRemove.push(uuid);
                return;
            }

            // Проверяем, существует ли еще модель
            if (!dimensions.model || !dimensions.model.parent) {
                // Модель уже была удалена из сцены
                dimensions.dispose();
                toRemove.push(uuid);
                return;
            }

            // Обновляем только видимые размеры
            if (dimensions.visible) {
                try {
                    // Обновляем позицию размеров
                    dimensions.updatePosition();
                } catch (error) {
                    console.error('Ошибка при обновлении размеров:', error);
                    toRemove.push(uuid);
                }
            }
        });

        // Удаляем размеры из карты
        toRemove.forEach(uuid => {
            modelDimensionsMap.delete(uuid);
        });

        // После обновления позиций:
        updateAllTextOrientations();
    }, 100);
}