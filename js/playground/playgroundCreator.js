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
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки 
 * @param {String} color - Цвет площадки (серый, черный, зеленый, коричневый)
 */
export function createSimplePlayground(width, length, color = 'серый') {
    console.log('Запущена функция createSimplePlayground');
    console.log('Текущие значения: ground =', ground, 'groundMesh =', groundMesh);
    console.log('Создаем простую площадку с размерами:', width, 'x', length);
    try {
        // Создаем геометрию прямоугольной площадки с установленными размерами
        const planeGeometry = new THREE.PlaneGeometry(width, length);
        console.log('Создана геометрия плоскости');
        // Создаем материал для плоскости (с текстурой)
        const planeMaterial = createGroundMaterial(width, length, color);
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
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @param {String} color - Цвет площадки (серый, черный, зеленый, коричневый)
 * @returns {THREE.Material} Материал для площадки
 */
function createGroundMaterial(width, length, color = 'серый') {
    // Создаем загрузчик текстур
    const textureLoader = new THREE.TextureLoader();
    
    try {
        // Загружаем текстуру травы из папки textures/grass
        console.log('Загружаем текстуру травы для площадки');
        
        // Основная текстура травы
        const grassTexture = textureLoader.load('textures/grass/grass_texture.jpg');
        
        // Пробуем загрузить нормаль-маппинг для объемности
        const normalTexture = textureLoader.load('textures/grass/grass_normal.jpg');
        
        // Также можно использовать основную текстуру травы
        const grassMainTexture = textureLoader.load('textures/grass.jpg');
        
        // Настраиваем повторение текстур в зависимости от размера площадки
        // Более крупное повторение для большой площадки
        const repeats = Math.max(2, Math.max(width, length) / 3);
        
        // Настраиваем все текстуры
        [grassTexture, normalTexture, grassMainTexture].forEach(texture => {
            if (texture) {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(repeats, repeats);
                texture.anisotropy = 16; // Улучшает качество при наклонных углах
            }
        });
        
        // Создаем программную текстуру бетона
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Заполняем фон серым цветом
        ctx.fillStyle = '#9E9E9E'; // Средний серый
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Добавляем текстуру бетона - мелкие шумы и трещины
        ctx.fillStyle = '#8D8D8D'; // Темно-серый для теней
        
        // Добавляем мелкие пятна для текстуры бетона
        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 2 + 0.5;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Добавляем несколько трещин
        ctx.strokeStyle = '#7D7D7D';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 50; i++) {
            const x1 = Math.random() * canvas.width;
            const y1 = Math.random() * canvas.height;
            const length = Math.random() * 30 + 5;
            const angle = Math.random() * Math.PI * 2;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x1 + Math.cos(angle) * length, y1 + Math.sin(angle) * length);
            ctx.stroke();
        }
        
        // Создаем текстуру из канваса
        const concreteTexture = new THREE.CanvasTexture(canvas);
        concreteTexture.wrapS = THREE.RepeatWrapping;
        concreteTexture.wrapT = THREE.RepeatWrapping;
        concreteTexture.repeat.set(repeats/2, repeats/2); // Более крупное повторение
        concreteTexture.anisotropy = 16;
        
        // Определяем цвет площадки в зависимости от выбора пользователя
        let groundColor;
        let groundRoughness = 0.85;
        let groundMetalness = 0.05;
        
        switch(color.toLowerCase()) {
            case 'черный':
                groundColor = 0x222222; // Чёрный
                break;
            case 'зеленый':
                groundColor = 0x2E7D32; // Зелёный
                groundRoughness = 0.75;
                break;
            case 'коричневый':
                groundColor = 0x5D4037; // Коричневый
                break;
            case 'серый':
            default:
                groundColor = 0xAAAAAA; // Серый (по умолчанию)
                break;
        }
        
        // Создаем материал для площадки
        return new THREE.MeshStandardMaterial({
            map: concreteTexture,
            normalMap: normalTexture.image && normalTexture.image.width > 10 ? normalTexture : null,
            color: groundColor,
            roughness: groundRoughness,
            metalness: groundMetalness,
            side: THREE.DoubleSide,
            flatShading: false,
            envMapIntensity: 0.3
        });
    } catch (error) {
        console.error('Ошибка при создании текстуры бетона:', error);
        
        // Определяем цвет площадки в зависимости от выбора пользователя (упрощенная версия)
        let groundColor;
        
        switch(color.toLowerCase()) {
            case 'черный':
                groundColor = 0x222222; // Чёрный
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
        
        // В случае ошибки создаем простой материал с выбранным цветом
        return new THREE.MeshStandardMaterial({
            color: groundColor,
            roughness: 0.85,
            metalness: 0.05,
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
    console.log('Настраиваем простую площадку с круглым фоном');
    
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
    
    // Создаем материал для травы с текстурой
    const grassTexturePath = 'textures/grass.jpg';
    const grassTexture = new THREE.TextureLoader().load(grassTexturePath);
    
    // Настраиваем текстуру для кругового фона
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    
    // Устанавливаем большое повторение для фона травы
    // Используем большое значение для мелкой текстуры
    const circleSize = Math.max(width, length) * 2.5; // Увеличенный размер круга
    const repeats = circleSize / 2;
    grassTexture.repeat.set(repeats, repeats);
    grassTexture.anisotropy = 16; // Улучшает качество при наклонных углах
    
    // Создаем материал для травы
    const grassMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        color: 0x4CAF50, // Зеленый цвет для травы
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    
    // Создаем большую круглую площадку для травы
    const grassGeometry = new THREE.CircleGeometry(surroundSize/2, 64); // Радиус = половина размера
    const grassPlane = new THREE.Mesh(grassGeometry, grassMaterial);
    
    // Настраиваем плоскость с травой
    grassPlane.rotation.x = -Math.PI / 2;
    grassPlane.position.y = -0.1; // Значительно ниже основной площадки, чтобы устранить z-fighting
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
        isPlayground: true,  // Маркер, что это площадка
        hasCircularGrass: true, // Маркер, что фон круглый
        groundColor: color // Сохраняем информацию о цвете площадки
    };
    console.log('Добавлены userData к плоскости:', plane.userData);
    
    // Обновляем текстовый статус и метки
    updatePlaygroundLabels(width, length);
    
    // Добавляем явный маркер, что плоскость содержит меш (для raycasting)
    plane.isMesh = true;  // Это должно быть уже установлено в THREE.Mesh, но проверяем явно
    console.log('Проверка plane.isMesh:', plane.isMesh);
}
