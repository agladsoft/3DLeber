/**
 * Модуль для инициализации сцены, рендерера и основных компонентов Three.js
 */
import { 
    RENDERER_SETTINGS, 
    LIGHTING 
} from '../config.js';
import * as THREE from 'three';
import { PMREMGenerator } from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
// CubeTextureLoader уже включен в импорт THREE

// Экспортируем переменные для доступа из других модулей
export let canvas;
export let renderer;
export let scene;

/**
 * Создает и настраивает основные компоненты рендеринга - canvas и renderer
 */
export function initializeRenderer() {
    // Инициализация canvas
    canvas = document.getElementById("renderCanvas");
    
    // Создаем WebGL рендерер
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas,
        antialias: RENDERER_SETTINGS.antialias,
        alpha: true
    });
    
    // Настройка renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(RENDERER_SETTINGS.pixelRatio);
    renderer.setClearColor(RENDERER_SETTINGS.clearColor);
    renderer.shadowMap.enabled = RENDERER_SETTINGS.shadowMapEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // мягкие тени

    // Улучшение точности буфера глубины для предотвращения Z-fighting
    renderer.logarithmicDepthBuffer = true; // Использование логарифмического буфера глубины
    
    // Современные настройки для улучшения качества отображения PBR материалов
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Новый API вместо outputEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Улучшенный tone mapping
    renderer.toneMappingExposure = 0.5; // Увеличена экспозиция для более светлых деревянных материалов
    
    console.log('Рендерер настроен для улучшенного отображения PBR материалов');
    
    return renderer;
}

/**
 * Создает и настраивает Three.js сцену
 */
export function createScene() {
    // Создаем сцену
    scene = new THREE.Scene();
    
    // Создание освещения
    createLighting();
    
    // Создание HDRI-фона
    createEXRBackground();
    
    return scene;
}

/**
 * Создание освещения для сцены
 */
function createLighting() {
    // Создаем общее освещение (аналог HemisphericLight)
    const ambientLight = new THREE.AmbientLight(
        LIGHTING.ambientLight.color,
        LIGHTING.ambientLight.intensity
    );
    scene.add(ambientLight);
    
    // Создаем направленный свет (для теней)
    const directionalLight = new THREE.DirectionalLight(
        LIGHTING.directionalLight.color,
        LIGHTING.directionalLight.intensity
    );
    
    // Устанавливаем позицию света
    directionalLight.position.set(
        LIGHTING.directionalLight.position.x,
        LIGHTING.directionalLight.position.y,
        LIGHTING.directionalLight.position.z
    );
    
    // Настройка теней
    if (LIGHTING.directionalLight.castShadow) {
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        
        // Устанавливаем размер области теней
        const d = 50;
        directionalLight.shadow.camera.left = -d;
        directionalLight.shadow.camera.right = d;
        directionalLight.shadow.camera.top = d;
        directionalLight.shadow.camera.bottom = -d;
        
        // Улучшаем качество теней для стеклянных объектов
        directionalLight.shadow.bias = -0.0001;
        directionalLight.shadow.normalBias = 0.02;
    }
    
    scene.add(directionalLight);
    
    // Добавляем дополнительное заполняющее освещение для PBR материалов
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);
    
    // Добавляем точечный источник света для дополнительных отражений
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
    pointLight.position.set(20, 30, 20);
    scene.add(pointLight);
    
    // Добавляем теплое направленное освещение для деревянных материалов
    const warmLight = new THREE.DirectionalLight(0xffd4a3, 0.6); // Теплый желтоватый свет
    warmLight.position.set(-40, 25, 30);
    scene.add(warmLight);
    
    // Добавляем дополнительное мягкое освещение снизу для осветления теней
    const bottomLight = new THREE.DirectionalLight(0xffffff, 0.3);
    bottomLight.position.set(0, -20, 0); // Свет снизу
    scene.add(bottomLight);
    
    console.log('Освещение настроено для оптимального отображения PBR материалов, включая деревянные поверхности');
}

/**
 * Устанавливает HDRI-фон по указанному пути
 * @param {string} hdriPath - путь к .exr файлу
 */
export function setHdriBackground(hdriPath) {
    if (!renderer) {
        console.error('Renderer не инициализирован');
        return;
    }
    
    // Показываем сообщение о загрузке HDRI
    console.log('🌅 Загружаем HDRI environment map:', hdriPath);
    
    const exrLoader = new EXRLoader();
    const pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    exrLoader.load(hdriPath, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.LinearSRGBColorSpace;
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;
        scene.background = envMap;
        texture.dispose();
        pmremGenerator.dispose();
        console.log('✅ HDRI environment map успешно установлен:', hdriPath);
        setTimeout(() => {
            import('../modules/objectManager.js').then(({ updateMaterialsEnvironmentMap, updateWoodenMaterials }) => {
                updateMaterialsEnvironmentMap();
                if (updateWoodenMaterials) updateWoodenMaterials();
            }).catch(err => console.warn('Не удалось обновить материалы:', err));
        }, 100);
        setTimeout(async () => {
            try {
                const { hideLoadingScreenSmooth } = await import('../utils/loadingScreen.js');
                await hideLoadingScreenSmooth();
            } catch (err) {
                console.warn('Не удалось скрыть loadingScreen:', err);
            }
        }, 200);
    }, undefined, (error) => {
        console.error('Ошибка загрузки HDRI:', error);
        createCityboxFallback();
    });
}

// createEXRBackground теперь вызывает setHdriBackground с дефолтным путем
function createEXRBackground() {
    setHdriBackground('textures/hdri/autumn_park_4k.exr');
}

/**
 * Fallback функция для создания citybox окружения если HDRI не загрузился
 */
function createCityboxFallback() {
    console.log('🔄 Используем citybox как fallback для environment map');
    
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('textures/citybox/');
    
    const textureCube = loader.load([
        'citybox_px.jpg', 'citybox_nx.jpg',
        'citybox_py.jpg', 'citybox_ny.jpg',
        'citybox_pz.jpg', 'citybox_nz.jpg'
    ], 
    // onLoad callback
    () => {
        console.log('✅ Citybox environment map загружен как fallback');
        
        // Скрываем loadingScreen после загрузки fallback
        setTimeout(async () => {
            try {
                const { hideLoadingScreenSmooth } = await import('../utils/loadingScreen.js');
                console.log('🌅 Citybox environment map готов, скрываем loadingScreen');
                await hideLoadingScreenSmooth();
            } catch (err) {
                console.warn('Не удалось скрыть loadingScreen:', err);
            }
        }, 200);
    });
    
    scene.background = textureCube;
    
    const pmremGenerator = new PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromCubemap(textureCube).texture;
    scene.environment = envMap;
    pmremGenerator.dispose();
}

/**
 * Обновляет размеры рендерера при изменении размера окна
 * @param {THREE.WebGLRenderer} renderer - Рендерер
 * @param {THREE.Camera} camera - Камера
 */
export function setupResizeHandler(renderer, camera) {
    window.addEventListener('resize', () => {
        // Обновляем размер рендерера
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Обновляем соотношение сторон камеры, если это перспективная камера
        if (camera.isPerspectiveCamera) {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        }
    });
}
