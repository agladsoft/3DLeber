/**
 * Редактор площадок нестандартной формы с использованием Fabric.js
 * Позволяет создавать площадки произвольной геометрической формы
 */

class FabricPlaygroundEditor {
    constructor() {
        this.canvas = null;
        this.currentTool = 'polygon';
        this.currentColor = '#D9D9D9';
        this.currentTexture = 'rubber';
        this.isDrawingMode = false;
        this.polygonPoints = [];
        this.isDrawingPolygon = false;
        this.history = [];
        this.historyStep = 0;
        this.scale = 0.1; // метров на пиксель (будет изменен для 100x100м)
        this.wasDrawingMode = false; // Для сохранения состояния режима рисования
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupGrid();
        this.updateStats();
        
        console.log('🎨 Fabric.js Playground Editor инициализирован');
        console.log('📐 Масштаб:', this.scale, 'м/пиксель');
    }

    setupCanvas() {
        // Создаем Fabric.js canvas для площадки 100x100 метров
        this.canvas = new fabric.Canvas('playgroundCanvas', {
            width: 1000,  // 100 метров = 1000 пикселей (1м = 10 пикселей)
            height: 1000, // 100 метров = 1000 пикселей (1м = 10 пикселей)
            backgroundColor: '#f8f9fa',
            selection: true,
            preserveObjectStacking: true
        });
        
        // Обновляем масштаб: 1 метр = 10 пикселей
        this.scale = 0.1; // 1 пиксель = 0.1 метра

        // Настройки canvas
        this.canvas.on('path:created', (e) => this.onPathCreated(e));
        this.canvas.on('object:added', () => this.updateStats());
        this.canvas.on('object:removed', () => this.updateStats());
        this.canvas.on('object:modified', () => this.updateStats());
        this.canvas.on('selection:created', (e) => this.onObjectSelected(e));
        this.canvas.on('selection:updated', (e) => this.onObjectSelected(e));
        this.canvas.on('selection:cleared', () => this.onSelectionCleared());

        // События для рисования многоугольников убраны - теперь обрабатываются в общем обработчике
        
        // Отключаем рисование при перетаскивании объектов
        this.canvas.on('object:moving', () => this.disableDrawingTemporarily());
        this.canvas.on('object:scaling', () => this.disableDrawingTemporarily());
        this.canvas.on('object:rotating', () => this.disableDrawingTemporarily());
        this.canvas.on('mouse:up', () => this.restoreDrawingMode());
        
        // Управляем режимом рисования при движении мыши
        this.canvas.on('mouse:move', (e) => this.onMouseMove(e));
        
        // Также проверяем при клике мыши для мгновенного включения режима рисования
        this.canvas.on('mouse:down', (e) => {
            // Сначала проверяем режим рисования, потом обрабатываем клик
            this.checkDrawingMode(e);
            this.onMouseDown(e);
        });
        
        // Сохраняем начальное состояние
        this.saveState();
    }

    setupGrid() {
        // Создаем сетку 1 метр = 10 пикселей
        const gridSize = 10; // пикселей (1 метр)
        const gridColor = '#e0e0e0';
        
        // Вертикальные линии
        for (let i = 0; i <= this.canvas.width; i += gridSize) {
            const line = new fabric.Line([i, 0, i, this.canvas.height], {
                stroke: gridColor,
                strokeWidth: 1,
                selectable: false,
                evented: false,
                opacity: 0.5,
                isGrid: true
            });
            this.canvas.add(line);
        }
        
        // Горизонтальные линии
        for (let i = 0; i <= this.canvas.height; i += gridSize) {
            const line = new fabric.Line([0, i, this.canvas.width, i], {
                stroke: gridColor,
                strokeWidth: 1,
                selectable: false,
                evented: false,
                opacity: 0.5,
                isGrid: true
            });
            this.canvas.add(line);
        }

        // Подписи осей
        this.addAxisLabels(gridSize);
        
        this.canvas.renderAll();
    }

