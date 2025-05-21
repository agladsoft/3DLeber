import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'admin',
    database: 'admin',
    password: 'admin'
});

export async function getModelsByArticles(articles) {
    const query = `
        SELECT m.*
        FROM models m
        WHERE m.article = ANY($1)
    `;
    const result = await pool.query(query, [articles]);
    return result.rows;
}

export async function getModelByArticle(article) {
    const query = `
        SELECT m.*, s.quantity 
        FROM models m
        LEFT JOIN sessions s ON m.id = s.model_id
        WHERE m.article = $1
    `;
    const result = await pool.query(query, [article]);
    return result.rows[0];
}

export async function createOrUpdateSession(userId, modelId, quantity) {
    const query = `
        INSERT INTO sessions (user_id, model_id, quantity)
        SELECT u.id, m.id, $3
        FROM users u, models m
        WHERE u.user_id = $1 AND m.id = $2
        ON CONFLICT (user_id, model_id) 
        DO UPDATE SET quantity = $3
        RETURNING id
    `;
    const result = await pool.query(query, [userId, modelId, quantity]);
    return result.rows[0];
}

export async function getOrCreateUser(userId) {
    const query = `
        INSERT INTO users (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING id
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
}

export async function getModelsWithSessions(userId) {
    const query = `
        SELECT m.*, COALESCE(s.quantity, 0) as quantity
        FROM models m
        LEFT JOIN sessions s ON m.id = s.model_id
        LEFT JOIN users u ON s.user_id = u.id
        WHERE u.user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    console.log(result.rows);
    return result.rows;
}

export async function saveSession(userId, sessionData) {
    const query = `
        INSERT INTO sessions (user_id, session_data)
        VALUES ($1, $2)
        ON CONFLICT (user_id) 
        DO UPDATE SET session_data = $2
        RETURNING id
    `;
    const result = await pool.query(query, [userId, JSON.stringify(sessionData)]);
    return result.rows[0];
}

export async function getSession(userId) {
    const query = `
        SELECT session_data
        FROM sessions
        WHERE user_id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0]?.session_data;
} 