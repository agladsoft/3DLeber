import pg from 'pg';
import { DB_CONFIG } from './serverConfig.js';
const { Pool } = pg;

const pool = new Pool(DB_CONFIG);

export async function getModelsByArticles(articles) {
    const query = `
        SELECT m.*
        FROM models m
        WHERE m.article = ANY($1)
    `;
    const result = await pool.query(query, [articles]);
    return result.rows;
}



export async function getOrCreateUser(userId) {
    // Используем INSERT ... ON CONFLICT DO UPDATE чтобы всегда получать id
    const query = `
        WITH inserted AS (
            INSERT INTO projects (project_id)
            VALUES ($1)
            ON CONFLICT (project_id) DO UPDATE 
            SET project_id = EXCLUDED.project_id
            RETURNING id
        )
        SELECT id FROM inserted
        UNION ALL
        SELECT id FROM projects WHERE project_id = $1 AND NOT EXISTS (SELECT 1 FROM inserted)
        LIMIT 1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
}



export async function saveSession(userId, sessionData) {
    try {
        // Сначала получаем или создаем пользователя
        const user = await getOrCreateUser(userId);
        
        if (!user) {
            throw new Error('Failed to get or create user');
        }

        const query = `
            INSERT INTO sessions (project_id, session_data)
            VALUES ($1, $2)
            ON CONFLICT (project_id) 
            DO UPDATE SET session_data = $2
            RETURNING project_id
        `;
        const result = await pool.query(query, [user.id, sessionData]);
        return result.rows[0];
    } catch (error) {
        console.error('Error in saveSession:', error);
        throw error;
    }
}

export async function getSession(userId) {
    try {
        // Сначала получаем или создаем пользователя
        const user = await getOrCreateUser(userId);
        
        if (!user) {
            throw new Error('Failed to get or create user');
        }

        const query = `
            SELECT session_data
            FROM sessions
            WHERE project_id = $1
        `;
        const result = await pool.query(query, [user.id]);
        return result.rows[0]?.session_data;
    } catch (error) {
        console.error('Error in getSession:', error);
        throw error;
    }
}