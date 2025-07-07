/**
 * Модуль валидации входных данных для серверной части
 */

/**
 * Валидирует объект сессии
 * @param {Object} sessionData - Данные сессии для валидации
 * @returns {Object} Результат валидации {isValid: boolean, errors: string[]}
 */
export function validateSessionData(sessionData) {
    const errors = [];
    
    if (!sessionData || typeof sessionData !== 'object') {
        errors.push('Session data must be an object');
        return { isValid: false, errors };
    }
    
    // Проверяем структуру quantities
    if (sessionData.quantities && typeof sessionData.quantities !== 'object') {
        errors.push('Quantities must be an object');
    }
    
    // Проверяем структуру placedObjects
    if (sessionData.placedObjects) {
        if (!Array.isArray(sessionData.placedObjects)) {
            errors.push('PlacedObjects must be an array');
        } else {
            sessionData.placedObjects.forEach((obj, index) => {
                if (!obj.modelName || typeof obj.modelName !== 'string') {
                    errors.push(`PlacedObject at index ${index} must have a valid modelName`);
                }
                if (!obj.position || typeof obj.position !== 'object') {
                    errors.push(`PlacedObject at index ${index} must have a valid position`);
                }
            });
        }
    }
    
    return { isValid: errors.length === 0, errors };
}

/**
 * Валидирует массив моделей
 * @param {Array} models - Массив моделей для валидации
 * @returns {Object} Результат валидации {isValid: boolean, errors: string[]}
 */
export function validateModelsArray(models) {
    const errors = [];
    
    if (!Array.isArray(models)) {
        errors.push('Models must be an array');
        return { isValid: false, errors };
    }
    
    models.forEach((model, index) => {
        if (!model || typeof model !== 'object') {
            errors.push(`Model at index ${index} must be an object`);
            return;
        }
        
        if (!model.article || typeof model.article !== 'string') {
            errors.push(`Model at index ${index} must have a valid article`);
        }
        
        if (model.quantity !== undefined && (!Number.isInteger(model.quantity) || model.quantity < 0)) {
            errors.push(`Model at index ${index} quantity must be a non-negative integer`);
        }
    });
    
    return { isValid: errors.length === 0, errors };
}

/**
 * Валидирует ID пользователя
 * @param {string} userId - ID пользователя
 * @returns {Object} Результат валидации {isValid: boolean, errors: string[]}
 */
export function validateUserId(userId) {
    const errors = [];
    
    if (!userId || typeof userId !== 'string') {
        errors.push('User ID must be a non-empty string');
        return { isValid: false, errors };
    }
    
    // Проверяем на безопасные символы (буквы, цифры, дефис, подчеркивание)
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
        errors.push('User ID contains invalid characters');
    }
    
    if (userId.length > 100) {
        errors.push('User ID is too long');
    }
    
    return { isValid: errors.length === 0, errors };
}

/**
 * Валидирует email адрес
 * @param {string} email - Email для валидации
 * @returns {Object} Результат валидации {isValid: boolean, errors: string[]}
 */
export function validateEmail(email) {
    const errors = [];
    
    if (!email || typeof email !== 'string') {
        errors.push('Email must be a non-empty string');
        return { isValid: false, errors };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
    }
    
    if (email.length > 254) {
        errors.push('Email is too long');
    }
    
    return { isValid: errors.length === 0, errors };
}

/**
 * Валидирует параметры запроса для отсутствующих моделей
 * @param {string} userId - ID пользователя
 * @param {string} modelsQuery - Строка JSON с моделями
 * @returns {Object} Результат валидации {isValid: boolean, errors: string[], models?: Array}
 */
export function validateMissingModelsRequest(userId, modelsQuery) {
    const errors = [];
    
    // Валидируем userId
    const userIdValidation = validateUserId(userId);
    if (!userIdValidation.isValid) {
        errors.push(...userIdValidation.errors);
    }
    
    // Валидируем и парсим модели
    let models;
    try {
        models = JSON.parse(modelsQuery || '[]');
    } catch (e) {
        errors.push('Invalid JSON in models parameter');
        return { isValid: false, errors };
    }
    
    const modelsValidation = validateModelsArray(models);
    if (!modelsValidation.isValid) {
        errors.push(...modelsValidation.errors);
    }
    
    return { 
        isValid: errors.length === 0, 
        errors,
        models: errors.length === 0 ? models : undefined
    };
}

/**
 * Санитизирует строку от потенциально опасных символов
 * @param {string} str - Строка для санитизации
 * @returns {string} Санитизированная строка
 */
export function sanitizeString(str) {
    if (typeof str !== 'string') {
        return '';
    }
    
    return str
        .replace(/[<>\"']/g, '') // Удаляем потенциально опасные символы
        .substring(0, 1000); // Ограничиваем длину
}

/**
 * Валидирует токен
 * @param {string} token - Токен для валидации
 * @returns {Object} Результат валидации {isValid: boolean, errors: string[]}
 */
export function validateToken(token) {
    const errors = [];
    
    if (!token || typeof token !== 'string') {
        errors.push('Token must be a non-empty string');
        return { isValid: false, errors };
    }
    
    // Отладочная информация
    console.log('Token validation debug:', {
        length: token.length,
        firstChars: token.substring(0, 20) + '...',
        lastChars: '...' + token.substring(token.length - 20),
        hasInvalidChars: !/^[a-zA-Z0-9._\-+=\/\\:?&%$#@!~`|;,<>[\]{}()\s]+$/.test(token)
    });
    
    // Проверяем минимальную и максимальную длину токена
    if (token.length < 10) {
        errors.push('Token is too short');
    }
    
    if (token.length > 500) {
        errors.push('Token is too long');
    }
    
    // Проверяем на безопасные символы (более мягкая проверка)
    // Разрешаем больше символов, которые могут быть в JWT или других токенах
    if (!/^[a-zA-Z0-9._\-+=\/\\:?&%$#@!~`|;,<>[\]{}()\s]+$/.test(token)) {
        errors.push('Token contains invalid characters');
        
        // Показываем какие именно символы проблематичны
        const invalidChars = token.split('').filter(char => 
            !/[a-zA-Z0-9._\-+=\/\\:?&%$#@!~`|;,<>[\]{}()\s]/.test(char)
        );
        console.log('Invalid characters found:', [...new Set(invalidChars)]);
    }
    
    return { isValid: errors.length === 0, errors };
}