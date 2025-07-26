/**
 * Модуль для загрузки моделей площадки
 */
import { scene } from '../scene.js';
import { ground, updateGroundReferences, updatePlaygroundDimensions } from './playgroundCore.js';
import { createSimplePlayground } from './playgroundCreator.js';
import { PLAYGROUND } from '../config.js';
import { hideLoadingOverlay } from '../loadingManager.js';
import * as THREE from 'three';


/**
 * Загрузка модели площадки
 * @param {String} modelName - Имя файла модели площадки (по умолчанию 'rubber')
 * @param {Number} width - Ширина площадки (опционально)
 * @param {Number} length - Длина площадки (опционально)
 * @param {String} color - Цвет площадки (серый, черный, зеленый, коричневый)
 * @returns {Promise} Промис, который разрешается, когда площадка загружена
 */
export async function loadPlayground(modelName = 'rubber', width = null, length = null, color = null) {
    let userWidth = PLAYGROUND.defaultWidth;
    let userLength = PLAYGROUND.defaultLength;
    let userColor = 'серый'; // Добавляем переменную с цветом по умолчанию
    
    // Получаем размеры площадки
    if (width && length) {
        userWidth = width;
        userLength = length;
    } else if (window.selectedPlaygroundWidth && window.selectedPlaygroundLength) {
        userWidth = window.selectedPlaygroundWidth;
        userLength = window.selectedPlaygroundLength;
    } else {
        const widthInput = document.getElementById("playgroundWidth");
        const lengthInput = document.getElementById("playgroundLength");
        if (widthInput && lengthInput) {
            userWidth = parseFloat(widthInput.value) || PLAYGROUND.defaultWidth;
            userLength = parseFloat(lengthInput.value) || PLAYGROUND.defaultLength;
        }
    }
    
    // Получаем цвет площадки
    if (color) {
        userColor = color;
    } else if (window.selectedPlaygroundColor) {
        userColor = window.selectedPlaygroundColor;
    }
    
    try { 
        // Всегда удаляем существующие площадки (но не зеленый фон)
        removeExistingPlaygrounds(); 
    } catch (error) {}
    updateGroundReferences(null, null);
    
    // Проверяем, нужно ли создать кастомную площадку
    if (modelName === 'custom') {
        console.log('=== ЗАГРУЗКА КАСТОМНОЙ ПЛОЩАДКИ ===');
        console.log('Данные кастомной площадки:', window.customPlaygroundShape);
        
        try {
            if (!window.customPlaygroundShape) {
                throw new Error('Данные кастомной площадки не найдены');
            }
            
            // Создаем зеленый фон (большой круг для приземления)
            console.log('Создаем зеленый фон...');
            const { createGreenBackground } = await import('./playgroundCreator.js');
            const greenBackground = createGreenBackground(userWidth, userLength);
            console.log('✅ Зеленый фон создан');
            
            // Создаем кастомную площадку
            console.log('Создаем кастомную площадку...');
            const customPlayground = createCustomPlayground(window.customPlaygroundShape, userWidth, userLength, userColor);
            
            if (!customPlayground) {
                throw new Error('Кастомная площадка не создана');
            }
            
            // Настраиваем площадку
            if (customPlayground.position) customPlayground.position.y = 0;
            updatePlaygroundDimensions(userWidth, userLength);
            
            if (customPlayground.userData) {
                customPlayground.userData.groundColor = userColor;
                customPlayground.userData.isCustomPlayground = true;
                customPlayground.userData.customShape = window.customPlaygroundShape;
            }
            
            console.log('✅ Кастомная площадка успешно создана');
            
            setTimeout(() => {
                hideLoadingOverlay();
            }, 500);
            return Promise.resolve(customPlayground);
            
        } catch (error) {
            console.error('❌ Ошибка создания кастомной площадки:', error);
            
            // Fallback к стандартной площадке
            console.log('🔄 Переходим к стандартной площадке...');
            const simplePlane = createSimplePlayground(userWidth, userLength, userColor);
            if (simplePlane && simplePlane.position) simplePlane.position.y = 0;
            updatePlaygroundDimensions(userWidth, userLength);
            
            setTimeout(() => {
                hideLoadingOverlay();
            }, 500);
            return Promise.resolve(simplePlane);
        }
    } else {
        // Стандартная площадка
        const simplePlane = createSimplePlayground(userWidth, userLength, userColor);
        // Устанавливаем позицию площадки на Y=0
        if (simplePlane && simplePlane.position) simplePlane.position.y = 0;
        updatePlaygroundDimensions(userWidth, userLength);
        
        // Сохраняем цвет площадки в userData
        if (simplePlane && simplePlane.userData) {
            simplePlane.userData.groundColor = userColor;
        }
        // Используем стандартную функцию скрытия loading overlay
        setTimeout(() => {
            hideLoadingOverlay();
        }, 500);
        return Promise.resolve(simplePlane);
    }
}

