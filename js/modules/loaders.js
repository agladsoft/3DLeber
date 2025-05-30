/**
 * Модуль для настройки загрузчиков 3D-моделей
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Создаем загрузчики для разных форматов файлов
export const gltfLoader = new GLTFLoader();
export const stlLoader = new STLLoader();
export const fbxLoader = new FBXLoader();

// Настройка DRACOLoader для поддержки сжатых моделей
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
dracoLoader.setDecoderConfig({
    type: 'js', // Используем JavaScript декодер для лучшей совместимости
    useWebWorkers: true, // Используем веб-воркеры для декодирования
    useWebAssembly: true // Используем WebAssembly для лучшей производительности
});

// Применяем Draco загрузчик к GLTF загрузчику
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Определяет тип загрузчика на основе расширения файла
 * @param {String} fileExtension - Расширение файла модели
 * @returns {Object} Объект с загрузчиком и методом загрузки
 */
export function getLoaderByExtension(fileExtension) {
    if (fileExtension === 'glb' || fileExtension === 'gltf') {
        return { loader: gltfLoader, method: 'gltf' };
    } else if (fileExtension === 'stl') {
        return { loader: stlLoader, method: 'stl' };
    } else if (fileExtension === 'fbx') {
        return { loader: fbxLoader, method: 'fbx' };
    } else {
        throw new Error(`Неподдерживаемый формат файла: ${fileExtension}`);
    }
}
