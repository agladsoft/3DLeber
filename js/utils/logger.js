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
        console.error('Ошибка ротации лог файла:', error);
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
} 