/**
 * Удаляет все существующие площадки из сцены
 */
function removeExistingPlaygrounds() {    
    // Проверяем, что scene определена и доступна
    if (!scene) {
        console.warn('Scene is undefined, cannot remove existing playgrounds');
        return;
    }
    
    try {
        // Создаем массив для объектов, которые нужно удалить
        // (нельзя удалять объекты прямо во время traverse)
        const objectsToRemove = [];
        
        scene.traverse((object) => {
            // Ищем объекты площадок, НО НЕ удаляем зеленый фон
            if (object && object.userData && 
                (object.userData.modelName === 'rubber' || 
                 object.userData.modelName === 'simple_playground' ||
                 (object.userData.modelName && object.userData.modelName.includes('playground') && !object.userData.isCustomPlayground) ||
                 // НЕ удаляем зеленый фон - он должен остаться
                 (object.name && object.name.includes('playground') && object.name !== 'custom_playground' && object.name !== 'green_background'))) {
                
                // Дополнительная проверка - НЕ удаляем зеленый фон
                if (object.name !== 'green_background' && !object.userData.isGround) {
                    objectsToRemove.push(object);
                }
            }
        });
        
        // Удаляем все найденные объекты
        objectsToRemove.forEach(object => {
            console.log('Удаляем объект из сцены:', object.userData.modelName || object.name);
            scene.remove(object);
        });
        
    } catch (error) {
        console.error('Ошибка при удалении существующих площадок:', error);
    }
}

/**
 * Создает кастомную площадку из данных Fabric.js
 * @param {Object} customShape - Данные фигур из Fabric.js
 * @param {Number} width - Ширина в метрах
 * @param {Number} length - Длина в метрах
 * @param {String} color - Цвет площадки
 * @returns {THREE.Group} Группа с кастомной площадкой
 */
