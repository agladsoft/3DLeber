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
 * @returns {null} Возвращает null - сетка больше не создается
 */
export function createGrid(width, length) {
    // Функция больше не создает сетку, возвращает null
    console.log("createGrid вызвана, но сетка не создается (функционал отключен)");
    return null;
}