    addAxisLabels(gridSize) {
        const scale = this.scale;
        const fontSize = 10;
        const labelColor = '#666';
        const majorGridStep = gridSize * 10; // Подписи каждые 10 метров

        // Подписи по оси X (метры) - каждые 10 метров
        for (let i = majorGridStep; i <= this.canvas.width; i += majorGridStep) {
            const meters = Math.round(i * scale);
            const text = new fabric.Text(`${meters}м`, {
                left: i,
                top: 5,
                fontSize: fontSize,
                fill: labelColor,
                selectable: false,
                evented: false,
                originX: 'center',
                isGrid: true
            });
            this.canvas.add(text);
        }

        // Подписи по оси Y (метры) - каждые 10 метров
        for (let i = majorGridStep; i <= this.canvas.height; i += majorGridStep) {
            const meters = Math.round(i * scale);
            const text = new fabric.Text(`${meters}м`, {
                left: 5,
                top: i,
                fontSize: fontSize,
                fill: labelColor,
                selectable: false,
                evented: false,
                originY: 'center',
                isGrid: true
            });
            this.canvas.add(text);
        }
    }

    setupEventListeners() {
        // Инструменты рисования
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.setTool(btn.dataset.tool);
            });
        });

        // Цвета
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentColor = btn.dataset.color;
                this.updateSelectedObjectsColor();
            });
        });

        // Текстуры
        document.querySelectorAll('.texture-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.texture-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTexture = btn.dataset.texture;
                this.updateSelectedObjectsTexture();
            });
        });

        // Параметры
        this.setupParameterControls();

        // Действия
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());
        document.getElementById('undoAction').addEventListener('click', () => this.undo());
        document.getElementById('exportJSON').addEventListener('click', () => this.exportJSON());
        document.getElementById('importJSON').addEventListener('click', () => this.importJSON());
        document.getElementById('exportImage').addEventListener('click', () => this.exportImage());

        // Клавиши
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    setupParameterControls() {
        const strokeWidthInput = document.getElementById('strokeWidth');
        const strokeWidthValue = document.getElementById('strokeWidthValue');
        const opacityInput = document.getElementById('opacity');
        const opacityValue = document.getElementById('opacityValue');
        const scaleInput = document.getElementById('scale');

        strokeWidthInput.addEventListener('input', (e) => {
            strokeWidthValue.textContent = e.target.value + 'px';
            this.updateSelectedObjectsStroke();
        });

        opacityInput.addEventListener('input', (e) => {
            const value = Math.round(e.target.value * 100);
            opacityValue.textContent = value + '%';
            this.updateSelectedObjectsOpacity();
        });

        scaleInput.addEventListener('change', (e) => {
            this.scale = parseFloat(e.target.value);
            this.updateStats();
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        this.exitCurrentMode();

        const statusEl = document.getElementById('drawingStatus');
        
        switch (tool) {
            case 'select':
                this.canvas.isDrawingMode = false;
                this.canvas.selection = true;
                statusEl.innerHTML = '<p>Режим: Выбор и перемещение объектов</p>';
                statusEl.classList.add('active');
                break;
                
            case 'freehand':
                this.canvas.isDrawingMode = true;
                this.canvas.selection = true; // Включаем выделение объектов
                this.canvas.freeDrawingBrush.width = parseInt(document.getElementById('strokeWidth').value);
                this.canvas.freeDrawingBrush.color = this.currentColor;
                statusEl.innerHTML = '<p>Режим: Рисование (созданные фигуры можно сразу перемещать)</p>';
                statusEl.classList.add('active');
                break;
                
            case 'polygon':
                this.canvas.isDrawingMode = false;
                this.canvas.selection = true; // Включаем выделение объектов
                this.isDrawingPolygon = true;
                this.polygonPoints = [];
                statusEl.innerHTML = '<p>Режим: Многоугольник (созданные фигуры можно сразу перемещать)</p>';
                statusEl.classList.add('active');
                break;
                
            case 'rectangle':
            case 'circle':
                this.canvas.isDrawingMode = false;
                statusEl.innerHTML = `<p>Режим: Создание ${tool === 'rectangle' ? 'прямоугольника' : 'круга'}</p>`;
                statusEl.classList.add('active');
                break;
                
            default:
                this.canvas.isDrawingMode = false;
                statusEl.innerHTML = '<p>Режим: Выбор объектов</p>';
                statusEl.classList.remove('active');
        }
    }

    exitCurrentMode() {
        this.canvas.isDrawingMode = false;
        this.isDrawingPolygon = false;
        this.polygonPoints = [];
        this.removeTemporaryObjects();
    }

    onMouseDown(e) {
        if (!e.e) return;

        const pointer = this.canvas.getPointer(e.e);

        switch (this.currentTool) {
            case 'polygon':
                this.addPolygonPoint(pointer);
                break;
                
            case 'rectangle':
                this.startRectangleDrawing(pointer);
                break;
                
            case 'circle':
                this.startCircleDrawing(pointer);
                break;
        }
    }

    addPolygonPoint(pointer) {
        if (!this.isDrawingPolygon) return;

        this.polygonPoints.push(pointer);

        // Добавляем точку визуализации
        const circle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 3,
            fill: '#ff0000',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            isTemporary: true
        });
        this.canvas.add(circle);

        // Если есть предыдущая точка, рисуем линию
        if (this.polygonPoints.length > 1) {
            const prevPoint = this.polygonPoints[this.polygonPoints.length - 2];
            const line = new fabric.Line([prevPoint.x, prevPoint.y, pointer.x, pointer.y], {
                stroke: '#ff0000',
                strokeWidth: 2,
                selectable: false,
                evented: false,
                isTemporary: true
            });
            this.canvas.add(line);
        }

        this.canvas.renderAll();
    }

    finishPolygon() {
        if (this.polygonPoints.length < 3) {
            alert('Многоугольник должен содержать минимум 3 точки');
            return;
        }

        // Удаляем временные объекты
        this.removeTemporaryObjects();

        // Создаем многоугольник
        const polygon = new fabric.Polygon(this.polygonPoints, {
            fill: this.currentColor,
            stroke: '#333',
            strokeWidth: parseInt(document.getElementById('strokeWidth').value),
            opacity: parseFloat(document.getElementById('opacity').value),
            objectType: 'playground',
            selectable: true,      // Можно выделять
            moveable: true,        // Можно перемещать
            rotatable: true,       // Можно поворачивать
            scalable: true,        // Можно масштабировать
            hasRotatingPoint: true, // Показывать точку поворота
            lockUniScaling: false   // Разрешить неравномерное масштабирование
        });

        // Применяем текстуру если выбрана
        this.applyTexture(polygon);

        this.canvas.add(polygon);
        
        // Автоматически выделяем созданный многоугольник для возможности сразу перемещать
        setTimeout(() => {
            this.canvas.setActiveObject(polygon);
            this.canvas.renderAll();
        }, 100);
        
        this.saveState();

        // Сбрасываем режим рисования, но остаемся в режиме многоугольника
        this.polygonPoints = [];
        this.isDrawingPolygon = false;
    }

    startRectangleDrawing(pointer) {
        const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 100,
            height: 80,
            fill: this.currentColor,
            stroke: '#333',
            strokeWidth: parseInt(document.getElementById('strokeWidth').value),
            opacity: parseFloat(document.getElementById('opacity').value),
            objectType: 'playground',
            selectable: true,      // Можно выделять
            moveable: true,        // Можно перемещать
            rotatable: true,       // Можно поворачивать
            scalable: true,        // Можно масштабировать
            hasRotatingPoint: true, // Показывать точку поворота
            lockUniScaling: false   // Разрешить неравномерное масштабирование
        });

        this.applyTexture(rect);
        this.canvas.add(rect);
        this.canvas.setActiveObject(rect);
        this.saveState();
    }

    startCircleDrawing(pointer) {
        const circle = new fabric.Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 50,
            fill: this.currentColor,
            stroke: '#333',
            strokeWidth: parseInt(document.getElementById('strokeWidth').value),
            opacity: parseFloat(document.getElementById('opacity').value),
            objectType: 'playground',
            selectable: true,      // Можно выделять
            moveable: true,        // Можно перемещать
            rotatable: true,       // Можно поворачивать
            scalable: true,        // Можно масштабировать
            hasRotatingPoint: true, // Показывать точку поворота
            lockUniScaling: false   // Разрешить неравномерное масштабирование
        });

        this.applyTexture(circle);
        this.canvas.add(circle);
        this.canvas.setActiveObject(circle);
        this.saveState();
    }

    applyTexture(object) {
        if (this.currentTexture === 'rubber') {
            // Резиновое покрытие - добавляем pattern
            const patternCanvas = document.createElement('canvas');
            patternCanvas.width = 20;
            patternCanvas.height = 20;
            const ctx = patternCanvas.getContext('2d');
            
            ctx.fillStyle = this.currentColor;
            ctx.fillRect(0, 0, 20, 20);
            
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.arc(5, 5, 1, 0, Math.PI * 2);
            ctx.arc(15, 5, 1, 0, Math.PI * 2);
            ctx.arc(10, 10, 1, 0, Math.PI * 2);
            ctx.arc(5, 15, 1, 0, Math.PI * 2);
            ctx.arc(15, 15, 1, 0, Math.PI * 2);
            ctx.fill();
            
            const pattern = new fabric.Pattern({
                source: patternCanvas,
                repeat: 'repeat'
            });
            
            object.set('fill', pattern);
        }
    }

    removeTemporaryObjects() {
        const objects = this.canvas.getObjects().filter(obj => obj.isTemporary);
        objects.forEach(obj => this.canvas.remove(obj));
        this.canvas.renderAll();
    }

    onPathCreated(e) {
        const path = e.path;
        path.set({
            fill: this.currentColor,
            opacity: parseFloat(document.getElementById('opacity').value),
            objectType: 'playground',
            selectable: true,      // Можно выделять
            moveable: true,        // Можно перемещать
            rotatable: true,       // Можно поворачивать
            scalable: true,        // Можно масштабировать
            hasRotatingPoint: true, // Показывать точку поворота
            lockUniScaling: false   // Разрешить неравномерное масштабирование
        });
        
        this.applyTexture(path);
        
        // Автоматически выделяем созданную фигуру для возможности сразу перемещать
        setTimeout(() => {
            this.canvas.setActiveObject(path);
            this.canvas.renderAll();
        }, 100);
        
        this.saveState();
    }

    onObjectSelected(e) {
        const obj = e.selected ? e.selected[0] : e.target;
        if (obj && obj.objectType === 'playground') {
            // Показываем свойства выбранного объекта
            console.log('Выбран объект площадки:', obj);
            
            // Временно отключаем режим рисования при выделении объекта
            this.disableDrawingTemporarily();
        }
    }

    onSelectionCleared() {
        // Объект снят с выделения - восстанавливаем режим рисования если нужно
        if (this.currentTool === 'freehand') {
            this.canvas.isDrawingMode = true;
        }
    }

    disableDrawingTemporarily() {
        // Сохраняем текущий режим рисования и временно отключаем его
        if (this.canvas.isDrawingMode) {
            this.wasDrawingMode = true;
            this.canvas.isDrawingMode = false;
        }
    }

    restoreDrawingMode() {
        // Восстанавливаем режим рисования если он был активен
        if (this.wasDrawingMode && this.currentTool === 'freehand') {
            // Задержка чтобы избежать конфликтов
            setTimeout(() => {
                if (!this.canvas.getActiveObject()) {
                    this.canvas.isDrawingMode = true;
                }
                this.wasDrawingMode = false;
            }, 50);
        }
    }


    checkDrawingMode(e) {
        // Проверяем есть ли объект под курсором
        if (!e.e) return;
        
        const objectUnderCursor = this.canvas.findTarget(e.e, false);
        const isPlaygroundObject = objectUnderCursor && objectUnderCursor.objectType === 'playground';
        
        // Если мы в режиме свободного рисования
        if (this.currentTool === 'freehand') {
            // Если курсор на свободной области (нет объекта под курсором или это элемент сетки)
            if (!isPlaygroundObject && !this.canvas.getActiveObject()) {
                // Мгновенно включаем режим рисования
                this.canvas.isDrawingMode = true;
                this.wasDrawingMode = false;
            }
            // Если курсор на объекте площадки, отключаем рисование
            else if (isPlaygroundObject && this.canvas.isDrawingMode) {
                this.canvas.isDrawingMode = false;
                this.wasDrawingMode = true;
            }
        }
    }

    onMouseMove(e) {
        // Проверяем режим рисования при движении мыши
        this.checkDrawingMode(e);
    }

    updateSelectedObjectsColor() {
        const activeObjects = this.canvas.getActiveObjects();
        activeObjects.forEach(obj => {
            if (obj.objectType === 'playground') {
                obj.set('fill', this.currentColor);
                this.applyTexture(obj);
            }
        });
        this.canvas.renderAll();
        this.saveState();
    }

    updateSelectedObjectsTexture() {
        const activeObjects = this.canvas.getActiveObjects();
        activeObjects.forEach(obj => {
            if (obj.objectType === 'playground') {
                this.applyTexture(obj);
            }
        });
        this.canvas.renderAll();
        this.saveState();
    }

    updateSelectedObjectsStroke() {
        const strokeWidth = parseInt(document.getElementById('strokeWidth').value);
        const activeObjects = this.canvas.getActiveObjects();
        activeObjects.forEach(obj => {
            if (obj.objectType === 'playground') {
                obj.set('strokeWidth', strokeWidth);
            }
        });
        this.canvas.renderAll();
        this.saveState();
    }

    updateSelectedObjectsOpacity() {
        const opacity = parseFloat(document.getElementById('opacity').value);
        const activeObjects = this.canvas.getActiveObjects();
        activeObjects.forEach(obj => {
            if (obj.objectType === 'playground') {
                obj.set('opacity', opacity);
            }
        });
        this.canvas.renderAll();
        this.saveState();
    }

    onKeyDown(e) {
        switch (e.key) {
            case 'Enter':
                if (this.isDrawingPolygon) {
                    this.finishPolygon();
                }
                break;
                
            case 'Escape':
                this.exitCurrentMode();
                this.setTool('select');
                break;
                
            case 'Delete':
            case 'Backspace':
                this.deleteSelected();
                e.preventDefault();
                break;
                
            case 'z':
                if (e.ctrlKey || e.metaKey) {
                    this.undo();
                    e.preventDefault();
                }
                break;
        }
    }

    deleteSelected() {
        const activeObjects = this.canvas.getActiveObjects();
        activeObjects.forEach(obj => {
            if (obj.objectType === 'playground') {
                this.canvas.remove(obj);
            }
        });
        this.canvas.discardActiveObject();
        this.saveState();
    }

    clearCanvas() {
        if (confirm('Удалить все объекты площадки?')) {
            const objects = this.canvas.getObjects().filter(obj => obj.objectType === 'playground');
            objects.forEach(obj => this.canvas.remove(obj));
            this.saveState();
        }
    }

    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.canvas.loadFromJSON(this.history[this.historyStep], () => {
                this.canvas.renderAll();
                this.updateStats();
            });
        }
    }

    saveState() {
        const json = JSON.stringify(this.canvas.toJSON(['objectType']));
        this.history = this.history.slice(0, this.historyStep + 1);
        this.history.push(json);
        this.historyStep++;
        
        // Ограничиваем историю
        if (this.history.length > 20) {
            this.history.shift();
            this.historyStep--;
        }
    }

    updateStats() {
        const playgroundObjects = this.canvas.getObjects().filter(obj => obj.objectType === 'playground');
        const objectCount = playgroundObjects.length;
        
        let totalArea = 0;
        playgroundObjects.forEach(obj => {
            if (obj.type === 'polygon') {
                totalArea += this.calculatePolygonArea(obj);
            } else if (obj.type === 'rect') {
                totalArea += (obj.width * obj.scaleX) * (obj.height * obj.scaleY) * this.scale * this.scale;
            } else if (obj.type === 'circle') {
                const radius = obj.radius * obj.scaleX * this.scale;
                totalArea += Math.PI * radius * radius;
            }
        });

        document.getElementById('objectCount').textContent = objectCount;
        document.getElementById('totalArea').textContent = Math.round(totalArea);
    }

    calculatePolygonArea(polygon) {
        const points = polygon.points;
        let area = 0;
        
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        
        area = Math.abs(area) / 2;
        return area * this.scale * this.scale;
    }

    exportJSON() {
        const playgroundObjects = this.canvas.getObjects().filter(obj => obj.objectType === 'playground');
        const data = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            scale: this.scale,
            objects: playgroundObjects.map(obj => obj.toObject(['objectType']))
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `playground_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    importJSON() {
        document.getElementById('importFile').click();
        
        document.getElementById('importFile').onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    // Очищаем текущие объекты площадки
                    const objects = this.canvas.getObjects().filter(obj => obj.objectType === 'playground');
                    objects.forEach(obj => this.canvas.remove(obj));
                    
                    // Загружаем новые объекты
                    data.objects.forEach(objData => {
                        fabric.util.enlivenObjects([objData], (objects) => {
                            objects.forEach(obj => {
                                this.canvas.add(obj);
                            });
                            this.canvas.renderAll();
                            this.saveState();
                        });
                    });
                    
                    if (data.scale) {
                        this.scale = data.scale;
                        document.getElementById('scale').value = data.scale;
                    }
                    
                } catch (error) {
                    alert('Ошибка при загрузке файла: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
    }

    exportImage() {
        const dataURL = this.canvas.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: 2
        });
        
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `playground_${new Date().toISOString().split('T')[0]}.png`;
        link.click();
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    window.editor = new FabricPlaygroundEditor();
    window.canvas = window.editor.canvas;
    console.log('Editor and canvas set as global variables');
});

// Экспортируем класс для возможного использования
window.FabricPlaygroundEditor = FabricPlaygroundEditor;