function createCustomPlayground(customShape, width, length, color) {
    console.log('🏗️ СОЗДАНИЕ РЕАЛЬНОЙ КАСТОМНОЙ ПЛОЩАДКИ');
    console.log('📊 Данные фигуры:', customShape);
    console.log('📐 Размеры площадки:', width, 'x', length);
    
    if (!customShape?.objects?.length) {
        console.error('❌ Нет объектов для создания!');
        return null;
    }
    
    // Создаем группу для кастомной площадки
    const playgroundGroup = new THREE.Group();
    playgroundGroup.name = 'custom_playground';
    playgroundGroup.userData = {
        modelName: 'custom_playground',
        isPlayground: true,
        isCustomPlayground: true
    };
    
    // Прямое масштабирование: canvas 1000x1000 пикселей = 100x100 метров
    // 1 пиксель = 0.1 метра (как в редакторе)
    const scaleX = 0.1; // масштаб из редактора
    const scaleZ = 0.1; // масштаб из редактора
    
    // Центр canvas в пикселях для центрирования в 3D сцене
    const canvasCenterX = customShape.canvasWidth / 2;
    const canvasCenterY = customShape.canvasHeight / 2;
    
    console.log(`📏 Масштаб: canvas ${customShape.canvasWidth}x${customShape.canvasHeight} → ${width}x${length}м`);
    console.log(`📏 Коэффициенты: X=${scaleX.toFixed(4)}, Z=${scaleZ.toFixed(4)}`);
    
    // Обрабатываем каждый объект из Fabric.js
    let processedObjects = 0;
    
    customShape.objects.forEach((fabricObj, index) => {
        try {
            console.log(`\n=== ОБЪЕКТ ${index + 1} ===`);
            console.log('Тип:', fabricObj.type);
            console.log('Позиция:', fabricObj.left, fabricObj.top);
            console.log('Размер:', fabricObj.width, fabricObj.height);
            
            let mesh = null;
        
        // Создаем меш в зависимости от типа объекта
        if (fabricObj.type === 'rect') {
            // Прямоугольник
            const realWidth = fabricObj.width * fabricObj.scaleX * scaleX;
            const realHeight = fabricObj.height * fabricObj.scaleY * scaleZ;
            
            const geometry = new THREE.BoxGeometry(realWidth, 0.01, realHeight); // Плоский прямоугольник
            const material = new THREE.MeshStandardMaterial({ 
                color: 0xFF0000, // КРАСНЫЙ цвет для прямоугольника
                roughness: 0.8,
                metalness: 0.1
            });
            
            mesh = new THREE.Mesh(geometry, material);
            // РАЗМЕЩАЕМ ПРЯМОУГОЛЬНИК в точной позиции из canvas
            const worldX = (fabricObj.left - canvasCenterX) * scaleX;
            const worldZ = (fabricObj.top - canvasCenterY) * scaleZ;
            mesh.position.set(worldX, 0.05, worldZ);
            
            console.log(`✅ Прямоугольник ${index + 1} размещен в позиции (${worldX.toFixed(2)}, 0.05, ${worldZ.toFixed(2)})`);
            
            console.log('✅ Создан прямоугольник:', realWidth.toFixed(2), 'x', realHeight.toFixed(2), 'м');
            
        } else if (fabricObj.type === 'circle') {
            // КРУГ - детальная отладка
            console.log('🔵 СОЗДАЕМ КРУГ!');
            console.log('fabricObj.radius:', fabricObj.radius);
            console.log('fabricObj.scaleX:', fabricObj.scaleX);
            console.log('fabricObj.scaleY:', fabricObj.scaleY);
            console.log('scaleX:', scaleX, 'scaleZ:', scaleZ);
            
            const radius = fabricObj.radius * (fabricObj.scaleX || 1) * Math.max(scaleX, scaleZ);
            
            console.log('Вычисленный радиус:', radius, 'метров');
            
            const geometry = new THREE.CylinderGeometry(radius, radius, 0.01, 32); // Плоский круг
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x0000FF, // СИНИЙ цвет для круга - чтобы отличить от прямоугольника
                roughness: 0.8,
                metalness: 0.1
            });
            
            mesh = new THREE.Mesh(geometry, material);
            // РАЗМЕЩАЕМ КРУГ в точной позиции из canvas
            const worldX = (fabricObj.left - canvasCenterX) * scaleX;
            const worldZ = (fabricObj.top - canvasCenterY) * scaleZ;
            mesh.position.set(worldX, 0.05, worldZ);
            
            console.log(`✅ СОЗДАН СИНИЙ КРУГ ${index + 1} радиус:`, radius.toFixed(2), `м в позиции (${worldX.toFixed(2)}, 0.05, ${worldZ.toFixed(2)})`);
            
        } else if (fabricObj.type === 'polygon') {
            // МНОГОУГОЛЬНИК - детальная отладка
            console.log('🔷 СОЗДАЕМ МНОГОУГОЛЬНИК!');
            console.log('fabricObj.points:', fabricObj.points);
            console.log('fabricObj.left:', fabricObj.left);
            console.log('fabricObj.top:', fabricObj.top);
            console.log('fabricObj.width:', fabricObj.width);
            console.log('fabricObj.height:', fabricObj.height);
            
            if (fabricObj.points && fabricObj.points.length >= 3) {
                console.log('🔷 СОЗДАЕМ НАСТОЯЩИЙ МНОГОУГОЛЬНИК ИЗ ТОЧЕК!');
                console.log('Точки многоугольника:', fabricObj.points);
                
                // Создаем THREE.js Shape из точек Fabric.js
                const shape = new THREE.Shape();
                
                // Находим центр фигуры для центрирования
                const minX = Math.min(...fabricObj.points.map(p => p.x));
                const maxX = Math.max(...fabricObj.points.map(p => p.x));
                const minY = Math.min(...fabricObj.points.map(p => p.y));
                const maxY = Math.max(...fabricObj.points.map(p => p.y));
                
                const centerX = (minX + maxX) / 2;
                const centerY = (minY + maxY) / 2;
                
                console.log('📍 Центр многоугольника:', centerX, centerY);
                
                // Масштабируем и центрируем точки относительно центра сцены
                const scaledPoints = fabricObj.points.map(point => ({
                    x: (point.x - centerX) * scaleX,
                    y: (point.y - centerY) * scaleZ
                }));
                
                console.log('Масштабированные точки:', scaledPoints);
                
                // Начинаем с первой точки
                shape.moveTo(scaledPoints[0].x, scaledPoints[0].y);
                
                // Добавляем остальные точки
                for (let i = 1; i < scaledPoints.length; i++) {
                    shape.lineTo(scaledPoints[i].x, scaledPoints[i].y);
                }
                
                // Закрываем фигуру
                shape.lineTo(scaledPoints[0].x, scaledPoints[0].y);
                
                // Создаем плоскую геометрию (без экструзии)
                const extrudeSettings = {
                    depth: 0.01, // Минимальная толщина для плоской площадки
                    bevelEnabled: false
                };
                
                const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0xFF00FF, // ФИОЛЕТОВЫЙ цвет для многоугольника
                    roughness: 0.8,
                    metalness: 0.1
                });
                
                mesh = new THREE.Mesh(geometry, material);
                
                // Поворачиваем горизонтально и размещаем в точной позиции из canvas
                mesh.rotation.x = -Math.PI / 2; // Поворачиваем на 90 градусов
                const worldX = (fabricObj.left - canvasCenterX) * scaleX;
                const worldZ = (fabricObj.top - canvasCenterY) * scaleZ;
                mesh.position.set(worldX, 0.05, worldZ);
                
                console.log('✅ СОЗДАНА НАСТОЯЩАЯ ФИОЛЕТОВАЯ ФИГУРА из', fabricObj.points.length, 'точек');
            } else {
                console.warn('❌ Многоугольник не имеет точек');
            }
            
        } else if (fabricObj.type === 'path') {
            // СВОБОДНОЕ РИСОВАНИЕ - используем тот же подход что и для многоугольника
            console.log('🎨 СОЗДАЕМ СВОБОДНУЮ ФИГУРУ ИЗ PATH - как многоугольник!');
            console.log('fabricObj.path:', fabricObj.path);
            console.log('fabricObj полностью:', fabricObj);
            
            try {
                // Получаем данные пути
                const pathData = fabricObj.path;
                
                if (pathData && Array.isArray(pathData) && pathData.length > 0) {
                    console.log('🔍 Извлекаем точки из path данных:', pathData.length, 'команд');
                    
                    // Извлекаем точки из path команд
                    const pathPoints = [];
                    let currentX = 0, currentY = 0;
                    
                    pathData.forEach((command, index) => {
                        console.log(`Команда ${index}:`, command);
                        
                        const cmd = command[0]; // Тип команды (M, L, C, etc.)
                        
                        switch (cmd) {
                            case 'M': // MoveTo
                                currentX = command[1];
                                currentY = command[2];
                                pathPoints.push({x: currentX, y: currentY});
                                console.log('MoveTo точка добавлена:', currentX, currentY);
                                break;
                                
                            case 'L': // LineTo
                                currentX = command[1];
                                currentY = command[2];
                                pathPoints.push({x: currentX, y: currentY});
                                console.log('LineTo точка добавлена:', currentX, currentY);
                                break;
                                
                            case 'Q': // QuadraticCurveTo
                                // Добавляем конечную точку кривой
                                currentX = command[3];
                                currentY = command[4];
                                pathPoints.push({x: currentX, y: currentY});
                                console.log('QuadraticCurveTo точка добавлена:', currentX, currentY);
                                break;
                                
                            case 'C': // BezierCurveTo
                                // Добавляем конечную точку кривой
                                currentX = command[5];
                                currentY = command[6];
                                pathPoints.push({x: currentX, y: currentY});
                                console.log('BezierCurveTo точка добавлена:', currentX, currentY);
                                break;
                        }
                    });
                    
                    console.log('📍 Извлечено точек из path:', pathPoints.length);
                    console.log('📍 Точки path:', pathPoints);
                    
                    if (pathPoints.length >= 3) {
                        console.log('🔷 СОЗДАЕМ НАСТОЯЩУЮ ФИГУРУ ИЗ PATH ТОЧЕК!');
                        
                        // Создаем THREE.js Shape из точек - ТОТ ЖЕ КОД что и для многоугольника
                        const shape = new THREE.Shape();
                        
                        // Находим центр фигуры для центрирования
                        const minX = Math.min(...pathPoints.map(p => p.x));
                        const maxX = Math.max(...pathPoints.map(p => p.x));
                        const minY = Math.min(...pathPoints.map(p => p.y));
                        const maxY = Math.max(...pathPoints.map(p => p.y));
                        
                        const centerX = (minX + maxX) / 2;
                        const centerY = (minY + maxY) / 2;
                        
                        console.log('📍 Центр path фигуры:', centerX, centerY);
                        
                        // Масштабируем и центрируем точки относительно центра сцены
                        const scaledPoints = pathPoints.map(point => ({
                            x: (point.x - centerX) * scaleX,
                            y: (point.y - centerY) * scaleZ
                        }));
                        
                        console.log('Масштабированные path точки:', scaledPoints);
                        
                        // Начинаем с первой точки
                        shape.moveTo(scaledPoints[0].x, scaledPoints[0].y);
                        
                        // Добавляем остальные точки
                        for (let i = 1; i < scaledPoints.length; i++) {
                            shape.lineTo(scaledPoints[i].x, scaledPoints[i].y);
                        }
                        
                        // Закрываем фигуру
                        shape.lineTo(scaledPoints[0].x, scaledPoints[0].y);
                        
                        // Создаем плоскую геометрию - ТОТ ЖЕ КОД что и для многоугольника
                        const extrudeSettings = {
                            depth: 0.01, // Минимальная толщина для плоской площадки
                            bevelEnabled: false
                        };
                        
                        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                        const material = new THREE.MeshStandardMaterial({ 
                            color: 0xFFFF00, // ЖЕЛТЫЙ цвет для свободного рисования
                            roughness: 0.8,
                            metalness: 0.1
                        });
                        
                        mesh = new THREE.Mesh(geometry, material);
                        
                        // Поворачиваем горизонтально и размещаем в точной позиции из canvas
                        mesh.rotation.x = -Math.PI / 2; // Поворачиваем на 90 градусов
                        const worldX = (fabricObj.left - canvasCenterX) * scaleX;
                        const worldZ = (fabricObj.top - canvasCenterY) * scaleZ;
                        mesh.position.set(worldX, 0.05, worldZ);
                        
                        console.log('✅ СОЗДАНА НАСТОЯЩАЯ ЖЕЛТАЯ СВОБОДНАЯ ФИГУРА из', pathPoints.length, 'точек!');
                    } else {
                        throw new Error(`Недостаточно точек для создания фигуры: ${pathPoints.length}`);
                    }
                } else {
                    throw new Error('Path данные не найдены или пустые');
                }
                
            } catch (error) {
                console.warn('❌ Ошибка создания path фигуры:', error);
                console.log('🔄 Создаем простой прямоугольник как fallback');
                
                // Fallback - простой прямоугольник
                const bounds = {
                    width: fabricObj.width || 100,
                    height: fabricObj.height || 100
                };
                
                const finalWidth = Math.max(bounds.width * scaleX, 1);
                const finalHeight = Math.max(bounds.height * scaleZ, 1);
                
                const geometry = new THREE.BoxGeometry(finalWidth, 0.01, finalHeight); // Плоский fallback
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0xFFFF00,
                    roughness: 0.8,
                    metalness: 0.1
                });
                
                mesh = new THREE.Mesh(geometry, material);
                const worldX = (fabricObj.left - canvasCenterX) * scaleX;
                const worldZ = (fabricObj.top - canvasCenterY) * scaleZ;
                mesh.position.set(worldX, 0.05, worldZ);
                
                console.log('✅ Создан желтый прямоугольник fallback:', finalWidth.toFixed(2), 'x', finalHeight.toFixed(2), 'м');
            }
            
        } else {
            // НЕИЗВЕСТНЫЙ ТИП - создаем заглушку
            console.warn('⚠️ НЕИЗВЕСТНЫЙ ТИП ОБЪЕКТА:', fabricObj.type);
            console.log('Создаем серую заглушку для неизвестного типа');
            
            const geometry = new THREE.BoxGeometry(5, 0.01, 5); // Плоская заглушка
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x808080, // СЕРЫЙ цвет для неизвестных типов
                roughness: 0.8,
                metalness: 0.1
            });
            
            mesh = new THREE.Mesh(geometry, material);
            // РАЗМЕЩАЕМ НЕИЗВЕСТНЫЙ ТИП в точной позиции из canvas
            const worldX = (fabricObj.left - canvasCenterX) * scaleX;
            const worldZ = (fabricObj.top - canvasCenterY) * scaleZ;
            mesh.position.set(worldX, 0.05, worldZ);
            
            console.log('✅ СОЗДАНА СЕРАЯ ЗАГЛУШКА для типа:', fabricObj.type);
        }
        
            if (mesh) {
                mesh.castShadow = false;
                mesh.receiveShadow = true;
                mesh.userData = {
                    isPlayground: true,
                    fabricType: fabricObj.type
                };
                
                playgroundGroup.add(mesh);
                processedObjects++;
                console.log(`✅ Меш добавлен в группу на позиции:`, mesh.position);
            } else {
                console.warn(`❌ Не удалось создать меш для типа: ${fabricObj.type}`);
            }
            
        } catch (error) {
            console.error(`❌ ОШИБКА при обработке объекта ${index + 1}:`, error);
            console.error('Объект:', fabricObj);
            
            // Создаем простую заглушку при ошибке
            try {
                const errorGeometry = new THREE.BoxGeometry(2, 0.01, 2); // Плоская заглушка для ошибок
                const errorMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
                const errorMesh = new THREE.Mesh(errorGeometry, errorMaterial);
                const worldX = (fabricObj.left - canvasCenterX) * scaleX;
                const worldZ = (fabricObj.top - canvasCenterY) * scaleZ;
                errorMesh.position.set(worldX, 0.05, worldZ);
                playgroundGroup.add(errorMesh);
                processedObjects++;
                console.log('✅ Добавлена красная заглушка для ошибочного объекта');
            } catch (e) {
                console.error('❌ Не удалось создать даже заглушку:', e);
            }
        }
    });
    
    // Добавляем группу в сцену
    scene.add(playgroundGroup);
    console.log(`\n🎯 РЕЗУЛЬТАТ СОЗДАНИЯ КАСТОМНОЙ ПЛОЩАДКИ:`);
    console.log(`✅ Обработано объектов: ${processedObjects}/${customShape.objects.length}`);
    console.log(`✅ Мешей в группе: ${playgroundGroup.children.length}`);
    console.log(`✅ Группа добавлена в сцену: ${playgroundGroup.name}`);
    
    return playgroundGroup;
}

