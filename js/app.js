/**
 * Главный модуль приложения, собирающий все компоненты
 * Адаптирован для работы с Three.js
 */
// Импорты должны быть на верхнем уровне модуля, не внутри блоков
import { initScene } from './scene.js';
import { loadPlayground, ground } from './playground.js';
import { initUI } from './ui.js';
import { checkAllObjectsPositions } from './objects.js';

// Обертываем только выполнение кода в try-catch, а не импорты
try {
    console.log('Загрузка модулей...');
    
    // Основной код приложения - делаем функцию глобальной
    window.initApp = async function() {
        try {
            console.log('Инициализация приложения...');
            
            // Инициализируем Three.js сцену, камеру и освещение
            const sceneComponents = initScene();
            console.log('Сцена инициализирована');
            
            // Получаем тип площадки из выпадающего списка (если он уже создан)
            let playgroundType = 'playground.glb'; // По умолчанию
            const playgroundTypeSelect = document.getElementById('playgroundType');
            if (playgroundTypeSelect) {
                playgroundType = playgroundTypeSelect.value;
            }
            
            // Загружаем площадку (ждем, пока она загрузится)
            await loadPlayground(playgroundType);
            console.log('Площадка загружена:', playgroundType);
            
            // Инициализируем UI и обработчики событий
            // Важно делать это после загрузки площадки, чтобы не было ошибок доступа к ground и groundMesh
            initUI();
            console.log('UI инициализирован');
            
            // Проверяем позиции всех объектов после инициализации
            checkAllObjectsPositions();
            
            // Удаляем все элементы с классом safety-zone
            removeAllSafetyZones();
            
            // Экспортируем глобальные объекты в window для отладки
            window.app = sceneComponents;
            
            // Запускаем цикл рендеринга Three.js
            animate();
            
            console.log('Приложение успешно инициализировано');
        } catch (error) {
            console.error('Ошибка при инициализации приложения:', error);
            console.error('Стек вызовов:', error.stack);
            
            // Вывод в DOM для отображения ошибки на странице
            const errorElement = document.createElement('div');
            errorElement.style.position = 'fixed';
            errorElement.style.top = '0';
            errorElement.style.left = '0';
            errorElement.style.width = '100%';
            errorElement.style.padding = '20px';
            errorElement.style.backgroundColor = 'rgba(255,0,0,0.8)';
            errorElement.style.color = 'white';
            errorElement.style.zIndex = '9999';
            errorElement.innerHTML = `<h2>Ошибка при инициализации:</h2>
                                     <p>${error.message}</p>
                                     <pre>${error.stack}</pre>`;
            document.body.appendChild(errorElement);
        }
    }

    // Функция анимации для Three.js (рендеринг цикл)
    function animate() {
        requestAnimationFrame(animate);
        
        // Проверяем наличие необходимых компонентов
        if (window.app && window.app.renderer && window.app.scene && window.app.camera) {
            // Обновляем OrbitControls, если они существуют
            if (window.app.controls && window.app.controls.update) {
                window.app.controls.update();
            }
            
            // Рендерим сцену
            window.app.renderer.render(window.app.scene, window.app.camera);
        }
    }

    /**
     * Удаляет все элементы безопасной зоны
     */
    function removeAllSafetyZones() {
        // Удаляем все элементы с классом safety-zone
        document.querySelectorAll('.safety-zone, [class*="safe"], [class*="Safe"]').forEach(el => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
        });
        
        // Удаляем все скрипты, которые могут создавать желтые прямоугольники
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent && 
                (script.textContent.includes('safety') || 
                 script.textContent.includes('SafeZone') || 
                 script.textContent.includes('safeZone') ||
                 script.textContent.includes('safeArea'))) {
                
                // Вместо удаления скрипта (что может вызвать ошибки), 
                // добавляем код для удаления созданных им элементов
                const cleanupScript = document.createElement('script');
                cleanupScript.textContent = `
                    // Удаляем все элементы с желтым цветом
                    document.querySelectorAll('*').forEach(el => {
                        const style = window.getComputedStyle(el);
                        if (style.backgroundColor === 'rgb(255, 255, 0)' || 
                            style.backgroundColor === '#ffff00' || 
                            style.backgroundColor === 'yellow' ||
                            style.borderColor === 'rgb(255, 255, 0)' || 
                            style.borderColor === '#ffff00' ||
                            style.borderColor === 'yellow') {
                            
                            el.style.display = 'none';
                            el.style.visibility = 'hidden';
                            el.style.opacity = '0';
                        }
                    });
                `;
                document.body.appendChild(cleanupScript);
            }
        });
        
        // Для Three.js: удаляем все объекты с желтым цветом из сцены
        if (window.app && window.app.scene) {
            window.app.scene.traverse((object) => {
                if (object.isMesh && object.material) {
                    // Проверяем, имеет ли материал желтый цвет
                    if (object.material.color && 
                        object.material.color.r > 0.8 && 
                        object.material.color.g > 0.8 && 
                        object.material.color.b < 0.3) {
                        
                        // Делаем объект невидимым
                        object.visible = false;
                        // Если у объекта есть имя, проверяем его
                        if (object.name && (
                            object.name.includes("safe") || 
                            object.name.includes("Safe") || 
                            object.name.includes("zone") || 
                            object.name.includes("Zone") ||
                            object.name.includes("boundary") || 
                            object.name.includes("Boundary")
                        )) {
                            object.visible = false;
                        }
                    }
                }
            });
        }
    }

    // Флаг для отслеживания, было ли приложение уже инициализировано
    window.appInitialized = false;
    
    // Функция, которая запускает initApp только один раз
    const ensureSingleInit = () => {
        console.log('Проверка инициализации приложения. Текущий статус:', window.appInitialized);
        if (!window.appInitialized) {
            console.log('Первая инициализация приложения');
            window.appInitialized = true;
            window.initApp();
        } else {
            console.log('Приложение уже инициализировано, повторный запуск пропущен');
        }
    };
    
    // Запускаем приложение только при нажатии на кнопку запуска
    window.addEventListener('DOMContentLoaded', () => {
        console.log('DOM загружен, ожидаем нажатия кнопки запуска');
        
        // Удаляем все остальные слушатели, которые могут инициализировать приложение автоматически
        const launchButton = document.getElementById('launchApp');
        if (launchButton) {
            console.log('Кнопка запуска найдена, добавляем обработчик');
            // Добавляем только один обработчик для кнопки запуска
            launchButton.addEventListener('click', () => {
                console.log('Кнопка запуска нажата');
                const modal = document.getElementById('appModal');
                if (modal) {
                    modal.style.display = 'block';
                    document.getElementById('launchContainer').style.display = 'none';
                    ensureSingleInit();
                }
            });
        } else {
            console.log('Кнопка запуска не найдена!');
        }
    });

    // Дополнительная проверка и удаление жёлтых элементов после полной загрузки страницы
    window.addEventListener('load', () => {
        // Удаляем все элементы безопасной зоны после полной загрузки
        removeAllSafetyZones();
        
        // Также добавляем обработчик изменения размеров окна, чтобы удалять зоны при изменении размера
        window.addEventListener('resize', () => {
            removeAllSafetyZones();
            
            // Обновляем размер рендерера при изменении размера окна (специфично для Three.js)
            if (window.app && window.app.renderer && window.app.camera) {
                const renderer = window.app.renderer;
                const camera = window.app.camera;
                
                // Обновляем размеры рендерера
                renderer.setSize(window.innerWidth, window.innerHeight);
                
                // Если используется перспективная камера, обновляем её аспект
                if (camera.isPerspectiveCamera) {
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                }
            }
        });
    });
} catch (error) {
    console.error('Критическая ошибка при загрузке модулей:', error);
    console.error('Стек вызовов:', error.stack);
    
    // Вывод ошибки на страницу
    document.addEventListener('DOMContentLoaded', () => {
        const errorElement = document.createElement('div');
        errorElement.style.position = 'fixed';
        errorElement.style.top = '0';
        errorElement.style.left = '0';
        errorElement.style.width = '100%';
        errorElement.style.padding = '20px';
        errorElement.style.backgroundColor = 'rgba(255,0,0,0.8)';
        errorElement.style.color = 'white';
        errorElement.style.zIndex = '9999';
        errorElement.innerHTML = `<h2>Критическая ошибка при загрузке:</h2>
                                 <p>${error.message}</p>
                                 <pre>${error.stack}</pre>`;
        document.body.appendChild(errorElement);
    });
}

// Обратите внимание: в исходном файле был дублированный код.
// Эти функции уже определены выше, поэтому я удалил их повторное определение:
// - initApp()
// - animate()
// - removeAllSafetyZones()
// - обработчики событий
