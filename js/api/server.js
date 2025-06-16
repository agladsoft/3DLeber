import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { getModelsByArticles, getModelByArticle, getModelsWithSessions, getOrCreateUser, saveSession, getSession } from './db.js';
import pg from 'pg';
import { SERVER_PORT, DB_CONFIG, API_BASE_URL } from './serverConfig.js';

const { Pool } = pg;

const app = express();
const PORT = SERVER_PORT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Создаем пул подключений к базе данных
const pool = new Pool(DB_CONFIG);

// ✅ Разрешить CORS
app.use(cors());
app.use(express.json());

const modelsDir = path.join(__dirname, '..', 'models');

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
        console.log(`models: ${JSON.stringify(models)}`);
        res.json({ user_id: userId, models });
    } catch (err) {
        console.error('Error fetching models:', err);
        res.status(500).json({ error: 'Error fetching models from database' });
    }
});

// Обновление количества модели
app.post('/api/models/quantity', async (req, res) => {
    try {
        console.log(`req.body: ${JSON.stringify(req.body)}`);
        const { userId, article, quantity } = req.body;
        
        // Получаем или создаем пользователя
        await getOrCreateUser(userId);
        
        // Получаем модель по артикулу
        const model = await getModelByArticle(article);
        console.log(`model: ${JSON.stringify(model)}`);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        
        // Создаем или обновляем сессию
        await createOrUpdateSession(userId, model.id, quantity);
        
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

        const credentials = Buffer.from('leber:leber').toString('base64');
        const hostname = 'inertia.leber.click';
        const path = `/api/v2/project/builder/validate?token=${encodeURIComponent(token)}`;
        
        const options = {
            hostname: hostname,
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${credentials}`
            }
        };

        const httpsReq = https.request(options, (httpsRes) => {
            let data = '';
            
            httpsRes.on('data', (chunk) => {
                data += chunk;
            });
            
            httpsRes.on('end', () => {
                if (httpsRes.statusCode === 200) {
                    console.log('Token validation successful');
                    // Если ответ пустой или не JSON, просто возвращаем успех
                    if (!data || data.trim() === '') {
                        res.json({ isValid: true });
                    } else {
                        try {
                            const jsonData = JSON.parse(data);
                            console.log('Token validation response:', jsonData);
                            res.json({ isValid: true, userData: jsonData });
                        } catch (parseError) {
                            console.log('Response is not JSON, but status is 200 - token is valid');
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

// Получение сессии пользователя
app.get('/api/session/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const sessionData = await getSession(userId);
        
        if (!sessionData) {
            res.json({ session: null });
            return;
        }
        
        res.json({ session: sessionData });
    } catch (err) {
        console.error('Error fetching session:', err);
        res.status(500).json({ error: 'Error fetching session' });
    }
});

// Сохранение сессии пользователя
app.post('/api/session', async (req, res) => {
    try {
        const { userId, sessionData } = req.body;
        if (!userId || !sessionData) {
            return res.status(400).json({ error: 'userId and sessionData are required' });
        }
        await saveSession(userId, sessionData);
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
            WHERE user_id = (SELECT id FROM users WHERE user_id = $1)
        `;
        await pool.query(query, [userId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ error: 'Error deleting session from database' });
    }
});

app.use('/models', express.static(modelsDir));

app.listen(PORT, () => {
    console.log(`API сервер запущен на ${API_BASE_URL}`);
});