/**
 * Создает кастомную площадку с зеленым фоном
 * @param {Object} customShape - Данные фигур из Fabric.js
 * @param {Number} width - Ширина в метрах
 * @param {Number} length - Длина в метрах
 * @param {String} color - Цвет площадки
 * @returns {Promise<THREE.Group>} Группа с кастомной площадкой
 */
async function createCustomPlaygroundWithBackground(customShape, width, length, color) {
    console.log('=== СОЗДАНИЕ КАСТОМНОЙ ПЛОЩАДКИ С ФОНОМ ===');
    
    try {
        // Импортируем функции из playgroundCreator и playgroundUI
        const { createGreenBackground } = await import('./playgroundCreator.js');
        const { updatePlaygroundLabels } = await import('./playgroundUI.js');
        
        // 1. Создаем зеленый фон (как в стандартной площадке)
        console.log('Создаем зеленый фон...');
        const greenBackground = createGreenBackground(width, length);
        
        // 2. Создаем кастомную площадку (заменяет стандартный прямоугольник)
        console.log('Создаем кастомную площадку...');
        console.log('customShape перед созданием:', customShape);
        console.log('customShape.objects перед созданием:', customShape.objects);
        console.log('Количество объектов для создания:', customShape?.objects?.length || 0);
        
        // Показываем содержимое каждого объекта
        if (customShape.objects && customShape.objects.length > 0) {
            customShape.objects.forEach((obj, index) => {
                console.log(`Объект ${index + 1}:`, obj);
                console.log(`- Тип: ${obj.type}`);
                console.log(`- ObjectType: ${obj.objectType}`);
                console.log(`- Left: ${obj.left}, Top: ${obj.top}`);
                console.log(`- Width: ${obj.width}, Height: ${obj.height}`);
            });
        }
        
        const customPlayground = createCustomPlayground(customShape, width, length, color);
        
        console.log('Результат создания кастомной площадки:', customPlayground);
        console.log('Тип результата:', customPlayground ? customPlayground.constructor.name : 'null');
        
        if (!customPlayground) {
            console.error('❌ Кастомная площадка не создана!');
            // Используем стандартную площадку как fallback
            const simplePlane = createSimplePlayground(width, length, color);
            if (simplePlane && simplePlane.position) simplePlane.position.y = 0;
            updatePlaygroundDimensions(width, length);
            
            setTimeout(() => {
                hideLoadingOverlay();
            }, 500);
            return Promise.resolve(simplePlane);
        }
        
        // 3. Обновляем размеры и метки
        updatePlaygroundDimensions(width, length);
        updatePlaygroundLabels(width, length);
        
        // 4. Сохраняем данные кастомной площадки
        if (customPlayground && customPlayground.userData) {
            customPlayground.userData.groundColor = color;
            customPlayground.userData.isCustomPlayground = true;
            customPlayground.userData.customShape = customShape;
        }
        
        console.log('✅ Кастомная площадка с фоном создана успешно');
        
        setTimeout(() => {
            hideLoadingOverlay();
        }, 500);
        
        return Promise.resolve(customPlayground);
        
    } catch (error) {
        console.error('❌ Ошибка при создании кастомной площадки:', error);
        
        // Fallback to standard playground
        const simplePlane = createSimplePlayground(width, length, color);
        if (simplePlane && simplePlane.position) simplePlane.position.y = 0;
        updatePlaygroundDimensions(width, length);
        
        setTimeout(() => {
            hideLoadingOverlay();
        }, 500);
        
        return Promise.resolve(simplePlane);
    }
}

