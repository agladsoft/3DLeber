/**
 * Модуль для создания двух типов площадок:
 * 1. Зеленый фон с окружностью
 * 2. Основная площадка с возможностью выбора из 4 цветов (серый, черный, зеленый, коричневый)
 */
import * as THREE from 'three';
import { scene } from '../scene.js';
import { updateGroundReferences } from './playgroundCore.js';
import { updatePlaygroundLabels } from './playgroundUI.js';
import { createDimensionGrid } from '../scene/gridManager.js';
import { createBackground } from './backgroundManager.js';

/**
 * Создает основную площадку для размещения моделей и зеленый фон
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @param {String} color - Цвет площадки (серый, черный, зеленый, коричневый)
 * @returns {THREE.Mesh} Созданная основная площадка
 */
export function createSimplePlayground(width, length, color = 'серый') {
    console.log('Создаем площадку с размерами:', width, 'x', length, 'цвет:', color);
    try {
        // Удаляем предыдущие площадки
        removeExistingPlaygrounds();

        // 1. Создаем фон с окружностью (используем менеджер фона)
        const background = createBackground(width, length);

        // 2. Создаем основную площадку
        const mainSurface = createMainSurface(width, length, color);

        // Обновляем текстовый статус и метки
        updatePlaygroundLabels(width, length);

        // Проверяем, активен ли режим вида сверху для отображения сетки
        if (window.app && window.app.isTopViewActive) {
            createDimensionGrid(width, length, color, true);
        }
        return mainSurface;
    } catch (error) {
        console.error('Ошибка при создании площадки:', error);
        throw error;
    }
}

/**
 * Удаляет все существующие площадки из сцены
 */
function removeExistingPlaygrounds() {
    // Ищем и удаляем все объекты, связанные с площадками
    const playgroundObjects = scene.children.filter(obj =>
        obj.userData && (obj.userData.isPlayground || obj.userData.isGround ||
                         obj.name === 'grass_surround' || obj.name === 'green_background' ||
                         obj.name === 'main_surface' || obj.name === 'background_surface' ||
                         obj.userData.isBackground)
    );

    playgroundObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    });
}

/**
 * Создает зеленый фон с окружностью вокруг основной площадки
 * @param {Number} width - Ширина основной площадки
 * @param {Number} length - Длина основной площадки
 * @returns {THREE.Mesh} Созданный зеленый фон
 */
function createGreenBackground(width, length) {
    // Эта функция теперь устарела, используем createBackground из backgroundManager
    console.log('createGreenBackground устарела, используем createBackground');
    return createBackground(width, length, 'grass');
}

/**
 * Создает основную площадку для размещения моделей
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @param {String} color - Цвет площадки (серый, черный, зеленый, коричневый)
 * @returns {THREE.Mesh} Созданная основная площадка
 */
function createMainSurface(width, length, color) {
    console.log('Создаем основную площадку с цветом:', color);

    // Создаем геометрию прямоугольной площадки
    const planeGeometry = new THREE.PlaneGeometry(width, length);
    
    // Создаем материал с выбранным цветом и текстурой
    const material = createGroundMaterial(width, length, color);
    
    // Создаем меш площадки
    const plane = new THREE.Mesh(planeGeometry, material);

    // Поворачиваем плоскость, чтобы она была горизонтальной
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0;

    // Устанавливаем возможность отбрасывать и принимать тени
    plane.castShadow = false;
    plane.receiveShadow = true;

    // Устанавливаем имя для удобства поиска
    plane.name = "main_surface";

    // Добавляем данные для будущего масштабирования и идентификации
    plane.userData = {
        originalWidth: width,
        originalHeight: 0.1,
        originalDepth: length,
        modelName: 'main_surface',
        isPlayground: true,  // Маркер, что это площадка
        hasCircularGrass: true, // Маркер, что фон круглый
        groundColor: color, // Сохраняем информацию о цвете площадки
        isGround: true // Для взаимодействия
    };
    
    // Добавляем плоскость в сцену
    scene.add(plane);
    
    // Сохраняем ссылки на плоскость для масштабирования
    updateGroundReferences(plane, plane);
    return plane;
}

/**
 * Создает материал для основной площадки с выбранным цветом
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @param {String} color - Цвет площадки (серый, черный, зеленый, коричневый)
 * @returns {THREE.Material} Материал для площадки
 */
function getPlaygroundColorHex(color) {
    switch (color) {
        case 'черный':
            return 0x222222;
        case 'зеленый':
            return 0x2e7031;
        case 'коричневый':
            return 0x7c5c36;
        case 'синий':
            return 0x1976D2;
        case 'красный':
            return 0xD32F2F;
        case 'фиолетовый':
            return 0x7B1FA2;
        case 'оранжевый':
            return 0xF57C00;
        case 'желтый':
            return 0xFBC02D;
        case 'розовый':
            return 0xC2185B;
        case 'бирюзовый':
            return 0x00ACC1;
        case 'лайм':
            return 0x689F38;
        case 'серый':
        default:
            return 0x7F7F7F;
    }
}

function createGroundMaterial(width, length, color = 'серый') {
    console.log(`[PLAYGROUND] Создаем материал для площадки: цвет ${color}, размер ${width}x${length}м`);

    const material = new THREE.MeshStandardMaterial({
        color: getPlaygroundColorHex(color),
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide
    });

    // Загружаем текстуру резиновой крошки
    const textureLoader = new THREE.TextureLoader();
    const rubberTexture = textureLoader.load('textures/playground/crumb-rubber-2.jpg');
    // Настраиваем повторение текстуры
    const repeats = Math.max(width, length) / 2;
    rubberTexture.wrapS = THREE.RepeatWrapping;
    rubberTexture.wrapT = THREE.RepeatWrapping;
    rubberTexture.repeat.set(repeats, repeats);
    rubberTexture.anisotropy = 16; // Улучшает качество при наклонных углах

    // Применяем текстуру к материалу
    material.map = rubberTexture;
    material.needsUpdate = true;

    console.log(`[PLAYGROUND] Материал успешно создан для цвета ${color}`);
    return material;
}