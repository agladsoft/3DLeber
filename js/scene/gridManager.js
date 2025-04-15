/**
 * Модуль для управления сеткой и координатной системой
 */
import { scene } from './sceneCore.js';
import * as THREE from 'three';

// Экспортируем переменную для доступа из других модулей
export let gridHelper = null;

/**
 * Создание и отображение сетки с метровыми делениями
 * @param {Number} width - Ширина площадки
 * @param {Number} length - Длина площадки
 * @returns {THREE.GridHelper} Созданный объект сетки
 */
export function createGrid(width, length) {
    // Удаляем существующую сетку, если она есть
    if (gridHelper) {
        scene.remove(gridHelper);
        gridHelper = null;
    }
    
    // Определяем размер сетки как максимальную сторону площадки + 20% запаса
    const gridSize = Math.max(width, length) * 1.2;
    // Делаем деления сетки точно по 1 метру
    const divisions = Math.ceil(gridSize);
    
    // Создаем сетку с делениями в 1 метр
    gridHelper = new THREE.GridHelper(gridSize, divisions, 0x444444, 0x888888);
    
    // Фиксируем сетку в центре сцены
    gridHelper.position.set(0, 0.01, 0); // Слегка приподнимаем над землей
    
    // Добавляем метку для идентификации
    gridHelper.name = "topViewGrid";
    
    // Делаем линии сетки более заметными
    if (gridHelper.material) {
        if (Array.isArray(gridHelper.material)) {
            gridHelper.material.forEach(mat => {
                mat.opacity = 0.8;
                mat.transparent = true;
            });
        } else {
            gridHelper.material.opacity = 0.8;
            gridHelper.material.transparent = true;
        }
    }
    
    // Важно: отключаем автоматическое обновление матрицы преобразований для фиксации сетки
    gridHelper.matrixAutoUpdate = false;
    gridHelper.updateMatrix();
    
    // Сохраняем информацию о фиксации в пользовательских данных
    gridHelper.userData.isFixedGrid = true;
    
    // Добавляем сетку на сцену
    scene.add(gridHelper);
    
    // Обновляем глобальную ссылку на сетку
    if (window.app) {
        window.app.gridHelper = gridHelper;
    }
    
    return gridHelper;
}