/**
 * Создает зеленый фон для кастомной площадки
 */
function createGreenBackgroundForCustom(group, width, length) {
    const size = 1000;
    const circleGeometry = new THREE.CircleGeometry(size / 2, 64);
    
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load('textures/grass/grass_texture.png');
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;
    
    const repeats = size / 2;
    grassTexture.repeat.set(repeats, repeats);
    grassTexture.anisotropy = 16;
    
    const grassMaterial = new THREE.MeshStandardMaterial({
        map: grassTexture,
        color: 0x4CAF50,
        roughness: 0.7,
        metalness: 0.1,
        side: THREE.DoubleSide
    });
    
    const grassMesh = new THREE.Mesh(circleGeometry, grassMaterial);
    grassMesh.rotation.x = -Math.PI / 2;
    grassMesh.position.y = -0.01;
    grassMesh.name = 'green_background';
    grassMesh.userData = { isGround: true };
    
    scene.add(grassMesh);
}

/**
 * Создает THREE.js меш из объекта Fabric.js
 */
function createMeshFromFabricObject(fabricObject, scaleX, scaleZ, color) {
    const colorMap = {
        'серый': 0xD9D9D9,
        'зеленый': 0x2E7D32,
        'коричневый': 0x5D4037,
        'черный': 0x333333
    };
    
    const materialColor = colorMap[color] || 0xD9D9D9;
    
    try {
        let mesh = null;
        
        switch (fabricObject.type) {
            case 'polygon':
            case 'group':
                mesh = createPolygonMesh(fabricObject, scaleX, scaleZ, materialColor);
                break;
            case 'rect':
                mesh = createRectangleMesh(fabricObject, scaleX, scaleZ, materialColor);
                break;
            case 'circle':
                mesh = createCircleMesh(fabricObject, scaleX, scaleZ, materialColor);
                break;
            case 'path':
                mesh = createPathMesh(fabricObject, scaleX, scaleZ, materialColor);
                break;
            default:
                console.warn('⚠️ Неизвестный тип:', fabricObject.type);
                return null;
        }
        
        return mesh;
        
    } catch (error) {
        console.error('❌ Ошибка создания меша:', error);
        return null;
    }
}

