import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем директорию для логов если её нет
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const errorLogPath = path.join(logsDir, 'error.log');
const accessLogPath = path.join(logsDir, 'access.log');
const auditLogPath = path.join(logsDir, 'audit.log');
const apiLogPath = path.join(logsDir, 'api.log');
const databaseLogPath = path.join(logsDir, 'database.log');
const securityLogPath = path.join(logsDir, 'security.log');
const systemLogPath = path.join(logsDir, 'system.log');

/**
 * Форматирует сообщение для логирования
 */
function formatLogMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level,
        message,
        ...metadata
    };
    
    return JSON.stringify(logEntry) + '\n';
}

/**
 * Записывает лог в файл
 */
function writeToFile(filePath, content) {
    try {
        fs.appendFileSync(filePath, content);
    } catch (error) {
        console.error('Ошибка записи в лог файл:', error);
    }
}

/**
 * Ротация лог файла если он больше 10МБ
 */
function rotateLogFile(filePath) {
    try {
        // Проверяем существует ли файл
        if (!fs.existsSync(filePath)) {
            return; // Файл не существует, ротация не нужна
        }
        
        const stats = fs.statSync(filePath);
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (stats.size > maxSize) {
            const backupPath = filePath + '.' + Date.now() + '.bak';
            fs.renameSync(filePath, backupPath);
            
            // Удаляем старые бэкапы (оставляем только 5 последних)
            const dir = path.dirname(filePath);
            const baseName = path.basename(filePath);
            const backupFiles = fs.readdirSync(dir)
                .filter(file => file.startsWith(baseName + '.') && file.endsWith('.bak'))
                .sort()
                .reverse();
            
            if (backupFiles.length > 5) {
                backupFiles.slice(5).forEach(file => {
                    fs.unlinkSync(path.join(dir, file));
                });
            }
        }
    } catch (error) {
        // Игнорируем ошибки ротации, не критично
        // console.error('Ошибка ротации лог файла:', error);
    }
}

/**
 * Логирует ошибку
 */
export function logError(error, metadata = {}) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    const logContent = formatLogMessage('ERROR', message, {
        ...metadata,
        stack,
        userAgent: metadata.userAgent,
        ip: metadata.ip,
        url: metadata.url,
        method: metadata.method
    });
    
    rotateLogFile(errorLogPath);
    writeToFile(errorLogPath, logContent);
    
    // Также выводим в консоль для разработки
    console.error('ERROR:', message, metadata);
}

/**
 * Логирует предупреждение
 */
export function logWarning(message, metadata = {}) {
    const logContent = formatLogMessage('WARNING', message, metadata);
    
    rotateLogFile(errorLogPath);
    writeToFile(errorLogPath, logContent);
    
    console.warn('WARNING:', message, metadata);
}

/**
 * Логирует информационное сообщение
 */
export function logInfo(message, metadata = {}) {
    const logContent = formatLogMessage('INFO', message, metadata);
    
    rotateLogFile(accessLogPath);
    writeToFile(accessLogPath, logContent);
    
    console.log('INFO:', message, metadata);
}

/**
 * Логирует обращение к API
 */
export function logApiAccess(req, res, responseTime) {
    const logContent = formatLogMessage('ACCESS', `${req.method} ${req.originalUrl}`, {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        responseTime: responseTime + 'ms',
        contentLength: res.get('Content-Length')
    });
    
    rotateLogFile(accessLogPath);
    writeToFile(accessLogPath, logContent);
}

/**
 * Middleware для логирования всех запросов
 */
export function accessLogMiddleware(req, res, next) {
    const start = Date.now();
    
    // Перехватываем конец ответа
    const originalEnd = res.end;
    res.end = function(...args) {
        const responseTime = Date.now() - start;
        logApiAccess(req, res, responseTime);
        originalEnd.apply(res, args);
    };
    
    next();
}

/**
 * Middleware для обработки ошибок
 */
export function errorHandlerMiddleware(err, req, res, next) {
    // Логируем ошибку
    logError(err, {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        body: req.body,
        query: req.query,
        params: req.params
    });
    
    // Отправляем ошибку клиенту
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Внутренняя ошибка сервера' 
            : err.message,
        timestamp: new Date().toISOString()
    });
}

/**
 * Активные пользователи для мониторинга
 */
const activeUsers = new Map();
const USER_TIMEOUT = 5 * 60 * 1000; // 5 минут

/**
 * Логирует пользовательские действия (аудит)
 */
export function logUserAction(userId, action, details = {}) {
    // Обновляем активность пользователя
    updateUserActivity(userId, details.ip, details.userAgent);
    
    const logContent = formatLogMessage('AUDIT', action, {
        userId,
        ip: details.ip,
        userAgent: details.userAgent,
        sessionId: details.sessionId,
        ...details
    });
    
    rotateLogFile(auditLogPath);
    writeToFile(auditLogPath, logContent);
    
    console.log('USER ACTION:', action, { userId, ...details });
}

/**
 * Детальное логирование API запросов
 */
