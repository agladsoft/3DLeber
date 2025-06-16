// Server configuration
const SERVER_NAME = process.env.SERVER_NAME || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || '3000';
const API_BASE_URL = `https://${SERVER_NAME}/api`;
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'postgres';
const POSTGRES_DB = process.env.POSTGRES_DB || 'admin';
const POSTGRES_USER = process.env.POSTGRES_USER || 'admin';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'admin';

// Database configuration
const DB_CONFIG = {
    host: POSTGRES_DB,
    port: 5432,
    user: POSTGRES_USER,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD
};

export {
    SERVER_NAME,
    SERVER_PORT,
    API_BASE_URL,
    POSTGRES_HOST,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    DB_CONFIG
}; 