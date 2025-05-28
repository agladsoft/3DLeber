/**
 * Модуль для создания двух типов площадок:
 * 1. Зеленый фон с окружностью
 * 2. Основная площадка с возможностью выбора из 4 цветов (серый, черный, зеленый, коричневый)
 */
import { PLAYGROUND } from '../config.js';
import { scene } from '../scene.js';
import { ground, groundMesh, playgroundWidth, playgroundLength, updateGroundReferences } from './playgroundCore.js';
import { updatePlaygroundLabels } from './playgroundUI.js';
import * as THREE from 'three';
import { createDimensionGrid } from '../scene/gridManager.js';

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

        // 1. Создаем зеленый фон с окружностью
        const greenBackground = createGreenBackground(width, length);

        // 2. Создаем основную площадку
        const mainSurface = createMainSurface(width, length, color);

        // Обновляем текстовый статус и метки
        updatePlaygroundLabels(width, length);

        // Проверяем, активен ли режим вида сверху для отображения сетки
        if (window.app && window.app.isTopViewActive) {
            createDimensionGrid(width, length, color, true);
        }

        console.log('Площадка успешно создана и добавлена в сцену');
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
                         obj.name === 'main_surface')
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

    console.log(`Удалено ${playgroundObjects.length} существующих площадок`);
}

/**
 * Создает зеленый фон с окружностью вокруг основной площадки
 * @param {Number} width - Ширина основной площадки
 * @param {Number} length - Длина основной площадки
 * @returns {THREE.Mesh} Созданный зеленый фон
 */
function createGreenBackground(width, length) {
    console.log('Создаем зеленый фон с окружностью');

    // Устанавливаем фиксированный большой размер для фона, независимо от размеров площадки
    const size = 1000; // Фиксированный большой размер в метрах

    // Создаем геометрию круга
    const circleGeometry = new THREE.CircleGeometry(size / 2, 64);

    // Создаем материал для травы
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load('textures/grass/grass_texture.jpg');
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;

    // Настраиваем повторение текстуры в зависимости от размера
    const repeats = size / 2;
    grassTexture.repeat.set(repeats, repeats);
    grassTexture.anisotropy = 16; // Улучшает качество при наклонных углах

    const grassMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        color: 0x4CAF50, // Зеленый цвет для травы
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    
    // Создаем меш травы
    const grassPlane = new THREE.Mesh(circleGeometry, grassMaterial);
    
    // Поворачиваем и позиционируем круг травы
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.position.y = -0.1; // Чуть ниже основной площадки
    grassPlane.receiveShadow = true;
    grassPlane.name = "green_background";
    
    // Добавляем информацию для предотвращения выбора
    grassPlane.userData = {
        isGround: true,
        nonInteractive: true,
        isGrassBackground: true
    };
    
    // Добавляем траву в сцену
    scene.add(grassPlane);
    console.log('Зеленый фон добавлен в сцену');

    return grassPlane;
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

    console.log('Основная площадка добавлена в сцену');

    return plane;
}

/**
 * Создает материал для основной площадки с выбранным цветом
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @param {String} color - Цвет площадки (серый, черный, зеленый, коричневый)
 * @returns {THREE.Material} Материал для площадки
 */
function createGroundMaterial(width, length, color = 'серый') {
    console.log(`[PLAYGROUND] Создаем материал для площадки: цвет ${color}, размер ${width}x${length}м`);

    // Определяем цвет площадки в зависимости от выбранного варианта
    let groundColor;
    switch(color) {
        case 'черный':
            groundColor = 0x222222; // Черный
            break;
        case 'зеленый':
            groundColor = 0x2E7D32; // Зелёный
            break;
        case 'коричневый':
            groundColor = 0x5D4037; // Коричневый
            break;
        case 'серый':
        default:
            groundColor = 0xAAAAAA; // Серый (по умолчанию)
            break;
    }

    // Создаем базовый материал с выбранным цветом
    const material = new THREE.MeshStandardMaterial({
        color: groundColor,
        roughness: 0.85,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: false, // Убираем прозрачность
        opacity: 1.0 // Полная непрозрачность
    });

    // Только для зеленой площадки пробуем загрузить текстуры травы
    // (так как только они есть в проекте)
    if (color === 'зеленый') {
        console.log('[PLAYGROUND] Загружаем текстуры травы для зеленой площадки');

        try {
            const textureLoader = new THREE.TextureLoader();
            const baseTexture = textureLoader.load('textures/grass/grass_texture.jpg');
            const normalTexture = textureLoader.load('textures/grass/grass_normal.jpg');

            // Настраиваем повторение текстур
            const repeats = Math.max(width, length) / 2;
            [baseTexture, normalTexture].forEach(texture => {
                if (texture) {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    texture.repeat.set(repeats, repeats);
                    texture.anisotropy = 16; // Улучшает качество при наклонных углах
                }
            });

            // Добавляем текстуры в материал
            material.map = baseTexture;
            material.normalMap = normalTexture;
            console.log('[PLAYGROUND] Текстуры травы успешно загружены');
        } catch (error) {
            console.error('[PLAYGROUND] Ошибка при загрузке текстур травы:', error);
            // Продолжаем использовать материал только с цветом
        }
    } else {
        console.log(`[PLAYGROUND] Для цвета ${color} используем только цветовой материал без текстур`);
    }

    console.log(`[PLAYGROUND] Материал успешно создан для цвета ${color}`);
    return material;
}