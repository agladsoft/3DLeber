/**
 * Модуль управления модальным окном помощи
 * Расширенная версия с навигацией по разделам и множественными видео
 */

/**
 * Инициализация модального окна помощи
 */
export function initHelpModal() {
    const helpButton = document.getElementById('helpButton');
    const helpModal = document.getElementById('helpModal');
    const helpCloseButton = document.getElementById('helpCloseButton');

    if (!helpButton || !helpModal || !helpCloseButton) {
        console.error('Help modal elements not found');
        return;
    }

    // Обработчик открытия модального окна помощи
    helpButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        showHelpModal();
    });

    // Обработчик закрытия модального окна по кнопке
    helpCloseButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        hideHelpModal();
    });

    // Обработчик закрытия модального окна по клику на фон
    helpModal.addEventListener('click', function(e) {
        if (e.target === helpModal) {
            hideHelpModal();
        }
    });

    // Обработчик закрытия по клавише Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && helpModal.style.display === 'block') {
            hideHelpModal();
        }
    });

    // Инициализация навигации по разделам
    initHelpNavigation();
}

/**
 * Инициализация навигации по разделам помощи
 */
function initHelpNavigation() {
    const navButtons = document.querySelectorAll('.help-nav-btn');
    const sections = document.querySelectorAll('.help-section');

    navButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const targetSection = this.getAttribute('data-section');
            
            // Останавливаем все видео перед переключением
            pauseAllVideos();
            
            // Убираем активный класс со всех кнопок и разделов
            navButtons.forEach(btn => btn.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Добавляем активный класс к текущей кнопке и разделу
            this.classList.add('active');
            const targetSectionElement = document.querySelector(`.help-section[data-section="${targetSection}"]`);
            if (targetSectionElement) {
                targetSectionElement.classList.add('active');
            }
        });
    });
}

/**
 * Останавливает все видео в модальном окне помощи
 */
function pauseAllVideos() {
    const videos = document.querySelectorAll('#helpModal video');
    videos.forEach(video => {
        video.pause();
        video.currentTime = 0;
    });
}

/**
 * Показать модальное окно помощи
 */
export function showHelpModal() {
    const helpModal = document.getElementById('helpModal');
    
    if (helpModal) {
        helpModal.style.display = 'block';
        
        // Сбрасываем все видео к началу при открытии
        const videos = document.querySelectorAll('#helpModal video');
        videos.forEach(video => {
            video.currentTime = 0;
        });
        
        // Убеждаемся, что первый раздел активен
        const firstNavButton = document.querySelector('.help-nav-btn[data-section="models"]');
        const firstSection = document.querySelector('.help-section[data-section="models"]');
        
        if (firstNavButton && firstSection) {
            // Убираем активные классы со всех элементов
            document.querySelectorAll('.help-nav-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.help-section').forEach(section => section.classList.remove('active'));
            
            // Активируем первый раздел
            firstNavButton.classList.add('active');
            firstSection.classList.add('active');
        }
    }
}

/**
 * Скрыть модальное окно помощи
 */
export function hideHelpModal() {
    const helpModal = document.getElementById('helpModal');
    
    if (helpModal) {
        helpModal.style.display = 'none';
        
        // Останавливаем все видео при закрытии
        pauseAllVideos();
    }
}