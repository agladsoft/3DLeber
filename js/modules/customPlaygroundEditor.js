/**
 * Модуль для создания площадки произвольной формы
 * Использует Three.js Shape для создания сложных геометрических фигур
 */

import * as THREE from 'three';

class CustomPlaygroundEditor {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        this.controls = null;
        
        // Состояние редактора
        this.isEditing = false;
        this.currentShape = new THREE.Shape();
        this.points = [];
        this.tempLine = null;
        this.shapePreview = null;
        this.grid = null;
        this.gridLabels = [];
        
        // Режимы рисования
        this.drawingMode = 'line'; // 'line', 'curve', 'arc'
        this.isFirstPoint = true;
        this.tempCurvePoints = [];
        
        // Материалы
        this.materials = {
            preview: new THREE.MeshBasicMaterial({ 
                color: 0x4CAF50, 
                transparent: true, 
                opacity: 0.6,
                side: THREE.DoubleSide
            }),
            final: new THREE.MeshBasicMaterial({ 
                color: 0x2196F3, 
                side: THREE.DoubleSide
            }),
            point: new THREE.MeshBasicMaterial({ color: 0xFF5722 }),
            line: new THREE.LineBasicMaterial({ color: 0xFFEB3B, linewidth: 2 }),
            grid: new THREE.LineBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.3 })
        };
        
        // Готовая площадка
        this.finalPlayground = null;
        this.playgroundColor = 0x2196F3;
        
        this.init();
    }
    
    init() {
        this.createContainer();
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.createGrid();
        this.setupEventListeners();
        this.createUI();
        this.animate();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'customPlaygroundEditor';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            z-index: 10000;
            font-family: 'Inter', Arial, sans-serif;
        `;
        document.body.appendChild(this.container);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f5f5);
        
        // Освещение
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight.position.set(50, 50, 50);
        this.scene.add(directionalLight);
    }
    
    setupCamera() {
        this.camera = new THREE.OrthographicCamera(
            -60, 60, 60, -60, 0.1, 1000
        );
        this.camera.position.set(0, 100, 0);
        this.camera.lookAt(0, 0, 0);
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
    }
    
    createGrid() {
        // Основная сетка 100x100 метров
        this.grid = new THREE.Group();
        
        // Линии сетки
        for (let i = -50; i <= 50; i++) {
            // Вертикальные линии
            const vGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i, 0, -50),
                new THREE.Vector3(i, 0, 50)
            ]);
            const vLine = new THREE.Line(vGeometry, this.materials.grid);
            this.grid.add(vLine);
            
            // Горизонтальные линии
            const hGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-50, 0, i),
                new THREE.Vector3(50, 0, i)
            ]);
            const hLine = new THREE.Line(hGeometry, this.materials.grid);
            this.grid.add(hLine);
        }
        
        // Основные оси (более яркие)
        const axesMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 3 });
        
        const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-50, 0, 0),
            new THREE.Vector3(50, 0, 0)
        ]);
        const xAxis = new THREE.Line(xAxisGeometry, axesMaterial);
        this.grid.add(xAxis);
        
        const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -50),
            new THREE.Vector3(0, 0, 50)
        ]);
        const zAxis = new THREE.Line(zAxisGeometry, axesMaterial);
        this.grid.add(zAxis);
        
        // Подписи координат
        this.createGridLabels();
        
        this.scene.add(this.grid);
    }
    
    createGridLabels() {
        // Создаем подписи для основных координат
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const context = canvas.getContext('2d');
        
        for (let i = -40; i <= 40; i += 10) {
            if (i === 0) continue; // Пропускаем центр
            
            // Подпись по X
            context.clearRect(0, 0, 64, 32);
            context.fillStyle = '#333333';
            context.font = '12px Arial';
            context.textAlign = 'center';
            context.fillText(`${i}м`, 32, 20);
            
            const xTexture = new THREE.CanvasTexture(canvas);
            const xMaterial = new THREE.SpriteMaterial({ map: xTexture });
            const xSprite = new THREE.Sprite(xMaterial);
            xSprite.position.set(i, 1, -52);
            xSprite.scale.set(4, 2, 1);
            this.grid.add(xSprite);
            
            // Подпись по Z
            context.clearRect(0, 0, 64, 32);
            context.fillText(`${i}м`, 32, 20);
            
            const zTexture = new THREE.CanvasTexture(canvas);
            const zMaterial = new THREE.SpriteMaterial({ map: zTexture });
            const zSprite = new THREE.Sprite(zMaterial);
            zSprite.position.set(-52, 1, i);
            zSprite.scale.set(4, 2, 1);
            this.grid.add(zSprite);
        }
    }
    
    createUI() {
        const ui = document.createElement('div');
        ui.style.cssText = `
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(255, 255, 255, 0.95);
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            min-width: 300px;
            font-size: 14px;
        `;
        
        ui.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Редактор площадки</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Режим рисования:</label>
                <select id="drawingMode" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px;">
                    <option value="line">Прямые линии</option>
                    <option value="curve">Кривые Безье</option>
                    <option value="arc">Дуги</option>
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Цвет площадки:</label>
                <input type="color" id="playgroundColor" value="#2196F3" 
                       style="width: 100%; height: 40px; border: none; border-radius: 6px; cursor: pointer;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <button id="clearShape" style="width: 100%; padding: 10px; background: #ff5722; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
                    Очистить
                </button>
                <button id="undoLastPoint" style="width: 100%; padding: 10px; background: #ff9800; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
                    Отменить последнюю точку
                </button>
                <button id="closeShape" style="width: 100%; padding: 10px; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
                    Замкнуть фигуру
                </button>
                <button id="finishPlayground" style="width: 100%; padding: 10px; background: #2196f3; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px;" disabled>
                    Подтвердить площадку
                </button>
                <button id="exitEditor" style="width: 100%; padding: 10px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Выйти из редактора
                </button>
            </div>
            
            <div style="background: #f5f5f5; padding: 10px; border-radius: 6px; font-size: 12px; color: #666;">
                <strong>Инструкция:</strong><br>
                • Кликайте для добавления точек<br>
                • Для кривых: выберите режим "Кривые Безье"<br>
                • Для дуг: выберите режим "Дуги"<br>
                • Замкните фигуру для создания площадки<br>
                • Максимальный размер: 100x100 метров
            </div>
        `;
        
        this.container.appendChild(ui);
        
        // Обработчики UI
        document.getElementById('drawingMode').addEventListener('change', (e) => {
            this.drawingMode = e.target.value;
        });
        
        document.getElementById('playgroundColor').addEventListener('change', (e) => {
            this.playgroundColor = parseInt(e.target.value.replace('#', '0x'));
            if (this.finalPlayground) {
                this.finalPlayground.material.color.setHex(this.playgroundColor);
            }
        });
        
        document.getElementById('clearShape').addEventListener('click', () => {
            this.clearShape();
        });
        
        document.getElementById('undoLastPoint').addEventListener('click', () => {
            this.undoLastPoint();
        });
        
        document.getElementById('closeShape').addEventListener('click', () => {
            this.closeShape();
        });
        
        document.getElementById('finishPlayground').addEventListener('click', () => {
            this.finishPlayground();
        });
        
        document.getElementById('exitEditor').addEventListener('click', () => {
            this.exitEditor();
        });
        
        this.isEditing = true;
    }
    
    setupEventListeners() {
        // Обработчик кликов мыши
        this.renderer.domElement.addEventListener('click', (event) => {
            if (!this.isEditing || this.finalPlayground) return;
            
            const point = this.getMousePosition(event);
            this.addPoint(point);
        });
        
        // Обработчик движения мыши для превью
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            if (!this.isEditing || this.finalPlayground || this.points.length === 0) return;
            
            const point = this.getMousePosition(event);
            this.updatePreview(point);
        });
        
        // Обработчик изменения размера окна
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
    }
    
    getMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Переводим в мировые координаты
        const vector = new THREE.Vector3(x, y, 0);
        vector.unproject(this.camera);
        
        // Ограничиваем в пределах сетки (-50 до 50)
        vector.x = Math.max(-50, Math.min(50, Math.round(vector.x)));
        vector.z = Math.max(-50, Math.min(50, Math.round(vector.z)));
        
        return new THREE.Vector2(vector.x, vector.z);
    }
    
    addPoint(point) {
        // Добавляем визуальную точку
        this.addVisualPoint(point);
        
        if (this.drawingMode === 'line') {
            if (this.isFirstPoint) {
                this.currentShape.moveTo(point.x, point.y);
                this.isFirstPoint = false;
            } else {
                this.currentShape.lineTo(point.x, point.y);
            }
            this.points.push(point);
            
        } else if (this.drawingMode === 'curve') {
            this.tempCurvePoints.push(point);
            
            if (this.tempCurvePoints.length === 1 && this.isFirstPoint) {
                this.currentShape.moveTo(point.x, point.y);
                this.isFirstPoint = false;
            } else if (this.tempCurvePoints.length === 3) {
                // Квадратичная кривая: начальная точка уже есть, нужны контрольная и конечная
                const cp = this.tempCurvePoints[1];
                const ep = this.tempCurvePoints[2];
                this.currentShape.quadraticCurveTo(cp.x, cp.y, ep.x, ep.y);
                
                this.points.push(...this.tempCurvePoints);
                this.tempCurvePoints = [ep]; // Конечная точка становится начальной для следующей кривой
            }
            
        } else if (this.drawingMode === 'arc') {
            this.tempCurvePoints.push(point);
            
            if (this.tempCurvePoints.length === 1 && this.isFirstPoint) {
                this.currentShape.moveTo(point.x, point.y);
                this.isFirstPoint = false;
            } else if (this.tempCurvePoints.length === 3) {
                // Создаем дугу через 3 точки
                const p1 = this.tempCurvePoints[0];
                const p2 = this.tempCurvePoints[1];
                const p3 = this.tempCurvePoints[2];
                
                // Упрощенный расчет дуги
                const center = this.calculateCircleCenter(p1, p2, p3);
                const radius = p1.distanceTo(center);
                const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
                const endAngle = Math.atan2(p3.y - center.y, p3.x - center.x);
                
                this.currentShape.arc(center.x, center.y, radius, startAngle, endAngle, false);
                
                this.points.push(...this.tempCurvePoints);
                this.tempCurvePoints = [p3];
            }
        }
        
        this.updateShapePreview();
    }
    
    calculateCircleCenter(p1, p2, p3) {
        // Упрощенный расчет центра окружности через 3 точки
        const ax = p1.x, ay = p1.y;
        const bx = p2.x, by = p2.y;
        const cx = p3.x, cy = p3.y;
        
        const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
        if (Math.abs(d) < 0.001) return p2; // Точки на одной линии
        
        const ux = ((ax*ax + ay*ay) * (by - cy) + (bx*bx + by*by) * (cy - ay) + (cx*cx + cy*cy) * (ay - by)) / d;
        const uy = ((ax*ax + ay*ay) * (cx - bx) + (bx*bx + by*by) * (ax - cx) + (cx*cx + cy*cy) * (bx - ax)) / d;
        
        return new THREE.Vector2(ux, uy);
    }
    
    addVisualPoint(point) {
        const pointGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const pointMesh = new THREE.Mesh(pointGeometry, this.materials.point);
        pointMesh.position.set(point.x, 0.2, point.y);
        pointMesh.userData.isPoint = true;
        this.scene.add(pointMesh);
    }
    
    updatePreview(currentMousePoint) {
        // Удаляем предыдущую временную линию
        if (this.tempLine) {
            this.scene.remove(this.tempLine);
            this.tempLine = null;
        }
        
        if (this.points.length > 0) {
            const lastPoint = this.points[this.points.length - 1];
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(lastPoint.x, 0.1, lastPoint.y),
                new THREE.Vector3(currentMousePoint.x, 0.1, currentMousePoint.y)
            ]);
            
            this.tempLine = new THREE.Line(geometry, this.materials.line);
            this.scene.add(this.tempLine);
        }
    }
    
    updateShapePreview() {
        // Удаляем предыдущий превью
        if (this.shapePreview) {
            this.scene.remove(this.shapePreview);
            this.shapePreview = null;
        }
        
        if (this.points.length >= 3) {
            try {
                const geometry = new THREE.ShapeGeometry(this.currentShape);
                this.shapePreview = new THREE.Mesh(geometry, this.materials.preview);
                this.shapePreview.rotation.x = -Math.PI / 2; // Поворачиваем на плоскость XZ
                this.scene.add(this.shapePreview);
            } catch (error) {
                console.warn('Не удалось создать превью фигуры:', error);
            }
        }
    }
    
    clearShape() {
        // Удаляем все визуальные элементы
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            if (object.userData.isPoint || object === this.shapePreview || object === this.tempLine) {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
        });
        
        // Сбрасываем состояние
        this.currentShape = new THREE.Shape();
        this.points = [];
        this.tempCurvePoints = [];
        this.isFirstPoint = true;
        this.shapePreview = null;
        this.tempLine = null;
        
        document.getElementById('finishPlayground').disabled = true;
    }
    
    undoLastPoint() {
        if (this.points.length === 0) return;
        
        // Удаляем последнюю визуальную точку
        let lastPointMesh = null;
        this.scene.traverse((object) => {
            if (object.userData.isPoint) {
                lastPointMesh = object;
            }
        });
        
        if (lastPointMesh) {
            this.scene.remove(lastPointMesh);
            lastPointMesh.geometry.dispose();
        }
        
        // Удаляем последнюю точку из массива
        this.points.pop();
        
        if (this.points.length === 0) {
            this.clearShape();
        } else {
            // Пересоздаем фигуру без последней точки
            this.rebuildShape();
        }
    }
    
    rebuildShape() {
        this.currentShape = new THREE.Shape();
        
        if (this.points.length > 0) {
            this.currentShape.moveTo(this.points[0].x, this.points[0].y);
            
            for (let i = 1; i < this.points.length; i++) {
                this.currentShape.lineTo(this.points[i].x, this.points[i].y);
            }
        }
        
        this.updateShapePreview();
    }
    
    closeShape() {
        if (this.points.length < 3) {
            alert('Для создания площадки нужно минимум 3 точки!');
            return;
        }
        
        // Замыкаем фигуру
        const firstPoint = this.points[0];
        this.currentShape.lineTo(firstPoint.x, firstPoint.y);
        
        this.updateShapePreview();
        
        // Активируем кнопку подтверждения
        document.getElementById('finishPlayground').disabled = false;
    }
    
    finishPlayground() {
        if (!this.shapePreview) {
            alert('Сначала создайте и замкните фигуру!');
            return;
        }
        
        // Удаляем все вспомогательные элементы
        const objectsToRemove = [];
        this.scene.traverse((object) => {
            if (object.userData.isPoint || object === this.tempLine) {
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
        });
        
        // Создаем финальную площадку
        if (this.shapePreview) {
            this.scene.remove(this.shapePreview);
            this.shapePreview = null;
        }
        
        const geometry = new THREE.ShapeGeometry(this.currentShape);
        this.materials.final.color.setHex(this.playgroundColor);
        this.finalPlayground = new THREE.Mesh(geometry, this.materials.final);
        this.finalPlayground.rotation.x = -Math.PI / 2;
        this.finalPlayground.receiveShadow = true;
        this.scene.add(this.finalPlayground);
        
        // Отключаем редактирование
        this.isEditing = false;
        
        // Обновляем UI
        document.querySelector('#customPlaygroundEditor > div').innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Площадка создана!</h3>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500;">Изменить цвет:</label>
                <input type="color" id="finalPlaygroundColor" value="#2196F3" 
                       style="width: 100%; height: 40px; border: none; border-radius: 6px; cursor: pointer;">
            </div>
            
            <div style="margin-bottom: 20px;">
                <button id="savePlayground" style="width: 100%; padding: 10px; background: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
                    Сохранить площадку
                </button>
                <button id="editAgain" style="width: 100%; padding: 10px; background: #ff9800; color: white; border: none; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
                    Редактировать заново
                </button>
                <button id="exitEditor" style="width: 100%; padding: 10px; background: #666; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Выйти из редактора
                </button>
            </div>
            
            <div style="background: #e8f5e8; padding: 10px; border-radius: 6px; font-size: 12px; color: #2e7d32;">
                <strong>✓ Площадка готова!</strong><br>
                Теперь вы можете изменить только цвет покрытия.
            </div>
        `;
        
        // Новые обработчики
        document.getElementById('finalPlaygroundColor').addEventListener('change', (e) => {
            this.playgroundColor = parseInt(e.target.value.replace('#', '0x'));
            this.finalPlayground.material.color.setHex(this.playgroundColor);
        });
        
        document.getElementById('savePlayground').addEventListener('click', () => {
            this.savePlayground();
        });
        
        document.getElementById('editAgain').addEventListener('click', () => {
            this.editAgain();
        });
        
        document.getElementById('exitEditor').addEventListener('click', () => {
            this.exitEditor();
        });
    }
    
    savePlayground() {
        // Здесь можно добавить логику сохранения площадки
        const playgroundData = {
            shape: this.currentShape,
            points: this.points,
            color: this.playgroundColor,
            timestamp: new Date().toISOString()
        };
        
        console.log('Сохранение площадки:', playgroundData);
        
        alert('Площадка сохранена! (Данные выведены в консоль)');
    }
    
    editAgain() {
        if (confirm('Вы уверены, что хотите начать редактирование заново? Текущая площадка будет удалена.')) {
            if (this.finalPlayground) {
                this.scene.remove(this.finalPlayground);
                this.finalPlayground.geometry.dispose();
                this.finalPlayground = null;
            }
            
            this.clearShape();
            this.createUI();
        }
    }
    
    exitEditor() {
        if (confirm('Вы уверены, что хотите выйти из редактора?')) {
            this.cleanup();
            document.body.removeChild(this.container);
        }
    }
    
    cleanup() {
        // Очистка ресурсов Three.js
        this.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        this.renderer.dispose();
        
        // Удаление обработчиков событий
        window.removeEventListener('resize', this.onWindowResize);
    }
    
    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.left = -width / height * 60;
        this.camera.right = width / height * 60;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
}

// Функция запуска редактора
window.startCustomPlaygroundEditor = function() {
    new CustomPlaygroundEditor();
};

export default CustomPlaygroundEditor;