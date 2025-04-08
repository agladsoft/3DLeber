// Инициализация Three.js
const canvas = document.getElementById("renderCanvas");
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// --- Фон (Skybox) ---
const loader = new THREE.CubeTextureLoader();
const skyboxTexture = loader.load([
    'textures/citybox/citybox_px.jpg',
    'textures/citybox/citybox_nx.jpg',
    'textures/citybox/citybox_py.jpg',
    'textures/citybox/citybox_ny.jpg',
    'textures/citybox/citybox_pz.jpg',
    'textures/citybox/citybox_nz.jpg'
]);
scene.background = skyboxTexture;

// --- Камера "вид сверху" ---
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 15, 15);
camera.lookAt(0, 0, 0);

// Орбитальный контроль камеры
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.2; // Ограничение наклона камеры

// --- Свет ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 0);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Настройка теней
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;

// --- Поверхность (playground) ---
let ground = null;
const gltfLoader = new THREE.GLTFLoader();
gltfLoader.load('models/playground.glb', (gltf) => {
    ground = gltf.scene;
    ground.position.set(0, 0, 0);
    ground.scale.set(1, 1, 1);
    
    // Настройка теней для всех мешей в модели
    ground.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    
    scene.add(ground);
}, undefined, (error) => {
    console.error('Ошибка загрузки модели playground:', error);
});

// --- Цены элементов ---
const elementPrices = {
    "0001.glb": 8000,
    "242.glb": 7500,
    "0502.glb": 12000,
    "0519.glb": 11000,
    "3540.glb": 9500,
    "4209.glb": 13000,
    "taiga.glb": 14000,
    "lgd_3.glb": 11000,
    "lgk_314.glb": 10000,
    "msk_105.glb": 4000,
    "msk_201.glb": 15000
};

let totalPrice = 0;

const modelSizes = {
    "0001.glb": 2,
    "242.glb": 1,
    "0502.glb": 1,
    "0519.glb": 2,
    "3540.glb": 1.5,
    "4209.glb": 1,
    "taiga.glb": 1.5,
    "lgd_3.glb": 1.6,
    "lgk_314.glb": 1,
    "msk_105.glb": 1,
    "msk_201.glb": 0.5
};

// Raycaster для обработки кликов и перетаскивания
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- Обработчик начала перетаскивания для загрузки модели ---
document.querySelectorAll(".item").forEach(item => {
    item.addEventListener("dragstart", event => {
        const model = event.target.closest(".item").getAttribute("data-model");
        console.log("Drag started:", model);
        event.dataTransfer.setData("model", model);
    });
});

// --- Остановка поведения по умолчанию для drop ---
canvas.addEventListener("dragover", event => event.preventDefault());