/**
 * Создает меш многоугольника
 */
function createPolygonMesh(fabricObject, scaleX, scaleZ, color) {
    let points = [];
    
    if (fabricObject.type === 'group' && fabricObject.objects) {
        // Обрабатываем группу объектов
        fabricObject.objects.forEach(obj => {
            if (obj.points) {
                const groupPoints = obj.points.map(p => ({
                    x: (p.x + obj.left) * scaleX,
                    y: (p.y + obj.top) * scaleZ
                }));
                points = points.concat(groupPoints);
            }
        });
    } else if (fabricObject.points) {
        points = fabricObject.points.map(p => ({
            x: (p.x + fabricObject.left) * scaleX,
            y: (p.y + fabricObject.top) * scaleZ
        }));
    }
    
    if (points.length < 3) return null;
    
    // Создаем THREE.js Shape
    const shape = new THREE.Shape();
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i].x, points[i].y);
    }
    
    // Создаем геометрию с экструзией
    const extrudeSettings = {
        depth: 0.1,
        bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.7,
        metalness: 0.1 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.userData = { 
        isPlayground: true,
        fabricType: 'polygon'
    };
    
    return mesh;
}

/**
 * Создает меш прямоугольника
 */
function createRectangleMesh(fabricObject, scaleX, scaleZ, color) {
    const width = fabricObject.width * fabricObject.scaleX * scaleX;
    const height = fabricObject.height * fabricObject.scaleY * scaleZ;
    
    const geometry = new THREE.BoxGeometry(width, 0.1, height);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.7,
        metalness: 0.1 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
        fabricObject.left * scaleX,
        0.05,
        fabricObject.top * scaleZ
    );
    mesh.userData = { 
        isPlayground: true,
        fabricType: 'rectangle'
    };
    
    return mesh;
}

