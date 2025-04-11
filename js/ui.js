/**
 * Модуль для управления пользовательским интерфейсом
 * Адаптирован для работы с Three.js
 */
import { PLAYGROUND } from './config.js';
import { resetCameraView, takeScreenshot, toggleTopView, canvas, scene, camera, controls, renderer } from './scene.js';
import { loadPlayground, resizePlaygroundWithAnimation, playgroundWidth, playgroundLength, ground, groundMesh } from './playground.js';
import { 
    loadAndPlaceModel, 
    saveInitialPosition, 
    resetToInitialPosition,
    checkAndHighlightObject, 
    checkAllObjectsPositions, 
    isWithinPlayground,
    updateSizeInUI
} from './objects.js';
import { showNotification } from './utils.js';
import * as THREE from 'three';

// Глобальные переменные для управления манипуляциями с объектами
let selectedObject = null;
let isDragging = false;
let isRotating = false;
let dragPlane = null;
let initialMousePosition = new THREE.Vector2();
let initialObjectPosition = new THREE.Vector3();
let initialRotationY = 0;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

/**
 * Инициализирует обработчики событий пользовательского интерфейса
 */
export function initUI() {
    console.log('Инициализация UI...');
    
    // Проверяем, что основные компоненты сцены доступны
    if (!canvas || !scene || !camera || !renderer) {
        console.error('Ошибка: компоненты сцены не инициализированы');
        return;
    }
    
    // Создаем инструменты для выбора объектов
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Создаем плоскость для перетаскивания объектов
    dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    
    // Добавляем обработчики для drag and drop элементов из каталога
    initDragAndDrop();
    
    // Добавляем обработчики для управления объектами (перемещение, вращение)
    initObjectManipulation();
    
    // Добавляем обработчики для кнопок и элементов управления
    initControlHandlers();
    
    // Инициализируем обработчики клавиатуры
    initKeyboardHandlers();
    
    console.log('UI инициализирован успешно');
}

/**
 * Инициализирует обработчики клавиатуры
 */
function initKeyboardHandlers() {
    // Обработчик нажатия клавиш
    document.addEventListener('keydown', (event) => {
        // Обработка нажатия клавиши Escape для возврата объекта на исходную позицию
        if (selectedObject && event.key === 'Escape') {
            resetToInitialPosition(selectedObject);
            event.preventDefault();
        }
        
        // Удалена обработка нажатия Shift, так как теперь она не требуется
    });
    
    // Обработчик отпускания клавиш
    document.addEventListener('keyup', (event) => {
        // Удалена обработка отпускания Shift, так как теперь она не требуется
    });
}

/**
 * Инициализирует обработчики для drag and drop
 */
function initDragAndDrop() {
    // Добавляем обработчик начала перетаскивания для загрузки модели
    document.querySelectorAll(".item").forEach(item => {
        item.addEventListener("dragstart", event => {
            const model = event.target.closest(".item").getAttribute("data-model");
            console.log("Drag started:", model);
            event.dataTransfer.setData("model", model);
        });
    });

    // Останавливаем поведение по умолчанию для drop
    canvas.addEventListener("dragover", event => event.preventDefault());

    // Обработка события drop для загрузки модели
    canvas.addEventListener("drop", event => {
        event.preventDefault();
        const modelName = event.dataTransfer.getData("model");
        
        // Проверка на корректность задачи
        if (!modelName) {
            console.warn("Drop event without model name");
            return;
        }
        
        if (!scene || !ground) {
            console.error("Scene or ground not initialized");
            showNotification("Ошибка: сцена не инициализирована", true);
            return;
        }
        
        // Вычисляем позицию курсора в нормализованных координатах (-1 до +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Устанавливаем raycaster для определения точки пересечения
        raycaster.setFromCamera(mouse, camera);
        
        // Создаем массив объектов, которые могут быть выбраны (площадка)
        let intersects = [];
        
        // Проверяем пересечение с ground
        if (ground) {
            ground.traverse((child) => {
                if (child.isMesh) {
                    intersects.push(...raycaster.intersectObject(child));
                }
            });
        }
        
        // Позиция для размещения объекта
        let position = null;
        
        // Если нашли пересечение с площадкой
        if (intersects.length > 0) {
            position = intersects[0].point;
        } else {
            // Если не нашли пересечение с площадкой, проверяем пересечение с плоскостью Y=0
            const planeIntersect = new THREE.Vector3();
            raycaster.ray.intersectPlane(dragPlane, planeIntersect);
            position = planeIntersect;
        }
        
        // Загружаем и размещаем модель
        loadAndPlaceModel(modelName, position);
    });
}

