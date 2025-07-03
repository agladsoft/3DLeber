/**
 * Модуль для управления preloader'ом холодного запуска Three.js
 */

class ColdStartPreloader {
    constructor() {
        this.preloader = null;
        this.progressFill = null;
        this.progressPercentage = null;
        this.currentProgress = 0;
        this.isVisible = true;
        this.steps = [
            { name: 'Инициализация модулей...', duration: 300 },
            { name: 'Загрузка Three.js...', duration: 800 },
            { name: 'Настройка рендерера...', duration: 400 },
            { name: 'Создание сцены...', duration: 300 },
            { name: 'Загрузка текстур...', duration: 500 },
            { name: 'Инициализация освещения...', duration: 200 },
            { name: 'Настройка камеры...', duration: 200 },
            { name: 'Финализация...', duration: 300 }
        ];
        this.currentStep = 0;
        this.stepProgress = 0;
    }

    /**
     * Инициализирует preloader (без показа)
     */
    init() {
        this.preloader = document.getElementById('coldStartPreloader');
        this.progressFill = this.preloader?.querySelector('.progress-fill');
        this.progressPercentage = this.preloader?.querySelector('.progress-percentage');
        
        if (!this.preloader) {
            console.warn('Cold start preloader element not found');
            return;
        }

        // НЕ показываем preloader автоматически
        // Он будет показан только при вызове showAndStart()
        this.hide();
    }

    /**
     * Показывает preloader и запускает процесс загрузки
     */
    showAndStart() {
        if (!this.preloader) {
            console.warn('Cold start preloader not initialized');
            return;
        }

        // Сбрасываем прогресс
        this.currentProgress = 0;
        this.currentStep = 0;
        this.stepProgress = 0;

        // Показываем preloader
        this.show();
        
        // Запускаем автоматическую загрузку
        this.startAutoProgress();
    }

    /**
     * Показывает preloader
     */
    show() {
        if (this.preloader) {
            this.preloader.classList.remove('hidden', 'removing');
            // Принудительно показываем preloader
            this.preloader.style.opacity = '1';
            this.preloader.style.visibility = 'visible';
            this.preloader.style.pointerEvents = 'auto';
            this.isVisible = true;
        }
    }

    /**
     * Скрывает preloader с анимацией
     */
    hide() {
        if (this.preloader) {
            this.preloader.classList.add('removing');
            this.isVisible = false;
            
            // Полностью скрываем после анимации
            setTimeout(() => {
                if (this.preloader) {
                    this.preloader.classList.add('hidden');
                    this.preloader.style.opacity = '0';
                    this.preloader.style.visibility = 'hidden';
                    this.preloader.style.pointerEvents = 'none';
                }
            }, 800);
        }
    }

    /**
     * Обновляет прогресс загрузки
     * @param {number} progress - Прогресс от 0 до 100
     * @param {string} text - Текст текущего действия
     */
    updateProgress(progress, text = null) {
        this.currentProgress = Math.min(100, Math.max(0, progress));
        
        if (this.progressFill) {
            this.progressFill.style.width = `${this.currentProgress}%`;
        }
        
        if (this.progressPercentage) {
            this.progressPercentage.textContent = `${Math.round(this.currentProgress)}%`;
        }
        
        if (text && this.preloader) {
            const textElement = this.preloader.querySelector('.cold-start-subtext');
            if (textElement) {
                textElement.textContent = text;
            }
        }
        
        // Автоматически скрываем при 100%
        if (this.currentProgress >= 100) {
            setTimeout(() => this.hide(), 200);
        }
    }

    /**
     * Запускает автоматический прогресс по шагам
     */
    startAutoProgress() {
        this.processNextStep();
    }

    /**
     * Обрабатывает следующий шаг загрузки
     */
    processNextStep() {
        if (this.currentStep >= this.steps.length) {
            this.updateProgress(100, 'Готово!');
            return;
        }

        const step = this.steps[this.currentStep];
        const startProgress = (this.currentStep / this.steps.length) * 100;
        const endProgress = ((this.currentStep + 1) / this.steps.length) * 100;
        
        // Обновляем текст
        this.updateProgress(startProgress, step.name);
        
        // Плавно увеличиваем прогресс
        const progressInterval = setInterval(() => {
            this.stepProgress += 2;
            const currentProgress = startProgress + (this.stepProgress / 100) * (endProgress - startProgress);
            
            this.updateProgress(currentProgress, step.name);
            
            if (this.stepProgress >= 100) {
                clearInterval(progressInterval);
                this.stepProgress = 0;
                this.currentStep++;
                
                // Переходим к следующему шагу с небольшой задержкой
                setTimeout(() => this.processNextStep(), 50);
            }
        }, step.duration / 50);
    }

    /**
     * Устанавливает кастомные шаги загрузки
     * @param {Array} steps - Массив объектов с name и duration
     */
    setSteps(steps) {
        this.steps = steps;
        this.currentStep = 0;
        this.stepProgress = 0;
    }

    /**
     * Форсированно завершает загрузку
     */
    forceComplete() {
        this.currentStep = this.steps.length;
        this.updateProgress(100, 'Готово!');
    }
}

// Создаем глобальный экземпляр
const coldStartPreloader = new ColdStartPreloader();

// Экспортируем функции для использования
export function initColdStartPreloader() {
    coldStartPreloader.init();
}

export function showColdStartPreloader() {
    coldStartPreloader.showAndStart();
}

export function hideColdStartPreloader() {
    coldStartPreloader.hide();
}

export function updateColdStartProgress(progress, text) {
    coldStartPreloader.updateProgress(progress, text);
}

export function setColdStartSteps(steps) {
    coldStartPreloader.setSteps(steps);
}

export function completeColdStart() {
    coldStartPreloader.forceComplete();
}

// Автоматически инициализируем при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initColdStartPreloader();
    });
} else {
    // DOM уже загружен
    initColdStartPreloader();
}

export default coldStartPreloader;