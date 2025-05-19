/**
 * Модуль для создания простой площадки
 */
import { PLAYGROUND } from '../config.js';
import { scene } from '../scene.js';
import { ground, groundMesh, playgroundWidth, playgroundLength, updateGroundReferences } from './playgroundCore.js';
import { updatePlaygroundLabels } from './playgroundUI.js';
import * as THREE from 'three';

/**
 * Создает простую площадку в виде плоскости, если не удалось загрузить модель
 */
export function createSimplePlayground(width, length) {
    console.log('Запущена функция createSimplePlayground');
    console.log('Текущие значения: ground =', ground, 'groundMesh =', groundMesh);
    console.log('Создаем простую площадку с размерами:', width, 'x', length);
    try {
        // Создаем геометрию плоскости с установленными размерами
        const planeGeometry = new THREE.PlaneGeometry(width, length);
        console.log('Создана геометрия плоскости');
        // Создаем материал для плоскости (с текстурой)
        const planeMaterial = createGroundMaterial(width, length);
        console.log('Создан материал для плоскости');
        // Создаем меш плоскости
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        console.log('Создан меш плоскости:', plane);
        // Настраиваем плоскость
        setupSimplePlayground(plane, width, length);
        console.log('Простая площадка успешно создана и добавлена в сцену');
        console.log('После создания: ground =', ground, 'groundMesh =', groundMesh);
        return plane;
    } catch (error) {
        console.error('Ошибка при создании простой площадки:', error);
        throw error;
    }
}

/**
 * Создает материал для простой площадки
 * @returns {THREE.Material} Материал для площадки
 */
function createGroundMaterial(width, length) {
    // Создаем два материала: один для серой площадки, другой для зеленой травы вокруг
    const textureLoader = new THREE.TextureLoader();
    
    // Загружаем текстуру травы
    const grassTexture = textureLoader.load('textures/grass/grass_texture.jpg');
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    
    // Устанавливаем масштаб повторений текстуры в зависимости от размера площадки
    grassTexture.repeat.set(width * 2, length * 2); // Увеличиваем количество повторений
    
    try {
        // Загружаем нормальную карту для объемности травы
        const grassNormalMap = textureLoader.load('textures/grass/grass_normal.jpg');
        grassNormalMap.wrapS = THREE.RepeatWrapping;
        grassNormalMap.wrapT = THREE.RepeatWrapping;
        grassNormalMap.repeat.set(width * 2, length * 2);
        
        // Создаем материал для серой центральной площадки
        return new THREE.MeshStandardMaterial({
            color: 0xe0e0e0, // светло-серый
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
    } catch (error) {
        console.error('Ошибка при загрузке текстур:', error);
        
        // В случае ошибки возвращаем простой материал
        return new THREE.MeshStandardMaterial({
            color: 0xe0e0e0, // светло-серый
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
    }
}

/**
 * Настраивает простую площадку
 * @param {THREE.Mesh} plane - Меш плоскости
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 */
function setupSimplePlayground(plane, width, length) {
    console.log('Настраиваем простую площадку');
    
    // Поворачиваем плоскость так, чтобы она была горизонтальной
    plane.rotation.x = -Math.PI / 2;
    // Устанавливаем позицию площадки на Y=0
    plane.position.y = 0;
    // Разрешаем плоскости принимать тени
    plane.receiveShadow = true;
    
    // Добавляем имя и флаг для идентификации как площадки
    plane.name = "simple_playground";
    
    // Добавляем плоскость в сцену
    scene.add(plane);
    console.log('Плоскость добавлена в сцену, scene.children.length:', scene.children.length);
    
    // Создаем большую плоскость с текстурой травы для окружения
    const surroundSize = 1000; // Очень большой размер травяного окружения
    
    // Создаем материал для травы
    const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x4CAF50, // Зеленый цвет для травы
        roughness: 0.8,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    
    // Создаем большую плоскость для травы
    const grassGeometry = new THREE.PlaneGeometry(surroundSize, surroundSize);
    const grassPlane = new THREE.Mesh(grassGeometry, grassMaterial);
    
    // Настраиваем плоскость с травой
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.position.y = -0.01; // Чуть ниже основной площадки, чтобы избежать z-fighting
    grassPlane.receiveShadow = true;
    grassPlane.name = "grass_surround";
    
    // Добавляем информацию для предотвращения выбора
    grassPlane.userData = {
        isGround: true,
        nonInteractive: true
    };
    
    // Добавляем траву в сцену
    scene.add(grassPlane);
    console.log('Трава добавлена в сцену');
    
    // Сохраняем ссылки на плоскость и данные для масштабирования через функцию обновления
    console.log('Обновляем ссылки на ground и groundMesh в простой площадке');
    updateGroundReferences(plane, plane);
    console.log('После updateGroundReferences: ground =', ground, 'groundMesh =', groundMesh);
    
    // Добавляем данные для будущего масштабирования
    plane.userData = {
        originalWidth: width,
        originalHeight: 0.1,
        originalDepth: length,
        modelName: 'simple_playground',
        isPlayground: true  // Маркер, что это площадка
    };
    console.log('Добавлены userData к плоскости:', plane.userData);
    
    // Обновляем текстовый статус и метки
    updatePlaygroundLabels(width, length);
    
    // Добавляем явный маркер, что плоскость содержит меш (для raycasting)
    plane.isMesh = true;  // Это должно быть уже установлено в THREE.Mesh, но проверяем явно
    console.log('Проверка plane.isMesh:', plane.isMesh);
}
