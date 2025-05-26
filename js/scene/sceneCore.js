/**
 * Модуль для инициализации сцены, рендерера и основных компонентов Three.js
 */
import { 
    RENDERER_SETTINGS, 
    LIGHTING 
} from '../config.js';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { PMREMGenerator } from 'three';

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
 * Создание HDRI-фона для сцены
 */
function createEXRBackground() {
    if (!renderer) {
        console.error('Renderer не инициализирован');
        return;
    }
    const pmremGenerator = new PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    new EXRLoader()
        .setDataType(THREE.FloatType)
        .load('textures/hdri/M3_Photoreal_hdri-exr_wide_open_plaza_in_847306475_455207.exr', function(texture) {
            const envMap = pmremGenerator.fromEquirectangular(texture).texture;
            scene.environment = envMap;
            scene.background = envMap;
            texture.dispose();
            pmremGenerator.dispose();
        });
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

/**
 * Функция плавной анимации для использования в различных анимациях
 * @param {Number} t - Прогресс анимации от 0 до 1
 * @returns {Number} Преобразованный прогресс с эффектом замедления
 */
export function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