// --- Обработка события drop для загрузки модели ---
canvas.addEventListener("drop", event => {
    event.preventDefault();
    const modelName = event.dataTransfer.getData("model");
    
    // Преобразуем координаты мыши в нормализованные координаты от -1 до 1
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Проверяем пересечение с поверхностью playground
    const intersects = raycaster.intersectObjects(ground ? [ground] : [], true);
    
    if (modelName) {
        gltfLoader.load(`models/${modelName}`, (gltf) => {
            const modelContainer = new THREE.Group();
            modelContainer.add(gltf.scene);
            
            // Применяем специфические повороты для конкретных моделей
            if (modelName === "MG0001 2024-09 R2 Модель.glb") {
                modelContainer.rotation.x = Math.PI / 2;
            }
            if (modelName === "0519.glb") {
                modelContainer.rotation.x = Math.PI / -2;
            }
            if (modelName === "0001.glb") {
                modelContainer.rotation.x = Math.PI / -2;
            }
            
            // Настраиваем позицию
            if (intersects.length > 0) {
                modelContainer.position.copy(intersects[0].point);
            } else {
                modelContainer.position.set(0, 0, 0);
            }
            
            // Настройка теней для всех мешей в модели
            modelContainer.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Вычисляем bounding box для масштабирования
            const box = new THREE.Box3().setFromObject(modelContainer);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDimension = Math.max(size.x, size.y, size.z);
            
            // Определяем стандартный размер для модели из словаря
            const standardSize = modelSizes[modelName] || 1;
            
            // Масштабируем так, чтобы максимальная размерность стала равна standardSize
            const scaleFactor = standardSize / maxDimension;
            modelContainer.scale.set(scaleFactor, scaleFactor, scaleFactor);
            
            // Выравниваем нижнюю грань по Y=0
            const newBox = new THREE.Box3().setFromObject(modelContainer);
            const minY = newBox.min.y;
            modelContainer.position.y -= minY;
            
            scene.add(modelContainer);
            
            // Обновляем общую стоимость
            const price = elementPrices[modelName] || 0;
            totalPrice += price;
            document.getElementById("totalPrice").textContent = totalPrice.toLocaleString();
            
            // Добавляем информацию в таблицу с кнопкой удаления
            const tableBody = document.querySelector("#elementsTable tbody");
            const row = document.createElement("tr");
            row.innerHTML = `<td>${modelName}</td>
                             <td>${price.toLocaleString()} ₽</td>
                             <td><button class="delete-button" style="cursor:pointer;">🗑️</button></td>`;
            tableBody.appendChild(row);
            
            // Сохраняем ссылку на контейнер и стоимость в строке
            row.modelContainer = modelContainer;
            row.price = price;
            
            // Обработчик удаления элемента
            row.querySelector(".delete-button").addEventListener("click", () => {
                if (row.modelContainer) {
                    scene.remove(row.modelContainer);
                    // Освобождаем память
                    row.modelContainer.traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(material => material.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
                totalPrice -= row.price;
                document.getElementById("totalPrice").textContent = totalPrice.toLocaleString();
                row.remove();
            });
        }, undefined, (error) => {
            console.error(`Ошибка загрузки модели ${modelName}:`, error);
        });
    }
});

// --- Отключаем стандартное контекстное меню (правый клик) ---
canvas.addEventListener("contextmenu", event => event.preventDefault());

// --- Глобальные переменные для управления манипуляциями с объектами ---
let selectedObject = null;
let isDragging = false;
let isRotating = false;
let dragPlane = new THREE.Plane();
let dragOffset = new THREE.Vector3();
let initialRotationY = 0;
let initialPointerX = 0;

// Обработка кликов и движения мыши
canvas.addEventListener("pointerdown", (event) => {
    // Преобразуем координаты мыши в нормализованные координаты от -1 до 1
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    // Получаем все объекты в сцене, кроме ground
    const sceneObjects = [];
    scene.traverse((object) => {
        if (object.isMesh && (!ground || !object.isDescendantOf(ground))) {
            sceneObjects.push(object);
        }
    });
    
    const intersects = raycaster.intersectObjects(sceneObjects, true);
    
    if (intersects.length > 0) {
        // Находим родительский контейнер объекта
        let parent = intersects[0].object;
        while (parent.parent && parent.parent !== scene) {
            parent = parent.parent;
        }
        
        selectedObject = parent;
        
        // Отключаем управление камерой
        controls.enabled = false;
        
        // Левый клик – начинаем перетаскивание
        if (event.button === 0) {
            isDragging = true;
            
            // Создаем плоскость для перетаскивания на уровне Y=0
            dragPlane.setFromNormalAndCoplanarPoint(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, 0, 0)
            );
            
            // Вычисляем смещение от точки пересечения до позиции объекта
            const planeIntersect = new THREE.Vector3();
            raycaster.ray.intersectPlane(dragPlane, planeIntersect);
            dragOffset.copy(selectedObject.position).sub(planeIntersect);
        }
        // Правый клик – начинаем вращение
        else if (event.button === 2) {
            isRotating = true;
            initialRotationY = selectedObject.rotation.y;
            initialPointerX = event.clientX;
        }
    }
});

canvas.addEventListener("pointermove", (event) => {
    if (!selectedObject) return;
    
    // Перемещение объекта
    if (isDragging) {
        // Преобразуем координаты мыши в нормализованные координаты от -1 до 1
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        // Находим пересечение с плоскостью перетаскивания
        const planeIntersect = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, planeIntersect)) {
            // Обновляем позицию объекта с учетом смещения
            selectedObject.position.copy(planeIntersect.add(dragOffset));
            selectedObject.position.y = 0; // Фиксируем Y=0
            
            // Выравниваем нижнюю грань объекта по Y=0
            const box = new THREE.Box3().setFromObject(selectedObject);
            const minY = box.min.y;
            selectedObject.position.y -= minY;
        }
    }
    // Вращение объекта
    else if (isRotating) {
        const deltaX = event.clientX - initialPointerX;
        selectedObject.rotation.y = initialRotationY + deltaX * 0.01;
    }
});

canvas.addEventListener("pointerup", () => {
    // Завершаем перемещение/вращение
    if (isDragging || isRotating) {
        controls.enabled = true;
    }
    isDragging = false;
    isRotating = false;
    selectedObject = null;
});

// Обработка изменения размера окна
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Анимационный цикл
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Обновляем контроллер камеры
    renderer.render(scene, camera);
}

animate();