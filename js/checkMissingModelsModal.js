/**
 * Модуль управления модальным окном проверки отсутствующих моделей
 */
import { API_BASE_URL } from './api/serverConfig.js';
import { showSafeNotification, stripHtml, createSafeElement } from './utils/security.js';

/**
 * Отображает модальное окно проверки отсутствующих моделей
 */
export async function showCheckMissingModelsModal() {
    const modal = document.getElementById('missingModelsModal');
    if (!modal) {
        console.error('Missing models modal not found');
        return;
    }

    // Показываем модальное окно
    modal.style.display = 'block';
    
    // Активируем кнопку (делаем её оранжевой)
    setButtonActiveState(true);
    
    // Устанавливаем обработчики закрытия если еще не установлены
    setupModalEventHandlers();
    
    // Загружаем данные о отсутствующих моделях
    const result = await loadMissingModelsData();
    
    // Обновляем индикатор на кнопке
    if (result) {
        setMissingModelsIndicator(result.hasMissing || false);
    }
}

/**
 * Скрывает модальное окно проверки отсутствующих моделей
 */
export function hideCheckMissingModelsModal() {
    const modal = document.getElementById('missingModelsModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // Деактивируем кнопку (убираем оранжевый цвет)
    setButtonActiveState(false);
}

/**
 * Настраивает обработчики событий для модального окна
 */
function setupModalEventHandlers() {
    const modal = document.getElementById('missingModelsModal');
    const closeButton = document.getElementById('missingModelsCloseButton');
    const reportButton = document.getElementById('reportMissingModelsButton');
    
    // Обработчик для кнопки закрытия
    if (closeButton && !closeButton.hasAttribute('data-handler-added')) {
        closeButton.addEventListener('click', hideCheckMissingModelsModal);
        closeButton.setAttribute('data-handler-added', 'true');
    }
    
    // Обработчик для кнопки отправки отчета администрации
    if (reportButton && !reportButton.hasAttribute('data-handler-added')) {
        reportButton.addEventListener('click', handleReportToAdmin);
        reportButton.setAttribute('data-handler-added', 'true');
    }
    
    // Обработчик клика по фону модального окна
    if (modal && !modal.hasAttribute('data-handler-added')) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                hideCheckMissingModelsModal();
            }
        });
        modal.setAttribute('data-handler-added', 'true');
    }
    
    // Обработчик нажатия ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideCheckMissingModelsModal();
        }
    });
}

/**
 * Загружает и отображает данные о отсутствующих моделях
 */
