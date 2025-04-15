/**
 * Модуль для взаимодействия с интерфейсом пользователя
 */
import { ELEMENT_INFO } from '../config.js';
import { scene } from '../scene.js';
import { placedObjects, removeObject } from './objectManager.js';
import { checkAllObjectsPositions } from './collisionDetection.js';
import { toggleModelDimensions } from './dimensionDisplay/index.js';
