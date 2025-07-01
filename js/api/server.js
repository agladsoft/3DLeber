import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { getModelsByArticles, getModelByArticle, getModelsWithSessions, getOrCreateUser, saveSession, getSession } from './db.js';
import pg from 'pg';
import { SERVER_NAME, SERVER_PORT, DB_CONFIG, API_BASE_URL } from './serverConfig.js';
import nodemailer from 'nodemailer';
import compression from 'compression';

const { Pool } = pg;

const app = express();
const PORT = SERVER_PORT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем пул подключений к базе данных с оптимизированными настройками
const pool = new Pool({
    ...DB_CONFIG,
    max: 20, // максимальное количество клиентов в пуле
    idleTimeoutMillis: 30000, // время ожидания перед закрытием неактивного соединения
    connectionTimeoutMillis: 2000, // время ожидания подключения
});

// Добавляем middleware для оптимизации
app.use(compression()); // Сжатие ответов
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Увеличиваем лимит для JSON

// Кэш для сессий на уровне сервера
const sessionCache = new Map();
const SESSION_CACHE_TTL = 5000; // 5 секунд

// Функция для кэширования сессий
function getCachedSession(userId) {
    const cached = sessionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < SESSION_CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCachedSession(userId, data) {
    sessionCache.set(userId, {
        data,
        timestamp: Date.now()
    });
    
    // Ограничиваем размер кэша
    if (sessionCache.size > 100) {
        const firstKey = sessionCache.keys().next().value;
        sessionCache.delete(firstKey);
    }
}

function invalidateCachedSession(userId) {
    sessionCache.delete(userId);
}

const modelsDir = path.join(__dirname, '..', 'models');

// Логирование для отладки
console.log('Server __dirname:', __dirname);
console.log('Models directory path:', modelsDir);
console.log('Models directory exists:', fs.existsSync(modelsDir));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Проверяем подключение к базе данных
        await pool.query('SELECT 1');
        
        // Проверяем доступность директории с моделями
        if (!fs.existsSync(modelsDir)) {
            throw new Error('Models directory not found');
        }
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                models: 'available'
            }
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

function collectGlbModels(dir, baseDir = dir) {
    let models = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        // if (file.isDirectory()) {
        //     models = models.concat(collectGlbModels(fullPath, baseDir));
        if (file.isFile() && file.name.endsWith('.glb')) {
            const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
            models.push(relativePath);
        }
    }

    return models;
}

// Получение списка моделей с данными из БД
app.get('/api/models/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const models = await getModelsWithSessions(userId);
        res.json({ project_id: userId, models });
    } catch (err) {
        console.error('Error fetching models:', err);
        res.status(500).json({ error: 'Error fetching models from database' });
    }
});

// Обновление количества модели
app.post('/api/models/quantity', async (req, res) => {
    try {
        const { userId, article, quantity } = req.body;
        
        // Получаем или создаем пользователя
        await getOrCreateUser(userId);
        
        // Получаем модель по артикулу
        const model = await getModelByArticle(article);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        
        // Создаем или обновляем сессию
        await createOrUpdateSession(userId, model.id, quantity);
        
        // Инвалидируем кэш сессии
        invalidateCachedSession(userId);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating model quantity:', err);
        res.status(500).json({ error: 'Error updating model quantity' });
    }
});

app.get('/api/models', (req, res) => {
    try {
        const models = collectGlbModels(modelsDir).sort();
        res.json({ models });
    } catch (err) {
        res.status(500).json({ error: 'Error reading model files' });
    }
});

// Получение списка моделей с данными из БД
app.post('/api/models/match', async (req, res) => {
    try {
        const { models } = req.body;
        
        if (!models || !Array.isArray(models)) {
            return res.status(400).json({ error: 'Invalid models data' });
        }

        // Получаем артикулы из JSON
        const articles = models.map(model => model.article);
        
        // Получаем соответствующие модели из БД
        const dbModels = await getModelsByArticles(articles);
        
        // Создаем мапу для быстрого поиска
        const dbModelsMap = new Map(dbModels.map(model => [model.article, model]));
        
        // Объединяем данные из JSON с данными из БД
        const matchedModels = models.map(jsonModel => {
            const dbModel = dbModelsMap.get(jsonModel.article);
            if (dbModel) {
                return {
                    ...jsonModel,
                    name: dbModel.name,
                    description: dbModel.description,
                    category: dbModel.category
                };
            }
            return null;
        }).filter(model => model !== null);

        res.json({ models: matchedModels });
    } catch (err) {
        console.error('Error matching models:', err);
        res.status(500).json({ error: 'Error matching models with database' });
    }
});

