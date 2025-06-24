/**
 * Простой модуль для управления модальным окном настроек площадки
 */
const PlaygroundModal = {
    // DOM-элементы
    elements: {
        modal: null,
        backdrop: null,
        widthInput: null,
        lengthInput: null,
        colorSquares: null,
        applyButton: null,
        closeButton: null,
        playgroundButton: null
    },
    
    // Состояние
    state: {
        isOpen: false,
        selectedColor: 'зеленый',
        selectedColorHex: '#2E7D32'
    },
    
    /**
     * Инициализация модального окна
     */
    init: function() {
        // Получаем ссылки на DOM-элементы (они уже встроены в HTML)
        this.findElements();
        
        // Добавляем обработчики событий
        this.setupEventListeners();
        
    },
    

    
    /**
     * Получение ссылок на DOM-элементы
     */
    findElements: function() {
        this.elements.modal = document.getElementById('pgModal');
        this.elements.backdrop = document.getElementById('pgModalBackdrop');
        this.elements.widthInput = document.getElementById('pgWidthInput');
        this.elements.lengthInput = document.getElementById('pgLengthInput');
        this.elements.colorSquares = document.querySelectorAll('.pg-color-square');
        this.elements.applyButton = document.getElementById('pgApplyButton');
        this.elements.closeButton = document.getElementById('pgCloseButton');
        this.elements.playgroundButton = document.getElementById('playgroundButton');
    },
    
    /**
     * Настройка обработчиков событий
     */
    setupEventListeners: function() {
        // Если кнопка "Площадка" найдена, добавляем обработчик
        if (this.elements.playgroundButton) {
            this.elements.playgroundButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.open();
            });
        }
        
        // Обработчик закрытия
        if (this.elements.closeButton) {
            this.elements.closeButton.addEventListener('click', () => {
                this.close();
            });
        }
        
        // Закрытие при клике на backdrop
        if (this.elements.backdrop) {
            this.elements.backdrop.addEventListener('click', () => {
                this.close();
            });
        }
        
        // Обработчик кнопки "Применить"
        if (this.elements.applyButton) {
            this.elements.applyButton.addEventListener('click', () => {
                this.apply();
            });
        }
        
        // Обработчики для цветовых квадратов
        if (this.elements.colorSquares) {
            this.elements.colorSquares.forEach(square => {
                square.addEventListener('click', () => {
                    // Снимаем выделение со всех квадратов
                    this.elements.colorSquares.forEach(s => s.classList.remove('selected'));
                    
                    // Выделяем выбранный квадрат
                    square.classList.add('selected');
                    
                    // Сохраняем выбранный цвет
                    this.state.selectedColor = square.getAttribute('data-color');
                    this.state.selectedColorHex = square.style.backgroundColor;
                });
            });
        }
        
        // Обработчик изменения размера окна для корректного позиционирования модального окна
        window.addEventListener('resize', () => {
            if (this.state.isOpen) {
                this.updatePosition();
            }
        });
    },
    
    /**
     * Обновление позиции модального окна относительно кнопки
     */
    updatePosition: function() {
        if (!this.elements.modal || !this.elements.playgroundButton) {
            return;
        }
        
        const buttonRect = this.elements.playgroundButton.getBoundingClientRect();
        const modalWidth = 387; // Ширина модального окна по CSS
        
        // Проверяем, хватает ли места слева от кнопки
        if (buttonRect.left > modalWidth + 40) {
            // Достаточно места слева от кнопки
            this.elements.modal.style.right = (window.innerWidth - buttonRect.left + 20) + 'px';
            this.elements.modal.style.left = 'auto';
        } else {
            // Недостаточно места слева, размещаем справа от кнопки
            this.elements.modal.style.left = (buttonRect.right + 20) + 'px';
            this.elements.modal.style.right = 'auto';
        }
        
        // Вертикальное позиционирование
        const modalHeight = this.elements.modal.offsetHeight || 400; // Примерная высота модального окна
        
        // Проверяем, помещается ли окно целиком по вертикали
        if (buttonRect.top + modalHeight > window.innerHeight) {
            // Если не помещается, размещаем с нижней границей равной нижней границе окна
            this.elements.modal.style.top = Math.max(0, window.innerHeight - modalHeight - 20) + 'px';
        } else {
            // Иначе выравниваем по верхней границе кнопки
            this.elements.modal.style.top = buttonRect.top + 'px';
        }
        
        // Сбрасываем transform, чтобы не мешал позиционированию
        this.elements.modal.style.transform = 'none';
        
        console.log('Обновлена позиция модального окна:', {
            left: this.elements.modal.style.left,
            right: this.elements.modal.style.right,
            top: this.elements.modal.style.top
        });
    },
    
    /**
     * Открытие модального окна
     */
    open: function() {
        if (!this.elements.modal || !this.elements.backdrop) {
            console.error('Элементы модального окна не найдены');
            return;
        }
        
        // Обновляем позицию модального окна относительно кнопки
        this.updatePosition();
        
        // Показываем модальное окно и backdrop
        this.elements.backdrop.style.display = 'block';
        this.elements.modal.style.display = 'block';
        
        // Обновляем состояние
        this.state.isOpen = true;
        
        // Добавляем класс активной кнопки, если она найдена
        if (this.elements.playgroundButton) {
            this.elements.playgroundButton.classList.add('active');
        }
        
    },
    
    /**
     * Закрытие модального окна
     */
    close: function() {
        if (!this.elements.modal || !this.elements.backdrop) {
            console.error('Элементы модального окна не найдены');
            return;
        }
        
        // Скрываем модальное окно и backdrop
        this.elements.backdrop.style.display = 'none';
        this.elements.modal.style.display = 'none';
        
        // Обновляем состояние
        this.state.isOpen = false;
        
        // Убираем класс активной кнопки, если она найдена
        if (this.elements.playgroundButton) {
            this.elements.playgroundButton.classList.remove('active');
        }
        
        console.log('Модальное окно закрыто');
    },
    
    /**
     * Применение настроек
     */
    apply: async function() {
        try {
            // Получаем значения из полей ввода
            const width = parseInt(this.elements.widthInput.value) || 40;
            const length = parseInt(this.elements.lengthInput.value) || 30;
            
            // Получаем выбранный цвет
            const selectedSquare = document.querySelector('.pg-color-square.selected');
            const color = selectedSquare ? selectedSquare.getAttribute('data-color') : 'зеленый';
            
            // Преобразуем название цвета в hex-код
            let colorHex;
            switch (color) {
                case 'черный':
                    colorHex = '#100F0F';
                    break;
                case 'зеленый':
                    colorHex = '#2E7D32';
                    break;
                case 'коричневый':
                    colorHex = '#5D4037';
                    break;
                case 'синий':
                    colorHex = '#1976D2';
                    break;
                case 'красный':
                    colorHex = '#D32F2F';
                    break;
                case 'фиолетовый':
                    colorHex = '#7B1FA2';
                    break;
                case 'оранжевый':
                    colorHex = '#F57C00';
                    break;
                case 'желтый':
                    colorHex = '#FBC02D';
                    break;
                case 'розовый':
                    colorHex = '#C2185B';
                    break;
                case 'бирюзовый':
                    colorHex = '#00ACC1';
                    break;
                case 'лайм':
                    colorHex = '#689F38';
                    break;
                case 'серый':
                default:
                    colorHex = '#D9D9D9';
                    break;
            }
            
            console.log('Применяем настройки площадки:', { width, length, color, colorHex });
            
            // Обновляем размеры в глобальных переменных приложения
            if (!window.app) window.app = {};
            window.app.playgroundWidth = width;
            window.app.playgroundLength = length;
            window.app.playgroundColor = color;
            
            // Флаг успешного применения
            let success = false;
            
            // Прямое использование глобальных функций
            try {
                // 1. Сначала попробуем изменить размеры
                if (typeof window.resetPlayground === 'function') {
                    window.resetPlayground(width, length);
                    success = true;
                }
                
                // 2. Затем попробуем изменить цвет
                if (typeof window.changePlaygroundColor === 'function') {
                    window.changePlaygroundColor(colorHex, color);
                }
            } catch (directError) {
                console.error("Ошибка при прямом вызове функций:", directError);
            }
            
            // Если прямой подход не сработал, попробуем через импорт
            if (!success) {
                try {                    
                    // Импортируем модули
                    const playgroundModule = await import('./playground/playgroundCore.js');
                    const creatorModule = await import('./playground/playgroundCreator.js');
                    
                    // Создаем новую площадку
                    if (creatorModule.createSimplePlayground) {
                        creatorModule.createSimplePlayground(width, length, color);
                        success = true;
                    } else if (playgroundModule.resetPlayground) {
                        // Или хотя бы изменяем размеры
                        playgroundModule.resetPlayground(width, length);
                        success = true;
                    }
                } catch (importError) {
                    console.error("Ошибка при импорте модулей:", importError);
                }
            }
            
            // Запасной вариант - обновляем ground напрямую
            if (!success) {                
                // Ищем ground всеми возможными способами
                const ground = 
                    (window.app && window.app.ground) || 
                    (window.ground) || 
                    (window.scene && window.scene.getObjectByName('main_surface')) ||
                    document.querySelector('*[data-type="ground"]');
                
                if (ground) {
                    // Если нашли ground, меняем его размеры и цвет
                    if (ground.scale) {
                        ground.scale.x = width / (ground.userData.originalWidth || 40);
                        ground.scale.z = length / (ground.userData.originalDepth || 30);
                    }
                    
                    // Меняем цвет
                    if (ground.material) {
                        if (Array.isArray(ground.material)) {
                            ground.material.forEach(mat => {
                                if (mat.color) {
                                    mat.color.set(colorHex);
                                    mat.needsUpdate = true;
                                }
                            });
                        } else if (ground.material.color) {
                            ground.material.color.set(colorHex);
                            ground.material.needsUpdate = true;
                        }
                    }
                    
                    // Обновляем userData
                    if (ground.userData) {
                        ground.userData.groundColor = color;
                    }
                    
                    success = true;
                }
            }
            
            // Обновляем глобальные переменные для проверки границ площадки
            window.selectedPlaygroundWidth = width;
            window.selectedPlaygroundLength = length;
            
            // Проверяем все объекты на соответствие новым границам площадки
            try {
                const { checkAllObjectsPositions } = await import('./objects.js');
                checkAllObjectsPositions();
            } catch (error) {
                console.error('Ошибка при проверке позиций объектов:', error);
            }
            
            // Обновляем метки размеров и статус
            const widthLabel = document.getElementById('widthLabel');
            const lengthLabel = document.getElementById('lengthLabel');
            const playgroundStatus = document.getElementById('playgroundStatus');
            
            if (widthLabel) widthLabel.textContent = `${width}м`;
            if (lengthLabel) lengthLabel.textContent = `${length}м`;
            if (playgroundStatus) playgroundStatus.textContent = `Площадка: ${width}м × ${length}м`;
            
            // Показываем уведомление
            this.showNotification(`Настройки площадки применены: ${width}м × ${length}м, цвет: ${color}`);
            
            // Закрываем модальное окно
            this.close();
            
            // Вызываем событие изменения размеров площадки для обновления других модулей
            const event = new CustomEvent('playgroundChanged', {
                detail: { width, length, color, colorHex }
            });
            document.dispatchEvent(event);
            
        } catch (error) {
            console.error('Ошибка при применении настроек площадки:', error);
            this.showNotification('Ошибка при применении настроек площадки');
        }
    },
    
    /**
     * Отображение уведомления
     */
    showNotification: function(message, duration = 3000) {
        let notification = document.getElementById('pgNotification');
        
        // Если уведомление не существует, создаем его
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'pgNotification';
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            notification.style.color = 'white';
            notification.style.padding = '10px 20px';
            notification.style.borderRadius = '5px';
            notification.style.zIndex = '10000';
            notification.style.transition = 'opacity 0.3s ease';
            notification.style.opacity = '0';
            document.body.appendChild(notification);
        }
        
        // Устанавливаем текст и показываем уведомление
        notification.textContent = message;
        notification.style.opacity = '1';
        
        // Скрываем уведомление через указанное время
        setTimeout(() => {
            notification.style.opacity = '0';
        }, duration);
    }
};