/**
 * Создает меш круга
 */
function createCircleMesh(fabricObject, scaleX, scaleZ, color) {
    const radius = fabricObject.radius * fabricObject.scaleX * Math.max(scaleX, scaleZ);
    
    const geometry = new THREE.CylinderGeometry(radius, radius, 0.1, 32);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.7,
        metalness: 0.1 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
        fabricObject.left * scaleX,
        0.05,
        fabricObject.top * scaleZ
    );
    mesh.userData = { 
        isPlayground: true,
        fabricType: 'circle'
    };
    
    return mesh;
}

/**
 * Создает меш из Path (свободное рисование)
 */
function createPathMesh(fabricObject, scaleX, scaleZ, color) {
    // Для Path объектов создаем простой прямоугольник как заглушку
    // В реальной реализации можно было бы парсить SVG path
    const bounds = fabricObject.getBounds ? fabricObject.getBounds() : {
        left: fabricObject.left,
        top: fabricObject.top,
        width: fabricObject.width || 50,
        height: fabricObject.height || 50
    };
    
    const width = bounds.width * scaleX;
    const height = bounds.height * scaleZ;
    
    const geometry = new THREE.BoxGeometry(width, 0.1, height);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.7,
        metalness: 0.1 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
        bounds.left * scaleX,
        0.05,
        bounds.top * scaleZ
    );
    mesh.userData = { 
        isPlayground: true,
        fabricType: 'path'
    };
    
    return mesh;
}