// Прокси для валидации токенов (решает проблему CORS)
app.get('/api/validate-token', async (req, res) => {
    try {
        const { token } = req.query;
        
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const hostname = 'leber.ru';
        const path = `/api/v2/project/builder/validate?token=${token}`;
        
        console.log('🔍 Proxy token validation attempt:');
        console.log('URL:', `https://${hostname}${path}`);
        
        const options = {
            hostname: hostname,
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Cookie': 'redesign=always'
            }
        };

        const httpsReq = https.request(options, (httpsRes) => {
            let data = '';
            
            console.log('📡 Proxy response received:');
            console.log('Status Code:', httpsRes.statusCode);
            console.log('Headers:', httpsRes.headers);
            
            httpsRes.on('data', (chunk) => {
                data += chunk;
            });
            
            httpsRes.on('end', () => {
                // Принимаем 200 (OK) и 204 (No Content) как успешную валидацию
                if (httpsRes.statusCode === 200 || httpsRes.statusCode === 204) {
                    // Если ответ пустой или не JSON, просто возвращаем успех
                    if (!data || data.trim() === '') {
                        res.json({ isValid: true });
                    } else {
                        try {
                            const jsonData = JSON.parse(data);
                            res.json({ isValid: true, userData: jsonData });
                        } catch (parseError) {
                            console.log('Response is not JSON, but status is 200/204 - token is valid');
                            res.json({ isValid: true });
                        }
                    }
                } else {
                    console.error('Token validation failed:', httpsRes.statusCode, data);
                    res.status(httpsRes.statusCode).json({ error: 'Token validation failed' });
                }
            });
        });

        httpsReq.on('error', (error) => {
            console.error('HTTPS request error:', error);
            res.status(500).json({ error: 'Internal server error during token validation' });
        });

        httpsReq.end();
    } catch (error) {
        console.error('Error validating token:', error);
        res.status(500).json({ error: 'Internal server error during token validation' });
    }
});

