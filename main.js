const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);

// --- Фон ---
var skybox = BABYLON.MeshBuilder.CreateBox("cityBox", {size:1000.0}, scene);
var skyboxMaterial = new BABYLON.StandardMaterial("cityBox", scene);
skyboxMaterial.backFaceCulling = false;
skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("textures/citybox/citybox", scene);
skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
skybox.material = skyboxMaterial;

// --- Камера "вид сверху" ---
const camera = new BABYLON.ArcRotateCamera(
    "camera",
    0,           // Поворот вокруг оси Y
    1.3,         // Наклон (около 1.57 = строго сверху)
    15,          // Радиус (расстояние до центра)
    new BABYLON.Vector3(0, 0, 0),
    scene
);
camera.attachControl(canvas, true);
camera.upperBetaLimit = Math.PI / 2.2;

// --- Свет ---
const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(1, 1, 0), scene);

// --- Поверхность (playground) ---
// Глобальная переменная ground будет содержать контейнер загруженной модели playground
let ground = null;
BABYLON.SceneLoader.ImportMesh("", "models/", "playground.glb", scene, function (newMeshes) {
    if (!newMeshes || newMeshes.length === 0) return;
    
    // Получаем корневой контейнер (если он есть) или первую мешу
    const playground = newMeshes[0].parent || newMeshes[0];
    
    // Настройка модели playground
    playground.position = new BABYLON.Vector3(0, 0, 0);
    playground.rotationQuaternion = null; // Сбрасываем поворот из glTF
    playground.scaling = new BABYLON.Vector3(1, 1, 1);
    
    ground = playground;
});

// --- Цены элементов ---
const elementPrices = {
    "0001.glb": 8000,
    "242.glb": 7500,
    "0502.glb": 12000,
    "0519.glb": 11000,
    "3540.glb": 9500,
    "4209.glb": 13000,
    "taiga.stl": 14000,
    "lgd_3.glb": 11000,
    "lgk_11.glb": 6000,
    "lgk_314.glb": 10000,
    "msk_105.glb": 4000,
    "msk_201.glb": 15000
};

let totalPrice = 0;

const modelSizes = {
    "0001.glb": 1,
    "242.glb": 1,
    "0502.glb": 1,
    "0519.glb": 1,
    "3540.glb": 1,
    "4209.glb": 1,
    "taiga.stl": 1,
    "lgd_3.glb": 1,
    "lgk_11.glb": 1,
    "lgk_314.glb": 1,
    "msk_105.glb": 1,
    "msk_201.glb": 1
};

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
    const pickResult = scene.pick(event.clientX, event.clientY);

    if (modelName) {
        BABYLON.SceneLoader.ImportMesh("", "models/", modelName, scene, function (newMeshes) {
            if (!newMeshes || newMeshes.length === 0) {
                console.error("Ошибка: модель не загружена", modelName);
                return;
            }

            // Создаём контейнер для импортированных мешей
            const container = new BABYLON.TransformNode("modelContainer", scene);
            newMeshes.forEach(mesh => {
                mesh.parent = container;
            });

            // При необходимости поворачиваем конкретные модели
            if (modelName === "MG0001 2024-09 R2 Модель.glb") {
                container.rotation.x = Math.PI / 2;
            }
            if (modelName === "0519.glb") {
                container.rotation.x = Math.PI / -2;
            }
            if (modelName === "0001.glb") {
                container.rotation.x = Math.PI / -2;
            }

            // Устанавливаем контейнер в позицию броска (если pickResult не сработал, берем (0,0,0))
            container.position = pickResult.pickedPoint || new BABYLON.Vector3(0, 0, 0);
                
            // Вычисляем bounding box
            let boundingVectors = container.getHierarchyBoundingVectors();
            let size = boundingVectors.max.subtract(boundingVectors.min);
            let maxDimension = Math.max(size.x, size.y, size.z);

            // Определяем стандартный размер для модели из словаря
            let standardSize = modelSizes[modelName] || 1;

            // Масштабируем так, чтобы максимальная размерность стала равна standardSize
            let scaleFactor = standardSize / maxDimension;
            container.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);

            // Выравниваем нижнюю грань по Y=0
            boundingVectors = container.getHierarchyBoundingVectors();
            const minY = boundingVectors.min.y;
            container.position.y -= minY;

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
            row.container = container;
            row.price = price;

            // Обработчик удаления элемента
            row.querySelector(".delete-button").addEventListener("click", () => {
                if (row.container) {
                    row.container.dispose();
                }
                totalPrice -= row.price;
                document.getElementById("totalPrice").textContent = totalPrice.toLocaleString();
                row.remove();
            });
        });
    }
});

// --- Отключаем стандартное контекстное меню (правый клик) ---
canvas.addEventListener("contextmenu", event => event.preventDefault());

// --- Глобальные переменные для управления манипуляциями с объектами ---
let selectedMesh = null;
let isDragging = false;
let isRotating = false;
let dragOffset = BABYLON.Vector3.Zero();
let initialRotationY = 0;
let initialPointerX = 0;

// Обработка кликов и движения мыши
scene.onPointerObservable.add(pointerInfo => {
    const event = pointerInfo.event;
    
    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        const pickInfo = pointerInfo.pickInfo;
        if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
            // Если клик по playground или по его дочерним объектам – не выбираем объект
            if (ground && (pickInfo.pickedMesh === ground || pickInfo.pickedMesh.isDescendantOf(ground))) {
                selectedMesh = null;
                return;
            }
            // Выбираем корневой контейнер объекта
            selectedMesh = pickInfo.pickedMesh.parent || pickInfo.pickedMesh;
            
            // Отключаем управление камерой, чтобы не мешало перемещать/вращать объект
            camera.detachControl(canvas);

            // Левый клик – начинаем перетаскивание
            if (event.button === 0) {
                isDragging = true;
                dragOffset = selectedMesh.position.subtract(pickInfo.pickedPoint);
            }
            // Правый клик – начинаем вращение
            else if (event.button === 2) {
                isRotating = true;
                initialRotationY = selectedMesh.rotation.y;
                initialPointerX = event.clientX;
            }
        }
    }
    else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
        // Перемещение объекта
        if (isDragging && selectedMesh) {
            // Выбираем точку на поверхности playground (учитываем все дочерние объекты)
            const pickResult = scene.pick(
                scene.pointerX,
                scene.pointerY,
                mesh => ground && (mesh === ground || mesh.isDescendantOf(ground))
            );
            if (pickResult && pickResult.hit && pickResult.pickedPoint) {
                let newPos = pickResult.pickedPoint.add(dragOffset);
                newPos.y = 0;
                selectedMesh.position = newPos;
                
                // Выравнивание нижней грани объекта по Y=0
                let boundingVectors = selectedMesh.getHierarchyBoundingVectors();
                const minY = boundingVectors.min.y;
                selectedMesh.position.y -= minY;
            }
        }
        // Вращение объекта
        else if (isRotating && selectedMesh) {
            const deltaX = event.clientX - initialPointerX;
            selectedMesh.rotation.y = initialRotationY + deltaX * 0.01;
        }
    }
    else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
        // Завершаем перемещение/вращение
        if (isDragging || isRotating) {
            camera.attachControl(canvas, true);
        }
        isDragging = false;
        isRotating = false;
        selectedMesh = null;
    }
});

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());