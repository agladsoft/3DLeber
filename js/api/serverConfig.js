// Server configuration
const SERVER_IP = process.env.SERVER_IP || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || '3000';
const API_BASE_URL = `http://${SERVER_IP}:${SERVER_PORT}/api`;
const POSTGRES_HOST = process.env.POSTGRES_HOST || 'postgres';
const POSTGRES_DB = process.env.POSTGRES_DB || 'admin';
const POSTGRES_USER = process.env.POSTGRES_USER || 'admin';
const POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'admin';

// Database configuration
const DB_CONFIG = {
    host: POSTGRES_HOST,
    port: 5432,
    user: POSTGRES_USER,
    database: POSTGRES_DB,
    password: POSTGRES_PASSWORD
};

export {
    SERVER_IP,
    SERVER_PORT,
    API_BASE_URL,
    POSTGRES_HOST,
    POSTGRES_DB,
    POSTGRES_USER,
    POSTGRES_PASSWORD,
    DB_CONFIG
}; 