// Новый endpoint для запуска приложения с данными из внешнего сайта
app.post('/api/launch', async (req, res) => {
    try {
        const { token, project_id, models } = req.body;
        
        if (!token || !project_id || !models) {
            return res.status(400).json({ error: 'Token, project_id and models are required' });
        }

        console.log('Launch request received:', { project_id, modelsCount: models.length });

        // Проверяем режим разработки
        const isDevelopment = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
        let isTokenValid = false;

        if (isDevelopment) {
            console.log('Development mode: skipping token validation');
            isTokenValid = true;
        } else {
            // Валидируем токен через внешний API
            isTokenValid = await validateTokenInternal(token);
            console.log('Token validation result:', isTokenValid);
        }
        
        if (!isTokenValid) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        console.log('Token validated successfully for user:', project_id);

        // Создаем уникальный sessionId для этого запуска
        const sessionId = generateSessionId();
        
        // Сохраняем данные в временное хранилище (можно использовать Redis или просто память)
        const sessionData = {
            project_id,
            models,
            timestamp: new Date().toISOString(),
            lastAccessed: new Date().toISOString(),
            validated: true
        };
        
        // Сохраняем в память (для продакшена лучше использовать Redis)
        if (!global.sessionStore) {
            global.sessionStore = new Map();
        }
        
        global.sessionStore.set(sessionId, sessionData);
        // Устанавливаем начальный таймаут (скользящий)
        updateSessionTimeout(sessionId, sessionData);

        // Возвращаем ссылку для редиректа
        const redirectUrl = `http://${SERVER_NAME}?sessionId=${sessionId}`;
        
        res.json({ 
            success: true, 
            redirectUrl,
            sessionId 
        });

    } catch (error) {
        console.error('Error in launch endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Функция для валидации токена (внутренняя)
async function validateTokenInternal(token) {
    return new Promise((resolve) => {
        const hostname = 'leber.ru';
        const path = `/api/v2/project/builder/validate?token=${token}`;
        
        console.log('🔍 Token validation attempt:');
        console.log('URL:', `https://${hostname}${path}`);
        
        const options = {
            hostname: hostname,
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Cookie': 'redesign=always'
            }
        };

        const httpsReq = https.request(options, (httpsRes) => {
            let data = '';
            
            httpsRes.on('data', (chunk) => {
                data += chunk;
            });
            
            httpsRes.on('end', () => {
                // Принимаем 200 (OK) и 204 (No Content) как успешную валидацию
                const isValid = httpsRes.statusCode === 200 || httpsRes.statusCode === 204;
                console.log('✅ Token validation result:', isValid);
                
                resolve(isValid);
            });
        });

        httpsReq.on('error', (error) => {
            console.error('❌ Token validation error:', error);
            resolve(false);
        });

        httpsReq.setTimeout(10000, () => {
            console.error('⏰ Token validation timeout');
            httpsReq.destroy();
            resolve(false);
        });

        httpsReq.end();
    });
}

// Функция для генерации уникального ID сессии
function generateSessionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2);
    const sessionId = timestamp + random;
    console.log('SessionId components:', { timestamp, random, sessionId });
    return sessionId;
}

// Функция для обновления таймаута сессии (скользящий таймаут)
function updateSessionTimeout(sessionId, sessionData) {
    // Очищаем предыдущий таймаут если есть
    if (sessionData.timeoutId) {
        clearTimeout(sessionData.timeoutId);
    }
    
    // Устанавливаем новый таймаут (4 часа с момента последнего доступа)
    const timeoutMs = 14400000; // 4 часа в миллисекундах
    const timeoutHours = timeoutMs / (1000 * 60 * 60); // Конвертируем в часы для логов
    
    sessionData.timeoutId = setTimeout(() => {
        if (global.sessionStore && global.sessionStore.has(sessionId)) {
            global.sessionStore.delete(sessionId);
            console.log(`Session expired and deleted: ${sessionId} (after ${timeoutHours} hours)`);
        }
    }, timeoutMs);
    
    console.log(`Session timeout updated for ${sessionId}: expires in ${timeoutHours} hours`);
}

// Debug endpoint для просмотра всех активных сессий (только для разработки)
app.get('/api/debug/sessions', (req, res) => {
    const isDevelopment = req.hostname === 'localhost' || req.hostname === '127.0.0.1';
    
    if (!isDevelopment) {
        return res.status(403).json({ error: 'Debug endpoint only available in development' });
    }
    
    const sessions = global.sessionStore ? Array.from(global.sessionStore.entries()) : [];
    const sessionTimeoutHours = 14400000 / (1000 * 60 * 60); // 4 часа
    
    res.json({
        count: sessions.length,
        sessionTimeoutHours: sessionTimeoutHours,
        sessions: sessions.map(([id, data]) => ({
            sessionId: id,
            timestamp: data.timestamp,
            lastAccessed: data.lastAccessed,
            project_id: data.project_id,
            modelsCount: data.models ? data.models.length : 0
        }))
    });
});

// Endpoint для получения данных сессии по sessionId
app.get('/api/session-data/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        if (global.sessionStore) {
            console.log('Available sessions:', Array.from(global.sessionStore.keys()));
        }
        
        if (!global.sessionStore || !global.sessionStore.has(sessionId)) {
            console.log('Session not found in store');
            return res.status(404).json({ error: 'Session not found or expired' });
        }
        
        const sessionData = global.sessionStore.get(sessionId);
        
        // Обновляем время последнего доступа и продлеваем сессию
        sessionData.lastAccessed = new Date().toISOString();
        updateSessionTimeout(sessionId, sessionData);
        global.sessionStore.set(sessionId, sessionData);
        console.log(`Session accessed: ${sessionId}, timeout extended`);
        
        // Создаем копию данных без timeoutId для отправки клиенту
        const responseData = {
            project_id: sessionData.project_id,
            models: sessionData.models,
            timestamp: sessionData.timestamp,
            lastAccessed: sessionData.lastAccessed,
            validated: sessionData.validated
        };
        
        res.json(responseData);
    } catch (error) {
        console.error('Error getting session data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение сессии пользователя (оптимизированная версия с кэшированием)
app.get('/api/session/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Проверяем кэш
        const cachedSession = getCachedSession(userId);
        if (cachedSession) {
            res.json({ session: cachedSession });
            return;
        }
        
        const sessionData = await getSession(userId);
        
        if (!sessionData) {
            res.json({ session: null });
            return;
        }
        
        // Кэшируем результат
        setCachedSession(userId, sessionData);
        
        res.json({ session: sessionData });
    } catch (err) {
        console.error('Error fetching session:', err);
        res.status(500).json({ error: 'Error fetching session' });
    }
});

