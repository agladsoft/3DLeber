/**
 * Модуль для инициализации сцены, рендерера и основных компонентов Three.js
 */
import { 
    RENDERER_SETTINGS, 
    LIGHTING 
} from '../config.js';
import * as THREE from 'three';
import { PMREMGenerator } from 'three';
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
    
    // Улучшение точности буфера глубины для предотвращения Z-fighting
    renderer.logarithmicDepthBuffer = true; // Использование логарифмического буфера глубины
    
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
    }
    
    scene.add(directionalLight);
}

/**
 * Создание фона для сцены (Skybox с использованием citybox текстур)
 */
function createEXRBackground() {
    if (!renderer) {
        console.error('Renderer не инициализирован');
        return;
    }
    
    // Загружаем кубическую текстуру (Skybox) вместо HDRI
    const loader = new THREE.CubeTextureLoader();
    loader.setPath('textures/citybox/');
    
    const textureCube = loader.load([
        'citybox_px.jpg', // положительный X (право)
        'citybox_nx.jpg', // отрицательный X (лево)
        'citybox_py.jpg', // положительный Y (верх)
        'citybox_ny.jpg', // отрицательный Y (низ)
        'citybox_pz.jpg', // положительный Z (перед)
        'citybox_nz.jpg'  // отрицательный Z (зад)
    ]);
    
    // Устанавливаем фон и окружение для сцены
    scene.background = textureCube;
    
    // Опционально сохраняем окружение для отражений
    // Создаем PMREMGenerator для преобразования кубической текстуры
    const pmremGenerator = new PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromCubemap(textureCube).texture;
    scene.environment = envMap;
    pmremGenerator.dispose();
    
    console.log('Skybox с использованием citybox текстур успешно загружен');
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