async function loadMissingModelsData() {
    const listContainer = document.getElementById('missingModelsList');
    const totalCountEl = document.getElementById('totalModelsCount');
    const missingCountEl = document.getElementById('missingModelsCount');
    const foundCountEl = document.getElementById('foundModelsCount');
    
    if (!listContainer) {
        console.error('Missing models list container not found');
        return;
    }
    
    try {
        // Показываем индикатор загрузки
        listContainer.innerHTML = `
            <div class="missing-models-loading">
                <div class="loading-spinner"></div>
                <span>Проверка моделей...</span>
            </div>
        `;
        
        // Получаем данные моделей из sessionStorage
        const models = JSON.parse(sessionStorage.getItem('models') || '[]');
        const userId = sessionStorage.getItem('userId');
        
        if (!models.length) {
            showNoModelsMessage();
            return { hasMissing: false, missingModels: [], stats: { total: 0, missing: 0, found: 0 } };
        }
        
        if (!userId) {
            showErrorMessage('Не найден ID пользователя');
            return { hasMissing: false, missingModels: [], stats: { total: 0, missing: 0, found: 0 } };
        }
        
        // Отправляем запрос на сервер для проверки отсутствующих моделей
        const response = await fetch(
            `${API_BASE_URL}/missing-models/${userId}?models=${encodeURIComponent(JSON.stringify(models))}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Обновляем статистику
        updateStats(data.stats, totalCountEl, missingCountEl, foundCountEl);
        
        // Отображаем результаты
        if (data.missingModels && data.missingModels.length > 0) {
            displayMissingModels(data.missingModels, listContainer);
        } else {
            showNoMissingModelsMessage(listContainer);
        }
        
        return {
            hasMissing: data.missingModels.length > 0,
            missingModels: data.missingModels,
            stats: data.stats
        };
        
    } catch (error) {
        console.error('Error loading missing models data:', error);
        showErrorMessage('Ошибка при загрузке данных о моделях: ' + error.message);
        return null;
    }
}

/**
 * Обновляет статистику в модальном окне
 */
function updateStats(stats, totalCountEl, missingCountEl, foundCountEl) {
    if (totalCountEl) totalCountEl.textContent = stats.total || 0;
    if (missingCountEl) missingCountEl.textContent = stats.missing || 0;
    if (foundCountEl) foundCountEl.textContent = stats.found || 0;
}

/**
 * Отображает список отсутствующих моделей
 */
function displayMissingModels(missingModels, container) {
    // Очищаем контейнер
    container.innerHTML = '';
    
    missingModels.forEach(model => {
        // Создаем элементы безопасно
        const modelItem = createSafeElement('div', '', { class: 'missing-model-item' });
        const modelInfo = createSafeElement('div', '', { class: 'missing-model-info' });
        const modelArticle = createSafeElement('div', stripHtml(model.article), { class: 'missing-model-article' });
        
        modelInfo.appendChild(modelArticle);
        
        if (model.name) {
            const modelName = createSafeElement('div', stripHtml(model.name), { class: 'missing-model-name' });
            modelInfo.appendChild(modelName);
        }
        
        const modelStatus = createSafeElement('div', '', { class: 'missing-model-status' });
        
        if (model.missingInFolder) {
            const folderBadge = createSafeElement('span', 'Нет в папке', { class: 'status-badge missing-folder' });
            modelStatus.appendChild(folderBadge);
        }
        
        if (model.missingInDb) {
            const dbBadge = createSafeElement('span', 'Нет в БД', { class: 'status-badge missing-db' });
            modelStatus.appendChild(dbBadge);
        }
        
        modelItem.appendChild(modelInfo);
        modelItem.appendChild(modelStatus);
        container.appendChild(modelItem);
    });
}

/**
 * Показывает сообщение об отсутствии отсутствующих моделей
 */
function showNoMissingModelsMessage(container) {
    container.innerHTML = `
        <div class="no-missing-models">
            <div class="success-icon">✅</div>
            <h4>Все модели найдены!</h4>
            <p>Все модели из списка присутствуют в папке и базе данных.</p>
        </div>
    `;
}

/**
 * Показывает сообщение об отсутствии моделей
 */
function showNoModelsMessage() {
    const listContainer = document.getElementById('missingModelsList');
    if (listContainer) {
        listContainer.innerHTML = `
            <div class="no-missing-models">
                <div class="success-icon">ℹ️</div>
                <h4>Нет данных о моделях</h4>
                <p>Список моделей пуст или не загружен.</p>
            </div>
        `;
    }
}

/**
 * Показывает сообщение об ошибке
 */
function showErrorMessage(message) {
    const listContainer = document.getElementById('missingModelsList');
    if (listContainer) {
        // Очищаем контейнер
        listContainer.innerHTML = '';
        
        // Создаем элементы безопасно
        const errorContainer = createSafeElement('div', '', { 
            class: 'no-missing-models',
            style: 'color: #dc3545;'
        });
        
        const errorIcon = createSafeElement('div', '❌', { class: 'success-icon' });
        const errorTitle = createSafeElement('h4', 'Произошла ошибка');
        const errorMessage = createSafeElement('p', stripHtml(message));
        
        errorContainer.appendChild(errorIcon);
        errorContainer.appendChild(errorTitle);
        errorContainer.appendChild(errorMessage);
        listContainer.appendChild(errorContainer);
    }
}

/**
 * Проверяет наличие отсутствующих моделей без отображения модального окна
 * @returns {Promise<{hasMissing: boolean, missingModels: Array, stats: Object}>}
 */
export async function checkMissingModelsQuiet() {
    try {
        // Получаем данные моделей из sessionStorage
        const models = JSON.parse(sessionStorage.getItem('models') || '[]');
        const userId = sessionStorage.getItem('userId');
        
        if (!models.length || !userId) {
            return { hasMissing: false, missingModels: [], stats: { total: 0, missing: 0, found: 0 } };
        }
        
        // Отправляем запрос на сервер для проверки отсутствующих моделей
        const response = await fetch(
            `${API_BASE_URL}/missing-models/${userId}?models=${encodeURIComponent(JSON.stringify(models))}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            }
        );
        
        if (!response.ok) {
            console.error('Failed to check missing models:', response.status);
            return { hasMissing: false, missingModels: [], stats: { total: 0, missing: 0, found: 0 } };
        }
        
        const data = await response.json();
        
        return {
            hasMissing: data.missingModels.length > 0,
            missingModels: data.missingModels,
            stats: data.stats
        };
        
    } catch (error) {
        console.error('Error checking missing models quietly:', error);
        return { hasMissing: false, missingModels: [], stats: { total: 0, missing: 0, found: 0 } };
    }
}