/**
 * Инициализирует обработчики для манипуляции объектами
 */
function initObjectManipulation() {
    // Отключаем стандартное контекстное меню (правый клик)
    canvas.addEventListener("contextmenu", event => event.preventDefault());

    // Обработчик нажатия кнопки мыши
    canvas.addEventListener("mousedown", (event) => {
        // Если уже начато перетаскивание или вращение, игнорируем
        if (isDragging || isRotating) return;
        
        // Проверяем, активен ли режим вида сверху
        const isTopViewActive = window.app && window.app.isTopViewActive;
        
        // Проверяем, нажата ли клавиша Shift (для перемещения объектов в режиме вида сверху)
        const isShiftPressed = event.shiftKey;
        
        // Комментируем прежнюю логику для вида сверху, чтобы можно было перемещать объекты без Shift
        /* Прежняя логика:
        if (isTopViewActive && !isShiftPressed && event.button === 0) {
            if (controls) controls.enabled = true;
            return;
        }
        */
        
        // Вычисляем позицию курсора в нормализованных координатах (-1 до +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Устанавливаем raycaster для выбора объектов
        raycaster.setFromCamera(mouse, camera);
        
        // Получаем все объекты, которые пересекаются с лучом
        // Фильтруем объекты, чтобы исключить сетку и грид
        const objects = scene.children.filter(obj => {
            // Исключаем объекты с пометкой isFixedGrid (сетка)
            if (obj.userData && obj.userData.isFixedGrid) return false;
            return true;
        });
        
        const intersects = raycaster.intersectObjects(objects, true);
        
        // Если нашли пересечения
        if (intersects.length > 0) {
            // Проверяем, не является ли выбранный объект площадкой
            let isGround = false;
            if (ground) {
                ground.traverse((child) => {
                    if (child === intersects[0].object) {
                        isGround = true;
                    }
                });
            }
            
            // Если клик по площадке - сбрасываем выбранный объект
            if (isGround) {
                selectedObject = null;
                return;
            }
            
            // Ищем родительский объект (контейнер модели) для выбранного меша
            let parent = intersects[0].object;
            while (parent.parent && parent.parent !== scene) {
                parent = parent.parent;
            }
            
            // Выбираем этот объект
            selectedObject = parent;
            
            // Сохраняем исходную позицию и поворот
            saveInitialPosition(selectedObject);
            
            // Сохраняем начальную позицию мыши
            initialMousePosition.x = event.clientX;
            initialMousePosition.y = event.clientY;
            
            // Сохраняем начальную позицию объекта
            initialObjectPosition.copy(selectedObject.position);
            
            // Если левая кнопка мыши - начинаем перетаскивание
            if (event.button === 0) {
                isDragging = true;
                
                // Отключаем управление камерой во время перетаскивания
                if (controls) controls.enabled = false;
            } 
            // Если правая кнопка мыши - начинаем вращение
            else if (event.button === 2) {
                isRotating = true;
                initialRotationY = selectedObject.rotation.y;
                
                // Отключаем управление камерой во время вращения
                if (controls) controls.enabled = false;
            }
        } else {
            // Если клик по пустому месту - сбрасываем выбранный объект
            selectedObject = null;
        }
    });

    // Обработчик движения мыши
    canvas.addEventListener("mousemove", (event) => {
        // Проверяем, активен ли режим вида сверху
        const isTopViewActive = window.app && window.app.isTopViewActive;
        // Проверяем, нажата ли клавиша Shift
        const isShiftPressed = event.shiftKey;
        
        // Перемещение объекта
        if (isDragging && selectedObject) {
            // Комментируем прежнюю логику для вида сверху
            /* Прежняя логика:
            if (isTopViewActive && !isShiftPressed && event.buttons === 1) {
                return;
            }
            */
            
            // Вычисляем позицию курсора в нормализованных координатах
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            // Устанавливаем raycaster
            raycaster.setFromCamera(mouse, camera);
            
            // Находим точку пересечения с плоскостью Y=0
            const planeIntersect = new THREE.Vector3();
            if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
                // Устанавливаем новую позицию объекта
                selectedObject.position.x = planeIntersect.x;
                selectedObject.position.z = planeIntersect.z;
                
                // Выравниваем нижнюю грань объекта по Y=0
                const box = new THREE.Box3().setFromObject(selectedObject);
                selectedObject.position.y -= box.min.y;
                
                // Проверяем на коллизии с другими объектами
                checkAndHighlightObject(selectedObject);
            }
        } 
        // Вращение объекта
        else if (isRotating && selectedObject) {
            // Комментируем прежнюю логику для вида сверху
            /* Прежняя логика:
            if (isTopViewActive && !isShiftPressed && event.buttons === 2) {
                return;
            }
            */
            
            // Вычисляем изменение позиции мыши по X
            const deltaX = event.clientX - initialMousePosition.x;
            
            // Применяем новый угол поворота (0.01 - чувствительность вращения)
            selectedObject.rotation.y = initialRotationY + deltaX * 0.01;
            
            // Проверяем на коллизии после вращения
            checkAndHighlightObject(selectedObject);
        }
    });

    // Обработчик отпускания кнопки мыши
    canvas.addEventListener("mouseup", (event) => {
        // Проверяем, активен ли режим вида сверху
        const isTopViewActive = window.app && window.app.isTopViewActive;
        
        // Завершаем перемещение/вращение
        if (isDragging || isRotating) {
            // Включаем управление камерой обратно
            if (controls) controls.enabled = true;
            
            // Проверяем все объекты на коллизии
            checkAllObjectsPositions();
            
            // Если у выбранного объекта обнаружена коллизия, показываем уведомление
            if (selectedObject && selectedObject.userData && selectedObject.userData.hasCollision) {
                showNotification("Внимание! Обнаружено пересечение с другим объектом.", true);
            }
        }
        
        isDragging = false;
        isRotating = false;
    });
    
    // Обработчик выхода курсора за пределы canvas
    canvas.addEventListener("mouseleave", () => {
        if (isDragging || isRotating) {
            // Включаем управление камерой обратно
            if (controls) controls.enabled = true;
            
            isDragging = false;
            isRotating = false;
        }
    });
}

