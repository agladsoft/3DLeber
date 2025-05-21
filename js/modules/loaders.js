/**
 * Модуль для настройки загрузчиков 3D-моделей
 */
import * as THREE from 'three';
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
dracoLoader.setDecoderPath('/jsm/libs/draco/'); // Путь к декодеру Draco (папка с файлами draco_decoder.js/wasm)
dracoLoader.setDecoderConfig({type: 'js'}); // (Optional) Override detection of WASM support.
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