// Инициализируем модальное окно при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Даем время для загрузки всего контента
    setTimeout(() => {
        PlaygroundModal.init();
        
        // Устанавливаем обработчик события изменения площадки
        document.addEventListener('playgroundChanged', function(e) {            
            // Обновляем значения в модальном окне, если оно существует
            const widthInput = document.getElementById('pgWidthInput');
            const lengthInput = document.getElementById('pgLengthInput');
            
            if (widthInput && e.detail.width) {
                widthInput.value = e.detail.width;
            }
            
            if (lengthInput && e.detail.length) {
                lengthInput.value = e.detail.length;
            }
            
            // Обновляем выбранный цвет, если передан
            if (e.detail.color) {
                const colorSquares = document.querySelectorAll('.pg-color-square');
                colorSquares.forEach(square => {
                    if (square.getAttribute('data-color') === e.detail.color) {
                        // Сначала снимаем выделение со всех квадратов
                        colorSquares.forEach(s => s.classList.remove('selected'));
                        // Выделяем нужный квадрат
                        square.classList.add('selected');
                    }
                });
            }
        });
        
        // Создаем глобальные функции для доступа из других модулей
        window.applyPlaygroundChanges = async function(width, length, colorHex) {
            console.log('Вызвана глобальная функция applyPlaygroundChanges:', { width, length, colorHex });
            
            try {
                // Обновляем глобальные переменные для проверки границ площадки
                window.selectedPlaygroundWidth = width;
                window.selectedPlaygroundLength = length;
                
                // Вызываем новую функцию setPlaygroundParams, если она доступна
                if (typeof window.setPlaygroundParams === 'function') {
                    // Определяем название цвета по hex-коду
                    let colorName = 'серый';
                    if (colorHex === '#100F0F') colorName = 'черный';
                    else if (colorHex === '#2E7D32') colorName = 'зеленый';
                    else if (colorHex === '#5D4037') colorName = 'коричневый';
                    
                    return await window.setPlaygroundParams(width, length, colorName);
                }
                
                // Запасной вариант - использовать прямые импорты
                const playgroundModule = await import('./playground/playgroundCore.js');
                playgroundModule.resetPlayground(width, length);
                
                // Обновляем цвет
                if (playgroundModule.ground) {
                    playgroundModule.ground.userData.groundColor = colorHex;
                    
                    if (playgroundModule.ground.material) {
                        if (Array.isArray(playgroundModule.ground.material)) {
                            playgroundModule.ground.material.forEach(mat => {
                                if (mat.color) {
                                    mat.color.set(colorHex);
                                    mat.needsUpdate = true;
                                }
                            });
                        } else if (playgroundModule.ground.material.color) {
                            playgroundModule.ground.material.color.set(colorHex);
                            playgroundModule.ground.material.needsUpdate = true;
                        }
                    }
                }
                
                // Обновляем глобальные переменные
                playgroundModule.updatePlaygroundDimensions(width, length);
                
                // Проверяем все объекты на соответствие новым границам площадки
                const { checkAllObjectsPositions } = await import('./objects.js');
                checkAllObjectsPositions();
                
                return true;
            } catch (error) {
                console.error('Ошибка в глобальной функции applyPlaygroundChanges:', error);
                
                // Попробуем через глобальный объект app
                if (window.app && window.app.resetPlayground) {
                    window.app.resetPlayground(width, length);
                    
                    if (window.app.ground) {
                        window.app.ground.userData.groundColor = colorHex;
                        
                        if (window.app.ground.material) {
                            if (Array.isArray(window.app.ground.material)) {
                                window.app.ground.material.forEach(mat => {
                                    if (mat.color) mat.color.set(colorHex);
                                });
                            } else if (window.app.ground.material.color) {
                                window.app.ground.material.color.set(colorHex);
                            }
                        }
                    }
                    
                    // Проверяем все объекты на соответствие новым границам площадки
                    try {
                        const { checkAllObjectsPositions } = await import('./objects.js');
                        checkAllObjectsPositions();
                    } catch (checkError) {
                        console.error('Ошибка при проверке позиций объектов:', checkError);
                    }
                    
                    return true;
                }
                
                return false;
            }
        };
    }, 1000);
});