/**
 * Инициализирует обработчики для элементов управления в интерфейсе
 */
function initControlHandlers() {
    // Проверяем, загружена ли уже страница
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", setupControlHandlers);
    } else {
        // Если DOMContentLoaded уже произошло
        setupControlHandlers();
    }
}

/**
 * Настраивает обработчики для элементов управления
 */
function setupControlHandlers() {
    // Добавляем обработчик для кнопки создания скриншота
    const screenshotButton = document.getElementById("saveScreenshot");
    if (screenshotButton) {
        screenshotButton.addEventListener("click", takeScreenshot);
    }
    
    // Устанавливаем начальные значения в поля формы с реальными размерами площадки
    const widthInput = document.getElementById("playgroundWidth");
    const lengthInput = document.getElementById("playgroundLength");
    
    if (widthInput) widthInput.value = playgroundWidth.toFixed(2);
    if (lengthInput) lengthInput.value = playgroundLength.toFixed(2);
    
    // Добавляем информацию о размерах в статусной области
    const statusElement = document.getElementById("playgroundStatus");
    if (statusElement) {
        // Обновляем статус с текущими размерами площадки
        statusElement.textContent = `Площадка: ${playgroundWidth.toFixed(2)}м × ${playgroundLength.toFixed(2)}м`;
    }
    
    // Добавляем обработчики для полей ввода размеров, которые будут обновлять предпросмотр
    if (widthInput) {
        widthInput.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value) || playgroundWidth;
            const widthLabel = document.getElementById("widthLabel");
            if (widthLabel) widthLabel.textContent = `${value}м`;
        });
    }
    
    if (lengthInput) {
        lengthInput.addEventListener("input", (e) => {
            const value = parseFloat(e.target.value) || playgroundLength;
            const lengthLabel = document.getElementById("lengthLabel");
            if (lengthLabel) lengthLabel.textContent = `${value}м`;
        });
    }
    
    // Добавляем обработчик для кнопки "Применить"
    const applyButton = document.getElementById("applySettings");
    if (applyButton) {
        applyButton.addEventListener("click", () => {
            const newWidth = parseFloat(document.getElementById("playgroundWidth").value);
            const newLength = parseFloat(document.getElementById("playgroundLength").value);
            
            if (newWidth >= PLAYGROUND.minSize && newWidth <= PLAYGROUND.maxSize && 
                newLength >= PLAYGROUND.minSize && newLength <= PLAYGROUND.maxSize) {
                // Изменяем размеры площадки с анимацией
                resizePlaygroundWithAnimation(newWidth, newLength);
                
                // Обновляем информацию о размерах площадки
                const statusElement = document.getElementById("playgroundStatus");
                if (statusElement) {
                    statusElement.textContent = `Площадка: ${playgroundWidth.toFixed(2)}м × ${playgroundLength.toFixed(2)}м`;
                }
            } else {
                // Показываем предупреждение, если размеры некорректны
                showNotification("Размеры должны быть в диапазоне от 5 до 50 метров", true);
            }
        });
    }
    
    // Добавляем обработчик для кнопки "Сменить площадку"
    const changePlaygroundButton = document.getElementById("changePlayground");
    if (changePlaygroundButton) {
        changePlaygroundButton.addEventListener("click", async () => {
            try {
                // Получаем значение выбранной площадки из dropdown
                const selectedModel = document.getElementById("playgroundType").value;
                
                // Загружаем выбранную модель площадки
                await loadPlayground(selectedModel);
                
                // Обновляем значения в полях ввода
                const widthInput = document.getElementById("playgroundWidth");
                const lengthInput = document.getElementById("playgroundLength");
                
                if (widthInput) widthInput.value = playgroundWidth.toFixed(2);
                if (lengthInput) lengthInput.value = playgroundLength.toFixed(2);
                
                // Обновляем информацию о размерах площадки
                const statusElement = document.getElementById("playgroundStatus");
                if (statusElement) {
                    statusElement.textContent = `Площадка: ${playgroundWidth.toFixed(2)}м × ${playgroundLength.toFixed(2)}м`;
                }
                
                // Показываем уведомление об успешной смене площадки
                showNotification(`Площадка успешно изменена на ${selectedModel}. Реальные размеры: ${playgroundWidth.toFixed(2)}м × ${playgroundLength.toFixed(2)}м`, false);
                
                // Обновляем позиции всех объектов после смены площадки
                checkAllObjectsPositions();
            } catch (error) {
                console.error("Ошибка при смене площадки:", error);
                showNotification("Не удалось загрузить площадку", true);
            }
        });
    }
    
    // Добавляем обработчик для кнопки сброса вида
    const resetViewButton = document.getElementById("resetView");
    if (resetViewButton) {
        resetViewButton.addEventListener("click", () => {
            resetCameraView(playgroundWidth, playgroundLength);
        });
    }
    
    // Добавляем обработчик для кнопки вида сверху
    const topViewButton = document.getElementById("topView");
    if (topViewButton) {
        // Изначально обновляем текст кнопки, добавив информацию о сетке
        topViewButton.textContent = "Вид сверху (сетка 1×1м)";
        
        topViewButton.addEventListener("click", () => {
            const isActive = toggleTopView(playgroundWidth, playgroundLength);
            
            // Меняем текст кнопки в зависимости от состояния
            topViewButton.textContent = isActive ? "Выйти из вида сверху" : "Вид сверху (сетка 1×1м)";
            
            // Меняем цвет кнопки в зависимости от состояния
            if (isActive) {
                topViewButton.style.backgroundColor = "#F44336"; // Красный для "выйти"
            } else {
                topViewButton.style.backgroundColor = "#4CAF50"; // Зеленый для "вид сверху"
            }
        });
    }
}