// Сохранение сессии пользователя (оптимизированная версия)
app.post('/api/session', async (req, res) => {
    try {
        const { userId, sessionData } = req.body;
        if (!userId || !sessionData) {
            return res.status(400).json({ error: 'userId and sessionData are required' });
        }
        
        await saveSession(userId, sessionData);
        
        // Инвалидируем кэш после сохранения
        invalidateCachedSession(userId);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error saving session:', err);
        res.status(500).json({ error: 'Error saving session to database' });
    }
});

// Удаление сессии пользователя
app.delete('/api/session/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const query = `
            DELETE FROM sessions
            WHERE project_id = (SELECT id FROM projects WHERE project_id = $1)
        `;
        await pool.query(query, [userId]);
        
        // Инвалидируем кэш после удаления
        invalidateCachedSession(userId);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ error: 'Error deleting session from database' });
    }
});

// Получение списка отсутствующих моделей
app.get('/api/missing-models/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Получаем модели из sessionStorage (переданы в запросе)
        const requestedModels = JSON.parse(req.query.models || '[]');
        
        if (!Array.isArray(requestedModels)) {
            return res.status(400).json({ error: 'Invalid models data' });
        }
                
        // Получаем список файлов из папки models
        const filesInFolder = collectGlbModels(modelsDir);
        const fileNamesInFolder = filesInFolder.map(file => path.basename(file));
        
        // Получаем все модели из базы данных
        const allDbModels = await pool.query('SELECT name, article FROM models');
        
        // Находим отсутствующие модели
        const missingModels = [];
        
        for (const requestedModel of requestedModels) {            
            // Попробуем найти модель в БД по артикулу
            const dbModel = allDbModels.rows.find(dbModel => dbModel.article === requestedModel.article);
            const modelName = dbModel ? dbModel.name : null;
            
            // Создаем имя файла для поиска
            const possibleFileNames = [
                `${requestedModel.article}.glb`,
                modelName ? `${modelName}.glb` : null
            ].filter(Boolean);
                        
            // Проверяем наличие в папке
            const existsInFolder = possibleFileNames.some(fileName => 
                fileNamesInFolder.includes(fileName)
            );
            
            // Проверяем наличие в базе данных
            const existsInDb = dbModel !== undefined;
                        
            if (!existsInFolder || !existsInDb) {
                missingModels.push({
                    article: requestedModel.article,
                    name: modelName,
                    missingInFolder: !existsInFolder,
                    missingInDb: !existsInDb
                });
            }
        }
        
        console.log('Missing models result:', missingModels);
        
        res.json({ 
            missingModels,
            stats: {
                total: requestedModels.length,
                missing: missingModels.length,
                found: requestedModels.length - missingModels.length
            }
        });
    } catch (err) {
        console.error('Error getting missing models:', err);
        res.status(500).json({ error: 'Error getting missing models' });
    }
});

// Endpoint для отправки отчета об отсутствующих моделях по email
app.post('/api/send-missing-models-report', async (req, res) => {
    try {
        const { userId, missingModels, stats, userEmail, projectInfo } = req.body;
        
        if (!missingModels || !Array.isArray(missingModels)) {
            return res.status(400).json({ error: 'Missing models data is required' });
        }
        
        const jsonData = createMissingModelsJson(missingModels, stats, userId, projectInfo, userEmail);
        const emailResult = await sendEmailWithJson(jsonData, userId, stats, userEmail);
        
        res.json({ 
            success: true, 
            message: 'Отчет успешно отправлен администрации',
            development: emailResult.development || false
        });
        
    } catch (error) {
        console.error('Error sending missing models report:', error);
        res.status(500).json({ 
            error: 'Ошибка при отправке отчета',
            details: error.message
        });
    }
});

/**
 * Создает JSON отчет об отсутствующих моделях
 */
function createMissingModelsJson(missingModels, stats, userId, projectInfo, userEmail) {
    return {
        reportInfo: {
            title: 'ОТЧЕТ ОБ ОТСУТСТВУЮЩИХ МОДЕЛЯХ',
            createdAt: new Date().toLocaleString('ru-RU'),
            timestamp: new Date().toISOString(),
            projectId: userId || 'Не указан',
            userEmail: userEmail || null,
            playgroundSize: projectInfo?.playgroundSize || 'Не указан'
        },
        statistics: {
            total: stats?.total || 0,
            found: stats?.found || 0,
            missing: stats?.missing || 0
        },
        missingModels: missingModels.map(model => ({
            article: model.article || 'Не указан',
            name: model.name || 'Название не найдено',
            missingInFolder: model.missingInFolder || false,
            missingInDb: model.missingInDb || false,
            status: (() => {
                const statuses = [];
                if (model.missingInFolder) statuses.push('Нет в папке');
                if (model.missingInDb) statuses.push('Нет в БД');
                return statuses.length > 0 ? statuses.join(', ') : 'Все в порядке';
            })()
        })),
        projectInfo: projectInfo || {}
    };
}

/**
 * Отправляет email с JSON отчетом (используя рабочую конфигурацию из test-email-sending.js)
 */
async function sendEmailWithJson(jsonData, userId, stats, userEmail) {
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
        return { messageId: 'dev-mode-' + Date.now(), development: true };
    }

    try {
        console.log('1. Создание транспорта...');
        const transporter = nodemailer.createTransporter({
            host: 'smtp.mail.ru',
            port: 465,
            secure: true, // true для порта 465, false для других портов
            auth: {
                user: 'grafana_test_ruscon@mail.ru',
                pass: 'BCaWNbWNLdDoSwn6p5lL'
            }
        });

        console.log('2. Проверка SMTP подключения...');
        await transporter.verify();
        console.log('✅ SMTP подключение успешно');

        console.log('3. Отправка отчета об отсутствующих моделях...');
        const mailOptions = {
            from: 'grafana_test_ruscon@mail.ru',
            to: 'uventus_work@mail.ru',
            subject: `Отчет об отсутствующих моделях - Проект ${userId}`,
            html: `
                <h2>📊 Отчет об отсутствующих моделях</h2>
                <p><strong>Время отправки:</strong> ${new Date().toLocaleString('ru-RU')}</p>
                <p><strong>ID проекта:</strong> ${userId || 'Не указан'}</p>
                ${userEmail ? `<p><strong>Email пользователя:</strong> ${userEmail}</p>` : ''}
                
                <h3>📈 Статистика:</h3>
                <ul>
                    <li>Всего моделей: <strong>${stats?.total || 0}</strong></li>
                    <li>Найдено: <strong style="color: green;">${stats?.found || 0}</strong></li>
                    <li>Отсутствует: <strong style="color: red;">${stats?.missing || 0}</strong></li>
                </ul>
                
                <p>Подробная информация об отсутствующих моделях во вложенном JSON файле.</p>
                
                <hr>
                <p><small>Это автоматически сгенерированное сообщение из системы Leber 3D Constructor</small></p>
            `,
            attachments: [
                {
                    filename: `missing-models-report-${userId}-${new Date().toISOString().split('T')[0]}.json`,
                    content: JSON.stringify(jsonData, null, 2),
                    contentType: 'application/json'
                }
            ]
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ ОТЧЕТ ОТПРАВЛЕН УСПЕШНО!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('Получатель: uventus_work@mail.ru');
        
        return info;

    } catch (error) {
        console.error('❌ ОШИБКА ПРИ ОТПРАВКЕ ОТЧЕТА:');
        console.error('Тип ошибки:', error.code || error.name);
        console.error('Сообщение:', error.message);
        throw error;
    }
}

app.use('/models', express.static(modelsDir));

app.listen(PORT, () => {
    console.log(`API сервер запущен на ${API_BASE_URL}`);
});