/**
 * Автоматически показывает модальное окно если есть отсутствующие модели
 */
let autoCheckInProgress = false;

export async function autoCheckAndShowMissingModels() {
    if (autoCheckInProgress) {
        console.log('autoCheckAndShowMissingModels already in progress, skipping...');
        return { hasMissing: false, missingModels: [], stats: { total: 0, missing: 0, found: 0 } };
    }
    
    autoCheckInProgress = true;    
    try {
        const result = await checkMissingModelsQuiet();
        
        // Устанавливаем индикатор на кнопке
        setMissingModelsIndicator(result.hasMissing);
        
        if (result.hasMissing) {
            console.log('Found missing models, showing modal automatically:', result.missingModels);
            await showCheckMissingModelsModal();
        }
        
        return result;
    } finally {
        setTimeout(() => {
            autoCheckInProgress = false;
            console.log('autoCheckAndShowMissingModels completed, flag reset');
        }, 500);
    }
}

/**
 * Устанавливает или убирает индикатор отсутствующих моделей на кнопке
 * @param {boolean} hasMissing - есть ли отсутствующие модели
 */
function setMissingModelsIndicator(hasMissing) {
    const button = document.getElementById('checkMissingModelsButton');
    if (button) {
        if (hasMissing) {
            button.classList.add('has-missing-models');
        } else {
            button.classList.remove('has-missing-models');
        }
    }
}

/**
 * Устанавливает активное состояние кнопки
 * @param {boolean} isActive - активна ли кнопка
 */
function setButtonActiveState(isActive) {
    const button = document.getElementById('checkMissingModelsButton');
    if (button) {
        if (isActive) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }
}

/**
 * Обработчик для кнопки отправки отчета администрации
 */
async function handleReportToAdmin() {
    const reportButton = document.getElementById('reportMissingModelsButton');
    
    if (!reportButton) {
        console.error('Report button not found');
        return;
    }
    
    try {
        setButtonLoadingState(reportButton, true);
        
        const reportData = await collectReportData();
        
        if (!reportData.missingModels || reportData.missingModels.length === 0) {
            showNotification('Нет отсутствующих моделей для отправки', 'info');
            setButtonLoadingState(reportButton, false);
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/send-missing-models-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reportData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        showNotification('Отчет успешно отправлен администрации!', 'success');
        setButtonSuccessState(reportButton);
        
    } catch (error) {
        console.error('Ошибка при отправке отчета:', error);
        showNotification(`Ошибка при отправке отчета: ${error.message}`, 'error');
        setButtonLoadingState(reportButton, false);
    }
}

/**
 * Собирает данные для отправки отчета
 */
async function collectReportData() {
    const userId = sessionStorage.getItem('userId');
    const models = JSON.parse(sessionStorage.getItem('models') || '[]');
    const missingModelsResult = await checkMissingModelsQuiet();
    
    const projectInfo = {
        playgroundSize: getPlaygroundSizeInfo(),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
    };
    
    return {
        userId: userId,
        missingModels: missingModelsResult.missingModels || [],
        stats: missingModelsResult.stats || { total: 0, missing: 0, found: 0 },
        projectInfo: projectInfo,
        userEmail: null
    };
}

/**
 * Получает информацию о размере площадки
 */
function getPlaygroundSizeInfo() {
    const widthInput = document.getElementById('widthInput') || document.getElementById('pgWidthInput');
    const lengthInput = document.getElementById('lengthInput') || document.getElementById('pgLengthInput');
    
    if (widthInput && lengthInput) {
        return `${widthInput.value || 'не указано'} x ${lengthInput.value || 'не указано'} м`;
    }
    
    return 'Размер не определен';
}

/**
 * Устанавливает состояние загрузки для кнопки
 */
function setButtonLoadingState(button, isLoading) {
    if (isLoading) {
        button.classList.add('sending');
        button.disabled = true;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            Отправка отчета...
        `;
    } else {
        button.classList.remove('sending');
        button.disabled = false;
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Отправить отчет администрации
        `;
    }
}

/**
 * Устанавливает состояние успешной отправки для кнопки
 */
function setButtonSuccessState(button) {
    button.classList.remove('sending');
    button.classList.add('success');
    button.disabled = true;
    button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Отчет отправлен!
    `;
    
    setTimeout(() => {
        setButtonLoadingState(button, false);
        button.classList.remove('success');
    }, 5000);
}

/**
 * Показывает уведомление пользователю
 */
function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Используем безопасную функцию для отображения уведомлений
    showSafeNotification(notification, message, type);
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
} 