export function logApiRequest(req, res, responseTime, requestBody, responseBody) {
    const logContent = formatLogMessage('API', `${req.method} ${req.originalUrl}`, {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        responseTime: responseTime + 'ms',
        requestHeaders: req.headers,
        requestBody: sanitizeRequestBody(requestBody),
        responseBody: sanitizeResponseBody(responseBody),
        contentLength: res.get('Content-Length'),
        referer: req.get('Referer')
    });
    
    rotateLogFile(apiLogPath);
    writeToFile(apiLogPath, logContent);
}

/**
 * Логирование операций с базой данных
 */
export function logDatabaseOperation(operation, query, params, result, executionTime, error = null) {
    const logContent = formatLogMessage('DATABASE', operation, {
        query: query.substring(0, 500), // Ограничиваем длину запроса
        params: params ? JSON.stringify(params).substring(0, 200) : null,
        executionTime: executionTime + 'ms',
        rowsAffected: result ? result.rowCount : null,
        error: error ? error.message : null,
        timestamp: new Date().toISOString()
    });
    
    rotateLogFile(databaseLogPath);
    writeToFile(databaseLogPath, logContent);
    
    if (error) {
        console.error('DATABASE ERROR:', operation, error.message);
    }
}

/**
 * Логирование событий безопасности
 */
export function logSecurityEvent(eventType, details = {}) {
    const logContent = formatLogMessage('SECURITY', eventType, {
        ip: details.ip,
        userAgent: details.userAgent,
        url: details.url,
        method: details.method,
        payload: details.payload ? JSON.stringify(details.payload).substring(0, 200) : null,
        severity: details.severity || 'medium',
        blocked: details.blocked || false,
        ...details
    });
    
    rotateLogFile(securityLogPath);
    writeToFile(securityLogPath, logContent);
    
    console.warn('SECURITY EVENT:', eventType, details);
}

/**
 * Логирование системных метрик
 */
export function logSystemMetrics(metrics) {
    const logContent = formatLogMessage('SYSTEM', 'metrics', {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        activeUsers: activeUsers.size,
        uptime: process.uptime(),
        ...metrics
    });
    
    rotateLogFile(systemLogPath);
    writeToFile(systemLogPath, logContent);
}

/**
 * Обновляет активность пользователя
 */
function updateUserActivity(userId, ip, userAgent) {
    if (!userId) return;
    
    activeUsers.set(userId, {
        lastActivity: Date.now(),
        ip: ip,
        userAgent: userAgent,
        sessionStart: activeUsers.has(userId) ? activeUsers.get(userId).sessionStart : Date.now()
    });
    
    // Очищаем неактивных пользователей
    cleanupInactiveUsers();
}

/**
 * Очистка неактивных пользователей
 */
function cleanupInactiveUsers() {
    const now = Date.now();
    for (const [userId, data] of activeUsers.entries()) {
        if (now - data.lastActivity > USER_TIMEOUT) {
            logUserAction(userId, 'session_timeout', {
                sessionDuration: now - data.sessionStart,
                ip: data.ip
            });
            activeUsers.delete(userId);
        }
    }
}

/**
 * Получить статистику активных пользователей
 */
export function getActiveUsersStats() {
    cleanupInactiveUsers();
    
    const stats = {
        totalActive: activeUsers.size,
        users: Array.from(activeUsers.entries()).map(([userId, data]) => ({
            userId,
            lastActivity: new Date(data.lastActivity).toISOString(),
            sessionDuration: Date.now() - data.sessionStart,
            ip: data.ip
        }))
    };
    
    return stats;
}

/**
 * Санитизация тела запроса для логирования
 */
function sanitizeRequestBody(body) {
    if (!body) return null;
    
    // Создаем копию объекта
    const sanitized = JSON.parse(JSON.stringify(body));
    
    // Удаляем чувствительные данные
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    function removeSensitiveData(obj) {
        if (typeof obj !== 'object' || obj === null) return;
        
        for (const key in obj) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
                removeSensitiveData(obj[key]);
            }
        }
    }
    
    removeSensitiveData(sanitized);
    return JSON.stringify(sanitized).substring(0, 1000); // Ограничиваем размер
}

/**
 * Санитизация ответа для логирования
 */
function sanitizeResponseBody(body) {
    if (!body) return null;
    return JSON.stringify(body).substring(0, 1000); // Ограничиваем размер
}

/**
 * Обработчик необработанных исключений
 */
export function setupGlobalErrorHandlers() {
    // Необработанные исключения
    process.on('uncaughtException', (error) => {
        logError(error, {
            type: 'uncaughtException',
            fatal: true
        });
        
        console.error('Необработанное исключение:', error);
        process.exit(1);
    });
    
    // Необработанные промисы
    process.on('unhandledRejection', (reason, promise) => {
        logError(reason, {
            type: 'unhandledRejection',
            promise: promise.toString()
        });
        
        console.error('Необработанный отказ промиса:', reason);
    });
    
    // Периодическое логирование системных метрик
    setInterval(() => {
        logSystemMetrics({
            timestamp: new Date().toISOString()
        });
    }, 60000); // Каждую минуту
} 